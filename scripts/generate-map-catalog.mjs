#!/usr/bin/env node

import { watch } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const IMG_ROOT = path.join(REPO_ROOT, "img");
const METADATA_PATH = path.join(REPO_ROOT, "assets", "data", "map-metadata.json");
const MAP_LAYOUT_PATH = path.join(REPO_ROOT, "assets", "data", "maptactic.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "assets", "data", "map-catalog.json");
const ROOT_PAGE_PATH = path.join(REPO_ROOT, "index.html");
const MAP_ROUTE_ROOT = path.join(REPO_ROOT, "maps");
const SITEMAP_PATH = path.join(REPO_ROOT, "sitemap.xml");
const VARIATION_FOLDER_PATTERN = /^(domination|conquest|battle)\s*#(\d+)$/i;
const MODE_ORDER = Object.freeze({ domination: 0, conquest: 1, battle: 2 });
const MAP_UPDATED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const CHECK_ONLY = process.argv.includes("--check");
const WATCH_MODE = process.argv.includes("--watch");

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function mapSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodeUrlPath(value) {
  return toPosix(value).split("/").map(encodeURIComponent).join("/");
}

function battleRating(value, context) {
  const source = typeof value === "number" ? { min: value } : value;
  const min = Number(source?.min);
  const max = source?.max == null ? null : Number(source.max);
  const validValue = rating => Number.isFinite(rating) && rating >= 1 && Math.abs(rating * 10 - Math.round(rating * 10)) < 1e-9;
  if (!validValue(min) || (max !== null && (!validValue(max) || max < min))) {
    throw new Error(`Missing or invalid BR for ${context}`);
  }
  return max === null ? { min } : { min, max };
}

function tacticalSummary(value, context) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid tactical summary for ${context}`);
  }
  const result = {};
  for (const language of ["en", "ko"]) {
    const sentences = value[language];
    if (sentences == null) continue;
    if (!Array.isArray(sentences) || sentences.length < 2 || sentences.length > 4 || sentences.some(sentence => typeof sentence !== "string" || !sentence.trim())) {
      throw new Error(`Tactical summary for ${context} (${language}) must contain 2 to 4 non-empty sentences`);
    }
    result[language] = sentences.map(sentence => sentence.trim());
  }
  if (!result.en) throw new Error(`English tactical summary is required for ${context}`);
  return result;
}

function safeImageFolder(relativeFolder) {
  const absoluteFolder = path.resolve(IMG_ROOT, relativeFolder);
  const rootPrefix = `${path.resolve(IMG_ROOT)}${path.sep}`;
  if (absoluteFolder !== path.resolve(IMG_ROOT) && !absoluteFolder.startsWith(rootPrefix)) {
    throw new Error(`Map folder escapes img/: ${relativeFolder}`);
  }
  return absoluteFolder;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function fileExists(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function directoryEntries(folderPath) {
  try {
    return await fs.readdir(folderPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function findTeamFile(fileNames, team, requireExact) {
  const exactName = `${team}.png`.toLowerCase();
  const exact = fileNames.find(fileName => fileName.toLowerCase() === exactName);
  if (exact || requireExact) return exact || null;

  const candidates = fileNames.filter(fileName => {
    const normalized = fileName.toLowerCase();
    return normalized.endsWith(".png") && normalized.startsWith(team.toLowerCase());
  });
  return candidates.length === 1 ? candidates[0] : null;
}

async function discoverMapImages(relativeFolder, { requireExact = false, failOnPartial = false } = {}) {
  const absoluteFolder = safeImageFolder(relativeFolder);
  const entries = await directoryEntries(absoluteFolder);
  const fileNames = entries.filter(entry => entry.isFile()).map(entry => entry.name);
  const pathParts = toPosix(relativeFolder).split("/").filter(Boolean);
  const sharedNames = new Set([
    `${pathParts.at(-1)}.png`.toLowerCase(),
    `${pathParts[0]}.png`.toLowerCase()
  ]);
  const sharedImage = fileNames.find(fileName => sharedNames.has(fileName.toLowerCase()));
  const red = findTeamFile(fileNames, "Red", requireExact);
  const blue = findTeamFile(fileNames, "Blue", requireExact);
  if (sharedImage) return { sharedImage };
  if (red && blue) return { teamImages: { Red: red, Blue: blue } };
  if (failOnPartial && Boolean(red) !== Boolean(blue)) {
    throw new Error(`Both Red and Blue PNG files are required: ${relativeFolder}`);
  }
  return null;
}

async function configuredVariation(definition) {
  const mode = String(definition.mode || "domination").toLowerCase();
  const number = Number(definition.number || 1);
  const folder = toPosix(definition.folder);
  const imageConfig = definition.sharedImage
    ? { sharedImage: definition.sharedImage }
    : definition.teamImages
      ? { teamImages: definition.teamImages }
      : await discoverMapImages(folder);
  if (!Object.hasOwn(MODE_ORDER, mode) || !Number.isInteger(number) || number < 1) {
    throw new Error(`Invalid variation metadata for ${folder}`);
  }
  if (!imageConfig?.sharedImage && (!imageConfig?.teamImages?.Red || !imageConfig?.teamImages?.Blue)) {
    throw new Error(`A shared image or Red/Blue images are required for configured variation: ${folder}`);
  }

  const absoluteFolder = safeImageFolder(folder);
  if (imageConfig.sharedImage) {
    if (!await fileExists(path.join(absoluteFolder, imageConfig.sharedImage))) {
      throw new Error(`Shared image is missing for configured variation: ${folder}/${imageConfig.sharedImage}`);
    }
  } else {
    for (const team of ["Red", "Blue"]) {
      if (!await fileExists(path.join(absoluteFolder, imageConfig.teamImages[team]))) {
        throw new Error(`${team} image is missing for configured variation: ${folder}/${imageConfig.teamImages[team]}`);
      }
    }
  }
  return { mode, number, folder, br: definition.br, ...imageConfig };
}

function compactVariation(variation, rootFolder) {
  const result = { mode: variation.mode, number: variation.number, br: variation.br };
  if (variation.folder !== rootFolder) result.folder = variation.folder;
  if (variation.sharedImage) {
    result.sharedImage = variation.sharedImage;
  } else if (variation.teamImages.Red !== "Red.png" || variation.teamImages.Blue !== "Blue.png") {
    result.teamImages = variation.teamImages;
  }
  return result;
}

async function discoverMap(folderName, metadata, mapUpdated, mapUpdatedAt) {
  const mapMetadata = metadata.maps?.[folderName] || {};
  if (mapMetadata.disabled) return null;
  const name = mapMetadata.en || folderName;
  const aliases = mapMetadata.ko || name;
  const slug = mapMetadata.slug || mapSlug(name);
  const updated = String(mapUpdated?.[name] || "");
  const updatedAt = mapUpdatedAt?.[name];
  const defaultMode = String(mapMetadata.defaultMode || "domination").toLowerCase();
  const mapBr = battleRating(mapMetadata.br ?? metadata.defaultBr, folderName);
  const mapTacticalSummary = tacticalSummary(mapMetadata.tacticalSummary, folderName);
  const variationBrs = mapMetadata.variationBrs ?? {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid map slug for ${folderName}: ${slug}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    throw new Error(`Missing or invalid mapUpdated date in Maptactic.json for ${name}`);
  }
  if (updatedAt !== undefined && (typeof updatedAt !== "string" || !MAP_UPDATED_AT_PATTERN.test(updatedAt) || Number.isNaN(Date.parse(updatedAt)))) {
    throw new Error(`Invalid mapUpdatedAt timestamp in Maptactic.json for ${name}`);
  }
  if (!Object.hasOwn(MODE_ORDER, defaultMode)) {
    throw new Error(`Invalid default mode for ${folderName}: ${defaultMode}`);
  }
  if (!variationBrs || typeof variationBrs !== "object" || Array.isArray(variationBrs)) {
    throw new Error(`Invalid variation BR metadata for ${folderName}`);
  }

  const rootEntries = await directoryEntries(path.join(IMG_ROOT, folderName));
  let primaryFolder = folderName;
  let rootImages = await discoverMapImages(folderName, { requireExact: true, failOnPartial: true });
  if (!rootImages) {
    const primaryEntry = rootEntries.find(entry => {
      const match = entry.isDirectory() ? entry.name.match(VARIATION_FOLDER_PATTERN) : null;
      return match && match[1].toLowerCase() === defaultMode && Number(match[2]) === 1;
    });
    if (primaryEntry) {
      primaryFolder = toPosix(path.join(folderName, primaryEntry.name));
      rootImages = await discoverMapImages(primaryFolder, { failOnPartial: true });
    }
  }
  if (!rootImages) return null;

  const variations = [{ mode: defaultMode, number: 1, folder: primaryFolder, ...rootImages }];
  for (const entry of rootEntries.filter(item => item.isDirectory())) {
    const match = entry.name.match(VARIATION_FOLDER_PATTERN);
    if (!match) continue;
    const mode = match[1].toLowerCase();
    const number = Number(match[2]);
    const variationFolder = toPosix(path.join(folderName, entry.name));
    if (variationFolder === primaryFolder) continue;
    const imageConfig = await discoverMapImages(variationFolder, { failOnPartial: true });
    if (!imageConfig) continue;
    variations.push({ mode, number, folder: variationFolder, ...imageConfig });
  }

  for (const definition of mapMetadata.extraVariations || []) {
    variations.push(await configuredVariation(definition));
  }

  const seenIds = new Set();
  variations.sort((left, right) => (MODE_ORDER[left.mode] - MODE_ORDER[right.mode]) || (left.number - right.number));
  for (const variation of variations) {
    const id = `${variation.mode}-${variation.number}`;
    if (seenIds.has(id)) throw new Error(`Duplicate variation ${id} for ${name}`);
    seenIds.add(id);
    variation.br = battleRating(variation.br ?? variationBrs[id] ?? mapBr, `${name} ${id}`);
  }
  const unusedVariationBrs = Object.keys(variationBrs).filter(id => !seenIds.has(id));
  if (unusedVariationBrs.length) {
    throw new Error(`BR metadata references unknown variations for ${name}: ${unusedVariationBrs.join(", ")}`);
  }

  return {
    name,
    aliases,
    slug,
    updated,
    ...(updatedAt ? { updatedAt } : {}),
    br: mapBr,
    ...(mapTacticalSummary ? { tacticalSummary: mapTacticalSummary } : {}),
    folder: folderName,
    variations: variations.map(variation => compactVariation(variation, folderName))
  };
}

async function buildCatalog() {
  const [metadata, mapLayout] = await Promise.all([readJson(METADATA_PATH), readJson(MAP_LAYOUT_PATH)]);
  if (metadata.version !== 1 || !metadata.maps || typeof metadata.maps !== "object") {
    throw new Error("Unsupported map metadata format");
  }
  battleRating(metadata.defaultBr, "map metadata default");
  if (mapLayout.version !== 2 || !mapLayout.mapUpdated || typeof mapLayout.mapUpdated !== "object" || Array.isArray(mapLayout.mapUpdated)) {
    throw new Error("Maptactic.json must contain a mapUpdated object");
  }
  if (mapLayout.mapUpdatedAt !== undefined && (!mapLayout.mapUpdatedAt || typeof mapLayout.mapUpdatedAt !== "object" || Array.isArray(mapLayout.mapUpdatedAt))) {
    throw new Error("Maptactic.json mapUpdatedAt must be an object");
  }
  const mapUpdatedAt = mapLayout.mapUpdatedAt || {};
  const entries = await directoryEntries(IMG_ROOT);
  const maps = [];
  for (const entry of entries.filter(item => item.isDirectory())) {
    const map = await discoverMap(entry.name, metadata, mapLayout.mapUpdated, mapUpdatedAt);
    if (map) maps.push(map);
  }

  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  maps.sort((left, right) => collator.compare(left.name, right.name));
  const duplicateSlugs = maps.map(map => map.slug).filter((slug, index, slugs) => slugs.indexOf(slug) !== index);
  if (duplicateSlugs.length) throw new Error(`Duplicate map slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);
  const unknownTranslations = maps.filter(map => map.aliases === map.name && !metadata.maps?.[map.folder]?.ko);
  const registeredFolders = new Set(maps.map(map => map.folder));
  const unusedMetadata = Object.keys(metadata.maps).filter(folder => !registeredFolders.has(folder) && !metadata.maps[folder].disabled);
  const catalogMapNames = new Set(maps.map(map => map.name));
  const unusedMapUpdates = Object.keys(mapLayout.mapUpdated).filter(name => !catalogMapNames.has(name));
  const unusedMapUpdateTimestamps = Object.keys(mapUpdatedAt).filter(name => !catalogMapNames.has(name));
  return {
    payload: { version: 1, maps },
    unknownTranslations,
    unusedMetadata,
    unusedMapUpdates,
    unusedMapUpdateTimestamps
  };
}

function replacePageValue(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Map route template is missing ${label}`);
  return source.replace(pattern, replacement);
}

function mapPreviewUrl(map) {
  const variation = map.variations[0];
  const folder = variation.folder || map.folder;
  const image = variation.sharedImage || variation.teamImages?.Red || "Red.png";
  return `https://wardevops.github.io/img/${encodeUrlPath(folder)}/${encodeURIComponent(image)}`;
}

function renderTacticalSummary(map) {
  const sentences = map.tacticalSummary?.en || [];
  const hidden = sentences.length ? "" : " hidden";
  const paragraphs = sentences.map(sentence => `\n                <p>${escapeHtml(sentence)}</p>`).join("");
  return `<details class="map-tactical-summary" id="map-tactical-summary" aria-labelledby="map-tactical-summary-title"${hidden}>\n              <summary id="map-tactical-summary-title">\n                <span data-i18n="tacticalSummary">Tactical Summary</span>\n                <span class="map-tactical-summary-toggle" aria-hidden="true"></span>\n              </summary>\n              <blockquote id="map-tactical-summary-copy">${paragraphs}\n              </blockquote>\n            </details>`;
}

function renderMapRoutePage(rootPage, map) {
  const title = `War Thunder ${escapeHtml(map.name)} Map Guide | WarDevOps`;
  const heading = `${escapeHtml(map.name)} War Thunder Map Guide`;
  const description = escapeHtml(map.tacticalSummary?.en?.join(" ") || `Explore the ${map.name} tactical map, team positions, routes, markers, and key combat areas for War Thunder Ground Battles.`);
  const canonical = `https://wardevops.github.io/maps/${map.slug}/`;
  const preview = mapPreviewUrl(map);
  let page = rootPage;
  page = page.replace('class="hero home-hero"', 'class="hero"');
  page = page.replace(/\n\s*<aside class="recent-updates"[\s\S]*?<\/aside>/, "");
  page = replacePageValue(page, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`, "description");
  page = replacePageValue(page, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`, "canonical URL");
  page = replacePageValue(page, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`, "Open Graph title");
  page = replacePageValue(page, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`, "Open Graph description");
  page = replacePageValue(page, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`, "Open Graph URL");
  page = replacePageValue(page, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${preview}">`, "Open Graph image");
  page = replacePageValue(page, /<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escapeHtml(map.name)} tactical map">`, "Open Graph image alt");
  page = replacePageValue(page, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`, "X title");
  page = replacePageValue(page, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`, "X description");
  page = replacePageValue(page, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${preview}">`, "X image");
  page = replacePageValue(page, /<title>[^<]*<\/title>/, `<title>${title}</title>`, "document title");
  page = replacePageValue(page, /<h1 class="seo-title" id="page-title">[^<]*<\/h1>/, `<h1 class="seo-title" id="page-title">${heading}</h1>`, "page heading");
  page = replacePageValue(page, /<details class="map-tactical-summary"[\s\S]*?<\/details>/, renderTacticalSummary(map), "tactical summary");
  return page;
}

function renderSitemap(maps) {
  const staticRoutes = [
    { url: "https://wardevops.github.io/", updated: "2026-08-28" },
    { url: "https://wardevops.github.io/tier-list/", updated: "2026-08-28" },
    { url: "https://wardevops.github.io/privacy/", updated: "2026-08-28" }
  ];
  const routes = [...staticRoutes, ...maps.map(map => ({
    url: `https://wardevops.github.io/maps/${map.slug}/`,
    updated: map.updated
  }))];
  const entries = routes.map(route => `  <url>\n    <loc>${route.url}</loc>\n    <lastmod>${route.updated}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function writeSiteArtifacts(payload) {
  const rootPage = await fs.readFile(ROOT_PAGE_PATH, "utf8");
  for (const map of payload.maps) {
    const routeFolder = path.join(MAP_ROUTE_ROOT, map.slug);
    await fs.mkdir(routeFolder, { recursive: true });
    await fs.writeFile(path.join(routeFolder, "index.html"), renderMapRoutePage(rootPage, map), "utf8");
  }
  const sitemap = renderSitemap(payload.maps);
  let currentSitemap = "";
  try {
    currentSitemap = await fs.readFile(SITEMAP_PATH, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (currentSitemap !== sitemap) await fs.writeFile(SITEMAP_PATH, sitemap, "utf8");
  console.log(`Generated ${payload.maps.length} map routes and sitemap.xml.`);
}

async function generate() {
  const { payload, unknownTranslations, unusedMetadata, unusedMapUpdates, unusedMapUpdateTimestamps } = await buildCatalog();
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  let current = "";
  try {
    current = await fs.readFile(OUTPUT_PATH, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (CHECK_ONLY) {
    if (current !== serialized) {
      console.error("Map catalog is stale. Run: node scripts/generate-map-catalog.mjs");
      process.exitCode = 1;
    } else {
      console.log(`Map catalog is current (${payload.maps.length} maps).`);
    }
  } else if (current !== serialized) {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, serialized, "utf8");
    console.log(`Updated ${path.relative(REPO_ROOT, OUTPUT_PATH)} (${payload.maps.length} maps).`);
  } else {
    console.log(`Map catalog is unchanged (${payload.maps.length} maps).`);
  }

  if (!CHECK_ONLY) await writeSiteArtifacts(payload);

  if (unknownTranslations.length) {
    console.warn(`Korean name fallback: ${unknownTranslations.map(map => map.name).join(", ")}`);
  }
  if (unusedMetadata.length) {
    console.warn(`Metadata without a usable shared or Red/Blue map image: ${unusedMetadata.join(", ")}`);
  }
  if (unusedMapUpdates.length) {
    console.warn(`Maptactic.json dates without a usable map: ${unusedMapUpdates.join(", ")}`);
  }
  if (unusedMapUpdateTimestamps.length) {
    console.warn(`Maptactic.json timestamps without a usable map: ${unusedMapUpdateTimestamps.join(", ")}`);
  }
}

await generate();

if (WATCH_MODE) {
  let timer = null;
  console.log("Watching img/, map metadata, and Maptactic.json. Press Ctrl+C to stop.");
  const scheduleGenerate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => generate().catch(error => console.error(error)), 300);
  };
  const watchers = [
    watch(IMG_ROOT, { recursive: true }, scheduleGenerate),
    watch(METADATA_PATH, scheduleGenerate),
    watch(MAP_LAYOUT_PATH, scheduleGenerate)
  ];
  process.once("SIGINT", () => watchers.forEach(watcher => watcher.close()));
  process.once("SIGTERM", () => watchers.forEach(watcher => watcher.close()));
}
