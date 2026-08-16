    import { loadMarkerLayout, saveMarkerLayout as saveMarkerLayoutToStorage } from './marker-storage.js';
import { maps, translations } from './data.js?v=marker-layout-import-20260817';


    const state = { selected: null, team: "Red", query: "", language: "en", theme: "dark", editMode: false, contextMarkerId: null };
    const $ = (selector) => document.querySelector(selector);
    const mapList = $("#map-list");
    const search = $("#map-search");
    const clearSearch = $("#clear-search");
    const mapImage = $("#map-image");
    const mapStage = $("#map-stage");
    const imageStatus = $("#image-status");
    const dialog = $("#image-modal");
    const modalImage = $("#modal-image");
    const modalMapStage = $("#modal-map-stage");
    const modalMarkerLayer = $("#modal-marker-layer");
    const modalLegendList = $("#modal-legend-list");
    const modalToggleEditor = $("#modal-toggle-editor");
    const modalSaveMarkerLayout = $("#modal-save-marker-layout");
    const modalExportMarkerLayout = $("#modal-export-marker-layout");
    const modalImportMarkerLayout = $("#modal-import-marker-layout");
    const modalResetHiddenMarkers = $("#modal-reset-hidden-markers");
    const modalResetAllMarkers = $("#modal-reset-all-markers");
    const modalMarkerStatus = $("#modal-marker-status");
    const modalMarkerEditorNote = $("#modal-marker-editor-note");
    const modalMarkerContextMenu = $("#modal-marker-context-menu");
    const languageButtons = document.querySelectorAll(".language-button");
    const themeToggle = $("#theme-toggle");
    const mapViewer = $(".map-viewer");
    const markerLayer = $("#marker-layer");
    const legendItems = Array.from(document.querySelectorAll(".legend-list .legend-item"));
    const toggleEditor = $("#toggle-editor");
    const saveMarkerLayout = $("#save-marker-layout");
    const exportMarkerLayout = $("#export-marker-layout");
    const importMarkerLayout = $("#import-marker-layout");
    const markerLayoutImportFile = $("#marker-layout-import-file");
    const resetHiddenMarkers = $("#reset-hidden-markers");
    const resetAllMarkers = $("#reset-all-markers");
    const markerStatus = $("#marker-status");
    const markerEditorNote = $("#marker-editor-note");
    const markerContextMenu = $("#marker-context-menu");
    const markerTypes = new Map();
    const hiddenMarkers = new Set();
    const hiddenMarkerTypes = new Set();
    const MARKER_STORAGE_KEY = "maptactic-marker-layout-v1";
    const MARKER_LAYOUT_VERSION = 1;
    const MAX_IMPORTED_MARKERS = 5000;
    // Larger values render above smaller values. Equal-priority markers keep their placement order.
    const MARKER_RENDER_Z_INDEX = Object.freeze({
      smokeshell: 400,
      lightTank: 300,
      lightTankRed: 300,
      mainBattleTank: 300,
      mainBattleTankRed: 300,
      tankDestroyer: 300,
      tankDestroyerRed: 300,
      antiAir: 300,
      antiAirRed: 300,
      battleLine: 200,
      highRiskSpot: 200,
      sniper: 200,
      spawnKill: 200,
      route: 100,
      aimHere: 100
    });
    // These tactical annotations are view-only until their placement workflow is finalized.
    const PLACEMENT_DISABLED_MARKER_TYPES = new Set([
      "aimHere",
      "route",
      "coreArea",
      "dangerArea",
      "antiAirArea",
      "spawnArea",
      "notRecommended"
    ]);
    let legendDragActive = false;

    legendItems.forEach(item => {
      const label = item.querySelector("[data-i18n]");
      const icon = item.querySelector("img");
      if (!label || !icon) return;
      item.dataset.markerType = label.dataset.i18n;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      markerTypes.set(label.dataset.i18n, { icon: icon.getAttribute("src") });
    });
    const markerLayout = loadMarkerLayout(MARKER_STORAGE_KEY);
    const validMarkerLayoutKeys = new Set(maps.flatMap(map => ["Red", "Blue"].map(team => `${map.name}|${team}`)));

    function t(key) {
      return translations[state.language][key];
    }
    function mapLabel(map) {
      return state.language === "ko" ? map.aliases : map.name;
    }
    function setTheme(theme) {
      state.theme = theme;
      const isLight = theme === "light";
      document.body.classList.toggle("light-theme", isLight);
      document.documentElement.style.colorScheme = isLight ? "light" : "dark";
      document.querySelector('meta[name="theme-color"]').setAttribute("content", isLight ? "#edf2ed" : "#111719");
      themeToggle.setAttribute("aria-pressed", String(isLight));
      themeToggle.textContent = t(isLight ? "darkTheme" : "lightTheme");
      themeToggle.setAttribute("aria-label", t(isLight ? "switchToDarkTheme" : "switchToLightTheme"));
    }
    function updateSelectedMapDetails() {
      if (!state.selected) return;
      $("#selected-map-name").textContent = mapLabel(state.selected);
      $("#selected-map-description").textContent = `${state.team.toUpperCase()} ${t("teamTacticalMap")}`;
      mapImage.alt = `${mapLabel(state.selected)} ${state.team}`;
    }
    function setLanguage(language) {
      state.language = language;
      document.documentElement.lang = language;
      document.title = t("pageTitle");
      document.querySelector('meta[name="description"]').setAttribute("content", t("metaDescription"));
      document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
      document.querySelectorAll("[data-i18n-placeholder]").forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
      document.querySelectorAll("[data-i18n-aria]").forEach(element => { element.setAttribute("aria-label", t(element.dataset.i18nAria)); });
      languageButtons.forEach(button => { button.setAttribute("aria-pressed", String(button.dataset.language === language)); });
      setTheme(state.theme);
      updateSelectedMapDetails();
      imageStatus.textContent = mapStage.classList.contains("load-error") ? t("imageError") : t("loading");
      updateMarkerEditor();
      updateLegendVisibility();
      renderMarkers();
      renderList();
    }

    function currentMarkerKey() {
      return state.selected ? `${state.selected.name}|${state.team}` : null;
    }
    function currentMarkers() {
      const key = currentMarkerKey();
      if (!key) return [];
      if (!Array.isArray(markerLayout.markers[key])) markerLayout.markers[key] = [];
      return markerLayout.markers[key];
    }
    function setMarkerStatus(key) {
      const message = key ? t(key) : "";
      markerStatus.textContent = message;
      modalMarkerStatus.textContent = message;
    }
    function persistMarkerLayout(statusKey = "savedLocally") {
      try {
        saveMarkerLayoutToStorage(MARKER_STORAGE_KEY, markerLayout);
        setMarkerStatus(statusKey);
        return true;
      } catch (error) {
        setMarkerStatus("storageError");
        return false;
      }
    }
    function markerIdentity(marker) {
      return `${currentMarkerKey()}|${marker.id}`;
    }
    function markerTypeIdentity(type) {
      return `${currentMarkerKey()}|type:${type}`;
    }
    function isMarkerHidden(marker) {
      return hiddenMarkers.has(markerIdentity(marker)) || hiddenMarkerTypes.has(markerTypeIdentity(marker.type));
    }
    function modalLegendItems() {
      return Array.from(modalLegendList.querySelectorAll(".legend-item"));
    }
    function allLegendItems() {
      return [...legendItems, ...modalLegendItems()];
    }
    function bindLegendItem(item) {
      item.addEventListener("click", () => {
        if (legendDragActive) return;
        toggleLegendMarkerType(item.dataset.markerType);
      });
      item.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleLegendMarkerType(item.dataset.markerType);
      });
      item.addEventListener("dragstart", event => {
        if (!state.editMode || !isMarkerPlacementEnabled(item.dataset.markerType) || !event.dataTransfer) {
          event.preventDefault();
          return;
        }
        legendDragActive = true;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-maptactic-marker-type", item.dataset.markerType);
        event.dataTransfer.setData("text/plain", item.dataset.markerType);
      });
      item.addEventListener("dragend", () => { window.setTimeout(() => { legendDragActive = false; }, 0); });
    }
    function buildModalLegend() {
      modalLegendList.replaceChildren();
      legendItems.forEach(source => {
        const item = source.cloneNode(true);
        item.classList.add("modal-legend-item");
        item.draggable = state.editMode && isMarkerPlacementEnabled(item.dataset.markerType);
        item.classList.toggle("is-placement-disabled", state.editMode && !isMarkerPlacementEnabled(item.dataset.markerType));
        item.setAttribute("aria-disabled", String(state.editMode && !isMarkerPlacementEnabled(item.dataset.markerType)));
        bindLegendItem(item);
        modalLegendList.append(item);
      });
      updateLegendVisibility();
    }
    function updateLegendVisibility() {
      allLegendItems().forEach(item => {
        const isHidden = hiddenMarkerTypes.has(markerTypeIdentity(item.dataset.markerType));
        item.classList.toggle("is-marker-hidden", isHidden);
        item.setAttribute("aria-pressed", String(!isHidden));
        item.title = t(isHidden ? "legendTypeShown" : "legendTypeHidden");
      });
    }
    function hideMarker(marker) {
      hiddenMarkers.add(markerIdentity(marker));
      renderMarkers();
      setMarkerStatus("markerHidden");
    }
    function deleteMarker(markerId) {
      const markers = currentMarkers();
      const index = markers.findIndex(marker => marker.id === markerId);
      if (index < 0) return;
      const [marker] = markers.splice(index, 1);
      hiddenMarkers.delete(markerIdentity(marker));
      persistMarkerLayout("markerDeleted");
      renderMarkers();
    }
    function hideMarkerContextMenu() {
      markerContextMenu.hidden = true;
      modalMarkerContextMenu.hidden = true;
      state.contextMarkerId = null;
    }
    function showMarkerContextMenu(event, markerButton, contextMenu = markerContextMenu, stage = mapStage) {
      const stageRect = stage.getBoundingClientRect();
      state.contextMarkerId = markerButton.dataset.markerId;
      markerContextMenu.hidden = contextMenu !== markerContextMenu;
      modalMarkerContextMenu.hidden = contextMenu !== modalMarkerContextMenu;
      contextMenu.hidden = false;
      const left = Math.min(Math.max(6, event.clientX - stageRect.left), stageRect.width - contextMenu.offsetWidth - 6);
      const top = Math.min(Math.max(6, event.clientY - stageRect.top), stageRect.height - contextMenu.offsetHeight - 6);
      contextMenu.style.left = `${left}px`;
      contextMenu.style.top = `${top}px`;
    }
    function toggleLegendMarkerType(type) {
      const key = markerTypeIdentity(type);
      const isHidden = hiddenMarkerTypes.has(key);
      if (isHidden) hiddenMarkerTypes.delete(key);
      else hiddenMarkerTypes.add(key);
      updateLegendVisibility();
      renderMarkers();
      setMarkerStatus(isHidden ? "legendTypeShown" : "legendTypeHidden");
    }
    function syncMarkerLayer(layer = markerLayer, image = mapImage, stage = mapStage) {
      if (!image.naturalWidth || !image.naturalHeight || image.hidden) return;
      const stageRect = stage.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      if (!imageRect.width || !imageRect.height) return;
      const naturalRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = imageRect.width / imageRect.height;
      let width = imageRect.width;
      let height = imageRect.height;
      let left = imageRect.left;
      let top = imageRect.top;

      if (naturalRatio > boxRatio) {
        height = imageRect.width / naturalRatio;
        top += (imageRect.height - height) / 2;
      } else if (naturalRatio < boxRatio) {
        width = imageRect.height * naturalRatio;
        left += (imageRect.width - width) / 2;
      }
      Object.assign(layer.style, {
        left: `${left - stageRect.left}px`,
        top: `${top - stageRect.top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
    function markerPosition(event, layer = markerLayer) {
      const rect = layer.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      return {
        x: Math.round((x / rect.width) * 10000) / 100,
        y: Math.round((y / rect.height) * 10000) / 100
      };
    }
    function markerRenderZIndex(type) {
      return MARKER_RENDER_Z_INDEX[type] ?? 0;
    }
    function isMarkerPlacementEnabled(type) {
      return !PLACEMENT_DISABLED_MARKER_TYPES.has(type);
    }
    function renderMarkerLayer(layer, image) {
      layer.replaceChildren();
      if (!state.selected || image.hidden) return;
      currentMarkers().forEach(marker => {
        const type = markerTypes.get(marker.type);
        const x = Number(marker.x);
        const y = Number(marker.y);
        if (!type || !Number.isFinite(x) || !Number.isFinite(y) || isMarkerHidden(marker)) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-marker";
        button.dataset.markerId = marker.id;
        button.dataset.markerType = marker.type;
        button.draggable = state.editMode && isMarkerPlacementEnabled(marker.type);
        button.style.left = `${Math.min(100, Math.max(0, x))}%`;
        button.style.top = `${Math.min(100, Math.max(0, y))}%`;
        button.style.zIndex = String(markerRenderZIndex(marker.type));
        button.dataset.markerPriority = String(markerRenderZIndex(marker.type));
        button.title = t(state.editMode ? "markerEditTitle" : "markerViewTitle");
        button.setAttribute("aria-label", `${t(marker.type)} — ${button.title}`);
        const icon = document.createElement("img");
        icon.src = type.icon;
        icon.alt = "";
        button.append(icon);
        layer.append(button);
      });
    }
    function renderMarkers() {
      syncMarkerLayer(markerLayer, mapImage, mapStage);
      renderMarkerLayer(markerLayer, mapImage);
      if (!dialog.open) return;
      syncMarkerLayer(modalMarkerLayer, modalImage, modalMapStage);
      renderMarkerLayer(modalMarkerLayer, modalImage);
    }
    function updateMarkerEditor() {
      mapViewer.classList.toggle("is-editing", state.editMode);
      dialog.classList.toggle("is-editing", state.editMode);
      toggleEditor.setAttribute("aria-pressed", String(state.editMode));
      modalToggleEditor.setAttribute("aria-pressed", String(state.editMode));
      const editorLabel = t(state.editMode ? "finishEditing" : "editMarkers");
      const editorNote = t(state.editMode ? "editorActive" : "editorIdle");
      toggleEditor.textContent = editorLabel;
      modalToggleEditor.textContent = editorLabel;
      markerEditorNote.textContent = editorNote;
      modalMarkerEditorNote.textContent = editorNote;
      allLegendItems().forEach(item => {
        const placementEnabled = isMarkerPlacementEnabled(item.dataset.markerType);
        item.draggable = state.editMode && placementEnabled;
        item.classList.toggle("is-placement-disabled", state.editMode && !placementEnabled);
        item.setAttribute("aria-disabled", String(state.editMode && !placementEnabled));
      });
    }
    function setEditorMode(enabled) {
      state.editMode = enabled;
      hideMarkerContextMenu();
      updateMarkerEditor();
      renderMarkers();
      setMarkerStatus();
    }
    function exportMarkerLayoutData() {
      const exportData = { ...markerLayout, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = "maptactic-marker-layout.json";
      document.body.append(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMarkerStatus("exportedJson");
    }
    function validateImportedMarkerLayout(data) {
      if (!data || typeof data !== "object" || Array.isArray(data) || data.version !== MARKER_LAYOUT_VERSION || !data.markers || typeof data.markers !== "object" || Array.isArray(data.markers)) {
        throw new Error("Invalid marker layout.");
      }
      const layout = { version: MARKER_LAYOUT_VERSION, markers: {} };
      let markerCount = 0;
      Object.entries(data.markers).forEach(([key, markers]) => {
        if (!validMarkerLayoutKeys.has(key) || !Array.isArray(markers)) throw new Error("Invalid marker group.");
        const ids = new Set();
        layout.markers[key] = markers.map(marker => {
          if (!marker || typeof marker !== "object" || Array.isArray(marker) || typeof marker.id !== "string" || !marker.id || ids.has(marker.id) || !markerTypes.has(marker.type) || !Number.isFinite(marker.x) || !Number.isFinite(marker.y) || marker.x < 0 || marker.x > 100 || marker.y < 0 || marker.y > 100) {
            throw new Error("Invalid marker.");
          }
          markerCount += 1;
          if (markerCount > MAX_IMPORTED_MARKERS) throw new Error("Too many markers.");
          ids.add(marker.id);
          return { id: marker.id, type: marker.type, x: marker.x, y: marker.y };
        });
      });
      return layout;
    }
    async function importMarkerLayoutFile(file) {
      if (!file || file.size > 2 * 1024 * 1024) {
        setMarkerStatus("invalidJson");
        return;
      }
      try {
        const importedLayout = validateImportedMarkerLayout(JSON.parse(await file.text()));
        markerLayout.version = importedLayout.version;
        markerLayout.markers = importedLayout.markers;
        delete markerLayout.updatedAt;
        hiddenMarkers.clear();
        hiddenMarkerTypes.clear();
        hideMarkerContextMenu();
        updateLegendVisibility();
        persistMarkerLayout("importedJson");
        renderMarkers();
      } catch (error) {
        setMarkerStatus("invalidJson");
      }
    }
    function requestMarkerLayoutImport() {
      markerLayoutImportFile.value = "";
      markerLayoutImportFile.click();
    }

    function mapPath(map, team) {
      const image = map.sharedImage || `${team}.png`;
      return `img/${encodeURIComponent(map.folder)}/${encodeURIComponent(image)}`;
    }
    function visibleMaps() {
      const term = state.query.trim().toLocaleLowerCase("ko");
      return maps.filter(map => !term || `${map.name} ${map.aliases}`.toLocaleLowerCase("ko").includes(term));
    }
    function renderList() {
      const displayed = visibleMaps();
      $("#map-count").textContent = state.language === "ko" ? `${displayed.length}개 맵` : `${displayed.length} map${displayed.length === 1 ? "" : "s"}`;
      if (!displayed.length) {
        mapList.innerHTML = `<p class="empty-state">${t("noResults")}</p>`;
        return;
      }
      mapList.innerHTML = displayed.map(map => `
        <button class="map-card ${state.selected?.name === map.name ? "active" : ""}" type="button" data-map="${map.name}">
          <span class="map-card-name">${mapLabel(map)}</span><span class="map-card-arrow" aria-hidden="true">→</span>
        </button>`).join("");
    }
    function updateUrl() {
      if (!state.selected) return;
      const url = new URL(window.location);
      url.searchParams.set("map", state.selected.name);
      url.searchParams.set("team", state.team.toLowerCase());
      window.history.replaceState({}, "", url);
    }
    function setModalMapSource() {
      if (!state.selected) return;
      modalImage.hidden = true;
      modalMarkerLayer.replaceChildren();
      modalImage.alt = `${mapLabel(state.selected)} ${state.team}`;
      modalImage.src = mapPath(state.selected, state.team);
      $("#modal-title").textContent = `${mapLabel(state.selected)} · ${state.team.toUpperCase()} ${t("teamLabel")}`;
    }
    function selectMap(map, team = state.team) {
      state.selected = map;
      state.team = team;
      hideMarkerContextMenu();
      updateSelectedMapDetails();
      updateLegendVisibility();
      document.querySelectorAll(".team-button").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.team === team));
      });
      mapImage.hidden = true;
      mapStage.classList.remove("loaded", "load-error");
      markerLayer.replaceChildren();
      imageStatus.textContent = t("loading");
      mapImage.alt = `${mapLabel(map)} ${team}`;
      mapImage.src = mapPath(map, team);
      if (dialog.open) setModalMapSource();
      renderList();
      updateUrl();
    }
    function setTeam(team) {
      if (state.selected) selectMap(state.selected, team);
    }
    function restoreFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const map = maps.find(item => item.name === params.get("map"));
      const team = params.get("team")?.toLowerCase() === "blue" ? "Blue" : "Red";
      selectMap(map || maps[0], team);
    }
    function resetHiddenMarkersForCurrentMap() {
      const markerKey = currentMarkerKey();
      if (!markerKey) return;
      [...hiddenMarkers].filter(id => id.startsWith(`${markerKey}|`)).forEach(id => hiddenMarkers.delete(id));
      [...hiddenMarkerTypes].filter(id => id.startsWith(`${markerKey}|`)).forEach(id => hiddenMarkerTypes.delete(id));
      updateLegendVisibility();
      renderMarkers();
      setMarkerStatus("hiddenReset");
    }
    function resetAllPlacedMarkers() {
      if (!window.confirm(t("confirmResetAll"))) return;
      markerLayout.markers = {};
      hiddenMarkers.clear();
      hiddenMarkerTypes.clear();
      hideMarkerContextMenu();
      updateLegendVisibility();
      persistMarkerLayout("allMarkersReset");
      renderMarkers();
    }
    function bindMarkerLayer(layer, stage, contextMenu) {
      layer.addEventListener("dragstart", event => {
        const marker = event.target.closest(".map-marker");
        if (!state.editMode || !marker || !isMarkerPlacementEnabled(marker.dataset.markerType) || !event.dataTransfer) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-maptactic-marker-id", marker.dataset.markerId);
        event.dataTransfer.setData("text/plain", marker.dataset.markerId);
      });
      layer.addEventListener("click", event => {
        const markerButton = event.target.closest(".map-marker");
        if (!markerButton || state.editMode) return;
        const marker = currentMarkers().find(item => item.id === markerButton.dataset.markerId);
        if (marker) hideMarker(marker);
      });
      layer.addEventListener("contextmenu", event => {
        const markerButton = event.target.closest(".map-marker");
        if (!markerButton) return;
        event.preventDefault();
        showMarkerContextMenu(event, markerButton, contextMenu, stage);
      });
    }
    function bindMarkerStage(stage, layer) {
      stage.addEventListener("dragover", event => {
        if (!state.editMode || !event.dataTransfer) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("application/x-maptactic-marker-id") ? "move" : "copy";
      });
      stage.addEventListener("drop", event => {
        if (!state.editMode || !event.dataTransfer) return;
        event.preventDefault();
        const position = markerPosition(event, layer);
        if (!position) return;
        const markerId = event.dataTransfer.getData("application/x-maptactic-marker-id");
        const markerType = event.dataTransfer.getData("application/x-maptactic-marker-type");
        const markers = currentMarkers();
        const existingMarker = markers.find(marker => marker.id === markerId);
        if (existingMarker) {
          if (!isMarkerPlacementEnabled(existingMarker.type)) return;
          existingMarker.x = position.x;
          existingMarker.y = position.y;
          hiddenMarkers.delete(markerIdentity(existingMarker));
        } else if (markerTypes.has(markerType) && isMarkerPlacementEnabled(markerType)) {
          markers.push({
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            type: markerType,
            x: position.x,
            y: position.y
          });
        } else {
          return;
        }
        persistMarkerLayout();
        renderMarkers();
      });
    }
    function bindMarkerContextMenu(contextMenu) {
      contextMenu.addEventListener("click", event => {
        const action = event.target.closest("[data-marker-action]")?.dataset.markerAction;
        if (!action || !state.contextMarkerId) return;
        const marker = currentMarkers().find(item => item.id === state.contextMarkerId);
        if (action === "hide" && marker) hideMarker(marker);
        if (action === "delete") deleteMarker(state.contextMarkerId);
        hideMarkerContextMenu();
      });
    }
    function openMapModal() {
      buildModalLegend();
      dialog.showModal();
      setModalMapSource();
      window.requestAnimationFrame(renderMarkers);
    }

    mapList.addEventListener("click", event => {
      const card = event.target.closest("[data-map]");
      if (!card) return;
      selectMap(maps.find(map => map.name === card.dataset.map));
    });
    search.addEventListener("input", () => {
      state.query = search.value;
      clearSearch.classList.toggle("visible", Boolean(search.value));
      renderList();
    });
    clearSearch.addEventListener("click", () => { search.value = ""; search.dispatchEvent(new Event("input")); search.focus(); });
    document.querySelectorAll(".team-button").forEach(button => button.addEventListener("click", () => setTeam(button.dataset.team)));
    languageButtons.forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.language)));
    themeToggle.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
    toggleEditor.addEventListener("click", () => setEditorMode(!state.editMode));
    modalToggleEditor.addEventListener("click", () => setEditorMode(!state.editMode));
    saveMarkerLayout.addEventListener("click", () => persistMarkerLayout());
    modalSaveMarkerLayout.addEventListener("click", () => persistMarkerLayout());
    exportMarkerLayout.addEventListener("click", exportMarkerLayoutData);
    modalExportMarkerLayout.addEventListener("click", exportMarkerLayoutData);
    importMarkerLayout.addEventListener("click", requestMarkerLayoutImport);
    modalImportMarkerLayout.addEventListener("click", requestMarkerLayoutImport);
    markerLayoutImportFile.addEventListener("change", () => importMarkerLayoutFile(markerLayoutImportFile.files?.[0]));
    resetHiddenMarkers.addEventListener("click", resetHiddenMarkersForCurrentMap);
    modalResetHiddenMarkers.addEventListener("click", resetHiddenMarkersForCurrentMap);
    resetAllMarkers.addEventListener("click", resetAllPlacedMarkers);
    modalResetAllMarkers.addEventListener("click", resetAllPlacedMarkers);
    legendItems.forEach(bindLegendItem);
    bindMarkerLayer(markerLayer, mapStage, markerContextMenu);
    bindMarkerLayer(modalMarkerLayer, modalMapStage, modalMarkerContextMenu);
    bindMarkerStage(mapStage, markerLayer);
    bindMarkerStage(modalMapStage, modalMarkerLayer);
    bindMarkerContextMenu(markerContextMenu);
    bindMarkerContextMenu(modalMarkerContextMenu);
    document.addEventListener("click", event => {
      if (!markerContextMenu.contains(event.target) && !modalMarkerContextMenu.contains(event.target)) hideMarkerContextMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") hideMarkerContextMenu();
    });
    mapImage.addEventListener("load", () => {
      mapImage.hidden = false;
      mapStage.classList.add("loaded");
      renderMarkers();
    });
    mapImage.addEventListener("error", () => {
      mapStage.classList.add("load-error");
      markerLayer.replaceChildren();
      imageStatus.textContent = t("imageError");
    });
    modalImage.addEventListener("load", () => {
      modalImage.hidden = false;
      renderMarkers();
    });
    modalImage.addEventListener("error", () => {
      modalMarkerLayer.replaceChildren();
    });
    window.addEventListener("resize", renderMarkers);
    mapImage.addEventListener("click", () => {
      if (!state.selected || mapImage.hidden) return;
      openMapModal();
    });
    $(".close-modal").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      hideMarkerContextMenu();
      modalMarkerLayer.replaceChildren();
    });
    setLanguage("en");
    restoreFromUrl();
