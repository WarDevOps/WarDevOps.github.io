const labels = {
  en: {
    title: "GUIDED WEAPONS", loading: "Loading weapons…", unknown: "Weapon information unverified.",
    partial: "Some weapon information is unverified.", empty: "No guided weapons to display in this mode.",
    note: "Available types, not a simultaneous loadout. BR temporarily uses this aircraft’s current mode rating.",
    previous: "Previous", next: "Next", retry: "Retry", page: "Weapon page",
    aam: "Air-to-air missile", agm: "Air-to-ground missile", arm: "Anti-radiation missile",
    "guided-bomb": "Guided bomb", "guided-rocket": "Guided rocket", Laser: "Laser",
  },
  ko: {
    title: "유도무기", loading: "무장 불러오는 중…", unknown: "무장 정보 미확인",
    partial: "일부 무장 정보 미확인", empty: "표시할 유도무기 없음",
    note: "동시 장착 조합이 아닌 종류 목록입니다. BR은 현재 모드의 항공기 BR을 임시 표시합니다.",
    previous: "이전", next: "다음", retry: "다시 시도", page: "무장 페이지",
    aam: "공대공 미사일", agm: "공대지 미사일", arm: "대레이더 미사일",
    "guided-bomb": "유도폭탄", "guided-rocket": "유도로켓", Laser: "레이저",
    "Manual (MCLOS)": "MCLOS", "Semi-Automatic (SACLOS)": "SACLOS", "Beam riding": "빔 유도",
  },
};
const kinds = ["aam", "agm", "guided-bomb", "guided-rocket", "arm"];
const modes = { arb: new Set(["aam"]), grb: new Set(kinds.filter(kind => kind !== "aam")) };

export function weaponsForAircraft(data, wikiId, mode) {
  const aircraft = data?.aircraft?.[wikiId];
  if (!aircraft || !["verified", "partial"].includes(aircraft.status) || !Array.isArray(aircraft.weapons)) {
    return { status: "unverified", weapons: [] };
  }
  let status = aircraft.status;
  const weapons = [...new Set(aircraft.weapons)].flatMap(id => {
    const weapon = data.weapons?.[id];
    if (!weapon || !kinds.includes(weapon.type) || typeof weapon.name !== "string" || !weapon.name
        || typeof weapon.guidance !== "string" || !weapon.guidance) {
      status = "partial"; return [];
    }
    return modes[mode]?.has(weapon.type) ? [{ ...weapon, id }] : [];
  }).sort((a, b) => kinds.indexOf(a.type) - kinds.indexOf(b.type)
    || a.name.localeCompare(b.name, "en", { numeric: true }));
  return { status, weapons };
}

function node(tag, className, content) {
  const result = document.createElement(tag); result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}

export function createArmamentPanel({ panel, popup, onLayout }) {
  let data = null, loading = false, failed = false, current = null, key = "", start = 0, size = 6;
  const heading = node("h3", "brc-kicker");
  const message = node("p", "brc-armament-message"); message.setAttribute("role", "status");
  const list = node("ul", "brc-armament-list");
  const nav = node("nav", "brc-armament-pages");
  const previous = node("button", "brc-secondary"), next = node("button", "brc-secondary");
  previous.type = next.type = "button";
  const page = node("span", ""); page.setAttribute("aria-live", "polite"); page.setAttribute("aria-atomic", "true");
  nav.append(previous, page, next);
  const note = node("p", "brc-armament-note");
  const retry = node("button", "brc-secondary"); retry.type = "button";
  panel.replaceChildren(heading, message, retry, list, nav, note);

  async function load() {
    if (loading) return;
    loading = true; failed = false; render();
    try {
      const response = await fetch(new URL("../data/aircraft-armaments.json?v=20261101", import.meta.url));
      if (!response.ok) throw new Error(`Armaments HTTP ${response.status}`);
      const result = await response.json();
      if (result.schemaVersion !== 1 || !result.aircraft || !result.weapons) throw new Error("Invalid armament catalog");
      data = result;
    } catch (error) {
      console.warn("BRC armaments unavailable", error); failed = true;
    } finally {
      loading = false; render(); onLayout();
    }
  }

  function row(weapon, copy) {
    const item = node("li", "brc-armament-row"); item.dataset.weapon = weapon.id;
    const icon = node("img", "brc-armament-icon");
    icon.src = `/icon/weapon-${weapon.type}.svg`; icon.width = icon.height = 22;
    icon.alt = copy[weapon.type]; icon.title = copy[weapon.type];
    const name = node("span", "brc-armament-name", weapon.name);
    const guidance = node("span", "brc-armament-guidance", weapon.guidance.split("+").map(value => copy[value] || value).join(" + "));
    // A BR belongs to this aircraft in this mode, never to the shared weapon.
    // Until variable BR is supplied, use the same selected-unit BR as the table.
    const br = node("span", "brc-armament-br", `BR ${current.unit.br.toFixed(1)}`);
    item.append(icon, name, guidance, br); return item;
  }

  function render() {
    panel.hidden = !current || current.unit.category !== "air";
    if (panel.hidden || popup.hidden) return;
    const copy = labels[current.language] || labels.en;
    heading.textContent = `${current.mode.toUpperCase()} · ${copy.title}`;
    note.textContent = copy.note;
    previous.textContent = copy.previous; next.textContent = copy.next;
    nav.setAttribute("aria-label", copy.page); retry.textContent = copy.retry;
    retry.hidden = !failed;
    const result = weaponsForAircraft(data, current.unit.wikiId, current.mode);
    const weapons = result.weapons;
    message.textContent = loading ? copy.loading : result.status === "unverified" ? copy.unknown
      : result.status === "partial" ? copy.partial : !weapons.length ? copy.empty : "";
    message.hidden = !message.textContent;
    list.hidden = !weapons.length; note.hidden = !weapons.length; nav.hidden = !weapons.length;
    list.replaceChildren(...weapons.map(weapon => row(weapon, copy)));
    if (!weapons.length) return;
    // Measure actual wrapped text at the current width. Paginate to fit the
    // viewport instead of creating an inner scroll area or clipping names.
    page.textContent = `1 / ${weapons.length}`;
    const maxRow = Math.max(...[...list.children].map(item => item.getBoundingClientRect().height));
    const available = (window.visualViewport?.height || innerHeight) - 32;
    let base = popup.getBoundingClientRect().height - list.getBoundingClientRect().height;
    const media = popup.querySelector(".brc-detail-image");
    // On a short screen, give the first row space by reducing the preview image.
    // Keep the full weapon names, guidance and pagination controls readable.
    if (base + maxRow > available && media && !media.hidden) {
      const height = media.getBoundingClientRect().height;
      media.style.height = `${Math.max(24, height - (base + maxRow - available))}px`;
      base = popup.getBoundingClientRect().height - list.getBoundingClientRect().height;
    }
    size = Math.max(1, Math.min(6, Math.floor((available - base) / maxRow)));
    start = Math.min(Math.floor(start / size) * size, Math.floor((weapons.length - 1) / size) * size);
    list.replaceChildren(...weapons.slice(start, start + size).map(weapon => row(weapon, copy)));
    const pages = Math.ceil(weapons.length / size);
    nav.hidden = pages <= 1;
    page.textContent = `${Math.floor(start / size) + 1} / ${pages}`;
    previous.disabled = start === 0; next.disabled = start + size >= weapons.length;
  }

  previous.addEventListener("click", () => { start = Math.max(0, start - size); render(); onLayout(); });
  next.addEventListener("click", () => { start += size; render(); onLayout(); });
  retry.addEventListener("click", load);
  return {
    show(unit, mode, language) {
      const nextKey = `${unit.id}:${mode}`;
      if (key !== nextKey) start = 0;
      key = nextKey; current = { unit, mode, language };
      popup.querySelector(".brc-detail-image")?.style.removeProperty("height");
      render();
      if (unit.category === "air" && !data && !loading && !failed) void load();
    },
    layout() {
      popup.querySelector(".brc-detail-image")?.style.removeProperty("height");
      render();
    },
  };
}
