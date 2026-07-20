import test from "node:test";
import assert from "node:assert/strict";
import { hasQuoteContent, makeQuoteId, upsertQuoteRecord } from "./quoteDrafts.js";

test("hasQuoteContent: false para un borrador vacío", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: {}, service: "" }), false);
});

test("hasQuoteContent: true si hay al menos un ítem cargado", () => {
  assert.equal(hasQuoteContent({ lineItems: [{ detail: "Caño" }], clientDetails: {}, service: "" }), true);
});

test("hasQuoteContent: true si hay nombre de cliente", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { name: "Juan" }, service: "" }), true);
});

test("hasQuoteContent: true si hay teléfono de cliente", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { phone: "1122334455" }, service: "" }), true);
});

test("hasQuoteContent: true si hay título de trabajo", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: {}, service: "Reja" }), true);
});

test("hasQuoteContent: espacios en blanco no cuentan como contenido", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { name: "   " }, service: "  " }), false);
});

test("makeQuoteId: genera strings no vacíos y distintos entre llamadas", () => {
  const a = makeQuoteId();
  const b = makeQuoteId();
  assert.equal(typeof a, "string");
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test("upsertQuoteRecord: no materializa un borrador vacío sin id", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "new-id", nextNumber: () => "P-0001" };
  const { quotes, record } = upsertQuoteRecord([], null, { lineItems: [], clientDetails: {}, service: "" }, deps);
  assert.equal(record, null);
  assert.deepEqual(quotes, []);
});

test("upsertQuoteRecord: crea un registro nuevo cuando hay contenido y no hay id", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "new-id", nextNumber: () => "P-0001" };
  const patch = { lineItems: [{ detail: "Caño" }], clientDetails: { name: "Juan" }, service: "Reja", total: 1000 };
  const { quotes, record } = upsertQuoteRecord([], null, patch, deps);
  assert.equal(record.id, "new-id");
  assert.equal(record.number, "P-0001");
  assert.equal(record.createdAt, "2026-07-19T00:00:00.000Z");
  assert.equal(record.updatedAt, "2026-07-19T00:00:00.000Z");
  assert.equal(record.total, 1000);
  assert.deepEqual(quotes, [record]);
});

test("upsertQuoteRecord: actualiza un registro existente por id sin reasignar number ni createdAt", () => {
  const existing = { id: "q1", number: "P-0002", client: "Cliente viejo", total: 500, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" };
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "should-not-be-used", nextNumber: () => "should-not-be-used" };
  const { quotes, record } = upsertQuoteRecord([existing], "q1", { client: "Cliente nuevo", total: 900 }, deps);
  assert.equal(record.id, "q1");
  assert.equal(record.number, "P-0002");
  assert.equal(record.client, "Cliente nuevo");
  assert.equal(record.total, 900);
  assert.equal(record.createdAt, "2026-07-01T00:00:00.000Z");
  assert.equal(record.updatedAt, "2026-07-19T00:00:00.000Z");
  assert.deepEqual(quotes, [record]);
});

test("upsertQuoteRecord: no toca otros presupuestos de la lista", () => {
  const other = { id: "q0", number: "P-0001", total: 1 };
  const existing = { id: "q1", number: "P-0002", total: 500, createdAt: "x", updatedAt: "x" };
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "x", nextNumber: () => "x" };
  const { quotes } = upsertQuoteRecord([other, existing], "q1", { total: 900 }, deps);
  assert.equal(quotes.length, 2);
  assert.deepEqual(quotes[0], other);
});

test("upsertQuoteRecord: id que no existe en la lista se agrega igual (defensivo)", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "x", nextNumber: () => "P-0001" };
  const { quotes, record } = upsertQuoteRecord([], "ghost-id", { total: 1 }, deps);
  assert.equal(record.id, "ghost-id");
  assert.equal(record.total, 1);
  assert.deepEqual(quotes, [record]);
});

test("upsertQuoteRecord: ignora number y createdAt del patch al actualizar registro existente", () => {
  const existing = { id: "q1", number: "P-0002", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z", total: 500 };
  const deps = { now: "2026-07-19T12:30:45.000Z", makeId: () => "x", nextNumber: () => "P-9999" };
  const patchWithDifferentNumberAndCreatedAt = { number: "P-9999", createdAt: "2026-07-15T00:00:00.000Z", total: 1000 };
  const { quotes, record } = upsertQuoteRecord([existing], "q1", patchWithDifferentNumberAndCreatedAt, deps);
  assert.equal(record.id, "q1");
  assert.equal(record.number, "P-0002", "number debe ser preservado del registro original, no del patch");
  assert.equal(record.createdAt, "2026-07-01T00:00:00.000Z", "createdAt debe ser preservado del registro original, no del patch");
  assert.equal(record.updatedAt, "2026-07-19T12:30:45.000Z", "updatedAt debe ser actualizado al nuevo now");
  assert.equal(record.total, 1000, "otros campos del patch deben aplicarse normalmente");
  assert.deepEqual(quotes, [record]);
});
