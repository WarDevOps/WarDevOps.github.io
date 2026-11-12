#!/usr/bin/env python3
"""Collect aircraft guided weapons from Wiki loadout tooltips, without editing BRs.

Run with Python + lxml. Cached source pages and the review report stay under
local-artifacts; only the shared aircraft-armaments.json is published. --refresh
fetches fresh pages; a normal rerun resumes the same day's interrupted collection.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import time
import urllib.request

from lxml import html
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WIKI = "https://wiki.warthunder.com"
ICON_ROOT = "https://static.encyclopedia.warthunder.com/gui_skin/"


def choose_icon(*sources):
    valid = [url for url in sources if url and re.fullmatch(re.escape(ICON_ROOT) + r"[a-zA-Z0-9_-]+\.png", url)]
    def score(url):
        name = url.rsplit("/", 1)[-1]
        count = re.search(r"_x(\d+)", name)
        return ("ptb" in name, int(count.group(1)) if count else 2 if "group" in name else 1, len(name), name)
    return min(valid, key=score) if valid else None


def download_icon(url):
    if choose_icon(url) != url:
        raise ValueError(f"Unexpected icon URL: {url}")
    path = ROOT / "icon/weapon-wiki" / url.rsplit("/", 1)[-1]
    if path.exists():
        with Image.open(path) as image:
            image.verify()
        return
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "WarDevOps-Wiki-Sync/1.0 (+https://wardevops.github.io/)"})
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
            with Image.open(io.BytesIO(content)) as image:
                if image.format != "PNG":
                    raise ValueError("Expected PNG icon")
                image.verify()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            return
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** (attempt + 1))


def prepare_icons(weapons, workers):
    # Official Wiki slot icons used as type fallbacks for preset-only aircraft.
    defaults = {"aam": "missile_type_b_air_to_air.png", "agm": "missile_air_to_uni.png",
                "guided-bomb": "guided_bomb_green.png", "guided-rocket": "nar_he_small_group_x3.png",
                "arm": "missile_air_to_uni.png"}
    for weapon in weapons.values():
        if not weapon.get("iconSource"):
            weapon["iconSource"] = ICON_ROOT + defaults[weapon["type"]]
            weapon["iconGeneric"] = True
        weapon["icon"] = "/icon/weapon-wiki/" + weapon["iconSource"].rsplit("/", 1)[-1]
    sources = sorted({weapon["iconSource"] for weapon in weapons.values()})
    with ThreadPoolExecutor(max_workers=max(1, min(workers, 6))) as executor:
        for _ in executor.map(download_icon, sources):
            pass
    print(f"Downloaded/verified {len(sources)} Wiki icons; {sum(bool(w.get('iconGeneric')) for w in weapons.values())} type fallbacks", flush=True)
# Wiki tooltip titles below omit the weapon type. Classifications are reviewed
# against their Wiki collection/unit pages; guidance always comes from the tooltip.
TYPE_OVERRIDES = {
    "GBU-8": "guided-bomb",  # /collections/weapon/gbu_8
    "PC 1400 X (Fritz X)": "guided-bomb",  # /collections/weapon/fritz_x
    "AGM-123 Skipper missile": "agm",  # /unit/a_6e_tram
    "Kh-29T missiles": "agm", "Kh-29TE missiles": "agm",  # /collections/weapon/kh29
    "Kh-29L missiles": "agm", "Kh-29TD missiles": "agm",
    "Kh-66 missiles": "agm", "Kh-23M missiles": "agm",  # /unit/mig-21_pfm, /unit/mig_23m
    "Kh-25 missiles": "agm", "Kh-25ML missiles": "agm",  # /unit/su_17m2, /unit/su_25t
    "S-25L missiles": "agm", "S-25LD missiles": "agm",  # /unit/su_25, /unit/su_25t
    "Kh-38ML missiles": "agm", "Kh-38MT missiles": "agm",  # /unit/su_30sm
    "Kh-38MLE missiles": "agm", "Kh-38MTE missiles": "agm",  # /unit/su_30mkm
    "Kh-59M missiles": "agm", "Kh-59ME missiles": "agm",
    # Official Heavy Cavalry changelog: /en/game/changelog/current/1863
    "Kh-59MK missiles": "excluded", "Kh-59MKE missiles": "excluded",
    "Rb05A missiles": "agm",  # /3137-sk60b-trainer-turned-tank-buster
    "Ki-148 I-Go Model 1B missile": "agm",  # /unit/ki_48_2_otsu (ground attack)
    "Delilah missiles": "agm", "Delilah (IR) missiles": "agm",  # /unit/f-4e_kurnass_2000
    "Delilah (ARM) missiles": "arm",
    "Fire Snake 90A missiles": "agm",  # /unit/jf_17
    "SALGR M-16D missiles": "agm",  # /9046-the-yurom-project-one-jet-fighter-two-different-fates
    "MBDA Sea Eagle missile": "excluded",  # /unit/hawk_209_indonesia (anti-ship)
    "AGM-119A Penguin missile": "excluded",  # /unit/f_16am_block_20_mlu_norway (anti-ship)
}


def text(value):
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def by_class(name):
    return f"contains(concat(' ', normalize-space(@class), ' '), ' {name} ')"


def classify(name):
    if name in TYPE_OVERRIDES:
        return TYPE_OVERRIDES[name]
    lower = name.lower()
    if "anti-ship" in lower or "anti ship" in lower:
        return "excluded"
    if "air-to-air" in lower:
        return "aam"
    if "anti-radiation" in lower or "anti-radar" in lower:
        return "arm"
    if "guided bomb" in lower:
        return "guided-bomb"
    # The Wiki names APKWS simply 'missiles', despite its guided rocket origin.
    if "apkws" in lower or "guided rocket" in lower:
        return "guided-rocket"
    if "air-to-ground" in lower or "air-to-surface" in lower or "anti-tank" in lower:
        return "agm"
    return None


def parse_aircraft(document, wiki_id):
    title = document.xpath("//h1")
    if not title or not document.xpath(f"//*[{by_class('game-unit_card-info_item')}]"):
        raise ValueError("Not a Wiki vehicle specification page")
    # Use the actual available-weapon table, never modification unlock descriptions
    # or prose which may mention weapons carried by other aircraft.
    sections = document.xpath(f"//*[@id='weapon']/*[div[{by_class('block-header')}][normalize-space()='Suspended armament']]")
    if not sections:
        if not document.xpath("//*[@id='weapon']"):
            raise ValueError("Missing armament specification")
        if document.xpath("//*[@id='weapon-slots']"):
            raise ValueError("Unrecognized suspended-armament section")
        return {}, []
    # Older aircraft expose preset spans instead of a custom-loadout table.
    buttons = sections[0].xpath(".//*[@data-feature-popover]")
    if not buttons:
        raise ValueError("Empty/unrecognized weapon table")
    weapons, unresolved = {}, []
    for button in buttons:
        details = html.fromstring(button.get("data-feature-popover"))
        headers = details.xpath(f"//*[{by_class('game-unit_popover-header')}]/span")
        name = text(headers[0].text_content()) if headers else text(button.text_content())
        guidance = details.xpath(f"//*[{by_class('game-unit_chars-line')}][div[normalize-space()='Guidance']]/div[{by_class('game-unit_chars-value')}]")
        kind = classify(name)
        if kind == "excluded":
            continue
        if not guidance:
            if kind:
                unresolved.append({"name": name, "reason": "missing guidance"})
            continue
        method = text(guidance[0].text_content())
        if not kind:
            unresolved.append({"name": name, "guidance": method, "reason": "unclassified guided weapon"})
            continue
        short_name = re.sub(r"\s+(?:air-to-air missiles?|air-to-ground missiles?|air-to-surface missiles?|anti-radiation missiles?|anti-radar missiles?|anti-tank missiles?|guided bombs?|guided rockets?|missiles?)$", "", name, flags=re.I)
        weapon_id = "w-" + hashlib.sha256(name.encode()).hexdigest()[:16]
        links = details.xpath(".//a[starts-with(@href, '/collections/weapon/')]/@href")
        weapon = {"name": short_name, "type": kind, "guidance": method,
                  "source": WIKI + links[0] if links else f"{WIKI}/unit/{wiki_id}"}
        if "(MITL)" in name:
            weapon["manInTheLoop"] = True
            weapon["guidance"] = method if "MITL" in method.split("+") else method + "+MITL"
        previous = weapons.get(weapon_id, {})
        icon = choose_icon(previous.get("iconSource"), *button.xpath("ancestor::tr[1]//img/@src"))
        if icon:
            weapon["iconSource"] = icon
        if previous and any(previous[key] != weapon[key] for key in ("name", "type", "guidance")):
            raise ValueError(f"Conflicting repeated weapon: {name}")
        if previous and "/collections/weapon/" in previous["source"]:
            weapon["source"] = previous["source"]
        weapons[weapon_id] = weapon
    return weapons, list({json.dumps(item, sort_keys=True): item for item in unresolved}.values())


def collect(wiki_id, cache, refresh):
    path = cache / f"{wiki_id}.html.gz"
    if path.exists() and not refresh:
        content = gzip.decompress(path.read_bytes())
    else:
        for attempt in range(4):
            try:
                request = urllib.request.Request(f"{WIKI}/unit/{wiki_id}", headers={
                    "User-Agent": "WarDevOps-Wiki-Sync/1.0 (+https://wardevops.github.io/)",
                    "Accept-Language": "en", "Accept": "text/html"})
                with urllib.request.urlopen(request, timeout=45) as response:
                    content = response.read()
                # Validate before caching, including rate-limit/challenge pages.
                parse_aircraft(html.fromstring(content.decode('utf-8')), wiki_id)
                path.write_bytes(gzip.compress(content))
                time.sleep(0.2)
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 ** (attempt + 1))
    return parse_aircraft(html.fromstring(content.decode('utf-8')), wiki_id)


def apply_test_additions(data, rules):
    """Retain reviewed test-only availability without claiming it came from Wiki."""
    additions = {}
    for wiki_id, weapon_ids in rules.get("additionalWeapons", {}).items():
        if wiki_id not in data["aircraft"]:
            continue  # Sample collection may not include this aircraft.
        for weapon_id in weapon_ids:
            if weapon_id not in data["weapons"]:
                raise ValueError(f"Test weapon not collected: {wiki_id}/{weapon_id}")
        unit = data["aircraft"][wiki_id]
        unit["weapons"] = sorted(set(unit["weapons"]) | set(weapon_ids))
        additions[wiki_id] = weapon_ids
    data["testAdditions"] = {"source": rules["source"], "status": "testing", "aircraft": additions}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "assets/data/aircraft-armaments.json")
    parser.add_argument("--unit", action="append", help="Sample only; requires an explicit alternate --output")
    args = parser.parse_args()
    if args.unit and args.output.resolve() == (ROOT / "assets/data/aircraft-armaments.json").resolve():
        parser.error("Partial collections require an alternate --output")
    catalog = json.loads((ROOT / "assets/data/tier-units.json").read_text(encoding="utf-8"))
    ids = sorted(unit["wikiId"] for unit in catalog["categories"]["air"]["units"])
    pending_ids = {unit["wikiId"] for unit in catalog["categories"]["air"]["units"] if unit.get("wikiPending")}
    if args.unit:
        if set(args.unit) - set(ids):
            parser.error("Unknown aircraft ID")
        ids = sorted(set(args.unit))
    now = datetime.now(timezone.utc)
    cache = args.cache_dir or ROOT / "local-artifacts/wiki-armaments" / now.strftime("%Y-%m-%d")
    cache.mkdir(parents=True, exist_ok=True)
    results, failures, unresolved = {}, {}, {}
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        futures = {executor.submit(collect, wiki_id, cache, args.refresh): wiki_id for wiki_id in ids if wiki_id not in pending_ids}
        for i, future in enumerate(as_completed(futures), 1):
            wiki_id = futures[future]
            try:
                weapons, pending = future.result()
                results[wiki_id] = weapons
                if pending:
                    unresolved[wiki_id] = pending
            except Exception as error:
                failures[wiki_id] = str(error)
                print(f"FAILED {wiki_id}: {error}", flush=True)
            if i % 50 == 0 or i == len(ids):
                print(f"{i}/{len(ids)} aircraft checked; {len(failures)} failures, {len(unresolved)} need review", flush=True)
    weapons, aircraft, conflicts = {}, {}, []
    for wiki_id in ids:
        unit_weapons = results.get(wiki_id, {})
        for weapon_id, weapon in unit_weapons.items():
            previous = weapons.get(weapon_id)
            if previous and any(previous[key] != weapon[key] for key in ("name", "type", "guidance")):
                conflicts.append({"unit": wiki_id, "weapon": weapon_id, "values": [previous, weapon]})
            else:
                shared = weapons.setdefault(weapon_id, weapon.copy())
                icon = choose_icon(shared.get("iconSource"), weapon.get("iconSource"))
                if icon:
                    shared["iconSource"] = icon
        aircraft[wiki_id] = {"status": "pending-wiki" if wiki_id in pending_ids else "unverified" if wiki_id in failures else "partial" if wiki_id in unresolved else "verified",
                            "weapons": sorted(unit_weapons)}
    report = {"failures": failures, "unresolved": unresolved, "conflicts": conflicts}
    (cache / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if conflicts:
        raise SystemExit(f"Conflicting guidance for shared weapons; inspect {cache / 'report.json'}. Output not replaced.")
    data = {"schemaVersion": 1, "source": WIKI, "checkedAt": now.isoformat(),
            "scope": "All unlockable aircraft guided weapons; availability list, not simultaneous loadouts. Anti-ship-only weapons excluded.",
            "weapons": dict(sorted(weapons.items())), "aircraft": aircraft}
    rules_path = ROOT / "assets/data/brc-variable-br.json"
    if rules_path.exists() and not args.unit:
        apply_test_additions(data, json.loads(rules_path.read_text(encoding="utf-8")))
    prepare_icons(data["weapons"], args.workers)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.output)
    print(f"Wrote {len(aircraft)} aircraft / {len(weapons)} unique weapons to {args.output}")
    print(f"Review: {cache / 'report.json'}")


if __name__ == "__main__":
    main()
