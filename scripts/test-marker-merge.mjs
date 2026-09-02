import assert from "node:assert/strict";
import {
  acceptUpstreamMap,
  mapContentFingerprint,
  markLayoutAsLocalEdits,
  markMapEdited,
  mergeMapLayouts,
  sourceRevision
} from "../assets/js/marker-merge.js";

const mapNames = ["Alpha", "Beta"];

function layout({ alpha = 1, beta = 1, alphaDate = "2026-09-01", betaDate = "2026-09-01", updatedAt = "2026-09-01T12:00:00Z" } = {}) {
  return {
    version: 2,
    mapUpdated: { Alpha: alphaDate, Beta: betaDate },
    mapUpdatedAt: {
      Alpha: `${alphaDate}T12:00:00Z`,
      Beta: `${betaDate}T12:00:00Z`
    },
    tacticalSummaries: {},
    markers: {
      "Alpha::domination-1|Red": [{ id: `alpha-${alpha}`, type: "mainBattleTank", x: alpha, y: alpha }],
      "Beta::domination-1|Red": [{ id: `beta-${beta}`, type: "mainBattleTank", x: beta, y: beta }]
    },
    annotations: {
      "Alpha::domination-1|Red": [],
      "Beta::domination-1|Red": []
    },
    updatedAt
  };
}

function clone(value) {
  return structuredClone(value);
}

const originalServer = layout();
const firstVisit = mergeMapLayouts({}, originalServer, mapNames, {
  hadStoredLayout: false,
  sourceRevision: sourceRevision(originalServer)
});
assert.deepEqual(firstVisit.dirtyMaps, []);
assert.deepEqual(firstVisit.conflicts, []);
assert.equal(mapContentFingerprint(firstVisit.layout, "Alpha"), mapContentFingerprint(originalServer, "Alpha"));

const localOnly = clone(firstVisit.layout);
localOnly.markers["Alpha::domination-1|Red"][0].x = 25;
markMapEdited(localOnly, originalServer, mapNames, "Alpha", sourceRevision(originalServer));
assert.deepEqual(localOnly.sync.dirtyMaps, ["Alpha"]);

const betaServerUpdate = layout({ beta: 2, betaDate: "2026-09-02", updatedAt: "2026-09-02T12:00:00Z" });
const independentChanges = mergeMapLayouts(localOnly, betaServerUpdate, mapNames, {
  sourceRevision: sourceRevision(betaServerUpdate)
});
assert.equal(independentChanges.layout.markers["Alpha::domination-1|Red"][0].x, 25);
assert.equal(independentChanges.layout.markers["Beta::domination-1|Red"][0].id, "beta-2");
assert.deepEqual(independentChanges.dirtyMaps, ["Alpha"]);
assert.deepEqual(independentChanges.conflicts, []);

const alphaServerUpdate = layout({ alpha: 3, alphaDate: "2026-09-03", updatedAt: "2026-09-03T12:00:00Z" });
const conflict = mergeMapLayouts(localOnly, alphaServerUpdate, mapNames, {
  sourceRevision: sourceRevision(alphaServerUpdate)
});
assert.equal(conflict.layout.markers["Alpha::domination-1|Red"][0].x, 25);
assert.deepEqual(conflict.conflicts, ["Alpha"]);

const conflictReload = mergeMapLayouts(conflict.layout, alphaServerUpdate, mapNames, {
  sourceRevision: sourceRevision(alphaServerUpdate)
});
assert.deepEqual(conflictReload.conflicts, ["Alpha"]);

acceptUpstreamMap(conflict.layout, alphaServerUpdate, mapNames, "Alpha", sourceRevision(alphaServerUpdate));
assert.deepEqual(conflict.layout.sync.conflicts, []);
assert.deepEqual(conflict.layout.sync.dirtyMaps, []);
assert.equal(conflict.layout.markers["Alpha::domination-1|Red"][0].id, "alpha-3");

const deployedLocal = clone(localOnly);
const deployedServer = clone(originalServer);
deployedServer.markers["Alpha::domination-1|Red"][0].x = 25;
deployedServer.updatedAt = "2026-09-04T12:00:00Z";
const matchingDeployment = mergeMapLayouts(deployedLocal, deployedServer, mapNames, {
  sourceRevision: sourceRevision(deployedServer)
});
assert.deepEqual(matchingDeployment.dirtyMaps, []);
assert.deepEqual(matchingDeployment.conflicts, []);

const legacyOlder = layout({ alpha: 1, alphaDate: "2026-09-01" });
delete legacyOlder.sync;
const newerServer = layout({ alpha: 2, alphaDate: "2026-09-02", updatedAt: "2026-09-02T12:00:00Z" });
const migratedServerWins = mergeMapLayouts(legacyOlder, newerServer, mapNames, {
  hadStoredLayout: true,
  sourceRevision: sourceRevision(newerServer)
});
assert.equal(migratedServerWins.layout.markers["Alpha::domination-1|Red"][0].id, "alpha-2");
assert.equal(migratedServerWins.migrated, true);

const legacyNewer = layout({ alpha: 4, alphaDate: "2026-09-04", updatedAt: "2026-09-04T12:00:00Z" });
delete legacyNewer.sync;
const migratedLocalWins = mergeMapLayouts(legacyNewer, newerServer, mapNames, {
  hadStoredLayout: true,
  sourceRevision: sourceRevision(newerServer)
});
assert.equal(migratedLocalWins.layout.markers["Alpha::domination-1|Red"][0].id, "alpha-4");
assert.deepEqual(migratedLocalWins.dirtyMaps, ["Alpha"]);

const ambiguousLegacy = layout({ alpha: 5, alphaDate: "2026-09-02" });
delete ambiguousLegacy.sync;
const migratedConflict = mergeMapLayouts(ambiguousLegacy, newerServer, mapNames, {
  hadStoredLayout: true,
  sourceRevision: sourceRevision(newerServer)
});
assert.deepEqual(migratedConflict.conflicts, ["Alpha"]);

const imported = clone(newerServer);
imported.markers["Beta::domination-1|Red"][0].y = 44;
markLayoutAsLocalEdits(imported, newerServer, mapNames, sourceRevision(newerServer));
assert.deepEqual(imported.sync.dirtyMaps, ["Beta"]);
assert.deepEqual(imported.sync.conflicts, []);

const noRevision = clone(newerServer);
delete noRevision.updatedAt;
assert.match(sourceRevision(noRevision), /^fingerprint:/);

console.log("marker merge tests passed");
