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
