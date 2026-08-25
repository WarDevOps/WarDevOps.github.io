#!/usr/bin/env node

import { watch } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const IMG_ROOT = path.join(REPO_ROOT, "img");
const METADATA_PATH = path.join(REPO_ROOT, "assets", "data", "map-metadata.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "assets", "data", "map-catalog.json");
const VARIATION_FOLDER_PATTERN = /^(domination|conquest|battle)\s*#(\d+)$/i;
const MODE_ORDER = Object.freeze({ domination: 0, conquest: 1, battle: 2 });
const CHECK_ONLY = process.argv.includes("--check");
const WATCH_MODE = process.argv.includes("--watch");

function toPosix(value) {
  return value.split(path.sep).join("/");
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

async function discoverTeamImages(relativeFolder, { requireExact = false, failOnPartial = false } = {}) {
  const absoluteFolder = safeImageFolder(relativeFolder);
  const entries = await directoryEntries(absoluteFolder);
  const fileNames = entries.filter(entry => entry.isFile()).map(entry => entry.name);
  const red = findTeamFile(fileNames, "Red", requireExact);
  const blue = findTeamFile(fileNames, "Blue", requireExact);
  if (failOnPartial && Boolean(red) !== Boolean(blue)) {
    throw new Error(`Both Red and Blue PNG files are required: ${relativeFolder}`);
  }
  if (!red || !blue) return null;
  return { Red: red, Blue: blue };
}

async function configuredVariation(definition) {
  const mode = String(definition.mode || "domination").toLowerCase();
  const number = Number(definition.number || 1);
  const folder = toPosix(definition.folder);
  const teamImages = definition.teamImages || await discoverTeamImages(folder);
  if (!Object.hasOwn(MODE_ORDER, mode) || !Number.isInteger(number) || number < 1) {
    throw new Error(`Invalid variation metadata for ${folder}`);
  }
  if (!teamImages?.Red || !teamImages?.Blue) {
    throw new Error(`Red/Blue images are missing for configured variation: ${folder}`);
  }

  const absoluteFolder = safeImageFolder(folder);
  for (const team of ["Red", "Blue"]) {
    if (!await fileExists(path.join(absoluteFolder, teamImages[team]))) {
      throw new Error(`${team} image is missing for configured variation: ${folder}/${teamImages[team]}`);
    }
  }
  return { mode, number, folder, teamImages };
}

function compactVariation(variation, rootFolder) {
  const result = { mode: variation.mode, number: variation.number };
  if (variation.folder !== rootFolder) result.folder = variation.folder;
  if (variation.teamImages.Red !== "Red.png" || variation.teamImages.Blue !== "Blue.png") {
    result.teamImages = variation.teamImages;
  }
  return result;
}

async function discoverMap(folderName, metadata) {
  const rootImages = await discoverTeamImages(folderName, { requireExact: true, failOnPartial: true });
  if (!rootImages) return null;

  const mapMetadata = metadata.maps?.[folderName] || {};
  if (mapMetadata.disabled) return null;
  const name = mapMetadata.en || folderName;
  const aliases = mapMetadata.ko || name;
  const defaultMode = String(mapMetadata.defaultMode || "domination").toLowerCase();
  if (!Object.hasOwn(MODE_ORDER, defaultMode)) {
    throw new Error(`Invalid default mode for ${folderName}: ${defaultMode}`);
  }

  const variations = [{ mode: defaultMode, number: 1, folder: folderName, teamImages: rootImages }];
  const rootEntries = await directoryEntries(path.join(IMG_ROOT, folderName));
  for (const entry of rootEntries.filter(item => item.isDirectory())) {
    const match = entry.name.match(VARIATION_FOLDER_PATTERN);
    if (!match) continue;
    const mode = match[1].toLowerCase();
    const number = Number(match[2]);
    const variationFolder = toPosix(path.join(folderName, entry.name));
    const teamImages = await discoverTeamImages(variationFolder, { failOnPartial: true });
    if (!teamImages) continue;
    variations.push({ mode, number, folder: variationFolder, teamImages });
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
  }

  return {
    name,
    aliases,
    folder: folderName,
    variations: variations.map(variation => compactVariation(variation, folderName))
  };
}

async function buildCatalog() {
  const metadata = await readJson(METADATA_PATH);
  if (metadata.version !== 1 || !metadata.maps || typeof metadata.maps !== "object") {
    throw new Error("Unsupported map metadata format");
  }
  const entries = await directoryEntries(IMG_ROOT);
  const maps = [];
  for (const entry of entries.filter(item => item.isDirectory())) {
    const map = await discoverMap(entry.name, metadata);
    if (map) maps.push(map);
  }

  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  maps.sort((left, right) => collator.compare(left.name, right.name));
  const unknownTranslations = maps.filter(map => map.aliases === map.name && !metadata.maps?.[map.folder]?.ko);
  const registeredFolders = new Set(maps.map(map => map.folder));
  const unusedMetadata = Object.keys(metadata.maps).filter(folder => !registeredFolders.has(folder) && !metadata.maps[folder].disabled);
  return {
    payload: { version: 1, maps },
    unknownTranslations,
    unusedMetadata
  };
}

async function generate() {
  const { payload, unknownTranslations, unusedMetadata } = await buildCatalog();
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

  if (unknownTranslations.length) {
    console.warn(`Korean name fallback: ${unknownTranslations.map(map => map.name).join(", ")}`);
  }
  if (unusedMetadata.length) {
    console.warn(`Metadata without a complete Red/Blue map folder: ${unusedMetadata.join(", ")}`);
  }
}

await generate();

if (WATCH_MODE) {
  let timer = null;
  console.log("Watching img/ for map changes. Press Ctrl+C to stop.");
  const watcher = watch(IMG_ROOT, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => generate().catch(error => console.error(error)), 300);
  });
  process.once("SIGINT", () => watcher.close());
  process.once("SIGTERM", () => watcher.close());
}
