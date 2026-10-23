import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCatalog, inRange, rangeColor, visibleUnits, searchUnits, CATEGORIES } from "../assets/js/brc-model.js";

const catalog = JSON.parse(readFileSync(new URL("../assets/data/tier-units.json", import.meta.url)));
const units = readCatalog(catalog);
test("ARB contains only aircraft using Air RB without changing the shared catalog", () => {
  const before = JSON.stringify(catalog);
  const airUnits = readCatalog(catalog, "arb");
  assert.equal(airUnits.length, catalog.categories.air.units.length);
  assert.ok(airUnits.every(unit => unit.category === "air" && unit.br === unit.catalogBr));
  assert.ok(airUnits.every((unit, index) => !index || unit.br >= airUnits[index - 1].br));
  const airF15 = airUnits.find(unit => unit.wikiId === "f_15e");
  const groundF15 = units.find(unit => unit.wikiId === "f_15e");
  assert.equal(airF15.br, 14); assert.equal(groundF15.br, 12.7);
  assert.equal(searchUnits(airUnits, "Leopard 2K").length, 0);
  assert.equal(searchUnits(airUnits, "AH 64").length, 0);
  assert.equal(JSON.stringify(catalog), before);
  assert.throws(() => readCatalog(catalog, "ab"), /Unknown battle mode/);
});
test("every shared vehicle retains its identity and resolves its battle-specific BR", () => {
  assert.equal(units.length, CATEGORIES.reduce((sum, key) => sum + catalog.categories[key].units.length, 0));
  for (const unit of units) {
    const original = catalog.categories[unit.category].units.find(item => item.wikiId === unit.wikiId);
    assert.equal(unit.br, unit.category === "air" ? original.brGround : original.br);
    assert.equal(unit.catalogBr, original.br); assert.equal(unit.countryCode, original.countryCode);
  }
  assert.ok(units.every((unit, index) => !index || unit.br >= units[index - 1].br));
});
test("aircraft Ground RB stays separate from Air RB and never falls back", () => {
  const sample = { battleRatingMode: "RB", categories: {
    tank: { units: [] }, heli: { units: [] },
    air: { units: [
      { wikiId: "known", name: "Known", countryCode: "US", br: 14, brGround: 12.7 },
    ] },
  } };
  const records = readCatalog(sample);
  const known = records.find(unit => unit.wikiId === "known");
  assert.equal(known.br, 12.7); assert.equal(known.catalogBr, 14);
  assert.equal(sample.categories.air.units[0].br, 14);
  sample.categories.air.units[0].brGround = "14.0";
  assert.throws(() => readCatalog(sample), /invalid ground BR/);
  delete sample.categories.air.units[0].brGround;
  assert.throws(() => readCatalog(sample), /Missing or invalid ground BR/);
});
test("inclusive fractional boundaries and interpolation", () => {
  for (const center of [1, 8.3, 9.7, 10, 14.7]) {
    assert.ok(inRange(center - 1, center)); assert.ok(inRange(center + 1, center));
    assert.ok(!inRange(center + 1.3, center)); assert.ok(!inRange(center - 1.3, center));
  }
  assert.equal(rangeColor(9, 10), "rgb(79, 181, 116)");
  assert.equal(rangeColor(10, 10), "rgb(239, 166, 67)");
  assert.equal(rangeColor(11, 10), "rgb(226, 95, 94)");
  assert.equal(rangeColor(11.3, 10), null);
  assert.equal(rangeColor(9.3, 10), "rgb(127, 177, 101)");
  assert.equal(rangeColor(9.7, 10), "rgb(191, 171, 82)");
  assert.equal(rangeColor(10.3, 10), "rgb(235, 145, 75)");
  assert.equal(rangeColor(10.7, 10), "rgb(230, 116, 86)");
});
test("range and category filtering preserve the comparison reference", () => {
  const selection = units.find(unit => unit.name === "Leopard 2K"); assert.ok(selection);
  const subset = visibleUnits(units, new Set(["air"]), selection, true);
  assert.ok(subset.length); assert.ok(subset.every(unit => unit.category === "air" && inRange(unit.br, selection.br)));
  assert.deepEqual(visibleUnits(units, new Set(), selection, true), []);
  assert.equal(visibleUnits(units, new Set(CATEGORIES), null, true).length, units.length);
});
test("search finds names with case, spaces and punctuation variations", () => {
  assert.ok(searchUnits(units, "leopard2k").some(unit => unit.name === "Leopard 2K"));
  assert.ok(searchUnits(units, "AH 64").length);
  assert.deepEqual(searchUnits(units, "   "), []);
  assert.throws(() => readCatalog({ ...catalog, battleRatingMode: "AB" }));
});
