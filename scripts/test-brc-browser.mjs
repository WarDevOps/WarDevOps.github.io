// Usage: node scripts/test-brc-browser.mjs <absolute playwright/index.mjs> [base URL] [screenshot directory]
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
const { chromium } = await import(pathToFileURL(process.argv[2]));
const base = process.argv[3] || "http://127.0.0.1:8142";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, locale: "en-US" });
const errors = []; page.on("pageerror", error => errors.push(error.message));
const catalog = JSON.parse(readFileSync(new URL("../assets/data/tier-units.json", import.meta.url)));
const total = Object.values(catalog.categories).reduce((sum, category) => sum + category.units.length, 0);
await page.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
const search = page.locator("#brc-search"), popup = page.locator("#brc-details");
const selected = page.locator('.brc-unit[aria-pressed="true"]');
const assertBrAtTop = async (br, allowEnd = false) => {
  const position = await page.evaluate(br => {
    const scroller = document.querySelector("#brc-scroll");
    const row = document.querySelector(`tbody tr[data-br="${br.toFixed(1)}"]`);
    return { top: row.getBoundingClientRect().top, bottom: scroller.getBoundingClientRect().bottom,
      atEnd: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2,
      expected: scroller.getBoundingClientRect().top + scroller.clientTop + document.querySelector("thead").getBoundingClientRect().height + 8 };
  }, br);
  assert.ok(Math.abs(position.top - position.expected) < 2 || (allowEnd && position.atEnd && position.top >= position.expected && position.top < position.bottom), `Selected BR should be below the sticky header: ${JSON.stringify(position)}`);
};
const find = async name => {
  await search.fill(name);
  await page.locator(".brc-result").first().click();
  await popup.waitFor({ state: "visible" });
};
try {
  await page.goto(`${base}/brc/`);
  await page.waitForFunction(() => !document.querySelector("#brc-search").disabled);
  assert.equal(await page.locator(".brc-unit").count(), total);
  assert.equal(await page.locator("thead th").count(), 11);
  if (catalog.battleRatingUpdate?.status === "planned") {
    assert.match(await page.locator("#brc-data-note").textContent(), /planned BR changes/);
    assert.equal(await page.locator("#brc-data-note a").getAttribute("href"), catalog.battleRatingUpdate.source);
  }
  await find("Leopard 2K");
  const unit = catalog.categories.tank.units.find(unit => unit.name === "Leopard 2K");
  assert.equal(await selected.textContent(), "Leopard 2K");
  assert.ok((await page.locator("#brc-active").textContent()).includes(unit.br.toFixed(1)));
  const highlighted = await page.locator("tr.in-range").evaluateAll(rows => rows.map(row => Number(row.dataset.br)));
  assert.ok(highlighted.length); assert.ok(highlighted.every(br => Math.abs(Math.round(br * 10) - Math.round(unit.br * 10)) <= 10));
  await page.locator("#brc-detail-close").click();
  await search.focus();
  const different = page.locator('.brc-table tr:not(.in-range) .brc-unit').first();
  await different.hover();
  assert.match(await page.locator("#brc-active").textContent(), /Pinned · Leopard 2K/);
  assert.deepEqual(await page.locator("tr.in-range").evaluateAll(rows => rows.map(row => Number(row.dataset.br))), highlighted);
  await page.locator("#brc-title").hover();
  assert.match(await page.locator("#brc-active").textContent(), /Pinned · Leopard 2K/);
  await selected.click();
  assert.equal(await selected.textContent(), "Leopard 2K");
  await page.locator("#brc-detail-close").click();
  await different.click({ button: "right" });
  assert.equal(await selected.count(), 1);
  const nextId = await different.getAttribute("data-unit");
  const nextBr = await different.evaluate(node => Number(node.closest("tr").dataset.br));
  await different.click();
  assert.equal(await selected.getAttribute("data-unit"), nextId);
  assert.ok(await popup.isVisible());
  const switchedRange = await page.locator("tr.in-range").evaluateAll(rows => rows.map(row => Number(row.dataset.br)));
  assert.ok(switchedRange.length);
  assert.ok(switchedRange.every(br => Math.abs(Math.round(br * 10) - Math.round(nextBr * 10)) <= 10));
  await page.locator("#brc-detail-close").click();
  await different.hover();
  assert.equal(await selected.getAttribute("data-unit"), nextId);
  assert.deepEqual(await page.locator("tr.in-range").evaluateAll(rows => rows.map(row => Number(row.dataset.br))), switchedRange);
  await page.locator("#brc-title").click();
  assert.equal(await selected.count(), 0);
  assert.equal(await page.locator("tr.in-range").count(), 0);
  await find("Leopard 2K");
  await page.locator("#brc-detail-close").click();
  await page.locator("#brc-range-only").check();
  await page.locator("thead th").first().click();
  assert.equal(await selected.count(), 0);
  assert.ok(await page.locator("#brc-range-only").isDisabled());
  assert.ok(!(await page.locator("#brc-range-only").isChecked()));
  assert.equal(await page.locator(".brc-unit").count(), total);
  await find("Leopard 2K");
  await page.locator("#brc-detail-close").click();
  console.log("Pin lock: hover cannot change colors, other cell switches pin in one click, blank click unlocks, range-only clears");
  await page.locator("#brc-scroll").evaluate(node => { node.scrollLeft = 120; node.scrollTop = 0; });
  await page.locator('#brc-categories input[value="air"]').uncheck();
  await assertBrAtTop(unit.br);
  const horizontalOffset = await page.locator("#brc-scroll").evaluate(node => node.scrollLeft);
  await page.locator('#brc-categories input[value="air"]').check();
  await assertBrAtTop(unit.br);
  assert.equal(await page.locator("#brc-scroll").evaluate(node => node.scrollLeft), horizontalOffset);
  await page.locator('#brc-categories input[value="tank"]').uncheck();
  await assertBrAtTop(unit.br);
  assert.equal(await selected.count(), 0);
  await page.locator('#brc-categories input[value="tank"]').check();
  await assertBrAtTop(unit.br);
  assert.equal(await selected.count(), 1);
  console.log("Type filters: selected BR restored when types are shown/hidden, including selected type; horizontal position preserved");
  await page.locator("#brc-range-only").check();
  assert.ok(await page.locator(".brc-unit").count() < total);
  assert.equal(await page.locator("tbody tr:not(.in-range)").count(), 0);
  await page.locator('#brc-categories input[value="tank"]').uncheck();
  assert.equal(await selected.count(), 0);
  await find("Leopard 2K");
  assert.ok(await page.locator('#brc-categories input[value="tank"]').isChecked());
  await page.locator("#brc-detail-close").click();
  await page.locator('[data-language="ko"]').click();
  assert.equal(await page.locator('label[for="brc-search"]').textContent(), "장비 찾기");
  await page.locator("#theme-toggle").click();
  assert.ok(await page.locator("body").evaluate(body => body.classList.contains("light-theme")));
  if (process.argv[4]) await page.screenshot({ path: `${process.argv[4]}/brc-light.png`, fullPage: true });
  await page.locator("#theme-toggle").click();
  if (process.argv[4]) await page.screenshot({ path: `${process.argv[4]}/brc-desktop.png`, fullPage: true });
  await page.locator("#brc-reset").click();
  assert.equal(await selected.count(), 0); assert.equal(await page.locator(".in-range").count(), 0);
  assert.equal(await page.locator(".brc-unit").count(), total);
  for (const input of await page.locator("#brc-categories input").all()) await input.uncheck();
  assert.equal(await page.locator(".brc-unit").count(), 0);
  assert.match(await page.locator("#brc-status").textContent(), /표시할 장비/);
  await search.fill("leopard2k"); await search.press("ArrowDown"); await page.keyboard.press("Enter");
  await popup.waitFor({ state: "visible" });
  await page.keyboard.press("Escape"); assert.ok(await popup.isHidden());
  assert.equal(await selected.count(), 1);
  console.log("Desktop: full catalog, range, pinned hover, search, filters, reset, language, theme and keyboard passed");

  await page.setViewportSize({ width: 390, height: 844 });
  await find("Leopard 2K");
  const popupRect = await popup.boundingBox();
  assert.ok(popupRect.x >= 0 && popupRect.x + popupRect.width <= 390 && popupRect.y + popupRect.height <= 844);
  await page.locator("#brc-detail-close").click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#brc-categories input[value="air"]').check();
  await assertBrAtTop(unit.br);
  await page.locator('#brc-categories input[value="air"]').uncheck();
  await assertBrAtTop(unit.br);
  await page.locator("#brc-scroll").evaluate(node => { node.scrollLeft = 500; node.scrollTop = 300; });
  const sticky = await page.evaluate(() => {
    const scroll = document.querySelector("#brc-scroll").getBoundingClientRect();
    const head = document.querySelector("thead th").getBoundingClientRect();
    const br = document.querySelector("tbody th").getBoundingClientRect();
    return { scroll: { x: scroll.x, y: scroll.y }, head: { x: head.x, y: head.y }, br: { x: br.x } };
  });
  assert.ok(Math.abs(sticky.head.y - sticky.scroll.y) < 3);
  assert.ok(Math.abs(sticky.br.x - sticky.scroll.x) < 3);
  if (process.argv[4]) await page.screenshot({ path: `${process.argv[4]}/brc-mobile.png`, fullPage: true });
  assert.deepEqual(errors, []);
  console.log("Mobile: page width, bottom details panel and sticky column/header passed");

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touch = await touchContext.newPage();
  await touch.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await touch.goto(`${base}/brc/`);
  await touch.waitForFunction(() => !document.querySelector("#brc-search").disabled);
  const firstTouchUnit = touch.locator(".brc-unit").first();
  await firstTouchUnit.tap(); await touch.locator("#brc-details").waitFor({ state: "visible" });
  assert.equal(await touch.locator('.brc-unit[aria-pressed="true"]').count(), 1);
  if (process.argv[4]) await touch.screenshot({ path: `${process.argv[4]}/brc-touch.png`, fullPage: true });
  await touch.locator("#brc-detail-close").tap();
  assert.ok(await touch.locator("#brc-details").isHidden());
  assert.ok(await touch.locator("tr.in-range").count() > 0);
  await touch.locator("#brc-title").tap();
  assert.equal(await touch.locator('.brc-unit[aria-pressed="true"]').count(), 0);
  await firstTouchUnit.tap();
  await touch.locator("#brc-detail-close").tap();
  const nextTouchId = await touch.locator(".brc-unit").nth(1).getAttribute("data-unit");
  await touch.locator(".brc-unit").nth(1).tap();
  assert.equal(await touch.locator('.brc-unit[aria-pressed="true"]').getAttribute("data-unit"), nextTouchId);
  assert.ok(await touch.locator("#brc-details").isVisible());
  await touchContext.close();
  console.log("Touch: tap to pin/open details, close preserves range passed");

  const failure = await browser.newPage();
  let fail = true;
  await failure.route("**/*", route => {
    if (!route.request().url().startsWith(base)) return route.abort();
    if (fail && route.request().url().includes("tier-units.json")) return route.fulfill({ status: 503, body: "Unavailable" });
    return route.continue();
  });
  await failure.goto(`${base}/brc/`); await failure.locator("#brc-retry").waitFor({ state: "visible" });
  fail = false; await failure.locator("#brc-retry").click();
  await failure.waitForFunction(() => !document.querySelector("#brc-search").disabled);
  assert.equal(await failure.locator(".brc-unit").count(), total);
  await failure.close();
  console.log("Network failure and successful retry passed");

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.locator('[data-language="en"]').click();
  const knownAircraft = catalog.categories.air.units.find(unit => unit.wikiId === "f_15e");
  assert.ok(knownAircraft);
  await find(knownAircraft.name);
  assert.match(await page.locator("#brc-detail-meta").textContent(), new RegExp(`GRB BR ${knownAircraft.brGround.toFixed(1)}`));
  assert.equal(await selected.evaluate(node => Number(node.closest("tr").dataset.br)), knownAircraft.brGround);
  await page.locator("#brc-detail-close").click();
  assert.ok(catalog.categories.air.units.every(unit => Number.isFinite(unit.brGround)));
  assert.equal(await page.locator('.brc-unit[title*="unverified"]').count(), 0);
  console.log("BRC: all aircraft have dedicated Ground RB, F-15E is in its GRB row, no ARB fallback");
  const grbCount = await page.locator(".brc-unit").count();
  const grbFilters = await page.locator("#brc-categories input").evaluateAll(inputs => inputs.map(input => input.checked));
  await page.locator("#brc-tab-arb").click();
  assert.equal(await page.locator("#brc-tab-arb").getAttribute("aria-selected"), "true");
  assert.ok(await page.locator("#brc-categories").isHidden());
  assert.equal(await page.locator(".brc-unit").count(), catalog.categories.air.units.length);
  assert.equal(await page.locator('.brc-unit:not([data-unit^="air:"])').count(), 0);
  assert.equal(await selected.count(), 0);
  for (const query of ["Leopard 2K", "AH-64"]) {
    await search.fill(query);
    assert.equal(await page.locator(".brc-result").count(), 0);
    assert.match(await page.locator("#brc-results").textContent(), /No matching/);
  }
  await find(knownAircraft.name);
  assert.ok((await page.locator("#brc-detail-meta").textContent()).includes(`ARB BR ${knownAircraft.br.toFixed(1)}`));
  assert.equal(await selected.evaluate(node => Number(node.closest("tr").dataset.br)), knownAircraft.br);
  await page.locator("#brc-detail-close").click();
  await page.locator("#brc-range-only").check();
  const arbRows = await page.locator("tbody tr").evaluateAll(rows => rows.map(row => Number(row.dataset.br)));
  assert.ok(arbRows.length); assert.ok(arbRows.every(br => Math.abs(Math.round(br * 10) - Math.round(knownAircraft.br * 10)) <= 10));
  if (process.argv[4]) await page.screenshot({ path: `${process.argv[4]}/brc-arb-desktop.png`, fullPage: true });
  await page.locator("#brc-tab-arb").press("ArrowLeft");
  assert.equal(await page.locator("#brc-tab-grb").getAttribute("aria-selected"), "true");
  assert.equal(await page.locator(".brc-unit").count(), grbCount);
  assert.deepEqual(await page.locator("#brc-categories input").evaluateAll(inputs => inputs.map(input => input.checked)), grbFilters);
  assert.equal(await selected.evaluate(node => Number(node.closest("tr").dataset.br)), knownAircraft.brGround);
  assert.ok(!(await page.locator("#brc-range-only").isChecked()));
  await assertBrAtTop(knownAircraft.brGround, true);
  await page.locator("#brc-tab-grb").press("End");
  assert.equal(await page.locator("#brc-tab-arb").getAttribute("aria-selected"), "true");
  assert.ok(await page.locator("#brc-range-only").isChecked());
  assert.equal(await search.inputValue(), knownAircraft.name);
  assert.equal(await selected.evaluate(node => Number(node.closest("tr").dataset.br)), knownAircraft.br);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator("#brc-tab-grb").click();
  await page.locator("#brc-tab-arb").click();
  assert.equal(await page.locator('.brc-unit:not([data-unit^="air:"])').count(), 0);
  assert.ok(await page.locator("#brc-categories").isHidden());
  if (process.argv[4]) await page.screenshot({ path: `${process.argv[4]}/brc-arb-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1100 });
  assert.deepEqual(errors, []);
  console.log("BRC tabs: ARB aircraft-only table/search, Air RB range, independent selection/filter state, keyboard and mobile passed");
  await page.goto(`${base}/tier-list/`);
  await page.waitForFunction(() => document.querySelector("#tier-br-max").value !== "");
  if (catalog.battleRatingUpdate?.status === "planned") {
    assert.ok(await page.locator("#tier-rating-note").isVisible());
    assert.match(await page.locator("#tier-rating-note").textContent(), /planned BR changes/);
    assert.equal(await page.locator("#tier-rating-note a").getAttribute("href"), catalog.battleRatingUpdate.source);
  }
  for (const category of ["tank", "air", "heli"]) {
    await page.locator(`[data-tier-category="${category}"]`).click();
    const max = Math.max(...catalog.categories[category].units.map(unit => unit.br)).toFixed(1);
    assert.equal(await page.locator("#tier-br-max").inputValue(), max);
    assert.ok(await page.locator("#tier-card-pool .tier-card").count() > 0);
    await page.locator("#tier-br-max").fill(max);
    await page.locator("#tier-br-max").press("Enter");
    assert.equal(await page.locator("#tier-br-max").inputValue(), max);
  }
  await page.locator('[data-tier-category="air"]').click();
  for (const [id, value] of [["#tier-br-min", knownAircraft.br], ["#tier-br-max", knownAircraft.br]]) {
    await page.locator(id).fill(value.toFixed(1)); await page.locator(id).press("Enter");
  }
  assert.equal(await page.locator('#tier-card-pool .tier-card[aria-label="F-15E"]').count(), 1);
  for (const [id, value] of [["#tier-br-min", knownAircraft.brGround], ["#tier-br-max", knownAircraft.brGround]]) {
    await page.locator(id).fill(value.toFixed(1)); await page.locator(id).press("Enter");
  }
  assert.equal(await page.locator('#tier-card-pool .tier-card[aria-label="F-15E"]').count(), 0);
  await page.locator('[data-tier-country="DE"]').click();
  await page.locator('#tier-rank-select').selectOption('7');
  const su22 = page.locator('#tier-card-pool .tier-card[aria-label="◊Su-22M4"]');
  assert.equal(await su22.count(), 1);
  await su22.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const image = document.querySelector('.tier-card[aria-label="◊Su-22M4"] img');
    return image?.complete && image.naturalWidth > 0;
  });
  assert.deepEqual(errors, []);
  console.log("Tier List: current category maxima and F-15E exclusively at its Air RB passed");
} finally { await browser.close(); }
