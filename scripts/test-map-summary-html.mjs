import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderMapRoutePage } from "./generate-map-catalog.mjs";

const rootPage = await readFile(new URL("../index.html", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../assets/data/map-catalog.json", import.meta.url), "utf8"));
const baseMap = { ...catalog.maps[0], tacticalSummary: undefined };

function summarySection(page) {
  const section = page.match(/(<details\b[^>]*\bid="map-tactical-summary"[^>]*>)([\s\S]*?)<\/details>/);
  assert.ok(section, "The page must contain the native summary disclosure");
  const copy = section[2].match(/<blockquote\b[^>]*\bid="map-tactical-summary-copy"[^>]*>([\s\S]*?)<\/blockquote>/);
  assert.ok(copy, "The summary body must be inside the disclosure");
  return { openingTag: section[1], markup: section[2], copy: copy[1] };
}

test("summary text is in the initial HTML with a visible, collapsed native disclosure", () => {
  const page = renderMapRoutePage(rootPage, { ...baseMap, tacticalSummary: { en: ["Hold B."] } });
  const section = summarySection(page);
  assert.doesNotMatch(section.openingTag, /\s(?:hidden|open)(?:\s|=|>)/);
  assert.match(section.openingTag, /data-map-name="[^"]+"/);
  assert.match(section.copy, /<p>Hold B\.<\/p>/);
  assert.match(section.markup, /<blockquote[^>]*lang="en"/);
  assert.match(section.markup, /<button[^>]*id="edit-map-tactical-summary"[^>]*\shidden>/);
  assert.match(section.markup, /<form[^>]*id="map-tactical-summary-editor"[^>]*\shidden[\s>]/);
});

test("Korean-only summaries are present before JavaScript runs", () => {
  const page = renderMapRoutePage(rootPage, { ...baseMap, tacticalSummary: { en: [], ko: ["B를 지키세요."] } });
  const section = summarySection(page);
  assert.doesNotMatch(section.openingTag, /\s(?:hidden|open)(?:\s|=|>)/);
  assert.match(section.markup, /<blockquote[^>]*lang="ko"/);
  assert.match(section.copy, /<p>B를 지키세요\.<\/p>/);
  assert.match(page, /<meta name="description" content="B를 지키세요\.">/);
});

test("the English page uses English when both translations are available", () => {
  const page = renderMapRoutePage(rootPage, { ...baseMap, tacticalSummary: { en: ["Hold B."], ko: ["B를 지키세요."] } });
  const section = summarySection(page);
  assert.match(section.copy, /<p>Hold B\.<\/p>/);
  assert.doesNotMatch(section.copy, /B를 지키세요/);
});

test("both summary editors have no character limit", () => {
  for (const language of ["en", "ko"]) {
    const input = rootPage.match(new RegExp(`<textarea\\b[^>]*\\bid="map-tactical-summary-${language}"[^>]*>`));
    assert.ok(input, `Missing ${language} summary editor`);
    assert.doesNotMatch(input[0], /\bmaxlength\s*=/i);
  }
});

test("long English and Korean summaries are rendered without truncation", () => {
  for (const [language, sentence] of [["en", "Hold the central area. "], ["ko", "중앙 지역을 방어하세요. "]]) {
    const text = sentence.repeat(1000).trim();
    assert.ok(text.length > 1000);
    const page = renderMapRoutePage(rootPage, { ...baseMap, tacticalSummary: { [language]: [text] } });
    assert.equal(summarySection(page).copy.trim(), `<p>${text}</p>`);
  }
});

test("absent and cleared summaries leave only the empty section hidden", () => {
  for (const tacticalSummary of [undefined, {}, { en: [], ko: [] }]) {
    const section = summarySection(renderMapRoutePage(rootPage, { ...baseMap, tacticalSummary }));
    assert.match(section.openingTag, /\shidden>/);
    assert.doesNotMatch(section.openingTag, /\sopen(?:\s|=|>)/);
    assert.equal(section.copy.trim(), "");
  }
});

test("summary text is escaped and replacement tokens remain literal", () => {
  const page = renderMapRoutePage(rootPage, {
    ...baseMap,
    tacticalSummary: { en: ['Use <cover> & "$&" $$ safely.'] }
  });
  const section = summarySection(page);
  assert.match(section.copy, /<p>Use &lt;cover&gt; &amp; &quot;\$&amp;&quot; \$\$ safely\.<\/p>/);
  assert.doesNotMatch(section.copy, /<cover>/);
});

test("every generated map page contains its current initial summary HTML", async () => {
  for (const map of catalog.maps) {
    const page = await readFile(new URL(`../maps/${map.slug}/index.html`, import.meta.url), "utf8");
    assert.equal(page, renderMapRoutePage(rootPage, map), `Regenerate the stale route: ${map.slug}`);
    const section = summarySection(page);
    const sentences = map.tacticalSummary?.en?.length ? map.tacticalSummary.en : map.tacticalSummary?.ko || [];
    assert.equal((section.copy.match(/<p>/g) || []).length, sentences.length, map.slug);
    assert.equal(/\shidden>/.test(section.openingTag), sentences.length === 0, map.slug);
    assert.doesNotMatch(section.openingTag, /\sopen(?:\s|=|>)/, map.slug);
  }
});
