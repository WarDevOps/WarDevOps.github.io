import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTacticalSummary, resolveTacticalSummary, withVariationSummary } from "../assets/js/tactical-summary.js";
import { mapContentFingerprint, replaceMapLayout } from "../assets/js/marker-merge.js";

test("editing one variation preserves legacy copy and other variations across JSON round trips", () => {
  const legacy = { en: ["Common"], ko: ["공통"] };
  let entry = withVariationSummary(legacy, "domination-1", { en: ["First"], ko: ["첫째"] });
  entry = withVariationSummary(entry, "domination-2", { en: ["Second"] });
  entry = normalizeTacticalSummary(JSON.parse(JSON.stringify(entry)), ["domination-1", "domination-2", "conquest-1"]);
  assert.deepEqual(resolveTacticalSummary(entry, "domination-1"), { en: ["First"], ko: ["첫째"] });
  assert.deepEqual(resolveTacticalSummary(entry, "domination-2"), { en: ["Second"] });
  assert.equal(resolveTacticalSummary(entry, "conquest-1").ko[0], "공통");
  assert.deepEqual(legacy, { en: ["Common"], ko: ["공통"] });
});

test("clearing a variation remains empty after import without restoring common text", () => {
  const entry = normalizeTacticalSummary(withVariationSummary({ en: ["Common"] }, "domination-1", {}));
  assert.deepEqual(resolveTacticalSummary(entry, "domination-1"), {});
  assert.equal(resolveTacticalSummary(entry, "domination-2").en[0], "Common");
});

test("invalid variation IDs and malformed translated copy are rejected", () => {
  for (const variations of [{ unknown: {} }, { "battle-2": {} }, { "domination-1": { ko: "bad" } }, []]) {
    assert.throws(() => normalizeTacticalSummary({ variations }, ["domination-1"]));
  }
});

test("map synchronization fingerprints and copies all variation summaries", () => {
  const original = { tacticalSummaries: { Alpha: { en: ["Common"] } } };
  const updated = { tacticalSummaries: { Alpha: withVariationSummary(original.tacticalSummaries.Alpha, "conquest-1", { ko: ["점령"] }) } };
  assert.notEqual(mapContentFingerprint(original, "Alpha"), mapContentFingerprint(updated, "Alpha"));
  const target = replaceMapLayout({}, updated, "Alpha");
  assert.deepEqual(target.tacticalSummaries, updated.tacticalSummaries);
});
