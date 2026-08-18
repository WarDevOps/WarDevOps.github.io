#!/usr/bin/env python3
"""Synchronize War Thunder Wiki vehicle metadata and card images.

Only Realistic Battles (RB) battle ratings are stored. The generated catalog is
written to assets/data/tier-units.json and images are stored by stable Wiki ID.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from lxml import html


WIKI_ROOT = "https://wiki.warthunder.com"
CATEGORIES = {
    "tank": {"page": "ground", "folder": "Tank"},
    "air": {"page": "aviation", "folder": "Air"},
    "heli": {"page": "helicopters", "folder": "Heli"},
}
COUNTRY_CODES = {
    "USA": "US",
    "Germany": "DE",
    "USSR": "RU",
    "Great Britain": "UK",
    "Japan": "JP",
    "China": "CN",
    "Italy": "IT",
    "France": "FR",
    "Sweden": "SE",
    "Israel": "IL",
}
ROLE_CLASSES = {
    "tank": {
        "Light tank": "lt",
        "Medium tank": "mbt",
        "Main battle tank": "mbt",
        "Heavy tank": "ht",
        "Tank destroyer": "td",
        "SPAA": "aa",
    },
    "air": {"Fighter": "fighter", "Bomber": "bomber", "Strike aircraft": "striker"},
    "heli": {"Attack helicopter": "attack-heli", "Utility helicopter": "utility-heli"},
}
ROMAN_RANKS = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9}
USER_AGENT = "WarDevOps-MapTactic-Wiki-Sync/1.0 (+https://wardevops.github.io/)"
PRINT_LOCK = threading.Lock()


def log(message: str) -> None:
    with PRINT_LOCK:
        print(message, flush=True)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def fetch_bytes(url: str, retries: int = 4, timeout: int = 45) -> bytes:
    last_error: Exception | None = None
    for attempt in range(retries):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,image/png,*/*"})
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt + 1 < retries:
                time.sleep(1.25 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def fetch_document(url: str):
    return html.fromstring(fetch_bytes(url))


def first_text(document, xpath: str) -> str:
    values = document.xpath(xpath)
    if not values:
        return ""
    value = values[0]
    return normalize_text(value if isinstance(value, str) else value.text_content())


def card_info_value(document, title: str) -> str:
    xpath = (
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_card-info_item ')]"
        f"[.//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_card-info_title ')][normalize-space()='{title}']]"
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' text-truncate ')][1]"
    )
    return first_text(document, xpath)


def realistic_br(document) -> float | None:
    items = document.xpath("//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_br-item ')]")
    for item in items:
        mode = first_text(item, ".//div[contains(concat(' ', normalize-space(@class), ' '), ' mode ')]")
        if mode != "RB":
            continue
        value = first_text(item, ".//div[contains(concat(' ', normalize-space(@class), ' '), ' value ')]")
        try:
            return float(value)
        except ValueError:
            return None
    return None


def rank_value(document) -> tuple[str, int | None]:
    rank_roman = first_text(
        document,
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_rank ')]"
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_card-info_value ')][1]",
    )
    return rank_roman, ROMAN_RANKS.get(rank_roman)


def basic_unit_id(document) -> str:
    href = first_text(
        document,
        "//a[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_multiunit-item ')]"
        "[.//div[contains(concat(' ', normalize-space(@class), ' '), ' subtitle ')][normalize-space()='Basic unit']]/@href",
    )
    match = re.fullmatch(r"/unit/([A-Za-z0-9_-]+)", href)
    return match.group(1) if match else ""


def infer_unit_class(category: str, role: str) -> str:
    direct = ROLE_CLASSES[category].get(role)
    if direct:
        return direct
    role_lower = role.casefold()
    if category == "tank":
        if "anti-air" in role_lower or "spaa" in role_lower:
            return "aa"
        if "destroyer" in role_lower:
            return "td"
        if "heavy" in role_lower:
            return "ht"
        if "light" in role_lower:
            return "lt"
        if "medium" in role_lower or "battle tank" in role_lower:
            return "mbt"
    elif category == "air":
        if "bomber" in role_lower:
            return "bomber"
        if "strike" in role_lower or "attacker" in role_lower:
            return "striker"
        if "fighter" in role_lower:
            return "fighter"
    elif category == "heli":
        if "utility" in role_lower:
            return "utility-heli"
        if "attack" in role_lower:
            return "attack-heli"
    return "other"


def list_unit_ids(page: str) -> list[str]:
    document = fetch_document(f"{WIKI_ROOT}/{page}")
    hrefs = document.xpath("//a[contains(concat(' ', normalize-space(@class), ' '), ' wt-tree_item-link ')]/@href")
    if not hrefs:
        hrefs = document.xpath("//a[starts-with(@href, '/unit/')]/@href")
    ordered_ids: list[str] = []
    seen: set[str] = set()
    for href in hrefs:
        match = re.fullmatch(r"/unit/([A-Za-z0-9_-]+)", href)
        if not match or match.group(1) in seen:
            continue
        seen.add(match.group(1))
        ordered_ids.append(match.group(1))
    return ordered_ids


def valid_png(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > 100 and path.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
    except OSError:
        return False


def save_png(url: str, destination: Path) -> None:
    if valid_png(destination):
        return
    data = fetch_bytes(url)
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"Image is not PNG: {url}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".download")
    temporary.write_bytes(data)
    os.replace(temporary, destination)


def parse_unit(category: str, wiki_id: str, image_root: Path, download_images: bool) -> dict:
    source_url = f"{WIKI_ROOT}/unit/{wiki_id}"
    document = fetch_document(source_url)
    name = first_text(document, "//div[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_name ')][1]")
    rank_roman, rank = rank_value(document)
    country = card_info_value(document, "Research country")
    role = card_info_value(document, "Main role")
    br = realistic_br(document)
    inherited_from = ""
    if not rank or br is None:
        inherited_from = basic_unit_id(document)
        if inherited_from and inherited_from != wiki_id:
            basic_document = fetch_document(f"{WIKI_ROOT}/unit/{inherited_from}")
            inherited_rank_roman, inherited_rank = rank_value(basic_document)
            if not rank:
                rank_roman, rank = inherited_rank_roman, inherited_rank
            if br is None:
                br = realistic_br(basic_document)
    image_url = first_text(document, "//img[contains(concat(' ', normalize-space(@class), ' '), ' game-unit_template-image ')]/@src")
    image_url = image_url or f"https://static.encyclopedia.warthunder.com/images/{wiki_id}.png"
    if not name or not rank_roman or not country or not role or br is None:
        raise RuntimeError(
            f"Incomplete metadata for {wiki_id}: name={name!r}, rank={rank_roman!r}, "
            f"country={country!r}, role={role!r}, rb={br!r}"
        )
    if not rank:
        raise RuntimeError(f"Unknown rank {rank_roman!r} for {wiki_id}")
    file_name = f"{wiki_id}.png"
    if download_images:
        save_png(image_url, image_root / CATEGORIES[category]["folder"] / file_name)
    unit = {
        "wikiId": wiki_id,
        "name": name,
        "file": file_name,
        "countryCode": COUNTRY_CODES.get(country, country[:2].upper()),
        "country": country,
        "rank": rank,
        "br": br,
        "unitClass": infer_unit_class(category, role),
        "role": role,
        "source": source_url,
        "imageSource": image_url,
    }
    if inherited_from:
        unit["inheritsRankAndBrFrom"] = inherited_from
    return unit


def write_catalog(path: Path, categories: dict[str, list[dict]]) -> None:
    payload = {
        "source": WIKI_ROOT,
        "battleRatingMode": "RB",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "categories": {
            category: {
                "source": f"{WIKI_ROOT}/{CATEGORIES[category]['page']}",
                "count": len(units),
                "units": units,
            }
            for category, units in categories.items()
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".download")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int, default=0, help="Limit each category for parser testing")
    parser.add_argument("--metadata-only", action="store_true", help="Do not download images")
    parser.add_argument("--dry-run", action="store_true", help="Parse and report without writing the catalog")
    parser.add_argument("--categories", nargs="+", choices=tuple(CATEGORIES), default=list(CATEGORIES))
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    repo_root = arguments.repo_root.resolve()
    catalog: dict[str, list[dict]] = {category: [] for category in CATEGORIES}
    failures: list[str] = []
    for category in arguments.categories:
        page = CATEGORIES[category]["page"]
        unit_ids = list_unit_ids(page)
        if arguments.limit:
            unit_ids = unit_ids[: arguments.limit]
        log(f"[{category}] discovered {len(unit_ids)} units")
        results: dict[str, dict] = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, arguments.workers)) as executor:
            future_to_id = {
                executor.submit(parse_unit, category, wiki_id, repo_root / "Tier", not arguments.metadata_only): wiki_id
                for wiki_id in unit_ids
            }
            for completed, future in enumerate(concurrent.futures.as_completed(future_to_id), start=1):
                wiki_id = future_to_id[future]
                try:
                    results[wiki_id] = future.result()
                except Exception as error:
                    failures.append(f"{category}:{wiki_id}: {error}")
                    log(f"[{category}] ERROR {wiki_id}: {error}")
                if completed % 25 == 0 or completed == len(unit_ids):
                    log(f"[{category}] {completed}/{len(unit_ids)} complete")
        catalog[category] = [results[wiki_id] for wiki_id in unit_ids if wiki_id in results]
    if failures:
        log(f"Synchronization failed for {len(failures)} units")
        for failure in failures:
            log(f"  {failure}")
        return 1
    if not arguments.dry_run:
        catalog_path = repo_root / "assets" / "data" / "tier-units.json"
        write_catalog(catalog_path, catalog)
        log(f"Wrote {catalog_path}")
    for category in arguments.categories:
        class_counts: dict[str, int] = {}
        for unit in catalog[category]:
            class_counts[unit["unitClass"]] = class_counts.get(unit["unitClass"], 0) + 1
        log(f"[{category}] classes: {json.dumps(class_counts, sort_keys=True)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
