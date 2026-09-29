export function validatePastedView(candidate, key, validate, limits) {
  const markerGroups = Object.values(candidate.markers || {}).filter(Array.isArray);
  const drawingGroups = Object.values(candidate.annotations || {}).filter(Array.isArray);
  if (markerGroups.reduce((total, group) => total + group.length, 0) > limits.markers) throw new Error("Too many markers.");
  if (drawingGroups.reduce((total, group) => total + group.length, 0) > limits.annotations) throw new Error("Too many drawings.");
  if (drawingGroups.reduce((total, group) => total + group.reduce((count, drawing) => count + (drawing?.points?.length || 0), 0), 0) > limits.routePoints) throw new Error("Too many route points.");
  const vectorGroups = Object.values(candidate.vectorGroups || {}).filter(Array.isArray).flat();
  if (vectorGroups.length > limits.vectorGroups) throw new Error("Too many vector groups.");
  if (vectorGroups.reduce((total, group) => total + (group?.members || []).reduce((count, member) => count + (member?.original?.points?.length || (Number.isFinite(member?.original?.startX) ? 2 : 1)), 0), 0) > limits.vectorPoints) throw new Error("Too many vector points.");

  // Only the destination view changed. Retired views in local storage remain untouched.
  validate({
    version: candidate.version,
    markers: { [key]: candidate.markers[key] || [] },
    annotations: { [key]: candidate.annotations?.[key] || [] },
    vectorGroups: { [key]: candidate.vectorGroups?.[key] || [] }
  });
}
