const tierRoot = document.querySelector("#tier-content-view");

if (tierRoot) {
  const TIER_ZONES = Object.freeze(["s", "a", "b", "c", "d", "pool"]);
  const STORAGE_KEY = "maptactic-tier-maker-v1";

  const FILES = Object.freeze({
    tank: [
      "CN 99A.png",
      "CN M1A2T.png",
      "CN VT4A1.png",
      "DE Leopard 2A7V.png",
      "FR Leclerc AZUR.png",
      "FR Leclerc SXXI.png",
      "FR Leopard 2A6NL.png",
      "IL Merkava Siman 4M.png",
      "IT Ariete AMV.png",
      "IT Leopard 2A7HU.png",
      "JP BM Oplot-T.png",
      "JP Leopard 2RI.png",
      "JP TKX.png",
      "JP Type 10.png",
      "RU T-80BVM.png",
      "RU T-90M Arena-M.png",
      "SE Leopard 2A6.png",
      "SE Strv 122B PLSS.png",
      "SE Strv 122B+.png",
      "UK Challenger 2E.png",
      "UK Challenger 3 TD.png",
      "UK M1A2 SEPv3.png",
      "US M1A2 SEPv2 Trophy-HV.png",
      "US M1A2 SEPv3.png"
    ],
    air: [
      "CN F-16V.png",
      "CN J-10C.png",
      "CN J-15T.png",
      "DE EF-2000.png",
      "DE FA-18C Late Hornet.png",
      "FR Rafale C F3-R.png",
      "FR Rafale M F3-R.png",
      "IL F-15C Baz.png",
      "IL F-15I Ra'am.png",
      "IL F-16C Block 40 Barak ii.png",
      "IT F-2000A.png",
      "IT JAS39EBS HU C Gripen.png",
      "JP F-15JM Eagle.png",
      "JP JAS39C Gripen.png",
      "JP Su-30MKM.png",
      "RU SU-30SM2.png",
      "RU Su-34.png",
      "SE JAS39E Gripen.png",
      "UK EF-2000 Typhoon.png",
      "UK FA-18E Block 2 Super Hornet.png",
      "US F-15C Golden Eagle.png",
      "US F-16CM PoBIT.png",
      "US FA-18E Block 2 Super Hornet.png"
    ]
  });

  const META = Object.freeze({
    tank: { folder: "Tank", titleKey: "groundTitle", labelKey: "groundForces" },
    air: { folder: "Air", titleKey: "airTitle", labelKey: "aircraft" }
  });

  const COPY = Object.freeze({
    en: {
      contentNavigation: "Content selection",
      mapView: "TACTICAL MAP LIBRARY",
      tierView: "WAR THUNDER TIER LIST",
      categoryNavigation: "Tier list category",
      tierEyebrow: "WAR THUNDER · RANKING LAB",
      tierTitleFirst: "BUILD YOUR",
      tierTitleSecond: "TIER LIST",
      tierHeroCopy: "Drag vehicle and aircraft cards to build your own tier list. Your layout is saved automatically in this browser.",
      groundForces: "GROUND FORCES",
      tankShort: "TANK",
      aircraft: "AIRCRAFT",
      airShort: "AIR",
      groundTitle: "War Thunder Ground Vehicle Tier List",
      airTitle: "War Thunder Aircraft Tier List",
      reset: "RESET",
      instructions: "Drag a card, or select it and then choose a tier row.",
      availableUnits: "AVAILABLE UNITS",
      unranked: "Unranked",
      unrankedUnits: "Unranked units",
      tierBoard: "Tier board",
      dragHint: "drag or select",
      selected: name => `${name} selected. Choose a tier.`,
      selectionCleared: "Selection cleared.",
      saved: "Saved locally.",
      resetDone: "Tier list reset.",
      storageError: "This browser could not save the layout.",
      count: (ranked, unranked) => `${ranked} ranked · ${unranked} unranked`,
      mapDocumentTitle: "WarDevOps | War Thunder Map Tactic",
      tierDocumentTitle: "WarDevOps | War Thunder Tier List",
      mapDescription: "Explore War Thunder maps, team positions, tactical markers, routes, and key combat areas with WarDevOps MapTactic.",
      tierDescription: "Create and save a War Thunder ground vehicle or aircraft tier list with WarDevOps MapTactic."
    },
    ko: {
      contentNavigation: "콘텐츠 선택",
      mapView: "TACTICAL MAP LIBRARY",
      tierView: "WAR THUNDER TIER LIST",
      categoryNavigation: "티어 리스트 분류",
      tierEyebrow: "워썬더 · 랭킹 연구소",
      tierTitleFirst: "나만의",
      tierTitleSecond: "티어 리스트",
      tierHeroCopy: "전차와 항공기 카드를 드래그해 나만의 티어표를 만드세요. 배치는 이 브라우저에 자동 저장됩니다.",
      groundForces: "지상 장비",
      tankShort: "전차",
      aircraft: "항공기",
      airShort: "공중",
      groundTitle: "워썬더 지상 장비 티어 리스트",
      airTitle: "워썬더 항공기 티어 리스트",
      reset: "초기화",
      instructions: "카드를 드래그하거나, 카드를 선택한 뒤 원하는 티어 행을 누르세요.",
      availableUnits: "사용 가능한 장비",
      unranked: "미분류",
      unrankedUnits: "미분류 장비",
      tierBoard: "티어 보드",
      dragHint: "드래그 또는 선택",
      selected: name => `${name} 선택됨. 원하는 티어를 고르세요.`,
      selectionCleared: "선택을 해제했습니다.",
      saved: "이 브라우저에 저장했습니다.",
      resetDone: "티어 리스트를 초기화했습니다.",
      storageError: "이 브라우저에 배치를 저장할 수 없습니다.",
      count: (ranked, unranked) => `분류 ${ranked} · 미분류 ${unranked}`,
      mapDocumentTitle: "WarDevOps | 워썬더 전술 지도",
      tierDocumentTitle: "WarDevOps | 워썬더 티어 리스트",
      mapDescription: "워썬더 지도, 진영별 위치, 전술 범례, 이동 경로와 주요 교전 지역을 WarDevOps MapTactic에서 살펴보세요.",
      tierDescription: "WarDevOps MapTactic에서 워썬더 지상 장비와 항공기 티어 리스트를 만들고 저장하세요."
    }
  });

  const contentButtons = [...document.querySelectorAll("[data-content-target]")];
  const contentViews = [...document.querySelectorAll("[data-content-view]")];
  const categoryButtons = [...tierRoot.querySelectorAll("[data-tier-category]")];
  const dropzones = [...tierRoot.querySelectorAll("[data-tier-zone]")];
  const categoryLabel = tierRoot.querySelector("#tier-category-label");
  const templateTitle = tierRoot.querySelector("#tier-template-title");
  const unitCount = tierRoot.querySelector("#tier-unit-count");
  const saveStatus = tierRoot.querySelector("#tier-save-status");
  const resetButton = tierRoot.querySelector("#tier-reset");
  const descriptionMeta = document.querySelector('meta[name="description"]');

  let activeCategory = "tank";
  let activeView = "maps";
  let selectedItemId = null;
  let draggedItemId = null;
  let suppressNextClick = false;
  let statusState = null;

  function language() {
    return document.documentElement.lang === "ko" ? "ko" : "en";
  }

  function copy() {
    return COPY[language()];
  }

  function itemId(category, file) {
    return `${category}:${file}`;
  }

  function itemName(file) {
    return file.replace(/\.png$/i, "");
  }

  function allIds(category) {
    return FILES[category].map(file => itemId(category, file));
  }

  function emptyLayout(category) {
    return { s: [], a: [], b: [], c: [], d: [], pool: allIds(category) };
  }

  function sanitizeLayout(category, candidate) {
    const validIds = new Set(allIds(category));
    const seen = new Set();
    const layout = emptyLayout(category);
    TIER_ZONES.forEach(zone => {
      layout[zone] = [];
      const values = Array.isArray(candidate?.[zone]) ? candidate[zone] : [];
      values.forEach(id => {
        if (!validIds.has(id) || seen.has(id)) return;
        seen.add(id);
        layout[zone].push(id);
      });
    });
    validIds.forEach(id => {
      if (!seen.has(id)) layout.pool.push(id);
    });
    return layout;
  }

  function loadLayouts() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        tank: sanitizeLayout("tank", saved?.tank),
        air: sanitizeLayout("air", saved?.air)
      };
    } catch {
      return { tank: emptyLayout("tank"), air: emptyLayout("air") };
    }
  }

  const layouts = loadLayouts();

  function setStatus(key, value = "") {
    statusState = key ? { key, value } : null;
    renderStatus();
  }

  function renderStatus() {
    if (!statusState) {
      saveStatus.textContent = "";
      return;
    }
    const message = copy()[statusState.key];
    saveStatus.textContent = typeof message === "function" ? message(statusState.value) : message;
  }

  function persistLayouts(statusKey = "saved") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
      setStatus(statusKey);
    } catch {
      setStatus("storageError");
    }
  }

  function fileForId(id) {
    return id.startsWith(`${activeCategory}:`) ? id.slice(activeCategory.length + 1) : null;
  }

  function createCard(id) {
    const file = fileForId(id);
    if (!file || !FILES[activeCategory].includes(file)) return null;
    const name = itemName(file);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "tier-card";
    card.dataset.tierItemId = id;
    card.draggable = true;
    card.title = `${name} — ${copy().dragHint}`;
    card.setAttribute("aria-label", name);
    card.setAttribute("aria-pressed", String(selectedItemId === id));
    card.classList.toggle("is-selected", selectedItemId === id);

    const image = document.createElement("img");
    image.src = `${META[activeCategory].folder}/${encodeURIComponent(file)}`;
    image.alt = name;
    image.loading = "lazy";
    image.decoding = "async";
    card.append(image);

    card.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      selectedItemId = selectedItemId === id ? null : id;
      render();
      setStatus(selectedItemId ? "selected" : "selectionCleared", name);
    });
    card.addEventListener("dragstart", event => {
      draggedItemId = id;
      suppressNextClick = true;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      requestAnimationFrame(() => card.classList.add("is-dragging"));
    });
    card.addEventListener("dragend", () => {
      draggedItemId = null;
      card.classList.remove("is-dragging");
      dropzones.forEach(zone => zone.classList.remove("is-over"));
      window.setTimeout(() => { suppressNextClick = false; }, 0);
    });
    return card;
  }

  function removeFromLayout(id) {
    TIER_ZONES.forEach(zone => {
      const index = layouts[activeCategory][zone].indexOf(id);
      if (index !== -1) layouts[activeCategory][zone].splice(index, 1);
    });
  }

  function moveItem(id, targetZone, beforeId = null) {
    if (!allIds(activeCategory).includes(id) || !TIER_ZONES.includes(targetZone) || beforeId === id) return;
    removeFromLayout(id);
    const target = layouts[activeCategory][targetZone];
    const targetIndex = beforeId ? target.indexOf(beforeId) : -1;
    target.splice(targetIndex >= 0 ? targetIndex : target.length, 0, id);
    selectedItemId = null;
    persistLayouts();
    render();
  }

  function render() {
    const meta = META[activeCategory];
    categoryLabel.textContent = copy()[meta.labelKey];
    templateTitle.textContent = copy()[meta.titleKey];
    categoryButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.tierCategory === activeCategory)));

    dropzones.forEach(zone => {
      const zoneName = zone.dataset.tierZone;
      zone.replaceChildren();
      layouts[activeCategory][zoneName].forEach(id => {
        const card = createCard(id);
        if (card) zone.append(card);
      });
    });
    const rankedCount = TIER_ZONES
      .filter(zone => zone !== "pool")
      .reduce((count, zone) => count + layouts[activeCategory][zone].length, 0);
    unitCount.textContent = copy().count(rankedCount, layouts[activeCategory].pool.length);
    renderStatus();
  }

  function dropPosition(zone, event) {
    const targetCard = event.target.closest(".tier-card");
    if (!targetCard || targetCard.parentElement !== zone) return null;
    const rect = targetCard.getBoundingClientRect();
    if (event.clientX < rect.left + rect.width / 2) return targetCard.dataset.tierItemId;
    return targetCard.nextElementSibling?.dataset.tierItemId || null;
  }

  function updateDocumentMetadata() {
    const currentCopy = copy();
    const tierIsActive = activeView === "tier";
    document.title = tierIsActive ? currentCopy.tierDocumentTitle : currentCopy.mapDocumentTitle;
    descriptionMeta?.setAttribute("content", tierIsActive ? currentCopy.tierDescription : currentCopy.mapDescription);
  }

  function updateLanguage() {
    const currentCopy = copy();
    document.querySelectorAll("[data-tier-text]").forEach(element => {
      element.textContent = currentCopy[element.dataset.tierText];
    });
    document.querySelectorAll("[data-tier-aria]").forEach(element => {
      element.setAttribute("aria-label", currentCopy[element.dataset.tierAria]);
    });
    updateDocumentMetadata();
    render();
  }

  function setContentView(view, { updateHistory = false, moveFocus = false } = {}) {
    activeView = view === "tier" ? "tier" : "maps";
    contentViews.forEach(element => { element.hidden = element.dataset.contentView !== activeView; });
    contentButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.contentTarget === activeView)));
    document.body.dataset.contentView = activeView;

    if (updateHistory) {
      const url = new URL(window.location.href);
      if (activeView === "tier") url.searchParams.set("view", "tier");
      else url.searchParams.delete("view");
      window.history.pushState({}, "", url);
    }

    updateDocumentMetadata();
    if (activeView === "tier") render();
    if (moveFocus) document.querySelector("#top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  dropzones.forEach(zone => {
    zone.addEventListener("dragover", event => {
      if (!draggedItemId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      zone.classList.add("is-over");
    });
    zone.addEventListener("dragleave", event => {
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("is-over");
    });
    zone.addEventListener("drop", event => {
      event.preventDefault();
      zone.classList.remove("is-over");
      moveItem(event.dataTransfer.getData("text/plain"), zone.dataset.tierZone, dropPosition(zone, event));
    });
    zone.addEventListener("click", event => {
      if (event.target.closest(".tier-card") || !selectedItemId) return;
      moveItem(selectedItemId, zone.dataset.tierZone);
    });
    zone.addEventListener("keydown", event => {
      if ((event.key !== "Enter" && event.key !== " ") || !selectedItemId) return;
      event.preventDefault();
      moveItem(selectedItemId, zone.dataset.tierZone);
    });
  });

  categoryButtons.forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.tierCategory;
    selectedItemId = null;
    statusState = null;
    render();
  }));

  contentButtons.forEach(button => button.addEventListener("click", () => {
    setContentView(button.dataset.contentTarget, { updateHistory: true, moveFocus: true });
  }));

  resetButton.addEventListener("click", () => {
    layouts[activeCategory] = emptyLayout(activeCategory);
    selectedItemId = null;
    persistLayouts("resetDone");
    render();
  });

  window.addEventListener("popstate", () => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    setContentView(requestedView === "tier" ? "tier" : "maps");
  });
  window.addEventListener("maptactic:languagechange", updateLanguage);

  updateLanguage();
  setContentView(new URLSearchParams(window.location.search).get("view") === "tier" ? "tier" : "maps");
}
