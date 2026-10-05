#!/usr/bin/env python3
"""Convert repository PNG assets to WebP and remove originals after verification."""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import re
from pathlib import Path

from PIL import Image


ASSET_DIRECTORIES = ("icon", "img", "Legend", "Tier")
LOSSLESS_DIRECTORIES = {"icon", "Legend"}


def update_generated_references(repo_root: Path) -> None:
    index_path = repo_root / "index.html"
    index_source = index_path.read_text(encoding="utf-8")
    index_source = index_source.replace(".png", ".webp")
    index_source = re.sub(r'\sdata-png-fallback="[^"]*"', "", index_source)
    index_path.write_text(index_source, encoding="utf-8")

    tier_catalog_path = repo_root / "assets" / "data" / "tier-units.json"
    tier_catalog = tier_catalog_path.read_text(encoding="utf-8")
    tier_catalog = re.sub(r'("file"\s*:\s*"[^"]+)\.png(")', r"\1.webp\2", tier_catalog)
    tier_catalog_path.write_text(tier_catalog, encoding="utf-8")


def convert_png(source: Path, repo_root: Path) -> tuple[Path, Path]:
    relative = source.relative_to(repo_root)
    destination = source.with_suffix(".webp")
    if destination.is_file() and destination.stat().st_mtime_ns >= source.stat().st_mtime_ns:
        try:
            with Image.open(destination) as converted:
                converted.verify()
            return source, destination
        except (OSError, SyntaxError):
            pass
    temporary = destination.with_suffix(".tmp.webp")
    with Image.open(source) as image:
        image.load()
        options: dict[str, object] = {"format": "WEBP", "method": 4}
        if relative.parts[0] in LOSSLESS_DIRECTORIES:
            options["lossless"] = True
        else:
            options["quality"] = 90
        if image.info.get("icc_profile"):
            options["icc_profile"] = image.info["icc_profile"]
        if image.info.get("exif"):
            options["exif"] = image.info["exif"]
        image.save(temporary, **options)
    with Image.open(temporary) as converted:
        converted.verify()
    os.replace(temporary, destination)
    return source, destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 1))
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    sources = sorted(
        path
        for directory in ASSET_DIRECTORIES
        for path in (repo_root / directory).rglob("*")
        if path.is_file() and path.suffix.casefold() == ".png"
    )
    if not sources:
        update_generated_references(repo_root)
        print("No PNG assets found.")
        return

    converted: list[tuple[Path, Path]] = []
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = [executor.submit(convert_png, source, repo_root) for source in sources]
            for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
                converted.append(future.result())
                if index % 100 == 0 or index == len(sources):
                    print(f"Converted and verified {index}/{len(sources)} PNG assets.", flush=True)
    except Exception:
        for temporary in repo_root.rglob("*.tmp.webp"):
            temporary.unlink(missing_ok=True)
        raise

    for source, _ in converted:
        source.unlink()
    update_generated_references(repo_root)
    webp_bytes = sum(destination.stat().st_size for _, destination in converted)
    print(f"Replaced {len(converted)} PNG assets with WebP ({webp_bytes} output bytes).")


if __name__ == "__main__":
    main()
