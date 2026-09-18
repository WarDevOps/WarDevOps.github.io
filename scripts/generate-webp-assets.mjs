#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { availableParallelism } from "node:os";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const IMG_ROOT = path.join(REPO_ROOT, "img");
const CATALOG_PATH = path.join(REPO_ROOT, "assets", "data", "map-catalog.json");
const CACHE_DIR = process.env.WEBP_CACHE_DIR || path.join(REPO_ROOT, ".webp-cache");
const PROFILE_VERSION = "webp-v1";
const MAP_OPTIONS = ["-q", "90", "-m", "6", "-sharp_yuv", "-mt", "-metadata", "none"];
const COMMENT_OPTIONS = ["-q", "82", "-m", "6", "-sharp_yuv", "-mt", "-metadata", "none"];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return nested.flat();
}

async function sourceHash(sourcePath, profile) {
  const hash = createHash("sha256").update(`${PROFILE_VERSION}:${profile}:`);
  for await (const chunk of createReadStream(sourcePath)) hash.update(chunk);
  return hash.digest("hex");
}

function runCwebp(sourcePath, outputPath, options) {
  return new Promise((resolve, reject) => {
    const child = spawn("cwebp", [...options, sourcePath, "-o", outputPath], { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    child.stderr.on("data", chunk => { errorOutput += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`cwebp failed for ${toPosix(path.relative(REPO_ROOT, sourcePath))}: ${errorOutput.trim()}`));
    });
  });
}

async function convertAsset(asset) {
  const outputPath = asset.sourcePath.replace(/\.png$/i, ".webp");
  const key = await sourceHash(asset.sourcePath, asset.profile);
  const cachePath = path.join(CACHE_DIR, `${key}.webp`);
  try {
    await fs.copyFile(cachePath, outputPath);
    return "cached";
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const temporaryPath = path.join(CACHE_DIR, `${key}.${process.pid}.tmp.webp`);
  await runCwebp(asset.sourcePath, temporaryPath, asset.options);
  await fs.rename(temporaryPath, cachePath).catch(async error => {
    if (error?.code !== "EEXIST") throw error;
    await fs.rm(temporaryPath, { force: true });
  });
  await fs.copyFile(cachePath, outputPath);
  return "converted";
}

function addMapAsset(targets, folder, image) {
  if (!image || !/\.png$/i.test(image)) return;
  const relativePath = path.join("img", folder, image);
  targets.set(path.resolve(REPO_ROOT, relativePath), {
    sourcePath: path.resolve(REPO_ROOT, relativePath),
    profile: "map-q90",
    options: MAP_OPTIONS
  });
}

async function findTargets() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const targets = new Map();
  for (const map of catalog.maps || []) {
    for (const variation of map.variations || []) {
      const folder = variation.folder || map.folder;
      if (variation.sharedImage) {
        addMapAsset(targets, folder, variation.sharedImage);
      } else if (variation.teamImages) {
        addMapAsset(targets, folder, variation.teamImages.Red);
        addMapAsset(targets, folder, variation.teamImages.Blue);
      } else {
        addMapAsset(targets, folder, "Red.png");
        addMapAsset(targets, folder, "Blue.png");
      }
    }
  }
  for (const sourcePath of await walk(IMG_ROOT)) {
    if (!/^scr_.*\.png$/i.test(path.basename(sourcePath))) continue;
    targets.set(sourcePath, { sourcePath, profile: "comment-q82", options: COMMENT_OPTIONS });
  }
  return [...targets.values()];
}

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const targets = await findTargets();
  const missing = [];
  for (const asset of targets) {
    try {
      if (!(await fs.stat(asset.sourcePath)).isFile()) missing.push(asset.sourcePath);
    } catch {
      missing.push(asset.sourcePath);
    }
  }
  if (missing.length) {
    throw new Error(`WebP source image(s) are missing:\n${missing.map(item => toPosix(path.relative(REPO_ROOT, item))).join("\n")}`);
  }

  let nextIndex = 0;
  let converted = 0;
  let cached = 0;
  const workerCount = Math.min(targets.length, Math.max(1, Math.min(4, availableParallelism())));
  async function worker() {
    while (nextIndex < targets.length) {
      const asset = targets[nextIndex++];
      const result = await convertAsset(asset);
      if (result === "converted") converted += 1;
      else cached += 1;
      const completed = converted + cached;
      if (completed % 25 === 0 || completed === targets.length) {
        console.log(`Prepared ${completed}/${targets.length} WebP asset(s).`);
      }
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  console.log(`WebP assets ready: ${converted} converted, ${cached} restored from cache.`);
}

await main();
