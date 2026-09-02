export const MAP_SYNC_VERSION = 1;

function cloneValue(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizedLayout(layout) {
  const normalized = cloneValue(layout || {});
  if (!normalized.mapUpdated || typeof normalized.mapUpdated !== "object" || Array.isArray(normalized.mapUpdated)) normalized.mapUpdated = {};
  if (!normalized.mapUpdatedAt || typeof normalized.mapUpdatedAt !== "object" || Array.isArray(normalized.mapUpdatedAt)) normalized.mapUpdatedAt = {};
  if (!normalized.tacticalSummaries || typeof normalized.tacticalSummaries !== "object" || Array.isArray(normalized.tacticalSummaries)) normalized.tacticalSummaries = {};
  if (!normalized.markers || typeof normalized.markers !== "object" || Array.isArray(normalized.markers)) normalized.markers = {};
  if (!normalized.annotations || typeof normalized.annotations !== "object" || Array.isArray(normalized.annotations)) normalized.annotations = {};
  return normalized;
}

export function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const entries = Object.keys(value)
    .filter(key => value[key] !== undefined)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
  return `{${entries.join(",")}}`;
}

export function fingerprint(value) {
  const serialized = stableSerialize(value);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${serialized.length}:${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function mapEntries(section, mapName) {
  const prefix = `${mapName}::`;
  return Object.fromEntries(Object.keys(section || {})
    .filter(key => key.startsWith(prefix))
    .sort()
    .map(key => [key, section[key]]));
}

export function mapContentFingerprint(layout, mapName) {
  const hasTacticalSummary = Object.hasOwn(layout?.tacticalSummaries || {}, mapName);
  return fingerprint({
    mapUpdated: layout?.mapUpdated?.[mapName] ?? null,
    mapUpdatedAt: layout?.mapUpdatedAt?.[mapName] ?? null,
    hasTacticalSummary,
    tacticalSummary: hasTacticalSummary ? layout.tacticalSummaries[mapName] : null,
    markers: mapEntries(layout?.markers, mapName),
    annotations: mapEntries(layout?.annotations, mapName)
  });
}

export function sourceRevision(layout) {
  if (typeof layout?.updatedAt === "string" && Number.isFinite(Date.parse(layout.updatedAt))) {
    return `updatedAt:${layout.updatedAt}`;
  }
  return `fingerprint:${fingerprint({
    version: layout?.version,
    mapUpdated: layout?.mapUpdated || {},
    mapUpdatedAt: layout?.mapUpdatedAt || {},
    tacticalSummaries: layout?.tacticalSummaries || {},
    markers: layout?.markers || {},
    annotations: layout?.annotations || {}
  })}`;
}

export function isMapSyncState(sync) {
  return Boolean(sync
    && sync.version === MAP_SYNC_VERSION
    && typeof sync.sourceRevision === "string"
    && sync.baseFingerprints
    && typeof sync.baseFingerprints === "object"
    && !Array.isArray(sync.baseFingerprints)
    && Array.isArray(sync.dirtyMaps)
    && Array.isArray(sync.conflicts));
}

function copyMapProperty(target, source, section, mapName) {
  if (Object.hasOwn(source[section] || {}, mapName)) target[section][mapName] = cloneValue(source[section][mapName]);
  else delete target[section][mapName];
}

export function replaceMapLayout(target, source, mapName) {
  const prefix = `${mapName}::`;
  for (const section of ["markers", "annotations"]) {
    if (!target[section] || typeof target[section] !== "object" || Array.isArray(target[section])) target[section] = {};
    Object.keys(target[section]).filter(key => key.startsWith(prefix)).forEach(key => { delete target[section][key]; });
    Object.keys(source?.[section] || {})
      .filter(key => key.startsWith(prefix))
      .forEach(key => { target[section][key] = cloneValue(source[section][key]); });
  }
  for (const section of ["mapUpdated", "mapUpdatedAt", "tacticalSummaries"]) {
    if (!target[section] || typeof target[section] !== "object" || Array.isArray(target[section])) target[section] = {};
    copyMapProperty(target, source, section, mapName);
  }
  return target;
}

function mapFreshness(layout, mapName) {
  const timestamp = layout?.mapUpdatedAt?.[mapName];
  if (typeof timestamp === "string" && Number.isFinite(Date.parse(timestamp))) return Date.parse(timestamp);
  const date = layout?.mapUpdated?.[mapName];
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(`${date}T00:00:00Z`);
  return null;
}

function legacyDecision(localLayout, upstreamLayout, mapName) {
  const localFreshness = mapFreshness(localLayout, mapName);
  const upstreamFreshness = mapFreshness(upstreamLayout, mapName);
  if (localFreshness === null && upstreamFreshness !== null) return "upstream";
  if (localFreshness !== null && upstreamFreshness === null) return "local";
  if (localFreshness !== null && upstreamFreshness !== null) {
    if (upstreamFreshness > localFreshness) return "upstream";
    if (localFreshness > upstreamFreshness) return "local";
  }
  return "conflict";
}

function createSyncState(layout, upstreamLayout, mapNames, revision, conflicts = []) {
  const baseFingerprints = Object.fromEntries(mapNames.map(mapName => [mapName, mapContentFingerprint(upstreamLayout, mapName)]));
  const dirtyMaps = mapNames.filter(mapName => mapContentFingerprint(layout, mapName) !== baseFingerprints[mapName]);
  const dirtySet = new Set(dirtyMaps);
  return {
    version: MAP_SYNC_VERSION,
    sourceRevision: revision,
    baseFingerprints,
    dirtyMaps,
    conflicts: conflicts.filter(mapName => dirtySet.has(mapName))
  };
}

export function mergeMapLayouts(localLayout, upstreamLayout, mapNames, options = {}) {
  const local = normalizedLayout(localLayout);
  const upstream = normalizedLayout(upstreamLayout);
  const revision = options.sourceRevision || sourceRevision(upstreamLayout);
  const hadStoredLayout = options.hadStoredLayout !== false;
  const priorSync = isMapSyncState(local.sync) ? local.sync : null;
  const priorConflicts = new Set(priorSync?.conflicts || []);
  const merged = hadStoredLayout ? normalizedLayout(local) : normalizedLayout(upstream);
  const updatedMaps = [];
  const conflicts = [];

  for (const mapName of mapNames) {
    const localFingerprint = mapContentFingerprint(local, mapName);
    const upstreamFingerprint = mapContentFingerprint(upstream, mapName);
    let decision = "upstream";

    if (hadStoredLayout && localFingerprint !== upstreamFingerprint) {
      const baseFingerprint = priorSync?.baseFingerprints?.[mapName];
      if (priorConflicts.has(mapName)) {
        decision = "conflict";
      } else if (typeof baseFingerprint === "string") {
        if (localFingerprint === baseFingerprint) decision = "upstream";
        else if (upstreamFingerprint === baseFingerprint) decision = "local";
        else decision = "conflict";
      } else {
        decision = legacyDecision(local, upstream, mapName);
      }
    }

    if (decision === "upstream") {
      if (localFingerprint !== upstreamFingerprint) updatedMaps.push(mapName);
      replaceMapLayout(merged, upstream, mapName);
    } else {
      replaceMapLayout(merged, local, mapName);
      if (decision === "conflict") conflicts.push(mapName);
    }
  }

  merged.version = upstream.version;
  merged.sync = createSyncState(merged, upstream, mapNames, revision, conflicts);
  return {
    layout: merged,
    updatedMaps,
    dirtyMaps: [...merged.sync.dirtyMaps],
    conflicts: [...merged.sync.conflicts],
    migrated: hadStoredLayout && !priorSync
  };
}

export function markLayoutAsLocalEdits(layout, upstreamLayout, mapNames, revision = sourceRevision(upstreamLayout)) {
  layout.sync = createSyncState(layout, upstreamLayout, mapNames, revision);
  return layout.sync;
}

export function markMapEdited(layout, upstreamLayout, mapNames, mapName, revision = sourceRevision(upstreamLayout)) {
  const priorConflicts = new Set(isMapSyncState(layout.sync) ? layout.sync.conflicts : []);
  const sync = createSyncState(layout, upstreamLayout, mapNames, revision, [...priorConflicts]);
  layout.sync = sync;
  return sync;
}

export function acceptUpstreamMap(layout, upstreamLayout, mapNames, mapName, revision = sourceRevision(upstreamLayout)) {
  replaceMapLayout(layout, upstreamLayout, mapName);
  const priorConflicts = new Set(isMapSyncState(layout.sync) ? layout.sync.conflicts : []);
  priorConflicts.delete(mapName);
  layout.sync = createSyncState(layout, upstreamLayout, mapNames, revision, [...priorConflicts]);
  return layout.sync;
}
