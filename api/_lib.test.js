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

test("payload: la descripción de la tarea entra al prompt, recortada a 2000 chars", () => {
  const payload = buildOpenAIPayload([png], [], "Portón corredizo de 4m, sin pintura. " + "x".repeat(3000));
  const text = payload.input[0].content[0].text;
  assert.match(text, /Portón corredizo de 4m, sin pintura\./);
  assert.ok(!text.includes("x".repeat(2001)));
  const sinDescripcion = buildOpenAIPayload([png], []);
  assert.ok(!sinDescripcion.input[0].content[0].text.includes("Indicación del usuario"));
});

test("payload exige salida estructurada estricta", () => {
  const payload = buildOpenAIPayload([png], []);
  assert.equal(payload.text.format.type, "json_schema");
  assert.equal(payload.text.format.strict, true);
  assert.deepEqual(payload.text.format.schema, ANALYSIS_SCHEMA);
});
