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
