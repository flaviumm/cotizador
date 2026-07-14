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
