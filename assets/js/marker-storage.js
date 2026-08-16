const LAYOUT_VERSION = 1;

export function createEmptyMarkerLayout() {
  return { version: LAYOUT_VERSION, markers: {}, annotations: {} };
}

export function loadMarkerLayout(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.version === LAYOUT_VERSION && saved.markers && typeof saved.markers === "object") {
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
