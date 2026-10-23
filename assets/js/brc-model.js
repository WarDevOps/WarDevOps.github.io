export const CATEGORIES = ["tank", "air", "heli"];
export const COUNTRIES = ["US", "DE", "RU", "UK", "JP", "CN", "IT", "FR", "SE", "IL"];

export const toTenths = value => Math.round(Number(value) * 10);
export const inRange = (br, reference) => Math.abs(toTenths(br) - toTenths(reference)) <= 10;

// Work in integer tenths so the inclusive ±1.0 endpoints are exact.
export function rangeColor(br, reference) {
  const delta = toTenths(br) - toTenths(reference);
  if (Math.abs(delta) > 10) return null;
  const green = [79, 181, 116], orange = [239, 166, 67], red = [226, 95, 94];
  const from = delta < 0 ? green : orange;
  const to = delta < 0 ? orange : red;
  const fraction = delta < 0 ? (delta + 10) / 10 : delta / 10;
  return `rgb(${from.map((value, i) => Math.round(value + (to[i] - value) * fraction)).join(", ")})`;
}

export function readCatalog(catalog, mode = "grb") {
  if (!["grb", "arb"].includes(mode)) throw new Error(`Unknown battle mode: ${mode}`);
  if (catalog.battleRatingMode !== "RB") throw new Error("Expected the shared RB catalog");
  const ids = new Set();
  return (mode === "arb" ? ["air"] : CATEGORIES).flatMap(category => {
    const records = catalog.categories?.[category]?.units;
    if (!Array.isArray(records)) throw new Error(`Missing category: ${category}`);
    return records.map(record => {
      const id = `${category}:${record.wikiId}`;
      if (!record.name || !record.wikiId || ids.has(id) || !COUNTRIES.includes(record.countryCode)
          || !Number.isFinite(record.br) || record.br < 1) throw new Error(`Invalid vehicle: ${id}`);
      ids.add(id);
      if (mode === "grb" && category === "air" && (!Number.isFinite(record.brGround) || record.brGround < 1)) {
        throw new Error(`Missing or invalid ground BR: ${id}`);
      }
      return { ...record, id, category, catalogBr: record.br,
        br: mode === "grb" && category === "air" ? record.brGround : record.br };
    });
  }).sort((a, b) => a.br - b.br || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
    || a.name.localeCompare(b.name, "en", { numeric: true }) || a.id.localeCompare(b.id));
}

export function visibleUnits(units, categories, selected, rangeOnly) {
  return units.filter(unit => categories.has(unit.category) && (!rangeOnly || !selected || inRange(unit.br, selected.br)));
}

export function searchUnits(units, query) {
  const normalize = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const needle = normalize(query);
  if (!needle) return [];
  return units.filter(unit => normalize(unit.name).includes(needle));
}
