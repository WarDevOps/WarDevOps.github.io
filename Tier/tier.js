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
  tank: { folder: "Tank", label: "GROUND FORCES", title: "War Thunder Ground Vehicle Tier List" },
  air: { folder: "Air", label: "AIRCRAFT", title: "War Thunder Aircraft Tier List" }
});

const categoryButtons = [...document.querySelectorAll("[data-category]")];
const dropzones = [...document.querySelectorAll("[data-zone]")];
const categoryLabel = document.querySelector("#category-label");
const templateTitle = document.querySelector("#template-title");
const unitCount = document.querySelector("#unit-count");
const saveStatus = document.querySelector("#save-status");
const resetButton = document.querySelector("#reset-tier");

let activeCategory = "tank";
let selectedItemId = null;
let draggedItemId = null;
let suppressNextClick = false;

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

function persistLayouts(message = "Saved locally") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    saveStatus.textContent = message;
  } catch {
    saveStatus.textContent = "This browser could not save the layout.";
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
  card.dataset.itemId = id;
  card.draggable = true;
  card.title = `${name} — drag or select`;
  card.setAttribute("aria-label", name);
  card.setAttribute("aria-pressed", String(selectedItemId === id));
  card.classList.toggle("is-selected", selectedItemId === id);

  const image = document.createElement("img");
  image.src = `../${META[activeCategory].folder}/${encodeURIComponent(file)}`;
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
    saveStatus.textContent = selectedItemId ? `${name} selected. Choose a tier.` : "Selection cleared.";
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
  if (!allIds(activeCategory).includes(id) || !TIER_ZONES.includes(targetZone)) return;
  if (beforeId === id) return;
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
  categoryLabel.textContent = meta.label;
  templateTitle.textContent = meta.title;
  categoryButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory)));

  dropzones.forEach(zone => {
    const zoneName = zone.dataset.zone;
    zone.replaceChildren();
    layouts[activeCategory][zoneName].forEach(id => {
      const card = createCard(id);
      if (card) zone.append(card);
    });
  });
  const rankedCount = TIER_ZONES.filter(zone => zone !== "pool").reduce((count, zone) => count + layouts[activeCategory][zone].length, 0);
  unitCount.textContent = `${rankedCount} ranked · ${layouts[activeCategory].pool.length} unranked`;
}

function dropPosition(zone, event) {
  const targetCard = event.target.closest(".tier-card");
  if (!targetCard || targetCard.parentElement !== zone) return null;
  const rect = targetCard.getBoundingClientRect();
  const isBefore = event.clientX < rect.left + rect.width / 2;
  if (isBefore) return targetCard.dataset.itemId;
  const nextCard = targetCard.nextElementSibling;
  return nextCard?.dataset.itemId || null;
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
    const id = event.dataTransfer.getData("text/plain");
    moveItem(id, zone.dataset.zone, dropPosition(zone, event));
  });
  zone.addEventListener("click", event => {
    if (event.target.closest(".tier-card") || !selectedItemId) return;
    moveItem(selectedItemId, zone.dataset.zone);
  });
  zone.addEventListener("keydown", event => {
    if ((event.key !== "Enter" && event.key !== " ") || !selectedItemId) return;
    event.preventDefault();
    moveItem(selectedItemId, zone.dataset.zone);
  });
});

categoryButtons.forEach(button => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  selectedItemId = null;
  saveStatus.textContent = "";
  render();
}));

resetButton.addEventListener("click", () => {
  layouts[activeCategory] = emptyLayout(activeCategory);
  selectedItemId = null;
  persistLayouts("Tier list reset.");
  render();
});

render();
