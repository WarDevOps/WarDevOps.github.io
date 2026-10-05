import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const ASSET_DIRECTORIES = ["icon", "img", "Legend", "Tier"];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  }))).flat();
}

async function assertFile(relativePath) {
  assert.equal((await stat(path.join(REPO_ROOT, relativePath))).isFile(), true, relativePath);
}

test("asset directories contain verified WebP files and no PNG files", async () => {
  const files = (await Promise.all(ASSET_DIRECTORIES.map(directory => walk(path.join(REPO_ROOT, directory))))).flat();
  assert.equal(files.some(file => path.extname(file).toLowerCase() === ".png"), false);
  const webpFiles = files.filter(file => path.extname(file).toLowerCase() === ".webp");
  assert.ok(webpFiles.length > 3000);
  await Promise.all(webpFiles.map(async file => {
    const signature = (await readFile(file)).subarray(0, 12);
    assert.equal(signature.subarray(0, 4).toString("ascii"), "RIFF", file);
    assert.equal(signature.subarray(8, 12).toString("ascii"), "WEBP", file);
  }));
});

test("map catalog references existing WebP assets", async () => {
  const catalog = JSON.parse(await readFile(path.join(REPO_ROOT, "assets/data/map-catalog.json"), "utf8"));
  for (const map of catalog.maps) {
    for (const variation of map.variations) {
      const folder = variation.folder || map.folder;
      const images = variation.sharedImage
        ? [variation.sharedImage]
        : Object.values(variation.teamImages || { Red: "Red.webp", Blue: "Blue.webp" });
      for (const image of [...images, ...(variation.overlays || [])]) {
        assert.equal(path.extname(image).toLowerCase(), ".webp", `${folder}/${image}`);
        await assertFile(path.join("img", folder, image));
      }
    }
  }
});

test("tier catalog references existing WebP assets", async () => {
  const catalog = JSON.parse(await readFile(path.join(REPO_ROOT, "assets/data/tier-units.json"), "utf8"));
  const folders = { tank: "Tank", air: "Air", heli: "Heli" };
  for (const [category, group] of Object.entries(catalog.categories)) {
    for (const unit of group.units) {
      assert.equal(path.extname(unit.file).toLowerCase(), ".webp", unit.file);
      await assertFile(path.join("Tier", folders[category], unit.file));
    }
  }
});
