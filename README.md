# WarDevOps MapTactic

Root site for WarDevOps GitHub Pages.

## Automatic map registration

The map list is generated from the folders under `img/`.

1. Create `img/<English map name>/`.
2. Add `Red.png` and `Blue.png` to that folder.
3. Commit and push the images.

The `Build map catalog and deploy Pages` GitHub Actions workflow scans the
folders, generates `assets/data/map-catalog.json` in its deployment workspace,
and publishes the complete site. It does not create a bot commit. The site
loads that catalog directly, so `data.js`, `app.js`, and `index.html` do not
need to be edited for each new map.

After committing this automation for the first time, set the repository's
**Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
The repository currently uses the legacy `main / (root)` source, which cannot
deploy a catalog commit created with `GITHUB_TOKEN`.

Korean display names are optional. Add a matching entry to
`assets/data/map-metadata.json`; otherwise the English folder name is used in
both languages.

Variation folders are detected automatically when they use names such as
`Domination #2`, `Conquest #2`, or `Battle #2`. Put one Red PNG and one Blue
PNG in the variation folder. Nonstandard locations or filenames can be added
through `extraVariations` in `map-metadata.json`.

Local commands:

```powershell
node scripts/generate-map-catalog.mjs
node scripts/generate-map-catalog.mjs --check
node scripts/generate-map-catalog.mjs --watch
```

The watcher regenerates the catalog while files are being added locally. SVG,
AI source files, and unrelated PNG files are not treated as map entries.
