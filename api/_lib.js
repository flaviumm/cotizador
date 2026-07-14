// Validación y armado del pedido a OpenAI. Puro (sin red) para poder testearlo con node:test.

export const MAX_FILES = 4;
export const MAX_TOTAL_BASE64_CHARS = 4 * 1024 * 1024; // ~3MB binario; el body de Vercel corta en 4.5MB
export const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return { ok: false, error: "No se recibieron archivos." };
  if (files.length > MAX_FILES) return { ok: false, error: `Máximo ${MAX_FILES} archivos por análisis.` };
  let total = 0;
  for (const file of files) {
    if (!file || typeof file.dataBase64 !== "string" || !file.dataBase64) {
      return { ok: false, error: "Se recibió un archivo sin contenido." };
    }
    if (!ALLOWED_TYPES.has(file.mimeType)) {
      return { ok: false, error: `Tipo de archivo no soportado: ${file.mimeType || "desconocido"}. Usá PDF, JPG, PNG o WebP.` };
    }
    total += file.dataBase64.length;
  }
  if (total > MAX_TOTAL_BASE64_CHARS) {
    return { ok: false, error: "Los archivos superan el tamaño máximo (~3MB en total). Reducí la resolución o dividí el análisis." };
  }
  return { ok: true };
}

export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumen: { type: "string" },
    materiales: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          descripcion: { type: "string" },
          cantidad: { type: "number" },
          unidad: { type: "string" },
          rubro: { type: "string", enum: ["estructura", "piping", "electrica", "civil", "otro"] },
        },
        required: ["descripcion", "cantidad", "unidad", "rubro"],
      },
    },
    manoDeObra: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          oficio: { type: "string" },
          horas: { type: "number" },
          justificacion: { type: "string" },
        },
        required: ["oficio", "horas", "justificacion"],
      },
    },
    supuestos: { type: "array", items: { type: "string" } },
    advertencias: { type: "array", items: { type: "string" } },
  },
  required: ["resumen", "materiales", "manoDeObra", "supuestos", "advertencias"],
};

function buildPrompt(oficios, descripcion) {
  const oficiosList = oficios.length ? oficios.join(", ") : "Soldador, Electricista, Ayudante";
  const tarea = descripcion
    ? `\nIndicación del usuario sobre la tarea (priorizala para definir alcance, qué incluir y qué excluir): "${descripcion}"\n`
    : "";
  return `Sos un experto en presupuestos de fabricación industrial en Argentina (estructuras metálicas, piping, instalaciones eléctricas y obra civil).
Analizá los planos o croquis adjuntos (pueden ser PDF, fotos de planos o dibujos a mano alzada) y devolvé:
${tarea}

- resumen: qué es el trabajo y sus dimensiones principales.
- materiales: lista con cantidad y unidad (m, kg, unidad, m2, m3, litro). Descripciones técnicas concretas con medidas (ej: "Caño estructural cuadrado 40x40x2mm", "Chapa lisa 3,2mm", "Cable unipolar 2,5mm2").
  Heurísticas por rubro:
  * estructura: metros lineales por tipo de perfil y kg de chapa; sumá 10% de desperdicio.
  * piping: metros de caño por diámetro y conteo de accesorios (codos, tes, bridas, válvulas).
  * electrica: metros de cable y bandeja con 15% de reserva; conteo de bocas y equipos.
  * civil: volúmenes de hormigón (m3), superficies (m2), hierro (kg).
  Incluí consumibles obvios (electrodos o alambre de soldar, discos de corte, fijaciones).
- manoDeObra: horas estimadas por oficio. Usá EXCLUSIVAMENTE estos oficios: ${oficiosList}.
- supuestos: todo lo que asumiste (calidad de material, espesores, normas).
- advertencias: faltantes del plano (sin cotas, sin escala, vistas incompletas) y riesgos de la estimación.

Si el plano no tiene cotas, estimá por proporciones y decláralo en advertencias. Si la imagen no parece un plano o croquis, decilo en advertencias y devolvé listas vacías. Respondé en español.`;
}

export function buildOpenAIPayload(files, oficios, descripcion = "") {
  const content = [{ type: "input_text", text: buildPrompt(oficios, String(descripcion).trim().slice(0, 2000)) }];
  for (const file of files) {
    if (file.mimeType === "application/pdf") {
      content.push({ type: "input_file", filename: file.name || "plano.pdf", file_data: `data:application/pdf;base64,${file.dataBase64}` });
    } else {
      content.push({ type: "input_image", image_url: `data:${file.mimeType};base64,${file.dataBase64}` });
    }
  }
  return {
    model: "gpt-4o",
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "analisis_plano", strict: true, schema: ANALYSIS_SCHEMA } },
  };
}
