import { CATEGORIES, COUNTRIES, readCatalog, visibleUnits, searchUnits, rangeColor, toTenths } from "./brc-model.js?v=highest-penalty-20261101";
import { createArmamentPanel } from "./brc-armaments.js?v=highlight-refresh-20261108";
import { validateVariableRatings } from "./brc-ratings.js?v=highest-penalty-20261101";
import { setVehicleImage, imagePendingText } from "./vehicle-images.js?v=20261108";

const copy = {
  en: {
    grb: "GROUND REALISTIC", arb: "AIR REALISTIC", modeLabel: "Battle mode", dataUpdated: "Data updated",
    arbNotice: "Compare aircraft within ±1.0 of the selected aircraft’s Air RB. All nations are included. New vehicles have blue borders; vehicles with variable BR have purple borders.",
    arbEmpty: "No aircraft in this range. Turn off Range only to see all aircraft.",
    overview: "BRC compares War Thunder vehicles within a ±1.0 BR range by nation. GRB includes ground vehicles, aircraft and helicopters; ARB includes aircraft only.",
    usage: "Hover over a vehicle to see its range in color, or click to view its details and weapons and calculate weapon-dependent BR for Custom BR vehicles.",
    matchmaking: "Use search and filters to find vehicles. Actual matchmaking uses your lineup’s highest BR, so vehicles below the displayed range may also appear in battle.",
    searchLabel: "Find a vehicle", categories: "Vehicle types", tank: "Ground", air: "Aircraft", heli: "Helicopters",
    rangeOnly: "Range only", clear: "Clear selection", comparing: "COMPARING", difference: "BR difference",
    notice: "A ±1.0 BR comparison, not a complete list of possible opponents. Matchmaking uses your lineup’s highest BR; lower-BR vehicles may also appear. All nations are included. New vehicles have blue borders; vehicles with variable BR have purple borders.",
    scrollHint: "Scroll to explore · Nation headers and BR stay visible", details: "VEHICLE DETAILS",
    placeholder: "", closeHint: "Closing this panel keeps your selected range.", customBrVehicle: "Custom BR vehicle",
    close: "Close details", tableLabel: "Vehicles by nation and battle rating", retry: "Try again",
    idle: "Hover over or select a vehicle", idleHint: "Select a vehicle to enable Range only.",
    pinned: "Pinned", preview: "Preview", noResults: "No matching vehicles.", results: "results", more: "Showing the first 60. Refine your search for more specific results.",
    loading: "Loading vehicles…", error: "Could not load the vehicle catalog. Please try again.", empty: "No vehicles to display. Enable a vehicle type or turn off Range only.",
    vehicles: "vehicles", selected: "Selected", hiddenSelection: "Selected vehicle is hidden by the type filters.",
    countries: ["USA", "Germany", "USSR", "Britain", "Japan", "China", "Italy", "France", "Sweden", "Israel"],
  },
  ko: {
    grb: "지상 리얼리스틱", arb: "공중 리얼리스틱", modeLabel: "전투 모드", dataUpdated: "데이터 업데이트",
    arbNotice: "선택한 항공기의 공중전 BR 기준 ±1.0 범위를 비교합니다. 모든 국가의 항공기를 표시합니다. 최신 장비는 파란색 테두리, 가변 BR 적용 장비는 보라색 테두리로 표시합니다.",
    arbEmpty: "이 범위에 표시할 항공기가 없습니다. ‘범위만 보기’를 해제하면 전체 항공기를 볼 수 있습니다.",
    overview: "BRC는 워썬더 장비의 BR ±1.0 범위를 국가별로 비교하는 도구입니다. GRB에서는 지상·항공·헬기를, ARB에서는 항공기를 표시합니다.",
    usage: "장비에 마우스를 올리면 비교 범위를 색상으로 확인할 수 있으며, 클릭하면 장비 설명과 무장을 확인하고 커스텀 BR 장비의 무장별 BR을 계산할 수 있습니다.",
    matchmaking: "검색과 필터로 원하는 장비를 찾아보세요. 실제 매칭은 편성의 최고 BR을 기준으로 하므로, 표시 범위보다 낮은 BR 장비도 전투에 등장할 수 있습니다.",
    searchLabel: "장비 찾기", categories: "장비 종류", tank: "지상", air: "항공", heli: "헬기",
    rangeOnly: "범위만 보기", clear: "선택 해제", comparing: "비교 기준", difference: "BR 차이",
    notice: "선택 장비의 ±1.0 BR 비교표입니다. 실제 매칭은 편성의 최고 BR을 기준으로 하며 더 낮은 BR 장비도 등장할 수 있습니다. 아군·적군을 구분하지 않고 모든 국가를 표시합니다. 최신 장비는 파란색 테두리, 가변 BR 적용 장비는 보라색 테두리로 표시합니다.",
    scrollHint: "스크롤로 탐색 · 국가 헤더와 BR 열 고정", details: "장비 설명",
    placeholder: "", closeHint: "설명을 닫아도 선택한 범위는 유지됩니다.", customBrVehicle: "커스텀 BR 장비",
    close: "설명 닫기", tableLabel: "국가 및 BR별 장비", retry: "다시 시도",
    idle: "장비에 마우스를 올리거나 선택하세요", idleHint: "장비를 선택하면 ‘범위만 보기’를 사용할 수 있습니다.",
    pinned: "고정", preview: "미리보기", noResults: "일치하는 장비가 없습니다.", results: "개 검색 결과", more: "앞의 60개 결과입니다. 검색어를 더 입력하면 결과를 좁힐 수 있습니다.",
    loading: "장비를 불러오는 중…", error: "장비 목록을 불러오지 못했습니다. 다시 시도해주세요.", empty: "표시할 장비가 없습니다. 장비 종류를 켜거나 ‘범위만 보기’를 해제하세요.",
    vehicles: "대", selected: "선택", hiddenSelection: "선택한 장비가 종류 필터로 숨겨져 있습니다.",
    countries: ["미국", "독일", "소련", "영국", "일본", "중국", "이탈리아", "프랑스", "스웨덴", "이스라엘"],
  },
};
const $ = selector => document.querySelector(selector);
const table = $("#brc-table"), scroller = $("#brc-scroll"), search = $("#brc-search"), results = $("#brc-results"), popup = $("#brc-details");
const armaments = createArmamentPanel({ panel: $("#brc-armaments"), popup, onLayout: positionPopup, onRatingChange: updateWeaponComparison });
const state = { language: document.documentElement.lang === "ko" ? "ko" : "en", mode: "grb", units: [], byId: new Map(), categories: new Set(CATEGORIES), selected: null, hovered: null, focused: null, rangeOnly: false, catalog: null, loading: true, failed: false };
const modeViews = Object.fromEntries(["grb", "arb"].map(mode => [mode, { selectedId: null, rangeOnly: false, query: "", top: 0, left: 0 }]));
let buttons = new Map(), rows = [], popupAnchor = null;
let popupPosition = null, popupDrag = null;

function updatePositionControls() {
  const korean = state.language === "ko";
  const pin = $("#brc-detail-pin");
  pin.textContent = popupPosition ? (korean ? "고정 해제" : "Unpin") : (korean ? "고정" : "Pin");
  pin.setAttribute("aria-pressed", String(Boolean(popupPosition)));
  $("#brc-detail-drag").setAttribute("aria-label", korean
    ? "설명 창 이동: 드래그하거나 방향키를 사용하세요" : "Move details: drag or use arrow keys");
}

function movePopup(left, top) {
  popup.classList.add("is-positioned");
  const rect = popup.getBoundingClientRect();
  popupPosition = {
    left: Math.max(12, Math.min(left, innerWidth - rect.width - 12)),
    top: Math.max(12, Math.min(top, (window.visualViewport?.height || innerHeight) - rect.height - 12)),
  };
  popup.style.left = `${popupPosition.left}px`;
  popup.style.top = `${popupPosition.top}px`;
  updatePositionControls();
}
const t = key => copy[state.language][state.mode === "arb" ? ({ notice: "arbNotice", empty: "arbEmpty" }[key] || key) : key];
const countryName = code => t("countries")[COUNTRIES.indexOf(code)];
const number = value => value.toFixed(1);
const ratingLabel = unit => `${state.mode.toUpperCase()} BR ${number(unit.br)}`;
const comparisonSelection = () => state.selected ? { ...state.selected, br: armaments.ratingFor(state.selected, state.mode) } : null;
const active = () => comparisonSelection() || state.hovered || state.focused;
const hasCustomBr = unit => {
  const rule = unit.variableBr?.[state.mode];
  return Boolean(rule && rule.max > rule.base && Object.values(rule.penalties).some(penalty => penalty > 0));
};

function updateWeaponComparison(id, mode) {
  if (state.selected?.id !== id || state.mode !== mode) return;
  if (state.rangeOnly) { renderTable(); popupAnchor = buttons.get(id); }
  else paintComparison();
  positionPopup();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderTable() {
  const newUnitIds = new Set(state.catalog?.announcedVehicles?.units || []);
  state.hovered = null;
  state.focused = null;
  const units = visibleUnits(state.units, state.mode === "arb" ? new Set(["air"]) : state.categories, comparisonSelection(), state.rangeOnly);
  const head = element("tr");
  const brHead = element("th", "", "BR"); brHead.scope = "col"; head.append(brHead);
  for (const code of COUNTRIES) {
    const th = element("th"); th.scope = "col";
    const flag = element("img"); flag.src = `/icon/flag-${code.toLowerCase()}.svg`; flag.alt = ""; flag.width = 22; flag.height = 15;
    th.append(flag, document.createTextNode(countryName(code))); head.append(th);
  }
  table.tHead.replaceChildren(head);
  const groups = new Map();
  for (const unit of units) {
    if (!groups.has(unit.br)) groups.set(unit.br, new Map());
    const group = groups.get(unit.br);
    if (!group.has(unit.countryCode)) group.set(unit.countryCode, []);
    group.get(unit.countryCode).push(unit);
  }
  const body = document.createDocumentFragment(); buttons = new Map(); rows = [];
  for (const [br, group] of groups) {
    const row = element("tr"); row.dataset.br = number(br);
    const label = element("th", "", number(br)); label.scope = "row";
    const delta = element("small"); label.append(delta); row.append(label);
    for (const country of COUNTRIES) {
      const cell = element("td");
      const countryUnits = group.get(country) || [];
      if (!countryUnits.length) cell.append(element("span", "brc-empty-cell", "—"));
      for (const category of CATEGORIES) {
        const categoryUnits = countryUnits.filter(unit => unit.category === category);
        if (!categoryUnits.length) continue;
        const section = element("div", "brc-group");
        if (state.mode === "grb") section.append(element("span", "brc-group-label", t(category)));
        for (const unit of categoryUnits) {
          const button = element("button", "brc-unit", unit.name);
          button.classList.toggle("is-new", newUnitIds.has(unit.wikiId) || unit.isNew === true);
          button.classList.toggle("has-variable-br", hasCustomBr(unit));
          button.type = "button"; button.dataset.unit = unit.id;
          button.setAttribute("aria-pressed", String(state.selected?.id === unit.id));
          button.setAttribute("aria-label", `${unit.name}, ${countryName(unit.countryCode)}, ${t(category)}, ${ratingLabel(unit)}`);
          button.setAttribute("aria-haspopup", "dialog");
          button.title = `${unit.name} · ${ratingLabel(unit)}`;
          buttons.set(unit.id, button); section.append(button);
        }
        cell.append(section);
      }
      row.append(cell);
    }
    rows.push({ row, br, delta }); body.append(row);
  }
  table.tBodies[0].replaceChildren(body);
  $("#brc-status").textContent = units.length ? "" : t("empty");
  paintComparison();
}

function scrollToSelectedBr() {
  if (!state.selected || !rows.length) return;
  // Keep the comparison BR in view even when its vehicle type is hidden.
  // Some filters remove that BR entirely; use the nearest remaining row then.
  const target = rows.reduce((nearest, candidate) =>
    Math.abs(toTenths(candidate.br) - toTenths(state.selected.br)) < Math.abs(toTenths(nearest.br) - toTenths(state.selected.br))
      ? candidate : nearest);
  const top = scroller.scrollTop + target.row.getBoundingClientRect().top
    - scroller.getBoundingClientRect().top - scroller.clientTop - table.tHead.getBoundingClientRect().height - 8;
  scroller.scrollTo({ top, left: scroller.scrollLeft, behavior: "instant" });
}

function paintComparison() {
  const reference = active();
  for (const { row, br, delta } of rows) {
    const color = reference ? rangeColor(br, reference.br) : null;
    row.classList.toggle("in-range", Boolean(color));
    if (color) row.style.setProperty("--range-color", color);
    else row.style.removeProperty("--range-color");
    const difference = reference ? (toTenths(br) - toTenths(reference.br)) / 10 : 0;
    delta.textContent = color ? `${difference > 0 ? "+" : ""}${number(difference)}` : "";
  }
  const preview = reference && reference.id !== state.selected?.id;
  $("#brc-active").textContent = reference
    ? `${preview ? t("preview") : t("pinned")} · ${reference.name} · ${ratingLabel(reference)} → ${number(Math.max(1, reference.br - 1))}–${number(reference.br + 1)}`
    : t("idle");
  $("#brc-pinned").textContent = t("idleHint");
  const count = visibleUnits(state.units, state.mode === "arb" ? new Set(["air"]) : state.categories, reference, true).length;
  $("#brc-count").textContent = `${state.language === "ko" ? "범위 내 장비" : "Vehicles in range"} : ${count.toLocaleString(state.language)} ${t("vehicles")}`;
  $("#brc-range-only").disabled = !state.selected;
  $("#brc-reset").disabled = !state.selected;
}

function closePopup(restoreFocus = false) {
  popup.hidden = true;
  if (restoreFocus && popupAnchor?.isConnected) popupAnchor.focus({ preventScroll: true });
}

function clearSelection({ clearSearch = false } = {}) {
  const old = state.selected;
  const wasRangeOnly = state.rangeOnly;
  state.selected = null; state.hovered = null; state.focused = null; state.rangeOnly = false;
  $("#brc-range-only").checked = false;
  closePopup();
  if (wasRangeOnly) renderTable();
  else {
    buttons.get(old?.id)?.setAttribute("aria-pressed", "false");
    paintComparison();
    $("#brc-status").textContent = rows.length ? "" : t("empty");
  }
  if (clearSearch) search.value = "";
  results.hidden = true;
}

function positionPopup() {
  if (popup.hidden) return;
  if (popupPosition) { movePopup(popupPosition.left, popupPosition.top); return; }
  if (matchMedia("(max-width: 700px)").matches) return;
  const rect = popup.getBoundingClientRect();
  // Range-only can hide the base-BR row after a large weapon penalty.
  const anchor = popupAnchor?.isConnected ? popupAnchor.getBoundingClientRect()
    : { left: innerWidth - rect.width - 12, top: innerHeight / 2, bottom: innerHeight / 2 };
  const left = Math.min(innerWidth - rect.width - 12, Math.max(12, anchor.left));
  const below = anchor.bottom + 8;
  const preferredTop = below + rect.height <= innerHeight - 12 ? below : anchor.top - rect.height - 8;
  const top = Math.max(12, Math.min(innerHeight - rect.height - 12, preferredTop));
  popup.style.left = `${left}px`; popup.style.top = `${top}px`;
}

function updatePopup() {
  if (!state.selected) return;
  const wikiLink = element(state.selected.wikiPending ? "span" : "a", "", state.selected.name);
  if (!state.selected.wikiPending) {
    wikiLink.href = `https://wiki.warthunder.com/unit/${encodeURIComponent(state.selected.wikiId)}`;
    wikiLink.target = "_blank"; wikiLink.rel = "noopener noreferrer";
  }
  $("#brc-detail-name").replaceChildren(wikiLink);
  const unit = state.selected;
  const groundBr = unit.groundBr;
  const airRating = unit.category === "air" ? ` · ARB BR ${number(unit.airBr)}` : "";
  const meta = $("#brc-detail-meta");
  meta.textContent = `${countryName(unit.countryCode)} · ${t(unit.category)}`;
  meta.append(element("span", "brc-detail-ratings", hasCustomBr(unit)
    ? t("customBrVehicle") : `GRB BR ${number(groundBr)}${airRating}`));
  const image = $("#brc-detail-image");
  $("#brc-detail-media").hidden = false;
  $("#brc-detail-flag").src = `/icon/flag-${state.selected.countryCode.toLowerCase()}.svg`;
  $("#brc-detail-image-name").textContent = state.selected.name;
  image.alt = state.selected.name;
  const overlay = $("#brc-detail-image-pending");
  overlay.firstElementChild.textContent = imagePendingText(state.language);
  setVehicleImage(image, overlay, unit, unit.category, state.catalog.updatedAt || "current", positionPopup);
  armaments.show(state.selected, state.mode, state.language);
  positionPopup();
}

function selectUnit(unit, fromSearch = false) {
  const old = state.selected;
  state.selected = unit; state.hovered = null; state.focused = null;
  if (fromSearch && state.mode === "grb" && !state.categories.has(unit.category)) {
    state.categories.add(unit.category);
    $(`#brc-categories input[value="${unit.category}"]`).checked = true;
  }
  if (state.rangeOnly || fromSearch) renderTable();
  else {
    buttons.get(old?.id)?.setAttribute("aria-pressed", "false");
    buttons.get(unit.id)?.setAttribute("aria-pressed", "true");
    paintComparison();
  }
  popupAnchor = buttons.get(unit.id);
  results.hidden = true;
  if (fromSearch) {
    search.value = unit.name;
    popupAnchor?.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  }
  popup.hidden = false; updatePopup();
  // The non-modal panel can be dismissed by keyboard without trapping table navigation.
  $("#brc-detail-close").focus({ preventScroll: true });
}

function renderSearch() {
  results.replaceChildren();
  if (!search.value.trim()) { results.hidden = true; return; }
  const matches = searchUnits(state.units, search.value);
  results.append(element("p", "", matches.length ? `${matches.length} ${t("results")}` : t("noResults")));
  for (const unit of matches.slice(0, 60)) {
    const button = element("button", "brc-result"); button.type = "button"; button.dataset.result = unit.id;
    button.append(element("strong", "", unit.name), element("small", "", `${countryName(unit.countryCode)} · ${t(unit.category)} · ${ratingLabel(unit)}`));
    results.append(button);
  }
  if (matches.length > 60) results.append(element("p", "", t("more")));
  results.hidden = false;
}

function applyLanguage() {
  document.querySelectorAll("[data-brc-text]").forEach(node => { node.textContent = t(node.dataset.brcText); });
  const updated = state.catalog?.updatedAt || state.catalog?.battleRatingsUpdatedAt || state.catalog?.generatedAt;
  const date = typeof updated === "string" ? updated.slice(0, 10) : "";
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date));
  $("#brc-data-updated").hidden = !hasDate;
  $("#brc-data-updated-date").textContent = hasDate ? date : "";
  $("#brc-data-updated-date").dateTime = hasDate ? date : "";
  $("#brc-detail-close").setAttribute("aria-label", t("close"));
  updatePositionControls();
  scroller.setAttribute("aria-label", t("tableLabel"));
  $(".brc-legend").setAttribute("aria-label", t("difference"));
  $("#brc-mode-tabs").setAttribute("aria-label", t("modeLabel"));
  if (state.catalog) {
    const wasOpen = !popup.hidden;
    renderTable();
    popupAnchor = buttons.get(state.selected?.id);
    if (wasOpen) updatePopup();
    if (!results.hidden) renderSearch();
  } else {
    $("#brc-status").textContent = t(state.failed ? "error" : "loading");
    paintComparison();
  }
}

function switchMode(mode) {
  if (mode === state.mode || !["grb", "arb"].includes(mode) || !state.catalog) return;
  modeViews[state.mode] = { selectedId: state.selected?.id || null, rangeOnly: state.rangeOnly,
    query: search.value, top: scroller.scrollTop, left: scroller.scrollLeft };
  closePopup(); results.hidden = true;
  state.mode = mode;
  state.units = readCatalog(state.catalog, mode, state.variableRatings);
  state.byId = new Map(state.units.map(unit => [unit.id, unit]));
  const view = modeViews[mode];
  state.selected = state.byId.get(view.selectedId) || null;
  state.rangeOnly = Boolean(state.selected && view.rangeOnly);
  state.hovered = null; state.focused = null;
  search.value = view.query;
  search.placeholder = mode === "arb" ? "F-15E, A-10A, Spitfire…" : "Leopard 2K, M1A1, AH-64…";
  $("#brc-range-only").checked = state.rangeOnly;
  $("#brc-categories").hidden = mode === "arb";
  $("#brc-categories").disabled = mode === "arb";
  $("#brc-mode-eyebrow").textContent = `WAR THUNDER · ${mode === "arb" ? "AIR" : "GROUND"} REALISTIC BATTLES`;
  $("#brc-workspace").setAttribute("aria-labelledby", `brc-tab-${mode}`);
  document.querySelectorAll("[data-brc-mode]").forEach(button => {
    const selected = button.dataset.brcMode === mode;
    button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
  });
  applyLanguage();
  scroller.scrollTo({ top: view.top, left: view.left, behavior: "instant" });
  if (state.selected) scrollToSelectedBr();
}

async function loadCatalog() {
  state.loading = true; state.failed = false; $("#brc-retry").hidden = true; scroller.setAttribute("aria-busy", "true"); applyLanguage();
  try {
    // Deliberately share the Tier List catalog and its BR values; no BRC-specific copy.
    const [catalog, ratings] = await Promise.all([
      "../data/tier-units.json?v=highlight-refresh-20261108", "../data/brc-variable-br.json?v=20261101",
    ].map(async path => {
      const response = await fetch(new URL(path, import.meta.url));
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      return response.json();
    }));
    state.variableRatings = validateVariableRatings(ratings, catalog);
    state.units = readCatalog(catalog, state.mode, state.variableRatings);
    if (!state.units.length) throw new Error("Empty catalog");
    state.catalog = catalog; state.byId = new Map(state.units.map(unit => [unit.id, unit]));
    search.disabled = false; $("#brc-categories").disabled = false;
    document.querySelectorAll("[data-brc-mode]").forEach(button => { button.disabled = false; });
    applyLanguage();
  } catch (error) {
    console.error("BRC catalog load failed", error);
    state.failed = true; $("#brc-status").textContent = t("error"); $("#brc-retry").hidden = false;
  } finally { state.loading = false; scroller.setAttribute("aria-busy", "false"); }
}

table.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" || state.selected) return;
  const button = event.target.closest("[data-unit]");
  const next = button ? state.byId.get(button.dataset.unit) : null;
  if (state.hovered !== next) { state.hovered = next; paintComparison(); }
});
table.addEventListener("pointerleave", () => { state.hovered = null; paintComparison(); });
table.addEventListener("focusin", event => {
  const button = event.target.closest("[data-unit]");
  // Mouse focus must not turn a transient hover into a pinned preview.
  state.focused = !state.selected && button?.matches(":focus-visible") ? state.byId.get(button.dataset.unit) : null;
  paintComparison();
});
table.addEventListener("focusout", () => { state.focused = null; paintComparison(); });
table.addEventListener("click", event => {
  const button = event.target.closest("[data-unit]");
  if (button) selectUnit(state.byId.get(button.dataset.unit));
});
$("#brc-categories").addEventListener("change", event => {
  if (state.mode !== "grb") return;
  const input = event.target;
  if (!CATEGORIES.includes(input.value)) return;
  if (input.checked) state.categories.add(input.value); else state.categories.delete(input.value);
  closePopup(); renderTable(); scrollToSelectedBr();
});
$("#brc-mode-tabs").addEventListener("click", event => {
  const button = event.target.closest("[data-brc-mode]");
  if (button) switchMode(button.dataset.brcMode);
});
$("#brc-mode-tabs").addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const mode = event.key === "Home" ? "grb" : event.key === "End" ? "arb" : state.mode === "grb" ? "arb" : "grb";
  const button = $(`#brc-tab-${mode}`);
  if (!button.disabled) { switchMode(mode); button.focus(); }
});
$("#brc-range-only").addEventListener("change", event => {
  state.rangeOnly = event.target.checked; closePopup(); renderTable(); scroller.scrollTop = 0;
});
$("#brc-reset").addEventListener("click", () => {
  clearSelection({ clearSearch: true });
});
search.addEventListener("input", renderSearch);
search.addEventListener("focus", () => { if (search.value.trim()) renderSearch(); });
search.addEventListener("keydown", event => {
  if (event.key === "ArrowDown" || event.key === "Enter") {
    if (results.hidden) renderSearch();
    const first = results.querySelector("button");
    if (first) { event.preventDefault(); if (event.key === "Enter") first.click(); else first.focus(); }
  }
});
results.addEventListener("click", event => {
  const button = event.target.closest("[data-result]");
  if (button) selectUnit(state.byId.get(button.dataset.result), true);
});
results.addEventListener("keydown", event => {
  const options = [...results.querySelectorAll("button")]; const index = options.indexOf(document.activeElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault(); const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) search.focus(); else options[Math.min(next, options.length - 1)]?.focus();
  }
});
$("#brc-detail-close").addEventListener("click", () => closePopup(true));
$("#brc-detail-pin").addEventListener("click", () => {
  if (popupPosition) {
    popupPosition = null;
    popup.classList.remove("is-positioned");
    popup.style.removeProperty("left"); popup.style.removeProperty("top");
    updatePositionControls(); positionPopup();
  } else {
    const rect = popup.getBoundingClientRect(); movePopup(rect.left, rect.top);
  }
});
const dragHandle = $("#brc-detail-drag");
dragHandle.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  const rect = popup.getBoundingClientRect();
  popupDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  dragHandle.setPointerCapture(event.pointerId);
});
dragHandle.addEventListener("pointermove", event => {
  if (popupDrag?.id !== event.pointerId) return;
  const dx = event.clientX - popupDrag.x, dy = event.clientY - popupDrag.y;
  if (!popupPosition && Math.abs(dx) + Math.abs(dy) < 4) return;
  movePopup(popupDrag.left + dx, popupDrag.top + dy);
});
function endPopupDrag(event) {
  if (popupDrag?.id !== event.pointerId) return;
  popupDrag = null;
  if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
}
dragHandle.addEventListener("pointerup", endPopupDrag);
dragHandle.addEventListener("pointercancel", endPopupDrag);
dragHandle.addEventListener("lostpointercapture", () => { popupDrag = null; });
dragHandle.addEventListener("keydown", event => {
  const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!delta) return;
  event.preventDefault();
  const rect = popup.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
  movePopup(rect.left + delta[0] * step, rect.top + delta[1] * step);
});
$("#brc-detail-image").addEventListener("load", () => { armaments.layout(); positionPopup(); });
$("#brc-retry").addEventListener("click", loadCatalog);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!results.hidden) { results.hidden = true; search.focus(); results.hidden = true; }
  else closePopup(true);
});
document.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  if (!event.target.closest(".brc-search")) results.hidden = true;
  if (!popupPosition && !popup.hidden && !popup.contains(event.target) && !event.target.closest("[data-unit]")) closePopup();
});
document.addEventListener("click", event => {
  if (event.button !== 0 || !state.selected) return;
  // A pinned details panel keeps its comparison when clicking outside it.
  if (popupPosition && !popup.hidden) return;
  const unit = event.target.closest("[data-unit]");
  // Vehicle clicks go to selectUnit, which switches the pinned reference directly.
  if (unit) return;
  if (event.target.closest(".brc-controls, #brc-mode-tabs, #brc-details, .header-actions, a, button, input, select, textarea, label")) return;
  clearSelection();
}, true);
scroller.addEventListener("scroll", positionPopup, { passive: true });
window.addEventListener("scroll", positionPopup, { passive: true });
window.addEventListener("resize", () => { armaments.layout(); positionPopup(); });
window.visualViewport?.addEventListener("resize", () => { armaments.layout(); positionPopup(); });
window.addEventListener("maptactic:languagechange", event => { state.language = event.detail.language === "ko" ? "ko" : "en"; applyLanguage(); });
await loadCatalog();
