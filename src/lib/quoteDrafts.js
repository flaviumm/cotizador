// Lógica pura de materialización/actualización de borradores de presupuesto.
// Sin Date.now()/Math.random() directos: lo no determinístico se inyecta vía `deps`
// para que sea 100% testeable con node:test.

export function hasQuoteContent(patch) {
  return Boolean(
    (patch.lineItems && patch.lineItems.length) ||
    patch.clientDetails?.name?.trim() ||
    patch.clientDetails?.phone?.trim() ||
    patch.service?.trim()
  );
}

export function makeQuoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// patch: shape parcial de un quote (mismo shape que arma buildQuote() en Cotizador.jsx).
// deps.now: ISO string ya calculado por el caller (no Date.now() acá adentro).
export function upsertQuoteRecord(quotes, id, patch, { now, makeId, nextNumber }) {
  if (!id) {
    if (!hasQuoteContent(patch)) return { quotes, record: null };
    const record = { ...patch, id: makeId(), number: nextNumber(quotes), createdAt: now, updatedAt: now };
    return { quotes: [...quotes, record], record };
  }
  const existing = quotes.find((item) => item.id === id) || {};
  const record = { ...existing, ...patch, id, updatedAt: now };
  const found = quotes.some((item) => item.id === id);
  const nextQuotes = found ? quotes.map((item) => (item.id === id ? record : item)) : [...quotes, record];
  return { quotes: nextQuotes, record };
}
