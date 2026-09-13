const isRecord = value => value && typeof value === "object" && !Array.isArray(value);

function normalizeCopy(value) {
  if (!isRecord(value)) throw new Error("Invalid tactical summary.");
  const result = {};
  for (const language of ["en", "ko"]) {
    if (value[language] === undefined) continue;
    if (!Array.isArray(value[language]) || value[language].some(text => typeof text !== "string")) {
      throw new Error("Invalid tactical summary text.");
    }
    const sentences = value[language].map(text => text.trim()).filter(Boolean);
    if (sentences.length) result[language] = sentences;
  }
  return result;
}

// Keep legacy en/ko copy as a common fallback, alongside independent variations.
export function normalizeTacticalSummary(value, validVariationIds) {
  const result = normalizeCopy(value);
  if (value.variations !== undefined) {
    if (!isRecord(value.variations)) throw new Error("Invalid summary variations.");
    result.variations = {};
    for (const [id, copy] of Object.entries(value.variations)) {
      if (!/^(domination|conquest|battle)-[1-9]\d*$/.test(id)
        || (validVariationIds && !validVariationIds.includes(id))) {
        throw new Error(`Unknown tactical summary variation: ${id}`);
      }
      result.variations[id] = normalizeCopy(copy);
    }
  }
  return result;
}

export function resolveTacticalSummary(entry, variationId) {
  // An explicitly empty variation hides its summary, rather than reviving legacy copy.
  if (Object.hasOwn(entry?.variations || {}, variationId)) return entry.variations[variationId];
  return entry;
}

export function withVariationSummary(entry, variationId, copy) {
  return normalizeTacticalSummary({
    ...entry,
    variations: { ...entry?.variations, [variationId]: copy }
  });
}
