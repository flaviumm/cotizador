# Capa AI: análisis de planos para el Cotizador

**Fecha:** 2026-07-13 · **Estado:** aprobado por Flavio

## Objetivo

Subir planos (PDF/JPG/PNG) o fotos de croquis a mano alzada, que la AI los interprete
y proponga materiales del catálogo + horas de mano de obra, como **propuesta editable**
que el usuario confirma antes de que entre al presupuesto.

## Decisiones tomadas

- **Usuarios:** hoy local, se va a publicar → la clave de API vive en el servidor.
- **Proveedor AI:** OpenAI (el usuario ya tiene clave). Modelo con visión y salida
  estructurada (GPT-4o). PDFs se envían nativos; imágenes como imagen.
- **Alcance:** propuesta editable. La AI nunca escribe directo en el presupuesto.
- **Rubros:** estructuras metálicas, piping, instalaciones eléctricas y obra civil.
- **Hosting:** Vercel (front Vite + una función serverless). Dev local: `vercel dev`.

## Arquitectura

```
api/analyze.js                    ← función serverless Vercel (único backend)
src/components/AnalisisPlanoAI.jsx ← panel upload + revisión de propuesta
src/lib/catalogMatch.js            ← matcheo local contra el catálogo (~6.700 ítems)
```

- `api/analyze.js`: recibe archivos en base64 (máx 4 archivos, 10MB c/u), valida tipo
  y tamaño, llama a OpenAI con `OPENAI_API_KEY` (env del servidor) y salida
  estructurada por JSON schema. Devuelve el JSON al front.
- La clave nunca llega al navegador. En local vive en `.env.local` (gitignoreado);
  en producción, como variable de entorno del proyecto Vercel.

## Flujo de uso

1. En el paso **Materiales** del wizard: botón "✨ Analizar plano con AI".
2. Panel con drag & drop / selector de archivos (PDF, JPG, PNG; máx 4 × 10MB), preview.
3. **Analizar** → spinner → resultado:
   - Resumen de interpretación.
   - Materiales propuestos (descripción, especificación, cantidad, unidad, rubro).
   - Mano de obra estimada (horas por oficio, justificación) usando los mismos
     nombres de oficio de la sección Mano de Obra.
   - Supuestos y advertencias, siempre visibles.
4. Por cada material propuesto, matcheo local muestra top-5 candidatos del catálogo
   con precio. El usuario elige candidato, ajusta cantidad o descarta. Buscador manual
   como respaldo.
5. **"Agregar al presupuesto"** → los renglones confirmados entran al detalle de
   materiales como renglones normales. Las horas de MO quedan como sugerencia con
   botón de un click para aplicar en el paso Jornadas.

## Contrato JSON de la AI

```json
{
  "resumen": "string",
  "materiales": [
    { "descripcion": "string", "cantidad": 0, "unidad": "string", "rubro": "estructura|piping|electrica|civil" }
  ],
  "manoDeObra": [
    { "oficio": "string", "horas": 0, "justificacion": "string" }
  ],
  "supuestos": ["string"],
  "advertencias": ["string"]
}
```

Forzado con salida estructurada de OpenAI (json_schema, strict). El prompt incluye
heurísticas por rubro (metros lineales de perfil, kg de chapa, conteo de accesorios
por diámetro, metros de cable/bandeja, volúmenes de hormigón) y la lista de oficios
existentes.

## Matcheo contra el catálogo

Local, sin segunda llamada a la AI: puntaje por coincidencia de tokens de la
descripción AI contra name/spec/categoría/SKU del catálogo, con bonus por medidas
numéricas ("40x40", "2mm"). Top-5 por renglón; se preselecciona el mejor si el
puntaje es alto. Si el matcheo queda corto en la práctica, se mejora después.

## Errores y límites

- Validación de tipo/tamaño antes de enviar (front) y de nuevo en la función (server).
- Timeout o error de OpenAI → mensaje claro + reintentar, sin perder lo cargado.
- Límite de archivos/páginas para controlar costos (centavos de USD por análisis).

## Verificación

Prueba de punta a punta con `vercel dev`: un plano PDF real y una foto de croquis
a mano alzada → propuesta → confirmación → renglones en el presupuesto.

## Fuera de alcance (por ahora)

- Historial/almacenamiento de planos analizados.
- Presupuesto automático sin revisión humana.
- Matcheo asistido por AI contra el catálogo (segunda llamada).
- Autenticación de usuarios / límites por usuario.
