import test from "node:test";
import assert from "node:assert/strict";
import { money } from "./format.js";

test("formatea pesos argentinos sin decimales", () => {
  assert.equal(money(1500), "$ 1.500");
});

test("miles con separador de punto", () => {
  assert.equal(money(125000), "$ 125.000");
});

test("valores no numéricos o vacíos devuelven cero formateado", () => {
  assert.equal(money(undefined), "$ 0");
  assert.equal(money(null), "$ 0");
  assert.equal(money(""), "$ 0");
});
