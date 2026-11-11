// The display sequence is .0 / .3 / .7, not ordinary decimal addition.
export const brStep = br => Math.round(br * 3);
export const stepBr = step => Math.round(step / 3 * 10) / 10;

export function hasVariableBr(unit, mode) {
  if (unit.variableBrModes?.includes(mode)) return true;
  const rule = unit.variableBr?.[mode];
  return Boolean(rule && rule.max > rule.base && Object.values(rule.penalties).some(penalty => penalty > 0));
}

export function calculateWeaponBr(unit, mode, weaponIds = []) {
  const rule = unit.variableBr?.[mode];
  if (!rule) return mode === "grb" ? unit.groundBr ?? unit.br : unit.airBr ?? unit.br;
  const penalty = [...weaponIds].reduce((highest, id) => Math.max(highest, rule.penalties[id] || 0), 0);
  return stepBr(Math.min(brStep(rule.max), brStep(rule.base) + penalty));
}

// The highest single penalty wins, so a reachable BR needs at most one weapon.
// Return null for gaps between reachable values rather than inventing loadouts.
export function weaponSelectionForBr(unit, mode, target) {
  if (calculateWeaponBr(unit, mode) === target) return [];
  const rule = unit.variableBr?.[mode];
  for (const id of Object.keys(rule?.penalties || {}).sort()) {
    if (calculateWeaponBr(unit, mode, [id]) === target) return [id];
  }
  return null;
}

export function validateVariableRatings(data, catalog) {
  if (data?.schemaVersion !== 1 || !data.units || !data.additionalWeapons) throw new Error("Invalid variable BR data");
  const ids = new Set(Object.entries(catalog.categories).flatMap(([category, { units }]) => units.map(u => `${category}:${u.wikiId}`)));
  for (const [id, modes] of Object.entries(data.applicability?.units || {})) {
    if (!ids.has(id) || !Array.isArray(modes) || !modes.length || modes.some(mode => !["grb", "arb"].includes(mode))) {
      throw new Error(`Invalid variable BR applicability: ${id}`);
    }
  }
  for (const [id, modes] of Object.entries(data.units)) {
    if (!ids.has(id) || /nuke|killstreak/i.test(id)) throw new Error(`Unknown/excluded variable BR unit: ${id}`);
    for (const [mode, rule] of Object.entries(modes)) {
      if (!["grb", "arb"].includes(mode) || !Number.isFinite(rule.base) || !Number.isFinite(rule.max)
        || rule.base < 1 || rule.max < rule.base || stepBr(brStep(rule.base)) !== rule.base
        || stepBr(brStep(rule.max)) !== rule.max || !rule.penalties
        || Object.values(rule.penalties).some(steps => !Number.isInteger(steps) || steps < 0)) {
        throw new Error(`Invalid variable BR rule: ${id}/${mode}`);
      }
    }
  }
  return data;
}
