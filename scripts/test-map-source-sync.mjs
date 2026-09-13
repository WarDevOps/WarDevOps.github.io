import assert from "node:assert/strict";
import { test } from "node:test";
import { appendObjectEntries } from "./generate-map-catalog.mjs";

test("new map metadata is appended without changing existing settings", () => {
  const source = '{\n  "version": 1,\n  "maps": {\n    "Alpha": { "ko": "알파", "br": { "min": 1.0 } }\n  }\n}\n';
  const result = appendObjectEntries(source, "maps", [["New Map", {}]]);
  assert.deepEqual(JSON.parse(result).maps, {
    Alpha: { ko: "알파", br: { min: 1.0 } },
    "New Map": {}
  });
  assert.match(result, /"Alpha": \{ "ko": "알파", "br": \{ "min": 1\.0 \} \},/);
});

test("new dates leave unrelated map layout sections intact", () => {
  const source = '{\n  "mapUpdated": {\n    "Alpha": "2026-09-01"\n  },\n  "mapUpdatedAt": {\n    "Alpha": "2026-09-01T00:00:00Z"\n  },\n  "markers": { "Alpha": [] }\n}\n';
  const result = appendObjectEntries(
    appendObjectEntries(source, "mapUpdated", [["New Map", "2026-09-14"]]),
    "mapUpdatedAt", [["New Map", "2026-09-13T15:00:00Z"]]
  );
  assert.equal(JSON.parse(result).mapUpdated["New Map"], "2026-09-14");
  assert.equal(JSON.parse(result).mapUpdatedAt["New Map"], "2026-09-13T15:00:00Z");
  assert.deepEqual(JSON.parse(result).markers, { Alpha: [] });
});
