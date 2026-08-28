export const MARKER_LAYOUT_VERSION = 2;

export function createEmptyMarkerLayout() {
  return { version: MARKER_LAYOUT_VERSION, mapUpdated: {}, markers: {}, annotations: {} };
}

export function loadMarkerLayout(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.version === MARKER_LAYOUT_VERSION && saved.markers && typeof saved.markers === "object") {
      if (!saved.mapUpdated || typeof saved.mapUpdated !== "object" || Array.isArray(saved.mapUpdated)) saved.mapUpdated = {};
      if (!saved.annotations || typeof saved.annotations !== "object" || Array.isArray(saved.annotations)) saved.annotations = {};
      return saved;
    }
  } catch (error) {
    // A missing or invalid local layout starts with an empty layout.
  }
  return createEmptyMarkerLayout();
}

export function saveMarkerLayout(storageKey, layout) {
  layout.updatedAt = new Date().toISOString();
  localStorage.setItem(storageKey, JSON.stringify(layout));
}
