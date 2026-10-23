import { CATEGORIES, COUNTRIES, readCatalog, visibleUnits, searchUnits, rangeColor, toTenths } from "./brc-model.js?v=battle-tabs-20261024";

const copy = {
  en: {
    grb: "GROUND REALISTIC", arb: "AIR REALISTIC", modeLabel: "Battle mode",
    arbNotice: "Compare aircraft within ±1.0 of the selected aircraft’s Air RB. All nations are included.",
    arbEmpty: "No aircraft in this range. Turn off Range only to see all aircraft.",
    intro: "Hover to compare. Select a vehicle to pin its ±1.0 BR range and open its details.",
    searchLabel: "Find a vehicle", categories: "Vehicle types", tank: "Ground", air: "Aircraft", heli: "Helicopters",
    rangeOnly: "Range only", clear: "Clear selection", comparing: "COMPARING", difference: "BR difference",
    notice: "A ±1.0 BR comparison, not a complete list of possible opponents. Matchmaking uses your lineup’s highest BR; lower-BR vehicles may also appear. All nations are included.",
    scrollHint: "Scroll to explore · Nation headers and BR stay visible", details: "VEHICLE DETAILS",
    placeholder: "Vehicle notes are coming soon.", closeHint: "Closing this panel keeps your selected range.",
    close: "Close details", tableLabel: "Vehicles by nation and battle rating", retry: "Try again",
    idle: "Hover over or select a vehicle", idleHint: "Select a vehicle to enable Range only.",
    pinned: "Pinned", preview: "Preview", noResults: "No matching vehicles.", results: "results", more: "Showing the first 60. Refine your search for more specific results.",
    loading: "Loading vehicles…", error: "Could not load the vehicle catalog. Please try again.", empty: "No vehicles to display. Enable a vehicle type or turn off Range only.",
    vehicles: "vehicles", selected: "Selected", hiddenSelection: "Selected vehicle is hidden by the type filters.",
    shared: "Current Wiki ratings from the shared Tier List catalog. GRB uses Ground RB; ARB uses Air RB.", updated: "BR checked", source: "Source: War Thunder Wiki",
    countries: ["USA", "Germany", "USSR", "Britain", "Japan", "China", "Italy", "France", "Sweden", "Israel"],
  },
  ko: {
    grb: "지상 리얼리스틱", arb: "공중 리얼리스틱", modeLabel: "전투 모드",
    arbNotice: "선택한 항공기의 공중전 BR 기준 ±1.0 범위를 비교합니다. 모든 국가의 항공기를 표시합니다.",
    arbEmpty: "이 범위에 표시할 항공기가 없습니다. ‘범위만 보기’를 해제하면 전체 항공기를 볼 수 있습니다.",
    intro: "마우스를 올려 비교하고, 장비를 선택해 ±1.0 BR 범위를 고정하거나 설명을 확인하세요.",
    searchLabel: "장비 찾기", categories: "장비 종류", tank: "지상", air: "항공", heli: "헬기",
    rangeOnly: "범위만 보기", clear: "선택 해제", comparing: "비교 기준", difference: "BR 차이",
    notice: "선택 장비의 ±1.0 BR 비교표입니다. 실제 매칭은 편성의 최고 BR을 기준으로 하며 더 낮은 BR 장비도 등장할 수 있습니다. 아군·적군을 구분하지 않고 모든 국가를 표시합니다.",
    scrollHint: "스크롤로 탐색 · 국가 헤더와 BR 열 고정", details: "장비 설명",
    placeholder: "장비 설명을 준비 중입니다.", closeHint: "설명을 닫아도 선택한 범위는 유지됩니다.",
    close: "설명 닫기", tableLabel: "국가 및 BR별 장비", retry: "다시 시도",
    idle: "장비에 마우스를 올리거나 선택하세요", idleHint: "장비를 선택하면 ‘범위만 보기’를 사용할 수 있습니다.",
    pinned: "고정", preview: "미리보기", noResults: "일치하는 장비가 없습니다.", results: "개 검색 결과", more: "앞의 60개 결과입니다. 검색어를 더 입력하면 결과를 좁힐 수 있습니다.",
    loading: "장비를 불러오는 중…", error: "장비 목록을 불러오지 못했습니다. 다시 시도해주세요.", empty: "표시할 장비가 없습니다. 장비 종류를 켜거나 ‘범위만 보기’를 해제하세요.",
    vehicles: "대", selected: "선택", hiddenSelection: "선택한 장비가 종류 필터로 숨겨져 있습니다.",
    shared: "티어리스트와 같은 현재 위키 장비 데이터를 공유합니다. GRB는 지상전 BR, ARB는 공중전 BR을 사용합니다.", updated: "BR 확인", source: "출처: War Thunder Wiki",
    countries: ["미국", "독일", "소련", "영국", "일본", "중국", "이탈리아", "프랑스", "스웨덴", "이스라엘"],
  },
};
const $ = selector => document.querySelector(selector);
const table = $("#brc-table"), scroller = $("#brc-scroll"), search = $("#brc-search"), results = $("#brc-results"), popup = $("#brc-details");
const state = { language: document.documentElement.lang === "ko" ? "ko" : "en", mode: "grb", units: [], byId: new Map(), categories: new Set(CATEGORIES), selected: null, hovered: null, focused: null, rangeOnly: false, catalog: null, loading: true, failed: false };
const modeViews = Object.fromEntries(["grb", "arb"].map(mode => [mode, { selectedId: null, rangeOnly: false, query: "", top: 0, left: 0 }]));
let buttons = new Map(), rows = [], popupAnchor = null;
const t = key => copy[state.language][state.mode === "arb" ? ({ notice: "arbNotice", empty: "arbEmpty" }[key] || key) : key];
const countryName = code => t("countries")[COUNTRIES.indexOf(code)];
const number = value => value.toFixed(1);
const ratingLabel = unit => `${state.mode.toUpperCase()} BR ${number(unit.br)}`;
const active = () => state.hovered || state.focused || state.selected;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderTable() {
  state.hovered = null;
  state.focused = null;
  const units = visibleUnits(state.units, state.mode === "arb" ? new Set(["air"]) : state.categories, state.selected, state.rangeOnly);
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
        section.append(element("span", "brc-group-label", t(category)));
        for (const unit of categoryUnits) {
          const button = element("button", "brc-unit", unit.name);
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
  $("#brc-count").textContent = `${units.length.toLocaleString(state.language)} ${t("vehicles")}`;
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
  $("#brc-pinned").textContent = state.selected
    ? `${t("pinned")}: ${state.selected.name} · ${countryName(state.selected.countryCode)} · ${ratingLabel(state.selected)}${state.mode === "grb" && !state.categories.has(state.selected.category) ? ` · ${t("hiddenSelection")}` : ""}`
    : t("idleHint");
  $("#brc-range-only").disabled = !state.selected;
  $("#brc-reset").disabled = !state.selected;
}

function closePopup(restoreFocus = false) {
  popup.hidden = true;
  if (restoreFocus && popupAnchor?.isConnected) popupAnchor.focus({ preventScroll: true });
}

function positionPopup() {
  if (popup.hidden || !popupAnchor?.isConnected || matchMedia("(max-width: 700px)").matches) return;
  const anchor = popupAnchor.getBoundingClientRect();
  const rect = popup.getBoundingClientRect();
  const left = Math.min(innerWidth - rect.width - 12, Math.max(12, anchor.left));
  const below = anchor.bottom + 8;
  const preferredTop = below + rect.height <= innerHeight - 12 ? below : anchor.top - rect.height - 8;
  const top = Math.max(12, Math.min(innerHeight - rect.height - 12, preferredTop));
  popup.style.left = `${left}px`; popup.style.top = `${top}px`;
}

function updatePopup() {
  if (!state.selected) return;
  $("#brc-detail-name").textContent = state.selected.name;
  $("#brc-detail-meta").textContent = `${countryName(state.selected.countryCode)} · ${t(state.selected.category)} · ${ratingLabel(state.selected)}`;
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
  $("#brc-status").textContent = `${t("selected")}: ${unit.name} · ${ratingLabel(unit)}`;
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
  $("#brc-detail-close").setAttribute("aria-label", t("close"));
  scroller.setAttribute("aria-label", t("tableLabel"));
  $(".brc-legend").setAttribute("aria-label", t("difference"));
  $("#brc-mode-tabs").setAttribute("aria-label", t("modeLabel"));
  if (state.catalog) {
    const date = new Date(state.catalog.battleRatingsUpdatedAt || state.catalog.generatedAt);
    const note = $("#brc-data-note");
    note.textContent = `${t("shared")} ${t("updated")}: ${Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString(state.language, { timeZone: "UTC" })} · `;
    const source = element("a", "", t("source")); source.href = "https://wiki.warthunder.com"; source.target = "_blank"; source.rel = "noopener noreferrer"; note.append(source);
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
  state.units = readCatalog(state.catalog, mode);
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
    const response = await fetch(new URL("../data/tier-units.json?v=wiki-current-20261024", import.meta.url));
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const catalog = await response.json();
    state.units = readCatalog(catalog, state.mode);
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
  if (event.pointerType === "touch") return;
  const button = event.target.closest("[data-unit]");
  const next = button ? state.byId.get(button.dataset.unit) : null;
  if (state.hovered !== next) { state.hovered = next; paintComparison(); }
});
table.addEventListener("pointerleave", () => { state.hovered = null; paintComparison(); });
table.addEventListener("focusin", event => {
  const button = event.target.closest("[data-unit]");
  // Mouse focus must not turn a transient hover into a pinned preview.
  state.focused = button?.matches(":focus-visible") ? state.byId.get(button.dataset.unit) : null;
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
  state.selected = null; state.rangeOnly = false; $("#brc-range-only").checked = false;
  closePopup(); renderTable(); search.value = ""; results.hidden = true;
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
$("#brc-retry").addEventListener("click", loadCatalog);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!results.hidden) { results.hidden = true; search.focus(); results.hidden = true; }
  else closePopup(true);
});
document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".brc-search")) results.hidden = true;
  if (!popup.hidden && !popup.contains(event.target) && !event.target.closest("[data-unit]")) closePopup();
});
scroller.addEventListener("scroll", positionPopup, { passive: true });
window.addEventListener("scroll", positionPopup, { passive: true });
window.addEventListener("resize", positionPopup);
window.addEventListener("maptactic:languagechange", event => { state.language = event.detail.language === "ko" ? "ko" : "en"; applyLanguage(); });
await loadCatalog();
