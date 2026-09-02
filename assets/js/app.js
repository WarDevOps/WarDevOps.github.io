    import { MARKER_LAYOUT_VERSION, loadMarkerLayout, saveMarkerLayout as saveMarkerLayoutToStorage } from './marker-storage.js?v=recent-updates-20260901';
import { initDiscordMemberCount } from './discord-stats.js';
    import { commentImages } from './comment-images.js?v=comment-images-fcc91837fb81';
    import { defaultMarkerLayout, maps, translations } from './data.js?v=seo-headings-20260901';


    const DEFAULT_ANNOTATION_OPACITY = 50;
    const ANNOTATION_OPACITY_STORAGE_KEY = "maptactic-route-aim-opacity-v1";
    const state = { selected: null, team: "Red", query: "", language: "en", theme: "dark", editMode: false, focusedTankMarkerId: null, contextMarkerId: null, contextAnnotationId: null, commentMarkerId: null, drawing: null, annotationOpacity: loadAnnotationOpacity() };
    const $ = (selector) => document.querySelector(selector);
    const mapList = $("#map-list");
    const pageTitleHeading = $("#page-title");
    const mapVariationSelect = $("#map-variation");
    const mapBattleRating = $("#map-battle-rating");
    const copyLink = $("#copy-link");
    const copyLinkLabel = copyLink.querySelector("[data-copy-link-label]");
    const mapTacticalSummary = $("#map-tactical-summary");
    const mapTacticalSummaryCopy = $("#map-tactical-summary-copy");
    const search = $("#map-search");
    const clearSearch = $("#clear-search");
    const mapImage = $("#map-image");
    const mapStage = $("#map-stage");
    const imageStatus = $("#image-status");
    const dialog = $("#image-modal");
    const modalImage = $("#modal-image");
    const modalMapStage = $("#modal-map-stage");
    const modalMapOverlayLayer = $("#modal-map-overlay-layer");
    const modalAnnotationLayer = $("#modal-annotation-layer");
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
    const modalAnnotationContextMenu = $("#modal-annotation-context-menu");
    const annotationOpacityMainSlot = $("#annotation-opacity-main-slot");
    const annotationOpacityControl = $("#annotation-opacity-control");
    const annotationOpacitySlider = $("#annotation-opacity-slider");
    const annotationOpacityValue = $("#annotation-opacity-value");
    const languageButtons = document.querySelectorAll(".language-button");
    const themeToggle = $("#theme-toggle");
    const workspace = $(".workspace");
    const mapViewer = $(".map-viewer");
    const mapOverlayLayer = $("#map-overlay-layer");
    const markerLayer = $("#marker-layer");
    const annotationLayer = $("#annotation-layer");
    const legendGroups = [...document.querySelectorAll("[data-legend-group]")];
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
    const mapLastUpdated = $("#map-last-updated");
    const editorActions = [...document.querySelectorAll("[data-editor-action]")];
    const markerContextMenu = $("#marker-context-menu");
    const annotationContextMenu = $("#annotation-context-menu");
    const markerTypes = new Map();
    const hiddenMarkers = new Set();
    const hiddenAnnotations = new Set();
    const hiddenMarkerTypes = new Set();
    const MARKER_STORAGE_KEY = "maptactic-marker-layout-v2";
    const DEFAULT_MARKER_LAYOUT_FILENAME = "Maptactic.json";
    const MAX_IMPORTED_MARKERS = 5000;
    const MAX_IMPORTED_ANNOTATIONS = 5000;
    const MAX_IMPORTED_ROUTE_POINTS = 25000;
    const MAX_MARKER_COMMENT_BYTES = 120;
    const MAP_UPDATED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    const COMMENT_TEXT_ENCODER = new TextEncoder();
    const COMMENT_IMAGES_BY_ID = new Map();
    commentImages.forEach(image => {
      const hasSafePath = typeof image?.path === "string" && /^img\/(?:[^/]+\/)*scr_[^/]+\.png$/.test(image.path) && !image.path.split("/").some(part => part === "." || part === "..");
      if (typeof image?.id !== "string" || !image.id || image.id.length > 240 || typeof image.label !== "string" || image.label.length > 240 || !hasSafePath || COMMENT_IMAGES_BY_ID.has(image.id)) return;
      COMMENT_IMAGES_BY_ID.set(image.id, Object.freeze({ id: image.id, path: `/${image.path}`, label: image.label }));
    });
    const COMMENT_IMAGES = Object.freeze([...COMMENT_IMAGES_BY_ID.values()]);
    const ANNOTATION_TYPES = new Set(["aimHere", "route"]);
    const MAP_DRAWING_REFERENCE_SIZE = 600;
    const MAP_MARKER_REFERENCE_SIZE = 1440;
    const MAP_ROUTE_REFERENCE_SIZE = 1440;
    const MAP_MARKER_BASE_SIZE = 32;
    const AIM_ARROW_BASE_STROKE = 1;
    const AIM_ARROW_HEAD_BASE_LENGTH = 6;
    const AIM_ARROW_HEAD_BASE_HEIGHT = 6;
    const ROUTE_BASE_STROKE = 3;
    const ROUTE_BASE_DASH_LENGTH = 7;
    const ROUTE_BASE_DASH_GAP = 7;
    // Every map supports these optional transparent area overlays. Short names are canonical;
    // long names remain as fallbacks for existing map assets. A missing file is ignored.
    const MAP_AREA_OVERLAYS = Object.freeze([
      { type: "coreArea", files: ["c.png", "CoreArea.png"] },
      { type: "coreArea", files: ["cb.png", "CoreAreaBlue.png"], team: "Blue" },
      { type: "coreArea", files: ["cr.png", "CoreAreaRed.png"], team: "Red" },
      { type: "dangerArea", files: ["d.png", "DangerArea.png"] },
      { type: "dangerArea", files: ["db.png", "DangerAreaBlue.png"], team: "Blue" },
      { type: "dangerArea", files: ["dr.png", "DangerAreaRed.png"], team: "Red" },
      { type: "notRecommended", files: ["n.png", "NotRecommended.png"] },
      { type: "notRecommended", files: ["nb.png", "NotRecommendedBlue.png"], team: "Blue" },
      { type: "notRecommended", files: ["nr.png", "NotRecommendedRed.png"], team: "Red" },
      { type: "antiAirArea", files: ["a.png", "AntiAir.png", "AntiAirArea.png"] },
      { type: "antiAirArea", files: ["ab.png", "AntiAirBlue.png"], team: "Blue" },
      { type: "antiAirArea", files: ["ar.png", "AntiAirRed.png"], team: "Red" },
      { type: "spawnArea", files: ["s.png", "SpawnArea.png"] },
      { type: "spawnArea", files: ["sb.png", "SpawnAreaBlue.png"], team: "Blue" },
      { type: "spawnArea", files: ["sr.png", "SpawnAreaRed.png"], team: "Red" }
    ]);
    const unavailableMapOverlayFiles = new Set();
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
    const TANK_MARKER_TYPES = new Set([
      "lightTank",
      "lightTankRed",
      "mainBattleTank",
      "mainBattleTankRed",
      "tankDestroyer",
      "tankDestroyerRed",
      "antiAir",
      "antiAirRed"
    ]);
    const ROLE_MARKER_TYPES = new Set(["battleLine", "highRiskSpot", "sniper", "spawnKill"]);
    const SPECIAL_MARKER_MAP_NAMES = new Set([
      "Surroundings of Volokolamsk",
      "Arctic Polar Base",
      "Arctic Pier",
      "Volokolamsk",
      "Frozen Pass",
      "Stalingrad"
    ]);
    const SPECIAL_TANK_ICON_PATHS = Object.freeze({
      lightTank: "/Legend/lt w b.png",
      lightTankRed: "/Legend/lt w r.png",
      mainBattleTank: "/Legend/mbt w b.png",
      mainBattleTankRed: "/Legend/mbt w r.png",
      tankDestroyer: "/Legend/td w b.png",
      tankDestroyerRed: "/Legend/td w r.png",
      antiAir: "/Legend/aa w b.png",
      antiAirRed: "/Legend/aa w r.png"
    });
    // Role markers are attached from a tank marker's context menu, never placed directly.
    const PLACEMENT_DISABLED_MARKER_TYPES = new Set([
      ...ROLE_MARKER_TYPES,
      "aimHere",
      "route",
      "coreArea",
      "dangerArea",
      "antiAirArea",
      "spawnArea",
      "notRecommended"
    ]);
    let legendDragActive = false;
    let copyLinkFeedbackTimer = null;

    legendItems.forEach(item => {
      const label = item.querySelector("[data-i18n]");
      const icon = item.querySelector("img");
      if (!label || !icon) return;
      item.dataset.markerType = label.dataset.i18n;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      markerTypes.set(label.dataset.i18n, { icon: icon.getAttribute("src") });
    });
    const validMapNames = new Set(maps.map(map => map.name));
    const markerLayout = loadMarkerLayout(MARKER_STORAGE_KEY);
    const LEGACY_MAP_NAMES = new Map([
      ["38 Parallel", "38th Parallel"],
      ["Aredennes", "Ardennes"],
      ["Ash river", "Ash River"],
      ["Battle of Hurtgen Forest", "Battle of Hürtgen Forest"],
      ["Sand of Sinai", "Sands of Sinai"],
      ["Surrounding of Volokolamsk", "Surroundings of Volokolamsk"]
    ]);
    ["markers", "annotations"].forEach(section => {
      if (!markerLayout[section] || typeof markerLayout[section] !== "object" || Array.isArray(markerLayout[section])) return;
      Object.entries(markerLayout[section]).forEach(([key, value]) => {
        const separator = key.indexOf("::");
        if (separator < 0) return;
        const currentName = key.slice(0, separator);
        const correctedName = LEGACY_MAP_NAMES.get(currentName);
        if (!correctedName) return;
        const correctedKey = `${correctedName}${key.slice(separator)}`;
        if (!(correctedKey in markerLayout[section])) markerLayout[section][correctedKey] = value;
        delete markerLayout[section][key];
      });
    });
    const storedMapUpdated = markerLayout.mapUpdated;
    markerLayout.mapUpdated = Object.fromEntries(maps.map(map => {
      const legacyName = [...LEGACY_MAP_NAMES.entries()].find(([, correctedName]) => correctedName === map.name)?.[0];
      const storedDate = storedMapUpdated?.[map.name] || (legacyName ? storedMapUpdated?.[legacyName] : null);
      return [map.name, typeof storedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(storedDate) ? storedDate : map.updated];
    }));
    const storedMapUpdatedAt = markerLayout.mapUpdatedAt;
    markerLayout.mapUpdatedAt = Object.fromEntries(maps.flatMap(map => {
      const legacyName = [...LEGACY_MAP_NAMES.entries()].find(([, correctedName]) => correctedName === map.name)?.[0];
      const storedTimestamp = storedMapUpdatedAt?.[map.name] || (legacyName ? storedMapUpdatedAt?.[legacyName] : null);
      return validMapUpdatedAt(storedTimestamp) ? [[map.name, storedTimestamp]] : [];
    }));
    const validMarkerLayoutKeys = new Set(maps.flatMap(map => map.variations.flatMap(variation => ["Red", "Blue"].map(team => `${map.name}::${variation.id}|${team}`))));

    function t(key) {
      return translations[state.language][key];
    }
    function validMapUpdatedAt(value) {
      return typeof value === "string" && MAP_UPDATED_AT_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
    }
    function loadAnnotationOpacity() {
      try {
        const savedValue = localStorage.getItem(ANNOTATION_OPACITY_STORAGE_KEY);
        if (savedValue === null) return DEFAULT_ANNOTATION_OPACITY;
        const value = Number(savedValue);
        return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : DEFAULT_ANNOTATION_OPACITY;
      } catch (error) {
        return DEFAULT_ANNOTATION_OPACITY;
      }
    }
    function mountAnnotationOpacityControl(slot) {
      if (slot && annotationOpacityControl.parentElement !== slot) slot.prepend(annotationOpacityControl);
    }
    function updateAnnotationOpacity() {
      const value = state.annotationOpacity;
      annotationOpacitySlider.value = String(value);
      annotationOpacitySlider.setAttribute("aria-valuetext", `${value}%`);
      annotationOpacityValue.value = `${value}%`;
      document.documentElement.style.setProperty("--annotation-opacity", String(value / 100));
      document.documentElement.style.setProperty("--annotation-dimmed-opacity", String((value / 100) * .2));
      document.documentElement.classList.toggle("annotation-opacity-zero", value === 0);
    }
    function setAnnotationOpacity(value, { persist = true } = {}) {
      const nextValue = Math.min(100, Math.max(0, Math.round(Number(value))));
      if (!Number.isFinite(nextValue)) return;
      state.annotationOpacity = nextValue;
      updateAnnotationOpacity();
      if (!persist) return;
      try {
        localStorage.setItem(ANNOTATION_OPACITY_STORAGE_KEY, String(nextValue));
      } catch (error) {
        // The live setting still works when browser storage is unavailable.
      }
    }
    function mapLabel(map) {
      return state.language === "ko" ? map.aliases : map.name;
    }
    function renderRecentUpdates() {
      const list = $("#recent-update-list");
      if (!list) return;
      const recentMaps = maps
        .map((map, catalogIndex) => ({ map, catalogIndex }))
        .sort((left, right) => {
          const leftTimestamp = validMapUpdatedAt(left.map.updatedAt) ? Math.floor(Date.parse(left.map.updatedAt) / 1000) : Date.parse(`${left.map.updated}T00:00:00Z`) / 1000;
          const rightTimestamp = validMapUpdatedAt(right.map.updatedAt) ? Math.floor(Date.parse(right.map.updatedAt) / 1000) : Date.parse(`${right.map.updated}T00:00:00Z`) / 1000;
          return (rightTimestamp - leftTimestamp) || (left.catalogIndex - right.catalogIndex);
        })
        .slice(0, 5);
      const dateFormatter = new Intl.DateTimeFormat(state.language === "ko" ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      });
      list.replaceChildren(...recentMaps.map(({ map }) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `/maps/${map.slug}/`;
        const name = document.createElement("span");
        name.className = "recent-update-name";
        name.textContent = mapLabel(map);
        const time = document.createElement("time");
        time.dateTime = map.updated;
        time.textContent = dateFormatter.format(new Date(`${map.updated}T00:00:00Z`));
        link.append(name, time);
        item.append(link);
        return item;
      }));
    }
    function mapVariationLabel(variation) {
      return `${t(variation.mode)} #${variation.number}`;
    }
    function mapBattleRatingLabel(map) {
      const min = Number(map.br.min).toFixed(1);
      return map.br.max == null ? `BR ${min}+` : `BR ${min} ~ ${Number(map.br.max).toFixed(1)}`;
    }
    function mapTacticalSummarySentences(map, language = state.language) {
      const summaries = map?.tacticalSummary;
      if (!summaries || typeof summaries !== "object") return [];
      const sentences = summaries[language] || summaries.en;
      return Array.isArray(sentences) ? sentences : [];
    }
    function mapDocumentDescription(map) {
      const summary = mapTacticalSummarySentences(map).join(" ");
      if (summary) return summary;
      if (state.language === "ko") return `${mapLabel(map)}의 주요 교전 지역과 이동 경로를 살펴보고 워썬더 지상전 전술을 계획하세요.`;
      return `Explore key engagement areas and movement routes for ${map.name} in War Thunder Ground Battles.`;
    }
    function findBaseMap(map) {
      return maps.find(candidate => candidate.name === map?.name) || map;
    }
    function expandMapVariation(map, variationId) {
      const baseMap = findBaseMap(map);
      const variation = baseMap.variations.find(item => item.id === variationId) || baseMap.variations[0];
      return { ...baseMap, ...variation, variationId: variation.id };
    }
    function renderMapVariationSelect() {
      if (!state.selected) {
        mapVariationSelect.replaceChildren();
        mapVariationSelect.disabled = true;
        return;
      }
      const options = document.createDocumentFragment();
      state.selected.variations.forEach(variation => {
        const option = document.createElement("option");
        option.value = variation.id;
        option.textContent = mapVariationLabel(variation);
        options.append(option);
      });
      mapVariationSelect.replaceChildren(options);
      mapVariationSelect.value = state.selected.variationId;
      mapVariationSelect.disabled = false;
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
    function updateMapDocumentMetadata() {
      if (!state.selected) return;
      const pageTitle = `War Thunder ${state.selected.name} Map Guide | WarDevOps`;
      const pageDescription = mapDocumentDescription(state.selected);
      const canonicalUrl = `https://wardevops.github.io/maps/${state.selected.slug}/`;
      const previewUrl = `https://wardevops.github.io${mapPath(state.selected, state.team)}`;
      document.title = pageTitle;
      pageTitleHeading.textContent = `${state.selected.name} War Thunder Map Guide`;
      document.querySelector('meta[name="description"]').setAttribute("content", pageDescription);
      document.querySelector('link[rel="canonical"]').setAttribute("href", canonicalUrl);
      document.querySelector('meta[property="og:title"]').setAttribute("content", pageTitle);
      document.querySelector('meta[property="og:description"]').setAttribute("content", pageDescription);
      document.querySelector('meta[property="og:url"]').setAttribute("content", canonicalUrl);
      document.querySelector('meta[property="og:image"]').setAttribute("content", previewUrl);
      document.querySelector('meta[name="twitter:title"]').setAttribute("content", pageTitle);
      document.querySelector('meta[name="twitter:description"]').setAttribute("content", pageDescription);
      document.querySelector('meta[name="twitter:image"]').setAttribute("content", previewUrl);
    }
    function updateLibraryDocumentMetadata() {
      document.title = t("pageTitle");
      pageTitleHeading.textContent = "War Thunder Map Guides & Tactics";
      document.querySelector('meta[name="description"]').setAttribute("content", t("metaDescription"));
      document.querySelector('link[rel="canonical"]').setAttribute("href", "https://wardevops.github.io/");
      document.querySelector('meta[property="og:title"]').setAttribute("content", "War Thunder Map Guide & Tactics | WarDevOps");
      document.querySelector('meta[property="og:description"]').setAttribute("content", t("metaDescription"));
      document.querySelector('meta[property="og:url"]').setAttribute("content", "https://wardevops.github.io/");
      document.querySelector('meta[property="og:image"]').setAttribute("content", "https://wardevops.github.io/img/38th%20Parallel/38th%20Parallel.png");
      document.querySelector('meta[name="twitter:title"]').setAttribute("content", "War Thunder Map Guide & Tactics | WarDevOps");
      document.querySelector('meta[name="twitter:description"]').setAttribute("content", t("metaDescription"));
      document.querySelector('meta[name="twitter:image"]').setAttribute("content", "https://wardevops.github.io/img/38th%20Parallel/38th%20Parallel.png");
    }
    function updateSelectedMapDetails() {
      if (!state.selected) return;
      $("#selected-map-name").textContent = mapLabel(state.selected);
      const summarySentences = mapTacticalSummarySentences(state.selected);
      if (mapTacticalSummary.dataset.mapName !== state.selected.name) mapTacticalSummary.open = false;
      mapTacticalSummary.dataset.mapName = state.selected.name;
      mapTacticalSummary.hidden = summarySentences.length === 0;
      mapTacticalSummaryCopy.replaceChildren(...summarySentences.map(sentence => {
        const paragraph = document.createElement("p");
        paragraph.textContent = sentence;
        return paragraph;
      }));
      mapBattleRating.textContent = mapBattleRatingLabel(state.selected);
      mapImage.alt = `${mapLabel(state.selected)} ${mapVariationLabel(state.selected)} ${state.team}`;
      const mapUpdated = state.selected.updated;
      mapLastUpdated.dateTime = mapUpdated;
      mapLastUpdated.textContent = mapUpdated;
      if (/^\/maps\/[^/]+\/?$/.test(window.location.pathname)) updateMapDocumentMetadata();
      renderMapVariationSelect();
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
      renderRecentUpdates();
      window.dispatchEvent(new CustomEvent("maptactic:languagechange", { detail: { language } }));
      document.querySelectorAll(".marker-context-menu").forEach(contextMenu => {
        renderCommentImageOptions(contextMenu, contextMenu.querySelector("[data-marker-comment-image-picker]").dataset.selectedImageId);
      });
      setTheme(state.theme);
      updateSelectedMapDetails();
      imageStatus.textContent = mapStage.classList.contains("load-error") ? t("imageError") : t("loading");
      updateMarkerEditor();
      updateLegendVisibility();
      renderMarkers();
      renderList();
    }

    function currentMarkerKey() {
      return state.selected ? `${state.selected.name}::${state.selected.variationId}|${state.team}` : null;
    }
    function currentMarkers() {
      const key = currentMarkerKey();
      if (!key) return [];
      if (!Array.isArray(markerLayout.markers[key])) markerLayout.markers[key] = [];
      return markerLayout.markers[key];
    }
    function currentAnnotations() {
      const key = currentMarkerKey();
      if (!key) return [];
      if (!markerLayout.annotations || typeof markerLayout.annotations !== "object" || Array.isArray(markerLayout.annotations)) markerLayout.annotations = {};
      if (!Array.isArray(markerLayout.annotations[key])) markerLayout.annotations[key] = [];
      return markerLayout.annotations[key];
    }
    function setMarkerStatus(key) {
      const message = key ? t(key) : "";
      markerStatus.textContent = message;
      modalMarkerStatus.textContent = message;
    }
    function localIsoDate(date = new Date()) {
      return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    }
    function touchCurrentMapUpdated() {
      if (!state.selected) return;
      const now = new Date();
      if (!markerLayout.mapUpdated || typeof markerLayout.mapUpdated !== "object" || Array.isArray(markerLayout.mapUpdated)) markerLayout.mapUpdated = {};
      if (!markerLayout.mapUpdatedAt || typeof markerLayout.mapUpdatedAt !== "object" || Array.isArray(markerLayout.mapUpdatedAt)) markerLayout.mapUpdatedAt = {};
      markerLayout.mapUpdated[state.selected.name] = localIsoDate(now);
      markerLayout.mapUpdatedAt[state.selected.name] = now.toISOString().replace(/\.\d{3}Z$/, "Z");
      updateSelectedMapDetails();
    }
    function persistMarkerLayout(statusKey = "savedLocally", { touchMap = false } = {}) {
      try {
        if (touchMap) touchCurrentMapUpdated();
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
    function annotationIdentity(annotation) {
      return `${currentMarkerKey()}|${annotation.id}`;
    }
    function markerTypeIdentity(type) {
      return `${currentMarkerKey()}|type:${type}`;
    }
    function encodeAssetPath(path) {
      return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
    }
    function mapOverlayPath(map, file) {
      return `/img/${encodeAssetPath(map.folder)}/${encodeURIComponent(file)}`;
    }
    function mapOverlayIdentity(map, file) {
      return `${map.folder}|${file}`;
    }
    function currentMapOverlays() {
      return state.selected
        ? MAP_AREA_OVERLAYS.filter(overlay => !overlay.team || overlay.team === state.team)
        : [];
    }
    function isMarkerHidden(marker) {
      return hiddenMarkers.has(markerIdentity(marker)) || hiddenMarkerTypes.has(markerTypeIdentity(marker.type));
    }
    function isAnnotationHidden(annotation) {
      return hiddenAnnotations.has(annotationIdentity(annotation)) || hiddenMarkerTypes.has(markerTypeIdentity(annotation.type));
    }
    function isTankMarker(marker) {
      return Boolean(marker && TANK_MARKER_TYPES.has(marker.type));
    }
    function isRoleMarker(marker) {
      return Boolean(marker && ROLE_MARKER_TYPES.has(marker.type));
    }
    function usesSpecialMarkerStyle() {
      return Boolean(state.selected && SPECIAL_MARKER_MAP_NAMES.has(state.selected.name));
    }
    function markerIconPath(marker, fallbackPath) {
      return usesSpecialMarkerStyle() && isTankMarker(marker)
        ? SPECIAL_TANK_ICON_PATHS[marker.type] || fallbackPath
        : fallbackPath;
    }
    function usesSpecialDarkAnnotationStyle(annotation) {
      return usesSpecialMarkerStyle()
        && (annotation.type === "aimHere" || (annotation.type === "route" && !annotation.dangerRoute));
    }
    function commentByteLength(value) {
      return COMMENT_TEXT_ENCODER.encode(value).length;
    }
    function limitCommentToByteLength(value) {
      let result = "";
      let bytes = 0;
      for (const character of String(value ?? "")) {
        const characterBytes = COMMENT_TEXT_ENCODER.encode(character).length;
        if (bytes + characterBytes > MAX_MARKER_COMMENT_BYTES) break;
        result += character;
        bytes += characterBytes;
      }
      return result;
    }
    function normalizeMarkerComment(value) {
      return limitCommentToByteLength(String(value ?? "").trim());
    }
    function markerComment(marker) {
      return isTankMarker(marker) && typeof marker.comment === "string" ? normalizeMarkerComment(marker.comment) : "";
    }
    function markerCommentImage(marker) {
      return isTankMarker(marker) && typeof marker.commentImage === "string" && COMMENT_IMAGES_BY_ID.has(marker.commentImage)
        ? COMMENT_IMAGES_BY_ID.get(marker.commentImage)
        : null;
    }
    function markerHasComment(marker) {
      return Boolean(markerComment(marker) || markerCommentImage(marker));
    }
    function linkedTankMarker(marker) {
      if (isTankMarker(marker)) return marker;
      if (!isRoleMarker(marker) || typeof marker.parentTankId !== "string") return null;
      return currentMarkers().find(item => item.id === marker.parentTankId && isTankMarker(item)) || null;
    }
    function linkedMarkers(marker) {
      const tank = linkedTankMarker(marker);
      if (!tank) return marker ? [marker] : [];
      return currentMarkers().filter(item => item.id === tank.id || item.parentTankId === tank.id);
    }
    function linkedRoleMarker(tankMarker) {
      return currentMarkers().find(marker => marker.parentTankId === tankMarker.id && isRoleMarker(marker)) || null;
    }
    function syncLinkedRoleMarkerPosition(tankMarker) {
      linkedMarkers(tankMarker).forEach(marker => {
        if (!isRoleMarker(marker)) return;
        marker.x = tankMarker.x;
        marker.y = tankMarker.y;
      });
    }
    function linkedAimAnnotations(tankMarker) {
      if (!isTankMarker(tankMarker)) return [];
      return currentAnnotations().filter(annotation => annotation.type === "aimHere" && annotation.parentTankId === tankMarker.id);
    }
    function syncLinkedAimAnnotationPosition(tankMarker) {
      linkedAimAnnotations(tankMarker).forEach(annotation => {
        annotation.startX = tankMarker.x;
        annotation.startY = tankMarker.y;
      });
    }
    function createLayoutId() {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    function modalLegendItems() {
      return Array.from(modalLegendList.querySelectorAll(".legend-item"));
    }
    function allLegendItems() {
      return [...legendItems, ...modalLegendItems()];
    }
    function isDrawingTool(type) {
      return type === "route";
    }
    function isLegendPlacementEnabled(type) {
      return isMarkerPlacementEnabled(type);
    }
    function bindLegendItem(item) {
      item.addEventListener("click", () => {
        if (legendDragActive) return;
        if (state.editMode && isDrawingTool(item.dataset.markerType)) {
          startRouteDrawing();
          return;
        }
        toggleLegendMarkerType(item.dataset.markerType);
      });
      item.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (state.editMode && isDrawingTool(item.dataset.markerType)) {
          startRouteDrawing();
          return;
        }
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
      legendGroups.forEach(sourceGroup => {
        const group = document.createElement("details");
        group.className = "legend-group";
        group.open = sourceGroup.open;
        group.append(sourceGroup.querySelector("summary").cloneNode(true));
        const list = document.createElement("ul");
        list.className = "legend-list";
        if (sourceGroup.querySelector("summary")?.dataset.i18n === "legendTactical") {
          const opacitySlot = document.createElement("li");
          opacitySlot.className = "annotation-opacity-slot";
          opacitySlot.dataset.annotationOpacityModalSlot = "";
          list.append(opacitySlot);
        }
        sourceGroup.querySelectorAll(".legend-item").forEach(source => {
          const item = source.cloneNode(true);
          item.classList.add("modal-legend-item");
          const placementEnabled = isLegendPlacementEnabled(item.dataset.markerType);
          item.draggable = state.editMode && placementEnabled;
          item.classList.toggle("is-placement-disabled", state.editMode && !placementEnabled && !isDrawingTool(item.dataset.markerType));
          item.setAttribute("aria-disabled", String(state.editMode && !placementEnabled && !isDrawingTool(item.dataset.markerType)));
          bindLegendItem(item);
          list.append(item);
        });
        group.append(list);
        modalLegendList.append(group);
      });
      mountAnnotationOpacityControl(modalLegendList.querySelector("[data-annotation-opacity-modal-slot]"));
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
      linkedMarkers(marker).forEach(linkedMarker => hiddenMarkers.add(markerIdentity(linkedMarker)));
      const tankMarker = linkedTankMarker(marker);
      if (tankMarker) linkedAimAnnotations(tankMarker).forEach(annotation => hiddenAnnotations.add(annotationIdentity(annotation)));
      renderMarkers();
      setMarkerStatus("markerHidden");
    }
    function deleteMarker(markerId) {
      const markers = currentMarkers();
      const marker = markers.find(item => item.id === markerId);
      if (!marker) return;
      const tankMarker = linkedTankMarker(marker);
      const linkedMarkerIds = new Set(linkedMarkers(marker).map(item => item.id));
      markerLayout.markers[currentMarkerKey()] = markers.filter(item => !linkedMarkerIds.has(item.id));
      [...linkedMarkerIds].forEach(id => hiddenMarkers.delete(`${currentMarkerKey()}|${id}`));
      if (tankMarker) {
        const linkedAnnotationIds = new Set(linkedAimAnnotations(tankMarker).map(annotation => annotation.id));
        const annotations = currentAnnotations();
        markerLayout.annotations[currentMarkerKey()] = annotations.filter(annotation => !linkedAnnotationIds.has(annotation.id));
        [...linkedAnnotationIds].forEach(id => hiddenAnnotations.delete(`${currentMarkerKey()}|${id}`));
      }
      persistMarkerLayout("markerDeleted", { touchMap: true });
      renderMarkers();
    }
    function hideAnnotation(annotation) {
      hiddenAnnotations.add(annotationIdentity(annotation));
      renderMarkers();
      setMarkerStatus("drawingHidden");
    }
    function deleteAnnotation(annotationId) {
      const annotations = currentAnnotations();
      const annotation = annotations.find(item => item.id === annotationId);
      if (!annotation) return;
      markerLayout.annotations[currentMarkerKey()] = annotations.filter(item => item.id !== annotationId);
      hiddenAnnotations.delete(annotationIdentity(annotation));
      persistMarkerLayout("drawingDeleted", { touchMap: true });
      renderMarkers();
    }
    function toggleDangerRoute(annotation) {
      if (!annotation || annotation.type !== "route") return;
      annotation.dangerRoute = !annotation.dangerRoute;
      persistMarkerLayout(annotation.dangerRoute ? "dangerRouteEnabled" : "dangerRouteDisabled", { touchMap: true });
      renderMarkers();
    }
    function applyRoleMarker(tankMarker, roleType) {
      if (!isTankMarker(tankMarker) || !ROLE_MARKER_TYPES.has(roleType)) return;
      const existingRoleMarker = linkedRoleMarker(tankMarker);
      if (existingRoleMarker) {
        existingRoleMarker.type = roleType;
        existingRoleMarker.x = tankMarker.x;
        existingRoleMarker.y = tankMarker.y;
      } else {
        currentMarkers().push({
          id: createLayoutId(),
          type: roleType,
          x: tankMarker.x,
          y: tankMarker.y,
          parentTankId: tankMarker.id
        });
      }
      persistMarkerLayout("roleMarkerApplied", { touchMap: true });
      renderMarkers();
    }
    function resetCommentEditor(contextMenu) {
      const actionList = contextMenu.querySelector("[data-marker-action-list]");
      const editor = contextMenu.querySelector("[data-marker-comment-editor]");
      const input = contextMenu.querySelector("[data-marker-comment-input]");
      actionList.hidden = false;
      editor.hidden = true;
      input.value = "";
      renderCommentImageOptions(contextMenu);
      updateCommentByteCounter(input);
    }
    function renderCommentImageOptions(contextMenu, selectedImageId = "") {
      const picker = contextMenu.querySelector("[data-marker-comment-image-picker]");
      const resolvedImageId = COMMENT_IMAGES_BY_ID.has(selectedImageId) ? selectedImageId : "";
      const options = document.createDocumentFragment();
      const noImageOption = document.createElement("button");
      noImageOption.type = "button";
      noImageOption.className = "marker-comment-image-option no-image";
      noImageOption.dataset.markerCommentImageOption = "";
      noImageOption.setAttribute("role", "radio");
      noImageOption.setAttribute("aria-checked", String(!resolvedImageId));
      noImageOption.classList.toggle("selected", !resolvedImageId);
      noImageOption.textContent = t("noCommentImage");
      options.append(noImageOption);
      COMMENT_IMAGES.forEach(image => {
        const option = document.createElement("button");
        const thumbnail = document.createElement("img");
        const label = document.createElement("span");
        const isSelected = image.id === resolvedImageId;
        option.type = "button";
        option.className = "marker-comment-image-option";
        option.dataset.markerCommentImageOption = image.id;
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(isSelected));
        option.classList.toggle("selected", isSelected);
        option.title = image.label;
        thumbnail.src = image.path;
        thumbnail.alt = "";
        thumbnail.loading = "lazy";
        label.textContent = image.label;
        option.append(thumbnail, label);
        options.append(option);
      });
      picker.replaceChildren(options);
      picker.dataset.selectedImageId = resolvedImageId;
    }
    function selectCommentImage(contextMenu, imageId) {
      const picker = contextMenu.querySelector("[data-marker-comment-image-picker]");
      const resolvedImageId = COMMENT_IMAGES_BY_ID.has(imageId) ? imageId : "";
      picker.dataset.selectedImageId = resolvedImageId;
      contextMenu.querySelectorAll("[data-marker-comment-image-option]").forEach(option => {
        const isSelected = option.dataset.markerCommentImageOption === resolvedImageId;
        option.classList.toggle("selected", isSelected);
        option.setAttribute("aria-checked", String(isSelected));
      });
    }
    function updateCommentByteCounter(input) {
      const limitedValue = limitCommentToByteLength(input.value);
      if (input.value !== limitedValue) input.value = limitedValue;
      const counter = input.closest("[data-marker-comment-editor]").querySelector("[data-marker-comment-byte-counter]");
      counter.textContent = `${commentByteLength(input.value)} / ${MAX_MARKER_COMMENT_BYTES} B`;
    }
    function showCommentEditor(contextMenu, marker) {
      if (!isTankMarker(marker)) return;
      const actionList = contextMenu.querySelector("[data-marker-action-list]");
      const editor = contextMenu.querySelector("[data-marker-comment-editor]");
      const input = contextMenu.querySelector("[data-marker-comment-input]");
      state.commentMarkerId = marker.id;
      actionList.hidden = true;
      editor.hidden = false;
      input.value = markerComment(marker);
      renderCommentImageOptions(contextMenu, marker.commentImage);
      updateCommentByteCounter(input);
      input.focus();
    }
    function saveMarkerComment(marker, comment, imageId) {
      if (!isTankMarker(marker)) return;
      const value = normalizeMarkerComment(comment);
      const image = COMMENT_IMAGES_BY_ID.get(imageId);
      if (value) marker.comment = value;
      else delete marker.comment;
      if (image) marker.commentImage = image.id;
      else delete marker.commentImage;
      persistMarkerLayout(value || image ? "commentSaved" : "commentRemoved", { touchMap: true });
      renderMarkers();
    }
    function hideMarkerContextMenu() {
      markerContextMenu.hidden = true;
      modalMarkerContextMenu.hidden = true;
      resetCommentEditor(markerContextMenu);
      resetCommentEditor(modalMarkerContextMenu);
      state.contextMarkerId = null;
      state.commentMarkerId = null;
    }
    function hideAnnotationContextMenu() {
      annotationContextMenu.hidden = true;
      modalAnnotationContextMenu.hidden = true;
      state.contextAnnotationId = null;
    }
    function updateDrawingState() {
      const isDrawing = Boolean(state.drawing);
      mapStage.classList.toggle("is-drawing", isDrawing);
      modalMapStage.classList.toggle("is-drawing", isDrawing);
    }
    function cancelDrawing() {
      if (!state.drawing) return;
      state.drawing = null;
      updateDrawingState();
      renderMarkers();
    }
    function startAimHereDrawing(tankMarker) {
      if (!isTankMarker(tankMarker)) return;
      state.drawing = {
        type: "aimHere",
        parentTankId: tankMarker.id,
        startX: tankMarker.x,
        startY: tankMarker.y,
        endX: tankMarker.x,
        endY: tankMarker.y
      };
      hideAnnotationContextMenu();
      updateDrawingState();
      renderMarkers();
      setMarkerStatus("aimHerePrompt");
    }
    function startRouteDrawing() {
      if (!state.selected) return;
      if (hiddenMarkerTypes.has(markerTypeIdentity("route"))) {
        setMarkerStatus("routeHidden");
        return;
      }
      state.drawing = { type: "route", points: [], endX: null, endY: null };
      hideAnnotationContextMenu();
      updateDrawingState();
      renderMarkers();
      setMarkerStatus("routeStartPrompt");
    }
    function updateDrawingPreview(position) {
      if (!state.drawing || !position) return;
      if (state.drawing.type === "route" && !state.drawing.points.length) return;
      state.drawing.endX = position.x;
      state.drawing.endY = position.y;
      renderMarkers();
    }
    function completeDrawing(position) {
      if (!state.drawing || !position) return false;
      const drawing = state.drawing;
      if (drawing.type === "route") {
        drawing.points.push({ x: position.x, y: position.y });
        drawing.endX = position.x;
        drawing.endY = position.y;
        renderMarkers();
        setMarkerStatus(drawing.points.length === 1 ? "routeEndPrompt" : "routeContinuePrompt");
        return true;
      }
      drawing.endX = position.x;
      drawing.endY = position.y;
      currentAnnotations().push({ id: createLayoutId(), ...drawing });
      state.drawing = null;
      updateDrawingState();
      persistMarkerLayout(drawing.type === "aimHere" ? "aimHereDrawn" : "routeDrawn", { touchMap: true });
      renderMarkers();
      return true;
    }
    function finishRouteDrawing() {
      const drawing = state.drawing;
      if (!drawing || drawing.type !== "route") return false;
      if (drawing.points.length >= 2) {
        currentAnnotations().push({ id: createLayoutId(), type: "route", points: drawing.points.map(point => ({ x: point.x, y: point.y })) });
        state.drawing = null;
        updateDrawingState();
        persistMarkerLayout("routeDrawn", { touchMap: true });
        renderMarkers();
      } else {
        cancelDrawing();
        setMarkerStatus("routeCancelled");
      }
      return true;
    }
    function updateMarkerContextActions(contextMenu, marker) {
      const roleActions = contextMenu.querySelector("[data-role-marker-actions]");
      const tankMarker = linkedTankMarker(marker);
      roleActions.hidden = !state.editMode || !tankMarker;
      contextMenu.querySelector("[data-marker-tool='aimHere']").hidden = !state.editMode || !tankMarker;
      contextMenu.querySelector("[data-marker-action='addComment']").hidden = !state.editMode || !isTankMarker(marker);
      contextMenu.querySelector("[data-marker-action='delete']").hidden = !state.editMode;
      if (!state.editMode || !tankMarker) return;
      const selectedRoleMarker = linkedRoleMarker(tankMarker);
      roleActions.querySelectorAll("[data-marker-role]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.markerRole === selectedRoleMarker?.type));
      });
    }
    function showMarkerContextMenu(event, markerButton, contextMenu = markerContextMenu, stage = mapStage) {
      const stageRect = stage.getBoundingClientRect();
      hideAnnotationContextMenu();
      resetCommentEditor(contextMenu);
      state.contextMarkerId = markerButton.dataset.markerId;
      markerContextMenu.hidden = contextMenu !== markerContextMenu;
      modalMarkerContextMenu.hidden = contextMenu !== modalMarkerContextMenu;
      updateMarkerContextActions(contextMenu, currentMarkers().find(marker => marker.id === state.contextMarkerId));
      contextMenu.hidden = false;
      const left = Math.min(Math.max(6, event.clientX - stageRect.left), stageRect.width - contextMenu.offsetWidth - 6);
      const top = Math.min(Math.max(6, event.clientY - stageRect.top), stageRect.height - contextMenu.offsetHeight - 6);
      contextMenu.style.left = `${left}px`;
      contextMenu.style.top = `${top}px`;
    }
    function showAnnotationContextMenu(event, annotationButton, contextMenu = annotationContextMenu, stage = mapStage) {
      const stageRect = stage.getBoundingClientRect();
      hideMarkerContextMenu();
      state.contextAnnotationId = annotationButton.dataset.annotationId;
      const annotation = currentAnnotations().find(item => item.id === state.contextAnnotationId);
      annotationContextMenu.hidden = contextMenu !== annotationContextMenu;
      modalAnnotationContextMenu.hidden = contextMenu !== modalAnnotationContextMenu;
      const dangerRouteAction = contextMenu.querySelector("[data-annotation-action='dangerRoute']");
      const dangerRouteDivider = contextMenu.querySelector("[data-danger-route-divider]");
      const isRoute = annotation?.type === "route";
      dangerRouteAction.hidden = !isRoute;
      dangerRouteDivider.hidden = !isRoute;
      dangerRouteAction.setAttribute("aria-checked", String(Boolean(annotation?.dangerRoute)));
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
    function routePoints(annotation) {
      if (Array.isArray(annotation.points)) return annotation.points;
      const { startX, startY, endX, endY } = annotation;
      return [startX, startY, endX, endY].every(Number.isFinite)
        ? [{ x: startX, y: startY }, { x: endX, y: endY }]
        : [];
    }
    function renderAnnotation(layer, annotation, isPreview = false) {
      if (annotation.type === "route") {
        renderRouteAnnotation(layer, annotation, isPreview);
        return;
      }
      renderAnnotationSegment(layer, annotation, isPreview);
    }
    function renderRouteAnnotation(layer, annotation, isPreview = false) {
      const points = routePoints(annotation);
      if (points.length < 2) return;
      const width = layer.clientWidth;
      const height = layer.clientHeight;
      const renderedPoints = points.map(point => ({
        x: (Number(point.x) / 100) * width,
        y: (Number(point.y) / 100) * height
      }));
      if (renderedPoints.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return;
      const routeScale = Math.min(width, height) / MAP_ROUTE_REFERENCE_SIZE;
      const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      drawing.classList.add("map-annotation", "route-line");
      if (annotation.dangerRoute) drawing.classList.add("is-danger-route");
      drawing.classList.toggle("is-special-dark-annotation", usesSpecialDarkAnnotationStyle(annotation));
      if (isPreview) drawing.classList.add("is-preview");
      drawing.classList.toggle("is-dimmed", !isPreview && Boolean(state.focusedTankMarkerId));
      drawing.dataset.annotationId = annotation.id || "preview";
      drawing.setAttribute("viewBox", `0 0 ${width} ${height}`);
      drawing.setAttribute("preserveAspectRatio", "none");
      drawing.setAttribute("role", "button");
      drawing.setAttribute("aria-label", t(annotation.type));
      const route = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      route.setAttribute("points", renderedPoints.map(point => `${point.x},${point.y}`).join(" "));
      route.setAttribute("stroke-width", String(ROUTE_BASE_STROKE * routeScale));
      route.setAttribute("stroke-dasharray", `${ROUTE_BASE_DASH_LENGTH * routeScale} ${ROUTE_BASE_DASH_GAP * routeScale}`);
      drawing.append(route);
      layer.append(drawing);
    }
    function renderAnnotationSegment(layer, annotation, isPreview = false) {
      const startX = Number(annotation.startX);
      const startY = Number(annotation.startY);
      const endX = Number(annotation.endX);
      const endY = Number(annotation.endY);
      if (![startX, startY, endX, endY].every(Number.isFinite)) return;
      const width = layer.clientWidth;
      const height = layer.clientHeight;
      const mapScale = Math.min(width, height) / MAP_DRAWING_REFERENCE_SIZE;
      const fromX = (startX / 100) * width;
      const fromY = (startY / 100) * height;
      const toX = (endX / 100) * width;
      const toY = (endY / 100) * height;
      const length = Math.hypot(toX - fromX, toY - fromY);
      if (length < 1) return;
      const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);
      const drawing = document.createElement("button");
      drawing.type = "button";
      drawing.className = `map-annotation ${annotation.type === "aimHere" ? "aim-arrow" : "route-line"}${annotation.type === "route" && annotation.dangerRoute ? " is-danger-route" : ""}${isPreview ? " is-preview" : ""}`;
      drawing.classList.toggle("is-special-dark-annotation", usesSpecialDarkAnnotationStyle(annotation));
      drawing.classList.toggle("is-dimmed", !isPreview && Boolean(state.focusedTankMarkerId) && annotation.parentTankId !== state.focusedTankMarkerId);
      drawing.dataset.annotationId = annotation.id || "preview";
      drawing.style.left = `${fromX}px`;
      drawing.style.width = `${length}px`;
      drawing.style.transform = `rotate(${angle}deg)`;
      drawing.setAttribute("aria-label", t(annotation.type));
      const strokeWidth = AIM_ARROW_BASE_STROKE * mapScale;
      const scaledHeadLength = AIM_ARROW_HEAD_BASE_LENGTH * mapScale;
      const headLength = Math.min(scaledHeadLength, length);
      const headHeight = AIM_ARROW_HEAD_BASE_HEIGHT * mapScale * (headLength / scaledHeadLength);
      const arrowHeight = Math.max(strokeWidth, headHeight);
      drawing.style.height = `${arrowHeight}px`;
      drawing.style.top = `${fromY - (arrowHeight / 2)}px`;
      drawing.style.transformOrigin = `0 ${arrowHeight / 2}px`;
      const shaft = document.createElement("span");
      shaft.className = "aim-arrow-shaft";
      shaft.style.top = `${(arrowHeight - strokeWidth) / 2}px`;
      shaft.style.height = `${strokeWidth}px`;
      shaft.style.width = `${Math.max(0, length - headLength)}px`;
      const arrowHead = document.createElement("span");
      arrowHead.className = "aim-arrow-head";
      arrowHead.setAttribute("aria-hidden", "true");
      arrowHead.style.left = `${Math.max(0, length - headLength)}px`;
      arrowHead.style.top = `${(arrowHeight - headHeight) / 2}px`;
      arrowHead.style.borderTopWidth = `${headHeight / 2}px`;
      arrowHead.style.borderBottomWidth = `${headHeight / 2}px`;
      arrowHead.style.borderLeftWidth = `${headLength}px`;
      drawing.append(shaft, arrowHead);
      layer.append(drawing);
    }
    function renderAnnotationLayer(layer, image) {
      layer.replaceChildren();
      if (!state.selected || image.hidden || !layer.clientWidth || !layer.clientHeight) return;
      currentAnnotations().forEach(annotation => {
        if (!ANNOTATION_TYPES.has(annotation.type) || isAnnotationHidden(annotation)) return;
        renderAnnotation(layer, annotation);
      });
      if (!state.drawing) return;
      if (state.drawing.type !== "route") {
        renderAnnotation(layer, state.drawing, true);
        return;
      }
      const points = state.drawing.points.map(point => ({ x: point.x, y: point.y }));
      const lastPoint = points.at(-1);
      if (lastPoint && Number.isFinite(state.drawing.endX) && Number.isFinite(state.drawing.endY) && (lastPoint.x !== state.drawing.endX || lastPoint.y !== state.drawing.endY)) {
        points.push({ x: state.drawing.endX, y: state.drawing.endY });
      }
      renderAnnotation(layer, { id: "preview", type: "route", points }, true);
    }
    function renderMapOverlayLayer(layer, image) {
      layer.replaceChildren();
      if (!state.selected || image.hidden || !layer.clientWidth || !layer.clientHeight) return;
      currentMapOverlays().forEach(overlayConfig => {
        if (hiddenMarkerTypes.has(markerTypeIdentity(overlayConfig.type))) return;
        const overlayMap = state.selected;
        let fileIndex = overlayConfig.files.findIndex(file => !unavailableMapOverlayFiles.has(mapOverlayIdentity(overlayMap, file)));
        if (fileIndex < 0) return;
        const overlay = document.createElement("img");
        overlay.className = "map-area-overlay";
        overlay.classList.toggle("is-dimmed", Boolean(state.focusedTankMarkerId));
        overlay.alt = "";
        const loadOverlayFile = () => {
          overlay.src = mapOverlayPath(overlayMap, overlayConfig.files[fileIndex]);
        };
        overlay.addEventListener("error", () => {
          unavailableMapOverlayFiles.add(mapOverlayIdentity(overlayMap, overlayConfig.files[fileIndex]));
          fileIndex = overlayConfig.files.findIndex((file, index) => index > fileIndex && !unavailableMapOverlayFiles.has(mapOverlayIdentity(overlayMap, file)));
          if (fileIndex < 0) {
            overlay.remove();
            return;
          }
          loadOverlayFile();
        });
        loadOverlayFile();
        layer.append(overlay);
      });
    }
    function renderMarkerLayer(layer, image) {
      layer.replaceChildren();
      if (!state.selected || image.hidden) return;
      const markerSize = MAP_MARKER_BASE_SIZE * (Math.min(layer.clientWidth, layer.clientHeight) / MAP_MARKER_REFERENCE_SIZE);
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
        const belongsToFocusedTank = marker.id === state.focusedTankMarkerId || marker.parentTankId === state.focusedTankMarkerId;
        button.classList.toggle("is-dimmed", Boolean(state.focusedTankMarkerId) && !belongsToFocusedTank);
        button.draggable = state.editMode && isMarkerPlacementEnabled(marker.type);
        button.style.left = `${Math.min(100, Math.max(0, x))}%`;
        button.style.top = `${Math.min(100, Math.max(0, y))}%`;
        button.style.zIndex = String(markerRenderZIndex(marker.type));
        button.dataset.markerPriority = String(markerRenderZIndex(marker.type));
        const markerLabel = t(marker.type);
        if (state.editMode) {
          const editTitle = t("markerEditTitle");
          button.title = editTitle;
          button.setAttribute("aria-label", `${markerLabel} — ${editTitle}`);
        } else {
          button.setAttribute("aria-label", markerLabel);
          if (isTankMarker(marker)) button.setAttribute("aria-pressed", String(marker.id === state.focusedTankMarkerId));
        }
        const icon = document.createElement("img");
        icon.src = markerIconPath(marker, type.icon);
        icon.alt = "";
        icon.classList.toggle("is-special-role-marker", usesSpecialMarkerStyle() && isRoleMarker(marker));
        icon.style.width = `${markerSize}px`;
        icon.style.height = `${markerSize}px`;
        button.append(icon);
        const comment = markerComment(marker);
        const commentImage = markerCommentImage(marker);
        if (markerHasComment(marker) && !state.editMode) {
          const tooltip = document.createElement("span");
          tooltip.className = "map-marker-comment";
          if (commentImage) {
            const image = document.createElement("img");
            image.className = "map-marker-comment-image";
            image.src = commentImage.path;
            image.alt = commentImage.label;
            tooltip.append(image);
          }
          if (comment) {
            const text = document.createElement("span");
            text.className = "map-marker-comment-text";
            text.textContent = comment;
            tooltip.append(text);
          }
          button.classList.add("has-comment");
          button.dataset.commentPlacement = y > 50 ? "above" : "below";
          button.dataset.commentAlign = x < 25 ? "start" : x > 75 ? "end" : "center";
          button.append(tooltip);
        }
        layer.append(button);
      });
    }
    function renderMarkers() {
      const focusedTankMarker = currentMarkers().find(marker => marker.id === state.focusedTankMarkerId);
      if (state.focusedTankMarkerId && (!isTankMarker(focusedTankMarker) || isMarkerHidden(focusedTankMarker))) state.focusedTankMarkerId = null;
      syncMarkerLayer(mapOverlayLayer, mapImage, mapStage);
      renderMapOverlayLayer(mapOverlayLayer, mapImage);
      syncMarkerLayer(annotationLayer, mapImage, mapStage);
      renderAnnotationLayer(annotationLayer, mapImage);
      syncMarkerLayer(markerLayer, mapImage, mapStage);
      renderMarkerLayer(markerLayer, mapImage);
      if (!dialog.open) return;
      syncMarkerLayer(modalMapOverlayLayer, modalImage, modalMapStage);
      renderMapOverlayLayer(modalMapOverlayLayer, modalImage);
      syncMarkerLayer(modalAnnotationLayer, modalImage, modalMapStage);
      renderAnnotationLayer(modalAnnotationLayer, modalImage);
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
      markerEditorNote.hidden = !state.editMode;
      modalMarkerEditorNote.hidden = !state.editMode;
      copyLink.hidden = state.editMode;
      editorActions.forEach(action => { action.hidden = !state.editMode; });
      allLegendItems().forEach(item => {
        const placementEnabled = isLegendPlacementEnabled(item.dataset.markerType);
        const drawingTool = isDrawingTool(item.dataset.markerType);
        item.draggable = state.editMode && placementEnabled;
        item.classList.toggle("is-placement-disabled", state.editMode && !placementEnabled && !drawingTool);
        item.setAttribute("aria-disabled", String(state.editMode && !placementEnabled && !drawingTool));
      });
    }
    function setEditorMode(enabled) {
      if (!enabled) cancelDrawing();
      state.editMode = enabled;
      state.focusedTankMarkerId = null;
      hideMarkerContextMenu();
      updateMarkerEditor();
      renderMarkers();
      setMarkerStatus();
    }
    async function exportMarkerLayoutData() {
      const exportData = {
        version: markerLayout.version,
        mapUpdated: markerLayout.mapUpdated || {},
        mapUpdatedAt: markerLayout.mapUpdatedAt || {},
        markers: markerLayout.markers,
        annotations: markerLayout.annotations,
        ...(markerLayout.updatedAt ? { updatedAt: markerLayout.updatedAt } : {}),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      if (typeof window.showSaveFilePicker === "function") {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: DEFAULT_MARKER_LAYOUT_FILENAME,
            types: [{ description: "JSON files", accept: { "application/json": [".json"] } }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setMarkerStatus("exportedJson");
        } catch (error) {
          if (error?.name !== "AbortError") setMarkerStatus("exportFailed");
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = DEFAULT_MARKER_LAYOUT_FILENAME;
      document.body.append(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMarkerStatus("exportedJson");
    }
    function validateImportedMarkerLayout(data) {
      if (!data || typeof data !== "object" || Array.isArray(data) || data.version !== MARKER_LAYOUT_VERSION || !data.markers || typeof data.markers !== "object" || Array.isArray(data.markers) || (data.mapUpdated !== undefined && (!data.mapUpdated || typeof data.mapUpdated !== "object" || Array.isArray(data.mapUpdated))) || (data.mapUpdatedAt !== undefined && (!data.mapUpdatedAt || typeof data.mapUpdatedAt !== "object" || Array.isArray(data.mapUpdatedAt))) || (data.annotations !== undefined && (!data.annotations || typeof data.annotations !== "object" || Array.isArray(data.annotations)))) {
        throw new Error("Invalid marker layout.");
      }
      const layout = {
        version: MARKER_LAYOUT_VERSION,
        mapUpdated: Object.fromEntries(maps.map(map => [map.name, map.updated])),
        mapUpdatedAt: {},
        markers: {},
        annotations: {}
      };
      Object.entries(data.mapUpdated || {}).forEach(([mapName, updated]) => {
        if (!validMapNames.has(mapName) || typeof updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) throw new Error("Invalid map update date.");
        layout.mapUpdated[mapName] = updated;
      });
      Object.entries(data.mapUpdatedAt || {}).forEach(([mapName, updatedAt]) => {
        if (!validMapNames.has(mapName) || !validMapUpdatedAt(updatedAt)) throw new Error("Invalid map update timestamp.");
        layout.mapUpdatedAt[mapName] = updatedAt;
      });
      let markerCount = 0;
      Object.entries(data.markers).forEach(([key, markers]) => {
        if (!validMarkerLayoutKeys.has(key) || !Array.isArray(markers)) throw new Error("Invalid marker group.");
        const ids = new Set();
        layout.markers[key] = markers.map(marker => {
          const hasParentTankId = Object.prototype.hasOwnProperty.call(marker || {}, "parentTankId");
          const hasComment = Object.prototype.hasOwnProperty.call(marker || {}, "comment");
          const hasCommentImage = Object.prototype.hasOwnProperty.call(marker || {}, "commentImage");
          if (!marker || typeof marker !== "object" || Array.isArray(marker) || typeof marker.id !== "string" || !marker.id || ids.has(marker.id) || !markerTypes.has(marker.type) || !Number.isFinite(marker.x) || !Number.isFinite(marker.y) || marker.x < 0 || marker.x > 100 || marker.y < 0 || marker.y > 100 || (hasParentTankId && (!isRoleMarker(marker) || typeof marker.parentTankId !== "string" || !marker.parentTankId)) || (hasComment && (!isTankMarker(marker) || typeof marker.comment !== "string" || commentByteLength(marker.comment) > MAX_MARKER_COMMENT_BYTES)) || (hasCommentImage && (!isTankMarker(marker) || typeof marker.commentImage !== "string" || !COMMENT_IMAGES_BY_ID.has(marker.commentImage)))) {
            throw new Error("Invalid marker.");
          }
          markerCount += 1;
          if (markerCount > MAX_IMPORTED_MARKERS) throw new Error("Too many markers.");
          ids.add(marker.id);
          const importedMarker = { id: marker.id, type: marker.type, x: marker.x, y: marker.y };
          if (hasParentTankId) importedMarker.parentTankId = marker.parentTankId;
          if (hasComment && marker.comment.trim()) importedMarker.comment = normalizeMarkerComment(marker.comment);
          if (hasCommentImage) importedMarker.commentImage = marker.commentImage;
          return importedMarker;
        });
        const attachedTankIds = new Set();
        layout.markers[key].forEach(marker => {
          if (typeof marker.parentTankId !== "string") return;
          const tankMarker = layout.markers[key].find(item => item.id === marker.parentTankId);
          if (!isTankMarker(tankMarker) || attachedTankIds.has(tankMarker.id) || marker.x !== tankMarker.x || marker.y !== tankMarker.y) throw new Error("Invalid role marker.");
          attachedTankIds.add(tankMarker.id);
        });
      });
      let annotationCount = 0;
      let routePointCount = 0;
      Object.entries(data.annotations || {}).forEach(([key, annotations]) => {
        if (!validMarkerLayoutKeys.has(key) || !Array.isArray(annotations)) throw new Error("Invalid drawing group.");
        const ids = new Set();
        layout.annotations[key] = annotations.map(annotation => {
          const hasValidCoordinates = [annotation?.startX, annotation?.startY, annotation?.endX, annotation?.endY].every(value => Number.isFinite(value) && value >= 0 && value <= 100);
          const isAimHere = annotation?.type === "aimHere";
          const hasRoutePoints = Array.isArray(annotation?.points) && annotation.points.length >= 2 && annotation.points.every(point => point && typeof point === "object" && !Array.isArray(point) && Number.isFinite(point.x) && point.x >= 0 && point.x <= 100 && Number.isFinite(point.y) && point.y >= 0 && point.y <= 100);
          const isRoute = annotation?.type === "route";
          const hasLegacyRoute = !isAimHere && hasValidCoordinates;
          const hasDangerRoute = Object.prototype.hasOwnProperty.call(annotation || {}, "dangerRoute");
          if (!annotation || typeof annotation !== "object" || Array.isArray(annotation) || typeof annotation.id !== "string" || !annotation.id || ids.has(annotation.id) || !ANNOTATION_TYPES.has(annotation.type) || (isAimHere && (!hasValidCoordinates || typeof annotation.parentTankId !== "string" || !annotation.parentTankId)) || (!isAimHere && (!hasRoutePoints && !hasLegacyRoute)) || (!isAimHere && Object.prototype.hasOwnProperty.call(annotation, "parentTankId")) || (hasDangerRoute && (!isRoute || typeof annotation.dangerRoute !== "boolean"))) {
            throw new Error("Invalid drawing.");
          }
          const tankMarker = isAimHere ? layout.markers[key]?.find(marker => marker.id === annotation.parentTankId) : null;
          if (isAimHere && (!isTankMarker(tankMarker) || annotation.startX !== tankMarker.x || annotation.startY !== tankMarker.y)) throw new Error("Invalid aim drawing.");
          annotationCount += 1;
          if (annotationCount > MAX_IMPORTED_ANNOTATIONS) throw new Error("Too many drawings.");
          if (hasRoutePoints) {
            routePointCount += annotation.points.length;
            if (routePointCount > MAX_IMPORTED_ROUTE_POINTS) throw new Error("Too many route points.");
          }
          ids.add(annotation.id);
          if (isAimHere) return { id: annotation.id, type: annotation.type, parentTankId: annotation.parentTankId, startX: annotation.startX, startY: annotation.startY, endX: annotation.endX, endY: annotation.endY };
          const importedRoute = hasRoutePoints
            ? { id: annotation.id, type: annotation.type, points: annotation.points.map(point => ({ x: point.x, y: point.y })) }
            : { id: annotation.id, type: annotation.type, startX: annotation.startX, startY: annotation.startY, endX: annotation.endX, endY: annotation.endY };
          if (annotation.dangerRoute) importedRoute.dangerRoute = true;
          return importedRoute;
        });
      });
      return layout;
    }
    function applyMarkerLayout(importedLayout) {
      markerLayout.version = importedLayout.version;
      markerLayout.mapUpdated = importedLayout.mapUpdated;
      markerLayout.mapUpdatedAt = importedLayout.mapUpdatedAt;
      markerLayout.markers = importedLayout.markers;
      markerLayout.annotations = importedLayout.annotations;
      delete markerLayout.updatedAt;
      hiddenMarkers.clear();
      hiddenAnnotations.clear();
      hiddenMarkerTypes.clear();
      hideMarkerContextMenu();
      hideAnnotationContextMenu();
      updateLegendVisibility();
      updateSelectedMapDetails();
      renderMarkers();
    }
    async function importDefaultMarkerLayout() {
      if (!defaultMarkerLayout) throw new Error("Default marker layout could not be loaded.");
      applyMarkerLayout(validateImportedMarkerLayout(defaultMarkerLayout));
    }
    async function importMarkerLayoutFile(file) {
      if (!file || file.size > 2 * 1024 * 1024) {
        setMarkerStatus("invalidJson");
        return;
      }
      try {
        applyMarkerLayout(validateImportedMarkerLayout(JSON.parse(await file.text())));
        persistMarkerLayout("importedJson");
      } catch (error) {
        setMarkerStatus("invalidJson");
      }
    }
    function requestMarkerLayoutImport() {
      markerLayoutImportFile.value = "";
      markerLayoutImportFile.click();
    }

    function mapPath(map, team) {
      const image = map.sharedImage || map.teamImages?.[team] || `${team}.png`;
      return `/img/${encodeAssetPath(map.folder)}/${encodeURIComponent(image)}`;
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
      mapList.innerHTML = displayed.map(map => {
        const selectedVariation = state.selected?.name === map.name ? state.selected : expandMapVariation(map);
        return `
        <a class="map-card ${state.selected?.name === map.name ? "active" : ""}" href="/maps/${map.slug}/" data-map="${map.name}">
          <span class="map-card-content"><span class="map-card-name">${mapLabel(map)}</span><span class="map-variation-tag">${mapVariationLabel(selectedVariation)}</span></span><span class="map-card-arrow" aria-hidden="true">→</span>
        </a>`;
      }).join("");
    }
    function currentMapUrl() {
      if (!state.selected) return null;
      const url = new URL(`/maps/${state.selected.slug}/`, window.location.origin);
      url.searchParams.set("team", state.team.toLowerCase());
      url.searchParams.set("mode", state.selected.variationId);
      return url;
    }
    function updateUrl(historyMode = "replace") {
      if (!state.selected) return;
      const url = currentMapUrl();
      window.history[`${historyMode}State`]({}, "", url);
      updateMapDocumentMetadata();
    }
    function copyTextFallback(value) {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Copy command failed");
    }
    async function copyCurrentMapLink() {
      const url = currentMapUrl();
      if (!url) return;
      window.clearTimeout(copyLinkFeedbackTimer);
      copyLink.classList.remove("copied", "failed");
      try {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(url.href);
          } catch (error) {
            copyTextFallback(url.href);
          }
        } else {
          copyTextFallback(url.href);
        }
        copyLink.classList.add("copied");
        copyLinkLabel.textContent = t("linkCopied");
      } catch (error) {
        copyLink.classList.add("failed");
        copyLinkLabel.textContent = t("copyLinkFailed");
      }
      copyLinkFeedbackTimer = window.setTimeout(() => {
        copyLink.classList.remove("copied", "failed");
        copyLinkLabel.textContent = t("copyLink");
      }, 2200);
    }
    function setModalMapSource() {
      if (!state.selected) return;
      modalImage.hidden = true;
      modalMapOverlayLayer.replaceChildren();
      modalAnnotationLayer.replaceChildren();
      modalMarkerLayer.replaceChildren();
      modalImage.alt = `${mapLabel(state.selected)} ${mapVariationLabel(state.selected)} ${state.team}`;
      modalImage.src = mapPath(state.selected, state.team);
      $("#modal-title").textContent = `${mapLabel(state.selected)} · ${mapVariationLabel(state.selected)} · ${state.team.toUpperCase()} ${t("teamLabel")}`;
    }
    function selectMap(map, team = state.team, variationId, { historyMode = "replace", syncUrl = true } = {}) {
      const baseMap = findBaseMap(map);
      const preferredVariationId = variationId || (state.selected?.name === baseMap.name ? state.selected.variationId : null);
      cancelDrawing();
      state.focusedTankMarkerId = null;
      state.selected = expandMapVariation(baseMap, preferredVariationId);
      state.team = team;
      hideMarkerContextMenu();
      updateSelectedMapDetails();
      updateLegendVisibility();
      document.querySelectorAll(".team-button").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.team === team));
      });
      mapImage.hidden = true;
      mapStage.classList.remove("loaded", "load-error");
      mapOverlayLayer.replaceChildren();
      markerLayer.replaceChildren();
      annotationLayer.replaceChildren();
      imageStatus.textContent = t("loading");
      mapImage.alt = `${mapLabel(state.selected)} ${mapVariationLabel(state.selected)} ${team}`;
      mapImage.src = mapPath(state.selected, team);
      if (dialog.open) setModalMapSource();
      renderList();
      if (syncUrl) updateUrl(historyMode);
    }
    function setTeam(team) {
      if (state.selected) selectMap(state.selected, team);
    }
    function restoreFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const routeMatch = window.location.pathname.match(/^\/maps\/([^/]+)\/?$/);
      const routeSlug = routeMatch ? decodeURIComponent(routeMatch[1]) : null;
      const legacyName = params.get("map");
      const correctedLegacyName = LEGACY_MAP_NAMES.get(legacyName) || legacyName;
      const routeMap = maps.find(item => item.slug === routeSlug);
      const legacyMap = maps.find(item => item.name === correctedLegacyName);
      const variationId = params.get("mode") || params.get("variation");
      const team = params.get("team")?.toLowerCase() === "blue" ? "Blue" : "Red";
      if (routeMap) {
        selectMap(routeMap, team, variationId, { syncUrl: false });
      } else if (legacyMap) {
        selectMap(legacyMap, team, variationId);
      } else {
        updateLibraryDocumentMetadata();
        selectMap(maps[0], team, variationId, { syncUrl: false });
      }
    }
    function resetHiddenMarkersForCurrentMap() {
      const markerKey = currentMarkerKey();
      if (!markerKey) return;
      [...hiddenMarkers].filter(id => id.startsWith(`${markerKey}|`)).forEach(id => hiddenMarkers.delete(id));
      [...hiddenAnnotations].filter(id => id.startsWith(`${markerKey}|`)).forEach(id => hiddenAnnotations.delete(id));
      [...hiddenMarkerTypes].filter(id => id.startsWith(`${markerKey}|`)).forEach(id => hiddenMarkerTypes.delete(id));
      updateLegendVisibility();
      renderMarkers();
      setMarkerStatus("hiddenReset");
    }
    async function resetAllPlacedMarkers() {
      if (!window.confirm(t("confirmResetAll"))) return;
      try {
        await importDefaultMarkerLayout();
        persistMarkerLayout("defaultLayoutRestored");
      } catch (error) {
        console.error("Default marker layout reset failed.", error);
        setMarkerStatus("defaultLayoutLoadError");
      }
    }
    function bindMarkerLayer(layer, stage, contextMenu) {
      layer.addEventListener("click", event => {
        if (state.editMode) return;
        const markerButton = event.target.closest(".map-marker");
        if (!markerButton) return;
        const marker = currentMarkers().find(item => item.id === markerButton.dataset.markerId);
        if (!isTankMarker(marker)) return;
        event.preventDefault();
        event.stopPropagation();
        hideMarkerContextMenu();
        hideAnnotationContextMenu();
        state.focusedTankMarkerId = state.focusedTankMarkerId === marker.id ? null : marker.id;
        renderMarkers();
      });
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
      layer.addEventListener("contextmenu", event => {
        const markerButton = event.target.closest(".map-marker");
        if (!markerButton) return;
        event.preventDefault();
        showMarkerContextMenu(event, markerButton, contextMenu, stage);
      });
    }
    function bindMarkerStage(stage, layer, drawingLayer) {
      stage.addEventListener("pointermove", event => {
        if (!state.drawing) return;
        updateDrawingPreview(markerPosition(event, drawingLayer));
      });
      stage.addEventListener("click", event => {
        if (!state.drawing) return;
        const position = markerPosition(event, drawingLayer);
        if (!completeDrawing(position)) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
      stage.addEventListener("contextmenu", event => {
        if (state.drawing?.type !== "route") return;
        event.preventDefault();
        event.stopPropagation();
        finishRouteDrawing();
      }, true);
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
          if (isTankMarker(existingMarker)) {
            syncLinkedRoleMarkerPosition(existingMarker);
            syncLinkedAimAnnotationPosition(existingMarker);
          }
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
        persistMarkerLayout("savedLocally", { touchMap: true });
        renderMarkers();
      });
    }
    function bindMarkerContextMenu(contextMenu) {
      contextMenu.addEventListener("click", event => {
        const roleType = event.target.closest("[data-marker-role]")?.dataset.markerRole;
        const drawingTool = event.target.closest("[data-marker-tool]")?.dataset.markerTool;
        const action = event.target.closest("[data-marker-action]")?.dataset.markerAction;
        const commentAction = event.target.closest("[data-marker-comment-action]")?.dataset.markerCommentAction;
        const commentImageOption = event.target.closest("[data-marker-comment-image-option]");
        if (!state.contextMarkerId) return;
        const marker = currentMarkers().find(item => item.id === state.contextMarkerId);
        if (commentImageOption && marker?.id === state.commentMarkerId) {
          selectCommentImage(contextMenu, commentImageOption.dataset.markerCommentImageOption);
          return;
        }
        if (roleType && marker) {
          const tankMarker = linkedTankMarker(marker);
          if (tankMarker) applyRoleMarker(tankMarker, roleType);
          hideMarkerContextMenu();
          return;
        }
        if (drawingTool === "aimHere" && marker) {
          const tankMarker = linkedTankMarker(marker);
          if (tankMarker) startAimHereDrawing(tankMarker);
          hideMarkerContextMenu();
          return;
        }
        if (action === "addComment" && marker) {
          showCommentEditor(contextMenu, marker);
          return;
        }
        if (commentAction === "save" && marker && marker.id === state.commentMarkerId) {
          saveMarkerComment(
            marker,
            contextMenu.querySelector("[data-marker-comment-input]").value,
            contextMenu.querySelector("[data-marker-comment-image-picker]").dataset.selectedImageId
          );
          hideMarkerContextMenu();
          return;
        }
        if (commentAction === "cancel") {
          hideMarkerContextMenu();
          return;
        }
        if (!action) return;
        if (action === "hide" && marker) hideMarker(marker);
        if (action === "delete") deleteMarker(state.contextMarkerId);
        hideMarkerContextMenu();
      });
    }
    function bindAnnotationLayer(layer, stage, contextMenu) {
      layer.addEventListener("contextmenu", event => {
        const annotationButton = event.target.closest(".map-annotation:not(.is-preview)");
        if (!annotationButton) return;
        event.preventDefault();
        if (!state.editMode) return;
        showAnnotationContextMenu(event, annotationButton, contextMenu, stage);
      });
    }
    function bindAnnotationContextMenu(contextMenu) {
      contextMenu.addEventListener("click", event => {
        const action = event.target.closest("[data-annotation-action]")?.dataset.annotationAction;
        if (!action || !state.contextAnnotationId) return;
        const annotation = currentAnnotations().find(item => item.id === state.contextAnnotationId);
        if (action === "dangerRoute" && annotation) toggleDangerRoute(annotation);
        if (action === "hide" && annotation) hideAnnotation(annotation);
        if (action === "delete") deleteAnnotation(state.contextAnnotationId);
        hideAnnotationContextMenu();
      });
    }
    function openMapModal() {
      buildModalLegend();
      dialog.showModal();
      setModalMapSource();
      window.requestAnimationFrame(renderMarkers);
    }

    function syncMapIndexHeight() {
      const viewerHeight = Math.ceil(mapViewer.getBoundingClientRect().height);
      workspace.style.setProperty("--map-index-height", `${viewerHeight}px`);
    }

    if ("ResizeObserver" in window) {
      const mapViewerResizeObserver = new ResizeObserver(syncMapIndexHeight);
      mapViewerResizeObserver.observe(mapViewer);
    }
    syncMapIndexHeight();

    mapList.addEventListener("click", event => {
      const card = event.target.closest("[data-map]");
      if (!card) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectMap(maps.find(map => map.name === card.dataset.map), state.team, undefined, { historyMode: "push" });
    });
    search.addEventListener("input", () => {
      state.query = search.value;
      clearSearch.classList.toggle("visible", Boolean(search.value));
      renderList();
    });
    clearSearch.addEventListener("click", () => { search.value = ""; search.dispatchEvent(new Event("input")); search.focus(); });
    mapVariationSelect.addEventListener("change", () => {
      if (state.selected) selectMap(state.selected, state.team, mapVariationSelect.value);
    });
    copyLink.addEventListener("click", copyCurrentMapLink);
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
    annotationOpacitySlider.addEventListener("input", () => setAnnotationOpacity(annotationOpacitySlider.value));
    legendItems.forEach(bindLegendItem);
    bindMarkerLayer(markerLayer, mapStage, markerContextMenu);
    bindMarkerLayer(modalMarkerLayer, modalMapStage, modalMarkerContextMenu);
    bindAnnotationLayer(annotationLayer, mapStage, annotationContextMenu);
    bindAnnotationLayer(modalAnnotationLayer, modalMapStage, modalAnnotationContextMenu);
    bindMarkerStage(mapStage, markerLayer, annotationLayer);
    bindMarkerStage(modalMapStage, modalMarkerLayer, modalAnnotationLayer);
    document.querySelectorAll("[data-marker-comment-input]").forEach(input => {
      input.addEventListener("input", () => updateCommentByteCounter(input));
      updateCommentByteCounter(input);
    });
    bindMarkerContextMenu(markerContextMenu);
    bindMarkerContextMenu(modalMarkerContextMenu);
    bindAnnotationContextMenu(annotationContextMenu);
    bindAnnotationContextMenu(modalAnnotationContextMenu);
    document.addEventListener("click", event => {
      if (!state.editMode && state.focusedTankMarkerId) {
        state.focusedTankMarkerId = null;
        renderMarkers();
      }
      if (!markerContextMenu.contains(event.target) && !modalMarkerContextMenu.contains(event.target)) hideMarkerContextMenu();
      if (!annotationContextMenu.contains(event.target) && !modalAnnotationContextMenu.contains(event.target)) hideAnnotationContextMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        cancelDrawing();
        hideMarkerContextMenu();
        hideAnnotationContextMenu();
      }
    });
    mapImage.addEventListener("load", () => {
      mapImage.hidden = false;
      mapStage.classList.add("loaded");
      renderMarkers();
    });
    mapImage.addEventListener("error", () => {
      mapStage.classList.add("load-error");
      mapOverlayLayer.replaceChildren();
      annotationLayer.replaceChildren();
      markerLayer.replaceChildren();
      imageStatus.textContent = t("imageError");
    });
    modalImage.addEventListener("load", () => {
      modalImage.hidden = false;
      renderMarkers();
    });
    modalImage.addEventListener("error", () => {
      modalMapOverlayLayer.replaceChildren();
      modalAnnotationLayer.replaceChildren();
      modalMarkerLayer.replaceChildren();
    });
    window.addEventListener("resize", renderMarkers);
    window.addEventListener("popstate", restoreFromUrl);
    mapImage.addEventListener("click", () => {
      if (!state.selected || mapImage.hidden) return;
      openMapModal();
    });
    $(".close-modal").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      mountAnnotationOpacityControl(annotationOpacityMainSlot);
      cancelDrawing();
      state.focusedTankMarkerId = null;
      hideMarkerContextMenu();
      hideAnnotationContextMenu();
      modalMapOverlayLayer.replaceChildren();
      modalAnnotationLayer.replaceChildren();
      modalMarkerLayer.replaceChildren();
      renderMarkers();
    });
    setAnnotationOpacity(state.annotationOpacity, { persist: false });
    setLanguage("en");
    if (!markerLayout.updatedAt) {
      try {
        await importDefaultMarkerLayout();
        saveMarkerLayoutToStorage(MARKER_STORAGE_KEY, markerLayout);
      } catch (error) {
        setMarkerStatus("defaultLayoutLoadError");
      }
    }
    restoreFromUrl();
    initDiscordMemberCount();
