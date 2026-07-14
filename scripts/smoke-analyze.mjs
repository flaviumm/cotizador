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
