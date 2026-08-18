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
    ],
    heli: []
  });

  const META = Object.freeze({
    tank: { folder: "Tier/Tank", labelKey: "groundForces", rank: 8, br: { min: "0.0", max: "12.7" } },
    air: { folder: "Tier/Air", labelKey: "aircraft", rank: 9, br: { min: "0.0", max: "14.7" } },
    heli: { folder: "Tier/Heli", labelKey: "helicopters", rank: 7, br: { min: "0.0", max: "13.0" } }
  });

  const COUNTRY_FLAGS = Object.freeze({
    CN: "icon/flag-cn.svg",
    DE: "icon/flag-de.svg",
    FR: "icon/flag-fr.svg",
    IL: "icon/flag-il.svg",
    IT: "icon/flag-it.svg",
    JP: "icon/flag-jp.svg",
    RU: "icon/flag-ru.svg",
    SE: "icon/flag-se.svg",
    UK: "icon/flag-uk.svg",
    US: "icon/flag-us.svg"
  });

  const COUNTRY_NAMES = Object.freeze({
    CN: { en: "China", ko: "중국" },
    DE: { en: "Germany", ko: "독일" },
    FR: { en: "France", ko: "프랑스" },
    IL: { en: "Israel", ko: "이스라엘" },
    IT: { en: "Italy", ko: "이탈리아" },
    JP: { en: "Japan", ko: "일본" },
    RU: { en: "Russia", ko: "러시아" },
    SE: { en: "Sweden", ko: "스웨덴" },
    UK: { en: "United Kingdom", ko: "영국" },
    US: { en: "United States", ko: "미국" }
  });

  // Add filename-based rank and BR values here as more unit images are introduced.
  const UNIT_FILTER_OVERRIDES = Object.freeze({
    tank: Object.freeze({}),
    air: Object.freeze({}),
    heli: Object.freeze({})
  });
  const BR_INPUT_PATTERN = /^(?:\d{1,2}(?:\.\d?)?)?$/;

  const COPY = Object.freeze({
    en: {
      contentNavigation: "Content selection",
      mapView: "TACTICAL MAP LIBRARY",
      tierView: "WAR THUNDER TIER LIST",
      categoryNavigation: "Tier list category",
      tierEyebrow: "WAR THUNDER · TIER LIST",
      tierTitleFirst: "BUILD YOUR",
      tierTitleSecond: "TIER LIST",
      tierHeroCopy: "Drag ground vehicle, aircraft, and helicopter cards to build your own tier list.",
      groundForces: "GROUND FORCES",
      tankShort: "TANK",
      aircraft: "AIRCRAFT",
      airShort: "AIR",
      helicopters: "HELICOPTERS",
      heliShort: "HELI",
      saveExport: "SAVE & EXPORT",
      reset: "RESET",
      instructions: "Drag a card, or select it and then choose a tier row.",
      unitFilters: "Unit filters",
      countryFilter: "Country filter",
      rankFilter: "Rank",
      brFilter: "BR range",
      brMinimum: "Minimum BR",
      brMaximum: "Maximum BR",
      allCountries: "ALL",
      filteredUnits: "Filtered units",
      noMatchingUnits: "NO MATCHING UNITS",
      dropHere: "DROP HERE",
      tierBoard: "Tier board",
      dragHint: "drag or select",
      selected: name => `${name} selected. Choose a tier.`,
      selectionCleared: "Selection cleared.",
      saved: "Saved locally.",
      exporting: "Creating PNG...",
      exportDone: "Tier list saved and exported as PNG.",
      exportError: "The PNG could not be created.",
      resetDone: "Tier list reset.",
      storageError: "This browser could not save the layout.",
      filterCount: (shown, total) => `${shown} shown · ${total} available`,
      mapDocumentTitle: "WarDevOps | War Thunder Map Tactic",
      tierDocumentTitle: "WarDevOps | War Thunder Tier List",
      mapDescription: "Explore War Thunder maps, team positions, tactical markers, routes, and key combat areas with WarDevOps MapTactic.",
      tierDescription: "Create and save a War Thunder ground vehicle, aircraft, or helicopter tier list with WarDevOps MapTactic."
    },
    ko: {
      contentNavigation: "콘텐츠 선택",
      mapView: "TACTICAL MAP LIBRARY",
      tierView: "WAR THUNDER TIER LIST",
      categoryNavigation: "Tier list category",
      tierEyebrow: "War Thunder Tier List",
      tierTitleFirst: "BUILD YOUR",
      tierTitleSecond: "TIER LIST",
      tierHeroCopy: "지상 장비, 항공기, 헬리콥터 카드를 드래그해 나만의 티어 리스트를 만드세요.",
      groundForces: "지상 장비",
      tankShort: "전차",
      aircraft: "항공기",
      airShort: "공중",
      helicopters: "헬리콥터",
      heliShort: "헬기",
      saveExport: "저장 및 내보내기",
      reset: "초기화",
      instructions: "카드를 드래그하거나, 카드를 선택한 뒤 원하는 티어를 클릭하세요.",
      unitFilters: "장비 필터",
      countryFilter: "국가 필터",
      rankFilter: "랭크",
      brFilter: "BR 범위",
      brMinimum: "최소 BR",
      brMaximum: "최대 BR",
      allCountries: "전체",
      filteredUnits: "필터된 장비",
      noMatchingUnits: "조건에 맞는 장비 없음",
      dropHere: "여기에 놓기",
      tierBoard: "티어 보드",
      dragHint: "드래그 또는 선택",
      selected: name => `${name} 선택됨. 원하는 티어를 고르세요.`,
      selectionCleared: "선택을 해제했습니다.",
      saved: "이 브라우저에 저장했습니다.",
      exporting: "PNG 파일을 만드는 중입니다...",
      exportDone: "티어 리스트를 저장하고 PNG로 내보냈습니다.",
      exportError: "PNG 파일을 만들 수 없습니다.",
      resetDone: "티어 리스트를 초기화했습니다.",
      storageError: "이 브라우저에 배치를 저장할 수 없습니다.",
      filterCount: (shown, total) => `표시 ${shown} · 전체 ${total}`,
      mapDocumentTitle: "WarDevOps | 워썬더 전술 지도",
      tierDocumentTitle: "WarDevOps | 워썬더 티어 리스트",
      mapDescription: "워썬더 지도, 진영별 위치, 전술 범례, 이동 경로와 주요 교전 지역을 WarDevOps MapTactic에서 살펴보세요.",
      tierDescription: "WarDevOps MapTactic에서 워썬더 지상 장비, 항공기와 헬리콥터 티어 리스트를 만들고 저장하세요."
    }
  });

  const contentButtons = [...document.querySelectorAll("[data-content-target]")];
  const contentViews = [...document.querySelectorAll("[data-content-view]")];
  const categoryButtons = [...tierRoot.querySelectorAll("[data-tier-category]")];
  const dropzones = [...tierRoot.querySelectorAll("[data-tier-zone]")];
  const categoryLabel = tierRoot.querySelector("#tier-category-label");
  const templateTitle = tierRoot.querySelector("#tier-template-title");
  const countryFilters = tierRoot.querySelector("#tier-country-filters");
  const rankSelect = tierRoot.querySelector("#tier-rank-select");
  const brMinInput = tierRoot.querySelector("#tier-br-min");
  const brMaxInput = tierRoot.querySelector("#tier-br-max");
  const unitCount = tierRoot.querySelector("#tier-unit-count");
  const saveStatus = tierRoot.querySelector("#tier-save-status");
  const exportButton = tierRoot.querySelector("#tier-export");
  const resetButton = tierRoot.querySelector("#tier-reset");
  const descriptionMeta = document.querySelector('meta[name="description"]');

  let activeCategory = "tank";
  let activeView = "maps";
  let selectedItemId = null;
  let draggedItemId = null;
  let suppressNextClick = false;
  let statusState = null;
  const filters = {
    tank: { country: "all", rank: META.tank.rank, brMin: Number(META.tank.br.min), brMax: Number(META.tank.br.max) },
    air: { country: "all", rank: META.air.rank, brMin: Number(META.air.br.min), brMax: Number(META.air.br.max) },
    heli: { country: "all", rank: META.heli.rank, brMin: Number(META.heli.br.min), brMax: Number(META.heli.br.max) }
  };

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

  function itemDetails(file) {
    const [countryCode, ...nameParts] = itemName(file).split(" ");
    return {
      countryCode,
      equipmentName: nameParts.join(" ") || countryCode,
      flag: COUNTRY_FLAGS[countryCode] || null
    };
  }

  function itemRank(category, file) {
    return UNIT_FILTER_OVERRIDES[category]?.[file]?.rank || META[category].rank;
  }

  function itemBattleRating(category, file) {
    return UNIT_FILTER_OVERRIDES[category]?.[file]?.br ?? Number(META[category].br.max);
  }

  function countryName(countryCode) {
    return COUNTRY_NAMES[countryCode]?.[language()] || countryCode;
  }

  function countriesForCategory(category) {
    const available = new Set(FILES[category].map(file => itemDetails(file).countryCode));
    return Object.keys(COUNTRY_FLAGS).filter(countryCode => available.has(countryCode));
  }

  function rangeLabel(meta) {
    return `Rank ${meta.rank} - BR ${meta.br.min} ~ ${meta.br.max}`;
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
        air: sanitizeLayout("air", saved?.air),
        heli: sanitizeLayout("heli", saved?.heli)
      };
    } catch {
      return { tank: emptyLayout("tank"), air: emptyLayout("air"), heli: emptyLayout("heli") };
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
    const details = itemDetails(file);
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

    const caption = document.createElement("span");
    caption.className = "tier-card-caption";
    caption.setAttribute("aria-hidden", "true");
    if (details.flag) {
      const flag = document.createElement("img");
      flag.className = "tier-card-flag";
      flag.src = details.flag;
      flag.alt = "";
      caption.append(flag);
    } else {
      const countryCode = document.createElement("span");
      countryCode.className = "tier-card-country-code";
      countryCode.textContent = details.countryCode;
      caption.append(countryCode);
    }
    const equipmentName = document.createElement("span");
    equipmentName.className = "tier-card-equipment-name";
    equipmentName.textContent = details.equipmentName;
    caption.append(equipmentName);
    card.append(caption);

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

  function createCountryFilter(countryCode) {
    const currentFilter = filters[activeCategory].country;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tier-country-filter";
    button.dataset.tierCountry = countryCode;
    button.setAttribute("aria-pressed", String(currentFilter === countryCode));

    if (countryCode === "all") {
      button.classList.add("tier-country-filter-all");
      button.textContent = copy().allCountries;
      button.title = copy().allCountries;
      button.setAttribute("aria-label", copy().allCountries);
      return button;
    }

    const label = `${countryName(countryCode)} (${countryCode})`;
    button.title = label;
    button.setAttribute("aria-label", label);
    const flag = document.createElement("img");
    flag.src = COUNTRY_FLAGS[countryCode];
    flag.alt = "";
    flag.setAttribute("aria-hidden", "true");
    button.append(flag);
    return button;
  }

  function renderFilters() {
    const meta = META[activeCategory];
    const availableCountries = countriesForCategory(activeCategory);
    if (filters[activeCategory].country !== "all" && !availableCountries.includes(filters[activeCategory].country)) {
      filters[activeCategory].country = "all";
    }
    countryFilters.replaceChildren(
      createCountryFilter("all"),
      ...availableCountries.map(createCountryFilter)
    );

    rankSelect.replaceChildren(...Array.from({ length: meta.rank }, (_, index) => {
      const rank = index + 1;
      const option = document.createElement("option");
      option.value = String(rank);
      option.textContent = `Rank ${rank}`;
      return option;
    }));
    rankSelect.value = String(filters[activeCategory].rank);
    brMinInput.value = filters[activeCategory].brMin.toFixed(1);
    brMaxInput.value = filters[activeCategory].brMax.toFixed(1);
    brMinInput.dataset.lastValid = brMinInput.value;
    brMaxInput.dataset.lastValid = brMaxInput.value;
  }

  function matchesFilters(id) {
    const file = fileForId(id);
    if (!file) return false;
    const currentFilters = filters[activeCategory];
    const details = itemDetails(file);
    const battleRating = itemBattleRating(activeCategory, file);
    return (currentFilters.country === "all" || details.countryCode === currentFilters.country)
      && itemRank(activeCategory, file) === currentFilters.rank
      && battleRating >= currentFilters.brMin
      && battleRating <= currentFilters.brMax;
  }

  function validateBrInput(input) {
    const value = input.value;
    const numericValue = Number(value);
    if (BR_INPUT_PATTERN.test(value) && (value === "" || (numericValue >= 0 && numericValue <= 20))) {
      input.dataset.lastValid = value;
      return;
    }
    input.value = input.dataset.lastValid || "";
  }

  function commitBrFilter(input, boundary) {
    const value = input.value;
    if (!value || !BR_INPUT_PATTERN.test(value)) {
      renderFilters();
      return;
    }
    const numericValue = Math.round(Number(value) * 10) / 10;
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 20) {
      renderFilters();
      return;
    }

    const currentFilters = filters[activeCategory];
    if (boundary === "min") {
      currentFilters.brMin = numericValue;
      if (currentFilters.brMin > currentFilters.brMax) currentFilters.brMax = currentFilters.brMin;
    } else {
      currentFilters.brMax = numericValue;
      if (currentFilters.brMax < currentFilters.brMin) currentFilters.brMin = currentFilters.brMax;
    }
    selectedItemId = null;
    render();
  }

  function loadExportImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = new URL(source, document.baseURI).href;
    });
  }

  function drawImageCover(context, image, x, y, width, height) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
  }

  function clippedText(context, value, maxWidth) {
    if (context.measureText(value).width <= maxWidth) return value;
    let clipped = value;
    while (clipped.length && context.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
    return `${clipped}…`;
  }

  async function exportTierBoard() {
    const exportZones = TIER_ZONES.filter(zone => zone !== "pool");
    const exportWidth = 1440;
    const labelWidth = 86;
    const cardWidth = 158;
    const cardHeight = 100;
    const gap = 5;
    const padding = 6;
    const zoneWidth = exportWidth - labelWidth;
    const cardsPerLine = Math.max(1, Math.floor((zoneWidth - padding * 2 + gap) / (cardWidth + gap)));
    const rowHeights = exportZones.map(zone => Math.max(112, Math.ceil(layouts[activeCategory][zone].length / cardsPerLine) * (cardHeight + gap) - gap + padding * 2));
    const exportHeight = rowHeights.reduce((sum, height) => sum + height, 0);
    const pixelRatio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = exportWidth * pixelRatio;
    canvas.height = exportHeight * pixelRatio;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.scale(pixelRatio, pixelRatio);

    const ids = exportZones.flatMap(zone => layouts[activeCategory][zone]);
    const imageSources = new Set();
    ids.forEach(id => {
      const file = fileForId(id);
      if (!file) return;
      imageSources.add(`${META[activeCategory].folder}/${encodeURIComponent(file)}`);
      const flag = itemDetails(file).flag;
      if (flag) imageSources.add(flag);
    });
    const imageEntries = await Promise.all([...imageSources].map(async source => {
      try {
        return [source, await loadExportImage(source)];
      } catch {
        return [source, null];
      }
    }));
    const images = new Map(imageEntries);

    const labelColors = { s: "#ff7b7b", a: "#ffb978", b: "#f5d878", c: "#eff376", d: "#a9ee75" };
    context.fillStyle = "#0a0e0d";
    context.fillRect(0, 0, exportWidth, exportHeight);

    let rowY = 0;
    exportZones.forEach((zone, zoneIndex) => {
      const rowHeight = rowHeights[zoneIndex];
      context.fillStyle = labelColors[zone];
      context.fillRect(0, rowY, labelWidth, rowHeight);
      context.fillStyle = "#151817";
      context.font = "900 28px Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(zone.toUpperCase(), labelWidth / 2, rowY + rowHeight / 2);

      context.fillStyle = "#111714";
      context.fillRect(labelWidth, rowY, zoneWidth, rowHeight);
      layouts[activeCategory][zone].forEach((id, cardIndex) => {
        const file = fileForId(id);
        if (!file) return;
        const column = cardIndex % cardsPerLine;
        const line = Math.floor(cardIndex / cardsPerLine);
        const x = labelWidth + padding + column * (cardWidth + gap);
        const y = rowY + padding + line * (cardHeight + gap);
        const unitSource = `${META[activeCategory].folder}/${encodeURIComponent(file)}`;
        const unitImage = images.get(unitSource);

        context.fillStyle = "#252d34";
        context.fillRect(x, y, cardWidth, cardHeight);
        if (unitImage) drawImageCover(context, unitImage, x, y, cardWidth, cardHeight);
        context.strokeStyle = "#39463f";
        context.lineWidth = 1;
        context.strokeRect(x + .5, y + .5, cardWidth - 1, cardHeight - 1);

        context.fillStyle = "rgba(5, 8, 8, .88)";
        context.fillRect(x, y, cardWidth, 25);
        const details = itemDetails(file);
        let textX = x + 6;
        const flagImage = details.flag ? images.get(details.flag) : null;
        if (flagImage) {
          context.drawImage(flagImage, x + 6, y + 4, 25, 16);
          textX = x + 37;
        } else {
          context.fillStyle = "#d6db9d";
          context.font = "900 10px Arial, sans-serif";
          context.textAlign = "left";
          context.textBaseline = "middle";
          context.fillText(details.countryCode, textX, y + 12.5);
          textX += context.measureText(details.countryCode).width + 6;
        }
        context.fillStyle = "#ffffff";
        context.font = "800 11px Arial, sans-serif";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(clippedText(context, details.equipmentName, x + cardWidth - textX - 6), textX, y + 12.5);
      });

      context.strokeStyle = "#070908";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, rowY + rowHeight - .5);
      context.lineTo(exportWidth, rowY + rowHeight - .5);
      context.stroke();
      rowY += rowHeight;
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    link.href = downloadUrl;
    link.download = `wardevops-${activeCategory}-tier-list-${dateStamp}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
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
    templateTitle.textContent = rangeLabel(meta);
    categoryButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.tierCategory === activeCategory)));
    renderFilters();

    dropzones.forEach(zone => {
      const zoneName = zone.dataset.tierZone;
      zone.replaceChildren();
      zone.dataset.emptyLabel = zoneName === "pool" ? copy().noMatchingUnits : copy().dropHere;
      const visibleIds = zoneName === "pool"
        ? layouts[activeCategory][zoneName].filter(matchesFilters)
        : layouts[activeCategory][zoneName];
      visibleIds.forEach(id => {
        const card = createCard(id);
        if (card) zone.append(card);
      });
    });
    const visibleCount = layouts[activeCategory].pool.filter(matchesFilters).length;
    unitCount.textContent = copy().filterCount(visibleCount, layouts[activeCategory].pool.length);
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

  countryFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-tier-country]");
    if (!button || !countryFilters.contains(button)) return;
    filters[activeCategory].country = button.dataset.tierCountry;
    selectedItemId = null;
    render();
  });

  rankSelect.addEventListener("change", () => {
    const rank = Number(rankSelect.value);
    if (!Number.isInteger(rank) || rank < 1 || rank > META[activeCategory].rank) return;
    filters[activeCategory].rank = rank;
    selectedItemId = null;
    render();
  });

  [[brMinInput, "min"], [brMaxInput, "max"]].forEach(([input, boundary]) => {
    input.addEventListener("input", () => validateBrInput(input));
    input.addEventListener("keydown", event => {
      if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
      if (event.key === "Enter") input.blur();
    });
    input.addEventListener("change", () => commitBrFilter(input, boundary));
  });

  contentButtons.forEach(button => button.addEventListener("click", () => {
    setContentView(button.dataset.contentTarget, { updateHistory: true, moveFocus: true });
  }));

  resetButton.addEventListener("click", () => {
    layouts[activeCategory] = emptyLayout(activeCategory);
    selectedItemId = null;
    persistLayouts("resetDone");
    render();
  });

  exportButton.addEventListener("click", async () => {
    exportButton.disabled = true;
    setStatus("exporting");
    try {
      await exportTierBoard();
      setStatus("exportDone");
    } catch (error) {
      console.error("Tier list export failed", error);
      setStatus("exportError");
    } finally {
      exportButton.disabled = false;
    }
  });

  window.addEventListener("popstate", () => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    setContentView(requestedView === "tier" ? "tier" : "maps");
  });
  window.addEventListener("maptactic:languagechange", updateLanguage);

  updateLanguage();
  setContentView(new URLSearchParams(window.location.search).get("view") === "tier" ? "tier" : "maps");
}
