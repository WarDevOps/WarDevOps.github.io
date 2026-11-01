import { calculateWeaponBr } from "./brc-ratings.js?v=highest-penalty-20261101";
const labels = {
  en: {
    title: "GUIDED WEAPONS", ammunition: "MAIN-GUN AMMUNITION", ammoEmpty: "No main-gun ammunition to display.", loading: "Loading weapons…", unknown: "Weapon information unverified.",
    partial: "Some weapon information is unverified.", empty: "No guided weapons to display in this mode.",
    note: "Each weapon shows that alone. Only the highest selected weapon penalty applies, capped at the aircraft’s mode maximum; quantity is ignored. Availability does not guarantee a valid loadout.",
    previous: "Previous", next: "Next", retry: "Retry", page: "Weapon page",
    variableNote: "Each weapon shows that alone. Only the highest selected weapon penalty applies, capped at the aircraft’s mode maximum; quantity is ignored. Availability does not guarantee a valid loadout.",
    base: "Base", max: "Max", selected: "Selected", reset: "Clear weapons", select: "Select weapon for BR calculation",
    aam: "Air-to-air missile", agm: "Air-to-ground missile", arm: "Anti-radiation missile",
    "guided-bomb": "Guided bomb", "guided-rocket": "Guided rocket", Laser: "Laser",
  },
  ko: {
    title: "유도무기", ammunition: "주포 탄약", ammoEmpty: "표시할 주포 탄약 없음", loading: "무장 불러오는 중…", unknown: "무장 정보 미확인",
    partial: "일부 무장 정보 미확인", empty: "표시할 유도무기 없음",
    note: "각 무장은 단독 장착 기준입니다. 선택한 무장 중 가장 높은 페널티 하나만 적용하며, 항공기의 모드별 최대 BR을 넘지 않습니다. 수량은 무관하며 실제 동시 장착 가능 여부는 확인하지 않습니다.",
    previous: "이전", next: "다음", retry: "다시 시도", page: "무장 페이지",
    variableNote: "각 무장은 단독 장착 기준입니다. 선택한 무장 중 가장 높은 페널티 하나만 적용하며, 항공기의 모드별 최대 BR을 넘지 않습니다. 수량은 무관하며 실제 동시 장착 가능 여부는 확인하지 않습니다.",
    base: "기본", max: "최대", selected: "선택", reset: "무장 해제", select: "BR 계산에 무장 선택",
    aam: "공대공 미사일", agm: "공대지 미사일", arm: "대레이더 미사일",
    "guided-bomb": "유도폭탄", "guided-rocket": "유도로켓", Laser: "Laser",
    "Manual (MCLOS)": "MCLOS", "Semi-Automatic (SACLOS)": "SACLOS", "Beam riding": "Beam riding",
  },
};
const kinds = ["aam", "agm", "guided-bomb", "guided-rocket", "arm", "ammunition"];
const modes = { arb: new Set(["aam"]), grb: new Set(kinds.filter(kind => kind !== "aam")) };

export function weaponsForAircraft(data, wikiId, mode, rule = null, category = "air") {
  const aircraft = data?.[category === "tank" ? "ground" : category === "heli" ? "helicopters" : "aircraft"]?.[wikiId];
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
    const allowed = category === "tank" ? weapon.type === "ammunition"
      : category === "heli" ? weapon.type !== "ammunition" : weapon.type !== "ammunition" && (modes[mode]?.has(weapon.type) || rule?.penalties[id] > 0);
    return allowed ? [{ ...weapon, id }] : [];
  }).sort((a, b) => (rule ? calculateWeaponBr({ variableBr: { [mode]: rule } }, mode, [b.id])
    - calculateWeaponBr({ variableBr: { [mode]: rule } }, mode, [a.id]) : 0)
    || kinds.indexOf(a.type) - kinds.indexOf(b.type)
    || a.name.localeCompare(b.name, "en", { numeric: true }));
  return { status, weapons };
}

function node(tag, className, content) {
  const result = document.createElement(tag); result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}

export function createArmamentPanel({ panel, popup, onLayout, onRatingChange }) {
  let data = null, loading = false, failed = false, current = null, key = "", start = 0, size = 6;
  const selections = new Map();
  const chosen = () => selections.get(key) || new Set();
  const heading = node("h3", "brc-kicker");
  const message = node("p", "brc-armament-message"); message.setAttribute("role", "status");
  const list = node("ul", "brc-armament-list");
  const summary = node("div", "brc-armament-summary");
  const summaryText = node("span", ""); summaryText.setAttribute("role", "status");
  const reset = node("button", "brc-secondary"); reset.type = "button";
  summary.append(summaryText, reset);
  const nav = node("nav", "brc-armament-pages");
  const previous = node("button", "brc-secondary"), next = node("button", "brc-secondary");
  previous.type = next.type = "button";
  const page = node("span", ""); page.setAttribute("aria-live", "polite"); page.setAttribute("aria-atomic", "true");
  nav.append(previous, page, next);
  const note = node("p", "brc-armament-note");
  const retry = node("button", "brc-secondary"); retry.type = "button";
  panel.replaceChildren(heading, message, retry, summary, list, nav, note);

  async function load() {
    if (loading) return;
    loading = true; failed = false; render();
    try {
      const [result, extra] = await Promise.all([
        "../data/aircraft-armaments.json?v=new-units-20261101",
        "../data/ground-heli-armaments.json?v=missile-guidance-20261101",
      ].map(async path => {
        const response = await fetch(new URL(path, import.meta.url));
        if (!response.ok) throw new Error(`Armaments HTTP ${response.status}`);
        const value = await response.json();
        if (value.schemaVersion !== 1 || !value.weapons) throw new Error("Invalid armament catalog");
        return value;
      }));
      if (!result.aircraft || !extra.ground || !extra.helicopters) throw new Error("Missing armament categories");
      data = { ...extra, aircraft: result.aircraft, weapons: { ...extra.weapons, ...result.weapons } };
    } catch (error) {
      console.warn("BRC armaments unavailable", error); failed = true;
    } finally {
      loading = false; render(); onLayout();
    }
  }

  function row(weapon, copy) {
    const item = node("li", "brc-armament-row"); item.dataset.weapon = weapon.id;
    const icon = node("img", "brc-armament-icon");
    if (weapon.icon) icon.src = weapon.icon;
    else icon.style.visibility = "hidden";
    icon.width = icon.height = 36;
    icon.alt = copy[weapon.type] || weapon.ammoType || ""; icon.title = icon.alt;
    const name = node("span", "brc-armament-name", weapon.name);
    const guidance = node("span", "brc-armament-guidance", weapon.guidance.split("+").map(value => copy[value] || value).join(" + "));
    const br = node("span", "brc-armament-br", `BR ${calculateWeaponBr(current.unit, current.mode, [weapon.id]).toFixed(1)}`);
    if (current.unit.variableBr?.[current.mode]) {
      const toggle = node("button", "brc-armament-toggle"); toggle.type = "button";
      toggle.setAttribute("aria-pressed", String(chosen().has(weapon.id)));
      toggle.setAttribute("aria-label", `${copy.select}: ${weapon.name}`);
      toggle.append(icon);
      toggle.addEventListener("click", () => {
        const selected = new Set(chosen());
        if (selected.has(weapon.id)) selected.delete(weapon.id); else selected.add(weapon.id);
        selections.set(key, selected); render(); publishRating(); onLayout();
        list.querySelector(`[data-weapon="${weapon.id}"] button`)?.focus({ preventScroll: true });
      });
      item.classList.toggle("is-selected", chosen().has(weapon.id));
      item.append(toggle, name, guidance, br);
    } else item.append(icon, name, guidance, br);
    return item;
  }

  function render() {
    panel.hidden = !current || current.unit.wikiPending === true;
    if (panel.hidden || popup.hidden) return;
    const copy = labels[current.language] || labels.en;
    const ground = current.unit.category === "tank";
    heading.textContent = `${current.mode.toUpperCase()} · ${ground ? copy.ammunition : copy.title}`;
    const rule = current.unit.variableBr?.[current.mode];
    note.textContent = rule ? copy.variableNote : copy.note;
    previous.textContent = copy.previous; next.textContent = copy.next;
    nav.setAttribute("aria-label", copy.page); retry.textContent = copy.retry;
    retry.hidden = !failed;
    const result = weaponsForAircraft(data, current.unit.wikiId, current.mode, rule, current.unit.category);
    const weapons = result.weapons;
    message.textContent = loading ? copy.loading : result.status === "unverified" ? copy.unknown
      : result.status === "partial" ? copy.partial : !weapons.length ? ground ? copy.ammoEmpty : copy.empty : "";
    message.hidden = !message.textContent;
    summary.hidden = !rule;
    if (rule) {
      summaryText.textContent = `${copy.base} ${rule.base.toFixed(1)} · ${copy.max} ${rule.max.toFixed(1)} · ${copy.selected} BR ${calculateWeaponBr(current.unit, current.mode, chosen()).toFixed(1)}`;
      reset.textContent = copy.reset; reset.disabled = !chosen().size;
    }
    list.hidden = !weapons.length; note.hidden = ground || !weapons.length; nav.hidden = !weapons.length;
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
  function publishRating() {
    onRatingChange?.(current.unit.id, current.mode, calculateWeaponBr(current.unit, current.mode, chosen()));
  }
  reset.addEventListener("click", () => { selections.delete(key); render(); publishRating(); onLayout(); });
  return {
    ratingFor(unit, mode) {
      return calculateWeaponBr(unit, mode, selections.get(`${unit.id}:${mode}`) || []);
    },
    show(unit, mode, language) {
      const nextKey = `${unit.id}:${mode}`;
      if (key !== nextKey) start = 0;
      key = nextKey; current = { unit, mode, language };
      popup.querySelector(".brc-detail-image")?.style.removeProperty("height");
      render();
      if (!unit.wikiPending && !data && !loading && !failed) void load();
    },
    layout() {
      popup.querySelector(".brc-detail-image")?.style.removeProperty("height");
      render();
    },
  };
}
