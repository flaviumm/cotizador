# Capa AI de Análisis de Planos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir planos (PDF/JPG/PNG) o croquis a mano alzada, que la AI proponga materiales del catálogo + horas de mano de obra como propuesta editable que el usuario confirma antes de entrar al presupuesto.

**Architecture:** Una función serverless Vercel (`api/analyze.js`) llama a OpenAI (Responses API, GPT-4o, salida JSON estructurada) con la clave en env del servidor. El front matchea las descripciones de la AI contra el catálogo local (~6.700 ítems) y muestra una propuesta editable en el paso Materiales. En dev local, un mini servidor Node sirve la función y Vite le hace proxy (`/api` → `:3001`), sin necesidad de `vercel login`.

**Tech Stack:** Vite 7 + React 19 (existente), Node serverless en `api/`, `fetch` nativo a OpenAI (sin SDK), `node --test` para lógica pura.

## Global Constraints

- **Cero dependencias npm nuevas.** OpenAI se llama con `fetch`; tests con `node:test`.
- **Body ≤ ~4MB base64 total** (límite de Vercel: 4.5MB). Imágenes se reescalan a máx 1600px JPEG 0.85 en el navegador; PDFs máx 3MB.
- **Máx 4 archivos** por análisis. Tipos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **La clave nunca llega al navegador.** Local: `.env.local` (ya gitignoreado). Producción: env var `OPENAI_API_KEY` en Vercel.
- **La AI nunca escribe directo en el presupuesto** — todo renglón pasa por confirmación del usuario.
- Textos de UI en español (es-AR), estilo de los componentes existentes en `src/components/ui.jsx`.
- Modelo: `gpt-4o`. Rubros: `estructura | piping | electrica | civil | otro`.

---

### Task 1: Matcheo local contra el catálogo (`src/lib/catalogMatch.js`)

**Files:**
- Create: `src/lib/catalogMatch.js`
- Test: `src/lib/catalogMatch.test.js`

**Interfaces:**
- Consumes: nada (módulo puro).
- Produces: `matchCatalog(query: string, materials: Array, topN = 5): Array<{ item, score: number }>` ordenado por score desc; `extractDimensions(value: string): string[]`; `normalizeForMatch(value: string): string`; `tokenize(value: string): string[]`. Los ítems del catálogo tienen `{ id, name, spec, category, medidas, sku, brand, ... }`.

- [ ] **Step 1: Write the failing test**

`src/lib/catalogMatch.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { matchCatalog, extractDimensions } from "./catalogMatch.js";

const CATALOG = [
  { id: "a", name: "CAÑO ESTRUCTURAL CUADRADO 40X40", spec: "2 mm", category: "CAÑOS ESTRUCTURALES", medidas: "40x40", sku: "CE4040-2", brand: "" },
  { id: "b", name: "CAÑO ESTRUCTURAL CUADRADO 20X20", spec: "1,6 mm", category: "CAÑOS ESTRUCTURALES", medidas: "20x20", sku: "CE2020", brand: "" },
  { id: "c", name: "ALAMBRE RECOCIDO DE ATAR N°10", spec: "Ø 3,25 mm", category: "ALAMBRES", medidas: "", sku: "AR10", brand: "" },
];

test("encuentra el caño 40x40 primero por bonus de medidas", () => {
  const result = matchCatalog("Caño estructural cuadrado 40x40x2mm", CATALOG, 5);
  assert.equal(result[0].item.id, "a");
  assert.ok(result[0].score > result[1].score);
});

test("sin coincidencias devuelve vacío", () => {
  assert.deepEqual(matchCatalog("hormigón H21 elaborado", CATALOG), []);
});

test("query vacía devuelve vacío", () => {
  assert.deepEqual(matchCatalog("", CATALOG), []);
});

test("respeta topN", () => {
  const result = matchCatalog("caño estructural", CATALOG, 1);
  assert.equal(result.length, 1);
});

test("extractDimensions saca medidas compuestas y atómicas", () => {
  assert.deepEqual(extractDimensions("caño 40x40 esp 2mm"), ["40x40", "40", "2"]);
});

test("ignora acentos y mayúsculas", () => {
  const result = matchCatalog("caño estructural", CATALOG, 5);
  assert.ok(result.length >= 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/`
Expected: FAIL — `Cannot find module ... catalogMatch.js`

- [ ] **Step 3: Write minimal implementation**

`src/lib/catalogMatch.js`:

```js
// Matcheo local de descripciones de la AI contra el catálogo de materiales.
// ponytail: scoring por tokens, sin índice; con 6.700 ítems tarda <50ms. Indexar si crece 10x.

export function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.,x\/°ø#]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "la", "el", "los", "las", "para", "con", "por", "del", "un", "una", "y", "o", "en", "mm", "cm", "mts", "mm2"]);

export function tokenize(value) {
  return normalizeForMatch(value).split(/\s+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Medidas numéricas ("40x40", "2", "1/2") para bonus por coincidencia exacta.
export function extractDimensions(value) {
  const norm = normalizeForMatch(value).replace(/,/g, ".");
  const matches = norm.match(/\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)+|\d+\/\d+|\d+(?:\.\d+)?/g) || [];
  const out = new Set();
  for (const m of matches) {
    out.add(m);
    if (m.includes("x")) for (const part of m.split("x")) out.add(part);
  }
  return [...out];
}

export function matchCatalog(query, materials, topN = 5) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];
  const queryDims = extractDimensions(query);

  const scored = [];
  for (const item of materials) {
    const haystack = `${item.name} ${item.spec || ""} ${item.category || ""} ${item.medidas || ""} ${item.sku || ""} ${item.brand || ""}`;
    const haystackNorm = normalizeForMatch(haystack);
    const haystackTokens = new Set(tokenize(haystack));

    let hits = 0;
    for (const token of queryTokens) {
      if (haystackTokens.has(token)) hits += 1;
      else if (haystackNorm.includes(token)) hits += 0.5;
    }
    if (!hits) continue;

    let score = hits / queryTokens.length;
    const itemDims = extractDimensions(haystack);
    for (const dim of queryDims) {
      if (itemDims.includes(dim)) score += 0.25;
    }
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/`
Expected: `# pass 6` — si el test de "40x40 primero" falla, revisar que el bonus de dimensiones se aplique (el ítem `b` comparte tokens pero no medidas).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogMatch.js src/lib/catalogMatch.test.js
git commit -m "feat: matcheo local de descripciones AI contra el catálogo"
```

---

### Task 2: Validación y payload de OpenAI (`api/_lib.js`)

**Files:**
- Create: `api/_lib.js` (el prefijo `_` evita que Vercel lo exponga como ruta)
- Test: `api/_lib.test.js` (Vercel ignora `*.test.js`… no: **sí lo expondría**; por eso el test también lleva prefijo → `api/_lib.test.js` queda protegido por el `_`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `validateFiles(files): { ok: true } | { ok: false, error: string }` — files son `{ name, mimeType, dataBase64 }`.
  - `buildOpenAIPayload(files, oficios: string[]): object` — body listo para POST a `https://api.openai.com/v1/responses`.
  - `ANALYSIS_SCHEMA` — JSON schema estricto del contrato de la spec.
  - Constantes `MAX_FILES = 4`, `MAX_TOTAL_BASE64_CHARS = 4 * 1024 * 1024`, `ALLOWED_TYPES`.

- [ ] **Step 1: Write the failing test**

`api/_lib.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateFiles, buildOpenAIPayload, ANALYSIS_SCHEMA, MAX_FILES } from "./_lib.js";

const png = { name: "croquis.png", mimeType: "image/png", dataBase64: "iVBORw0KGgo=" };
const pdf = { name: "plano.pdf", mimeType: "application/pdf", dataBase64: "JVBERi0xLjQ=" };

test("acepta un archivo válido", () => {
  assert.deepEqual(validateFiles([png]), { ok: true });
});

test("rechaza lista vacía o ausente", () => {
  assert.equal(validateFiles([]).ok, false);
  assert.equal(validateFiles(undefined).ok, false);
});

test("rechaza más de MAX_FILES", () => {
  assert.equal(validateFiles(Array(MAX_FILES + 1).fill(png)).ok, false);
});

test("rechaza tipo no soportado", () => {
  const result = validateFiles([{ name: "a.gif", mimeType: "image/gif", dataBase64: "abc" }]);
  assert.equal(result.ok, false);
  assert.match(result.error, /gif/);
});

test("rechaza payload total demasiado grande", () => {
  const big = { name: "x.png", mimeType: "image/png", dataBase64: "a".repeat(5 * 1024 * 1024) };
  assert.equal(validateFiles([big]).ok, false);
});

test("payload: PDF va como input_file, imagen como input_image", () => {
  const payload = buildOpenAIPayload([pdf, png], ["Soldador"]);
  assert.equal(payload.model, "gpt-4o");
  const content = payload.input[0].content;
  assert.equal(content[0].type, "input_text");
  assert.match(content[0].text, /Soldador/);
  assert.equal(content[1].type, "input_file");
  assert.match(content[1].file_data, /^data:application\/pdf;base64,/);
  assert.equal(content[2].type, "input_image");
  assert.match(content[2].image_url, /^data:image\/png;base64,/);
});

test("payload exige salida estructurada estricta", () => {
  const payload = buildOpenAIPayload([png], []);
  assert.equal(payload.text.format.type, "json_schema");
  assert.equal(payload.text.format.strict, true);
  assert.deepEqual(payload.text.format.schema, ANALYSIS_SCHEMA);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/`
Expected: FAIL — `Cannot find module ... _lib.js`

- [ ] **Step 3: Write minimal implementation**

`api/_lib.js`:

```js
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

function buildPrompt(oficios) {
  const oficiosList = oficios.length ? oficios.join(", ") : "Soldador, Electricista, Ayudante";
  return `Sos un experto en presupuestos de fabricación industrial en Argentina (estructuras metálicas, piping, instalaciones eléctricas y obra civil).
Analizá los planos o croquis adjuntos (pueden ser PDF, fotos de planos o dibujos a mano alzada) y devolvé:

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

export function buildOpenAIPayload(files, oficios) {
  const content = [{ type: "input_text", text: buildPrompt(oficios) }];
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/`
Expected: `# pass 8`

- [ ] **Step 5: Commit**

```bash
git add api/_lib.js api/_lib.test.js
git commit -m "feat: validación de archivos y payload OpenAI para análisis de planos"
```

---

### Task 3: Función serverless + servidor de desarrollo (`api/analyze.js`, `scripts/dev-api.mjs`)

**Files:**
- Create: `api/analyze.js`
- Create: `scripts/dev-api.mjs`
- Create: `scripts/smoke-analyze.mjs`
- Modify: `vite.config.js` (agregar proxy `/api`)
- Modify: `package.json` (script `dev:api`)

**Interfaces:**
- Consumes: `validateFiles`, `buildOpenAIPayload` de `api/_lib.js` (Task 2).
- Produces: `POST /api/analyze` con body `{ files: [{ name, mimeType, dataBase64 }], oficios: string[] }` → `200 { ok: true, analysis }` (analysis cumple `ANALYSIS_SCHEMA`) | `4xx/5xx { ok: false, error: string }`. El front (Task 4) consume exactamente esto.

- [ ] **Step 1: Write the handler**

`api/analyze.js`:

```js
import { validateFiles, buildOpenAIPayload } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });

  const { files, oficios } = req.body || {};
  const validation = validateFiles(files);
  if (!validation.ok) return res.status(400).json({ ok: false, error: validation.error });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: "OPENAI_API_KEY no configurada en el servidor." });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildOpenAIPayload(files, Array.isArray(oficios) ? oficios : [])),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: data?.error?.message || `OpenAI respondió ${response.status}` });
    }
    // REST: el texto viene en output[].content[] con type "output_text".
    const text = data.output_text
      ?? (data.output || []).flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text;
    if (!text) return res.status(502).json({ ok: false, error: "La AI no devolvió resultado. Probá de nuevo." });
    return res.status(200).json({ ok: true, analysis: JSON.parse(text) });
  } catch (error) {
    return res.status(502).json({ ok: false, error: `No se pudo analizar el plano: ${error.message}` });
  }
}
```

- [ ] **Step 2: Write the dev server (sin Vercel CLI)**

`scripts/dev-api.mjs`:

```js
// Sirve api/analyze.js en :3001 para desarrollo, emulando (req, res) de Vercel.
// ponytail: solo el subset que usa el handler (status/json + body parseado).
import http from "node:http";
import { readFileSync } from "node:fs";
import handler from "../api/analyze.js";

// Carga .env.local sin dependencia dotenv.
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch { /* sin .env.local: la env tiene que venir de la shell */ }

http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };
    try {
      await handler(req, res);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}).listen(3001, "127.0.0.1", () => console.log("API dev en http://127.0.0.1:3001/api/analyze"));
```

- [ ] **Step 3: Proxy de Vite y script npm**

En `vite.config.js`, agregar `proxy` dentro de la config existente (mantener lo que ya haya):

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
```

En `package.json`, agregar a `scripts`:

```json
"dev:api": "node scripts/dev-api.mjs"
```

- [ ] **Step 4: Smoke test contra OpenAI real**

`scripts/smoke-analyze.mjs`:

```js
// Smoke test del contrato completo: POST real a la API local (usa la clave y gasta centavos).
// PNG 1x1: no es un plano; lo que se verifica es el contrato JSON, no la interpretación.
const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const response = await fetch("http://127.0.0.1:3001/api/analyze", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ files: [{ name: "test.png", mimeType: "image/png", dataBase64: PNG_1PX }], oficios: ["Soldador"] }),
});
const data = await response.json();
if (!data.ok) throw new Error(`Falló: ${data.error}`);
for (const key of ["resumen", "materiales", "manoDeObra", "supuestos", "advertencias"]) {
  if (!(key in data.analysis)) throw new Error(`Falta la clave "${key}" en la respuesta`);
}
console.log("OK — contrato cumplido. Resumen:", data.analysis.resumen.slice(0, 120));
```

Run (dos terminales o en background):
```bash
node scripts/dev-api.mjs &
node scripts/smoke-analyze.mjs
```
Expected: `OK — contrato cumplido. Resumen: ...` (la AI dirá en advertencias que no parece un plano — correcto).
Si falla con error de OpenAI sobre `input_file`/`text.format`: la forma del payload cambió — consultar https://platform.openai.com/docs/api-reference/responses y ajustar `buildOpenAIPayload` (y sus tests) en consecuencia.

- [ ] **Step 5: Commit**

```bash
git add api/analyze.js scripts/dev-api.mjs scripts/smoke-analyze.mjs vite.config.js package.json
git commit -m "feat: función serverless /api/analyze + servidor de desarrollo local"
```

---

### Task 4: Panel de análisis AI + integración en el wizard

**Files:**
- Create: `src/components/AnalisisPlanoAI.jsx`
- Modify: `src/pages/Cotizador.jsx` (extraer `buildMaterialLine`/`buildLaborLine`, agregar `addAiMaterials`/`addAiLabor`, pasar el panel a MaterialesStep)
- Modify: `src/pages/steps/MaterialesStep.jsx` (renderizar el panel arriba del buscador)

**Interfaces:**
- Consumes: `matchCatalog` (Task 1); `POST /api/analyze` (Task 3); componentes de `src/components/ui.jsx` (`Panel`, `Field`, `TextInput`, `Select`, `Button`, `SectionTitle`, `Icon`).
- Produces: `<AnalisisPlanoAI materials laborRates money catalogPrice onAddMaterials onAddLabor />` donde `onAddMaterials(selections: Array<{ item, quantity: number }>)` y `onAddLabor({ rate, horas: number, justificacion: string })`.

- [ ] **Step 1: Refactor en Cotizador.jsx — extraer builders reutilizables**

Mover la construcción de renglones a funciones a nivel de módulo (después de `catalogPrice`, línea ~24). `addMaterialLine` y `addLaborLine` pasan a usarlas — el comportamiento actual no cambia:

```js
function buildMaterialLine(item, quantity) {
  const price = catalogPrice(item);
  const meta = {
    category: item.category || "",
    sku: item.sku || "",
    unit: item.unit || "",
    provider: item.provider || "",
    source: item.source || "",
    spec: item.spec || "",
    espesorMm: item.espesorMm ?? null,
    largoM: item.largoM ?? null,
  };
  const medidasLabel = [
    meta.spec,
    meta.espesorMm != null ? `Esp: ${meta.espesorMm} mm` : "",
    meta.largoM != null ? `Largo: ${meta.largoM} m` : "",
  ].filter(Boolean).join(" · ");
  const detail = [
    item.name,
    medidasLabel,
    meta.unit ? `Unidad: ${meta.unit}` : "",
    meta.provider ? `Proveedor: ${meta.provider}` : "",
    meta.sku ? `SKU: ${meta.sku}` : "",
    `Precio base: ${money(price)}`,
  ].filter(Boolean).join(" - ");
  return {
    id: `mat-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "material",
    detail,
    quantity: Number(quantity || 1),
    unitPrice: price,
    sourceId: item.id,
    meta,
  };
}

function buildLaborLine(rate, hours, description) {
  const meta = {
    category: rate.category || "",
    agreement: rate.agreement || "",
    unit: "hora",
    provider: "Mano de obra Bizon",
    source: "Tarifario interno",
  };
  const detail = String(description || "").trim() || `${rate.trade} - ${rate.category} - ${rate.agreement}`;
  return {
    id: `labor-${rate.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "labor",
    detail,
    quantity: Number(hours || 1),
    unitPrice: Number(rate.quoteHour || 0),
    sourceId: rate.id,
    meta,
  };
}
```

Dentro del componente, reemplazar los cuerpos de `addMaterialLine` (líneas 348-385) y `addLaborLine` (líneas 387-409):

```js
function addMaterialLine() {
  if (!selectedMaterial) return;
  setGeneratedQuote(null);
  setLineItems((items) => [...items, buildMaterialLine(selectedMaterial, materialQuantity)]);
}

function addLaborLine() {
  if (!selectedLabor) return;
  setGeneratedQuote(null);
  setLineItems((items) => [...items, buildLaborLine(selectedLabor, laborHours, laborDescription)]);
  setLaborDescription("");
}
```

Y agregar los callbacks para la AI (junto a los otros `add*`):

```js
function addAiMaterials(selections) {
  if (!selections?.length) return;
  setGeneratedQuote(null);
  setLineItems((items) => [...items, ...selections.map(({ item, quantity }) => buildMaterialLine(item, quantity))]);
}

function addAiLabor({ rate, horas, justificacion }) {
  if (!rate) return;
  setGeneratedQuote(null);
  setLineItems((items) => [...items, buildLaborLine(rate, horas, justificacion)]);
}
```

- [ ] **Step 2: Crear el componente `src/components/AnalisisPlanoAI.jsx`**

```jsx
import React, { useRef, useState } from "react";
import { Panel, Field, TextInput, Select, Button, Icon } from "./ui.jsx";
import { matchCatalog } from "../lib/catalogMatch.js";

const MAX_FILES = 4;
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const AUTO_SELECT_SCORE = 0.5;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagen inválida"));
    img.src = src;
  });
}

// Reescala imágenes a máx 1600px (JPEG 0.85) para no superar el límite de body de Vercel (4.5MB).
async function fileToPayload(file) {
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error(`"${file.name}" supera los 3MB. Comprimí el PDF o subí una captura.`);
    const dataUrl = await readAsDataURL(file);
    return { name: file.name, mimeType: "application/pdf", dataBase64: dataUrl.split(",")[1], previewUrl: null };
  }
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}": usá PDF, JPG, PNG o WebP.`);
  const img = await loadImage(await readAsDataURL(file));
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL("image/jpeg", 0.85);
  return { name: file.name, mimeType: "image/jpeg", dataBase64: jpeg.split(",")[1], previewUrl: jpeg };
}

export default function AnalisisPlanoAI({ materials, laborRates, money, catalogPrice, onAddMaterials, onAddLabor }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [rows, setRows] = useState([]);
  const [laborRows, setLaborRows] = useState([]);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    setError("");
    try {
      const incoming = await Promise.all([...fileList].map(fileToPayload));
      setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
    } catch (err) {
      setError(err.message);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: files.map(({ name, mimeType, dataBase64 }) => ({ name, mimeType, dataBase64 })),
          oficios: laborRates.map((rate) => rate.trade),
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      setAnalysis(data.analysis);
      setRows((data.analysis.materiales || []).map((mat, index) => {
        const candidates = matchCatalog(mat.descripcion, materials, 5);
        const best = candidates[0];
        return {
          key: index,
          ...mat,
          candidates,
          selectedId: best && best.score >= AUTO_SELECT_SCORE ? best.item.id : "",
          include: Boolean(best && best.score >= AUTO_SELECT_SCORE),
        };
      }));
      setLaborRows((data.analysis.manoDeObra || []).map((labor, index) => {
        const match = laborRates.find((rate) =>
          rate.trade.toLowerCase().includes(labor.oficio.toLowerCase()) ||
          labor.oficio.toLowerCase().includes(rate.trade.toLowerCase()));
        return { key: index, ...labor, rateId: match?.id || laborRates[0]?.id || "", applied: false };
      }));
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  function updateRow(key, patch) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function confirmMaterials() {
    const selections = rows
      .filter((row) => row.include && row.selectedId)
      .map((row) => ({
        item: row.candidates.find((c) => c.item.id === row.selectedId)?.item,
        quantity: row.cantidad,
      }))
      .filter((sel) => sel.item);
    onAddMaterials(selections);
    setRows((prev) => prev.map((row) => (row.include && row.selectedId ? { ...row, include: false, added: true } : row)));
  }

  function applyLabor(row) {
    const rate = laborRates.find((r) => r.id === row.rateId);
    if (!rate) return;
    onAddLabor({ rate, horas: row.horas, justificacion: `${row.oficio}: ${row.justificacion}` });
    setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, applied: true } : l)));
  }

  function reset() {
    setFiles([]); setAnalysis(null); setRows([]); setLaborRows([]); setStatus("idle"); setError("");
  }

  const pendingCount = rows.filter((row) => row.include && row.selectedId).length;

  return (
    <Panel className="p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-semibold text-on-surface">
          <Icon name="auto_awesome" className="text-primary" /> Analizar plano con AI
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-on-surface-variant" />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* --- carga de archivos --- */}
          <div
            className="rounded border-2 border-dashed border-outline p-6 text-center text-sm text-on-surface-variant"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <p>Arrastrá planos o croquis acá (PDF, JPG, PNG — máx {MAX_FILES} archivos)</p>
            <Button className="mt-2" variant="secondary" icon="upload_file" onClick={() => inputRef.current?.click()}>Elegir archivos</Button>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 rounded border border-outline bg-surface-container-low px-2 py-1 text-xs">
                  {file.previewUrl
                    ? <img src={file.previewUrl} alt={file.name} className="h-8 w-8 rounded object-cover" />
                    : <Icon name="picture_as_pdf" className="text-error" />}
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} className="text-on-surface-variant hover:text-error">✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={analyze} disabled={!files.length || status === "loading"} icon="auto_awesome">
              {status === "loading" ? "Analizando… (~30 seg)" : "Analizar"}
            </Button>
            {(analysis || files.length > 0) && <Button variant="secondary" onClick={reset}>Limpiar</Button>}
          </div>

          {/* --- resultado --- */}
          {analysis && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface">{analysis.resumen}</p>

              {analysis.advertencias?.length > 0 && (
                <div className="rounded border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">⚠ Advertencias</p>
                  <ul className="ml-4 list-disc">{analysis.advertencias.map((adv, i) => <li key={i}>{adv}</li>)}</ul>
                </div>
              )}
              {analysis.supuestos?.length > 0 && (
                <details className="text-sm text-on-surface-variant">
                  <summary className="cursor-pointer font-semibold">Supuestos ({analysis.supuestos.length})</summary>
                  <ul className="ml-4 mt-1 list-disc">{analysis.supuestos.map((sup, i) => <li key={i}>{sup}</li>)}</ul>
                </details>
              )}

              {rows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-on-surface">Materiales propuestos</p>
                  {rows.map((row) => (
                    <div key={row.key} className={`rounded border border-outline p-3 ${row.added ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" checked={row.include} disabled={row.added} onChange={(e) => updateRow(row.key, { include: e.target.checked })} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface">{row.descripcion} <span className="text-on-surface-variant">— {row.cantidad} {row.unidad}</span></p>
                          <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px]">
                            <Select value={row.selectedId} onChange={(e) => updateRow(row.key, { selectedId: e.target.value, include: Boolean(e.target.value) })} disabled={row.added}>
                              <option value="">— sin match, usar buscador manual —</option>
                              {row.candidates.map(({ item }) => (
                                <option key={item.id} value={item.id}>{item.name} · {money(catalogPrice(item))}</option>
                              ))}
                            </Select>
                            <TextInput type="number" min="0" step="0.01" value={row.cantidad} disabled={row.added} onChange={(e) => updateRow(row.key, { cantidad: Number(e.target.value) })} />
                          </div>
                          {row.added && <p className="mt-1 text-xs text-green-700">✓ Agregado al presupuesto</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button onClick={confirmMaterials} disabled={!pendingCount} icon="playlist_add">
                    Agregar {pendingCount} material{pendingCount === 1 ? "" : "es"} al presupuesto
                  </Button>
                </div>
              )}

              {laborRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-on-surface">Mano de obra estimada</p>
                  {laborRows.map((row) => (
                    <div key={row.key} className={`rounded border border-outline p-3 ${row.applied ? "opacity-50" : ""}`}>
                      <p className="text-sm font-medium text-on-surface">{row.oficio} — {row.horas} h</p>
                      <p className="text-xs text-on-surface-variant">{row.justificacion}</p>
                      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px_max-content]">
                        <Select value={row.rateId} disabled={row.applied} onChange={(e) => setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, rateId: e.target.value } : l)))}>
                          {laborRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.trade} · {money(rate.quoteHour)}/h</option>)}
                        </Select>
                        <TextInput type="number" min="0" step="0.5" value={row.horas} disabled={row.applied} onChange={(e) => setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, horas: Number(e.target.value) } : l)))} />
                        <Button variant="secondary" disabled={row.applied} onClick={() => applyLabor(row)} icon="engineering">
                          {row.applied ? "✓ Aplicado" : "Aplicar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
```

Nota: si `Button` no soporta `className`, quitar ese prop (revisar `ui.jsx:9` al implementar).

- [ ] **Step 3: Integrar en MaterialesStep vía prop `aiPanel`**

En `src/pages/Cotizador.jsx`, importar el panel y pasarlo (bloque `step === "materiales"`, línea ~548):

```jsx
import AnalisisPlanoAI from "../components/AnalisisPlanoAI.jsx";
// ...
if (step === "materiales") {
  return (
    <MaterialesStep
      // ...props existentes sin cambios...
      aiPanel={
        <AnalisisPlanoAI
          materials={materials}
          laborRates={laborRates}
          money={money}
          catalogPrice={catalogPrice}
          onAddMaterials={addAiMaterials}
          onAddLabor={addAiLabor}
        />
      }
    />
  );
}
```

En `src/pages/steps/MaterialesStep.jsx`, agregar `aiPanel` a los props y renderizarlo entre `SectionTitle` y el `Panel` del buscador:

```jsx
export default function MaterialesStep({
  materialProvider, setMaterialProvider, materialQuery, setMaterialQuery, materialQuantity, setMaterialQuantity,
  filteredMaterials, selectedMaterial, selectedMaterialId, setSelectedMaterialId, addMaterialLine, setLightboxImage,
  money, catalogPrice, providers, aiPanel,
}) {
  return (
    <div className="space-y-4">
      <SectionTitle ... />
      {aiPanel}
      <Panel className="p-5">
      ...
```

- [ ] **Step 4: Verificación en navegador**

```bash
node scripts/dev-api.mjs &
npm run dev
```

En el navegador (paso Materiales del wizard):
1. Se ve el panel colapsado "✨ Analizar plano con AI"; se expande al click.
2. Subir una imagen cualquiera → aparece el chip con preview; "Analizar" → spinner → resultado con advertencias.
3. Marcar un material con candidato, "Agregar al presupuesto" → en el paso Resumen aparece el renglón tipo material con precio del catálogo.
4. "Aplicar" una fila de mano de obra → en Resumen aparece el renglón tipo labor con la tarifa correcta.
5. Consola del navegador sin errores.

(Si no hay plano real a mano: cualquier foto sirve para validar la mecánica; la AI responderá con advertencias y quizá listas vacías — en ese caso validar renglones con un croquis simple dibujado en Paint.)

- [ ] **Step 5: Commit**

```bash
git add src/components/AnalisisPlanoAI.jsx src/pages/Cotizador.jsx src/pages/steps/MaterialesStep.jsx
git commit -m "feat: panel de análisis AI de planos integrado al paso Materiales"
```

---

### Task 5: Prueba de punta a punta y notas de deploy

**Files:**
- Create: `README.md`
- Test: E2E manual con plano/croquis real

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: app verificada de punta a punta + instrucciones de deploy.

- [ ] **Step 1: E2E con un plano real**

Con `node scripts/dev-api.mjs` y `npm run dev` corriendo: subir un plano PDF real y una foto de croquis a mano alzada. Verificar:
- Los materiales propuestos tienen cantidades plausibles y candidatos del catálogo razonables.
- Advertencias y supuestos son coherentes con el plano.
- Los renglones confirmados aparecen en Resumen y en el PDF generado.
- Un análisis completo tarda < 60 seg.

- [ ] **Step 2: README con instrucciones de dev y deploy**

`README.md`:

```markdown
# Cotizador Bizon

Cotizador de presupuestos industriales (Vite + React) con análisis de planos por AI.

## Desarrollo

Dos terminales:

    npm run dev:api   # función AI local en :3001 (lee OPENAI_API_KEY de .env.local)
    npm run dev       # front en Vite; /api se proxea a :3001

## Deploy en Vercel

1. Subir el repo a GitHub e importarlo en vercel.com (framework: Vite, sin config extra —
   `api/analyze.js` se convierte en función serverless automáticamente).
2. En Settings → Environment Variables agregar `OPENAI_API_KEY` (Production + Preview).
3. Deploy. El análisis de planos cuesta centavos de USD por consulta (GPT-4o).

`.env.local` (local, no se commitea):

    OPENAI_API_KEY=sk-...
```

- [ ] **Step 3: Commit final**

```bash
git add README.md
git commit -m "docs: instrucciones de desarrollo y deploy"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura de spec:** upload multi-formato (T4), croquis a mano (mismo pipeline de imagen, T4), función serverless con clave segura (T3), contrato JSON estricto (T2), matcheo top-5 local (T1), propuesta editable con confirmación humana (T4), MO aplicable con un click (T4 — se aplica desde el propio panel, misma intención que la spec), errores/límites (T2/T3/T4), verificación E2E (T5). Fuera de alcance respetado.
- **Placeholders:** ninguno; todo step con código completo.
- **Consistencia de tipos:** `{ files, oficios }` → `{ ok, analysis }` usado igual en T2/T3/T4; `onAddMaterials([{ item, quantity }])` y `onAddLabor({ rate, horas, justificacion })` definidos en T4-Step1 y consumidos en T4-Step2; `matchCatalog` firma igual en T1 y T4.
