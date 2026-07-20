import test from "node:test";
import assert from "node:assert/strict";
import { money } from "./format.js";

test("formatea pesos argentinos sin decimales", () => {
  assert.equal(money(1500), "$\u00a01.500");
});

test("miles con separador de punto", () => {
  assert.equal(money(125000), "$\u00a0125.000");
});

test("valores no numéricos o vacíos devuelven cero formateado", () => {
  assert.equal(money(undefined), "$\u00a00");
  assert.equal(money(null), "$\u00a00");
  assert.equal(money(""), "$\u00a00");
});
