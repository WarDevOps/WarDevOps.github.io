#!/usr/bin/env python3
"""Collect helicopter guided weapons and ground main-gun ammunition from Wiki.

Reuses the aircraft collector's guided-weapon parser and official icon downloader.
Does not edit the shared vehicle/BR catalog. Source pages and review reports are
cached under local-artifacts; missing pages never imply confirmed absence.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import time
import urllib.request
from lxml import html

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('aircraft_sync', ROOT / 'scripts/sync-aircraft-armaments.py')
air = importlib.util.module_from_spec(spec)
spec.loader.exec_module(air)
# Wiki helicopter loadout tooltips omit the category in these exact titles.
# Types are reviewed against the named missile families; guidance is still read
# from each actual loadout tooltip, never inferred from the family name.
air.TYPE_OVERRIDES.update({name: 'agm' for name in [
    'AGM-22 missiles', 'BGM-71С Improved TOW missiles', 'BGM-71D TOW-2 missiles',
    'AS.11 missiles', 'AS.12 missiles', '9M14M Malyutka missiles',
    'HOT-1 missiles', 'HOT-2 TOW missiles', '9М17М Falanga missiles',
    '9M114 Shturm missiles', '9M120 Ataka missiles', '9M120-1 Ataka missiles',
    '9M123M Khrizantema-VM missiles', 'LMUR "Izdeliye 305" missiles', 'LMUR "Izdeliye 305" (MITL) missiles',
    'HJ-8A missiles', 'HJ-8C missiles', 'HJ-8E missiles', 'HJ-8H missiles',
    'L-UMTAS missiles', '9M14-2 Malyutka-2 missiles', 'RB 53 Bantam missiles',
    'RB 52 A missiles', 'RB 55B Heli TOW missiles', 'RB 55C Heli TOW missiles',
]})
air.TYPE_OVERRIDES.update({'ATAS (AIM-92) missiles': 'aam',
    'CIRIT missiles': 'guided-rocket', 'GATR missiles': 'guided-rocket'})


def parse_ground(document, wiki_id):
    if not document.xpath('//h1') or not document.xpath('//*[@id="weapon"]'):
        raise ValueError('Missing vehicle armament specification')
    weapons, unresolved = {}, []
    blocks = document.xpath(f'//*[@id="weapon"]//*[{air.by_class("game-unit_weapon")}]')
    if not blocks:
        if 'Without offensive armament' in document.xpath('//*[@id="weapon"]')[0].text_content():
            return {}, []
        raise ValueError('Unrecognized ground weapon structure')
    for block in blocks:
        title = ' '.join(air.text(node.text_content()) for node in block.xpath(f'.//*[{air.by_class("game-unit_weapon-title")}]'))
        # Non-MG armaments share one list, including gun-launched ATGMs and
        # primary missile launchers. A machine gun is primary only when it is
        # the first weapon in its setup; coaxial/roof mounts are always excluded.
        if not title:
            unresolved.append({'reason': 'Missing weapon title'})
            continue
        if 'flamethrower' in title.lower():
            continue  # Fuel has no ammunition-type table to display.
        if 'machine gun' in title.lower() and (re.search(r'coaxial|roof|pintle|anti-aircraft', title, re.I)
                or block.xpath(f'preceding-sibling::*[{air.by_class("game-unit_weapon")}]')):
            continue
        tables = block.xpath('.//table[thead/tr/th[normalize-space()="Ammunition" or normalize-space()="Belt"]]')
        if not tables:
            unresolved.append({'weapon': title, 'reason': 'Missing ammunition table'})
        for table in tables:
            for row in table.xpath('./tbody/tr'):
                cells = row.xpath('./td')
                if len(cells) < 2:
                    unresolved.append({'weapon': title, 'reason': 'Unrecognized ammunition row'})
                    continue
                name, kind = air.text(cells[0].text_content()), air.text(cells[1].text_content())
                if not name or not kind:
                    unresolved.append({'weapon': title, 'reason': 'Missing ammunition name/type'})
                    continue
                popovers = cells[0].xpath('.//*[@data-feature-popover]/@data-feature-popover')
                details = html.fromstring(popovers[0]) if popovers else cells[0]
                guidance_nodes = details.xpath(f'.//*[{air.by_class("game-unit_chars-line")}][*[normalize-space()="Guidance"]]/*[{air.by_class("game-unit_chars-value")}]')
                missile_guidance = air.text(guidance_nodes[0].text_content()) if guidance_nodes else None
                sources = details.xpath(f'.//*[{air.by_class("game-unit_b-icon_base")}]//img/@src')
                icon = air.choose_icon(*sources) or air.choose_icon(*cells[0].xpath(
                    f'.//*[{air.by_class("game-unit_b-icon_base")}]//img/@src'))
                # Caliber/gun identity keeps identically named belts from different
                # cannons distinct, while duplicate guns/setups share one entry.
                gun = re.sub(r'^\d+\s*[x×]\s*', '', title).strip()
                key = 'ammo-' + hashlib.sha256(f'{gun}|{name}|{kind}'.encode()).hexdigest()[:16]
                weapons[key] = {'name': name, 'type': 'ammunition', 'guidance': missile_guidance or kind,
                    'ammoType': kind, 'gun': gun, 'source': f'{air.WIKI}/unit/{wiki_id}'}
                if missile_guidance:
                    weapons[key]['missileGuidance'] = missile_guidance
                if table.xpath('./thead/tr/th[normalize-space()="Belt"]'):
                    pattern = [part.strip() for part in kind.split('/')]
                    belt_sources = [url for url in sources if air.choose_icon(url)]
                    if len(belt_sources) == 1 and len(set(pattern)) == 1:
                        belt_sources *= len(pattern)
                    if belt_sources and len(belt_sources) >= len(pattern):
                        count = 4 if len(pattern) == 2 else len(belt_sources)
                        weapons[key]['belt'] = [
                            {'type': pattern[i % len(pattern)],
                             'iconSource': belt_sources[i % len(belt_sources)],
                             'icon': '/icon/weapon-wiki/' + belt_sources[i % len(belt_sources)].rsplit('/', 1)[-1]}
                            for i in range(count)]
                    else:
                        unresolved.append({'weapon': title, 'ammunition': name, 'reason': 'Missing ordered belt icons'})
                if icon:
                    weapons[key]['iconSource'] = icon
                else:
                    unresolved.append({'weapon': title, 'ammunition': name, 'reason': 'Missing icon'})
    return weapons, unresolved


def collect(unit, category, cache):
    wiki_id = unit['wikiId']
    path = cache / (wiki_id + '.html.gz')
    sample = ROOT / 'local-artifacts/weapon-samples' / (wiki_id + '.html')
    if path.exists():
        content = gzip.decompress(path.read_bytes())
    elif sample.exists():
        content = sample.read_bytes()
        path.write_bytes(gzip.compress(content))
    else:
        for attempt in range(4):
            try:
                req = urllib.request.Request(f'{air.WIKI}/unit/{wiki_id}', headers={
                    'User-Agent': 'WarDevOps-Wiki-Sync/1.0 (+https://wardevops.github.io/)', 'Accept-Language': 'en'})
                with urllib.request.urlopen(req, timeout=40) as response:
                    content = response.read()
                doc = html.fromstring(content.decode('utf-8'))
                if not doc.xpath('//h1') or not doc.xpath('//*[@id="weapon"]'):
                    raise ValueError('Missing Wiki specification')
                path.write_bytes(gzip.compress(content))
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
    doc = html.fromstring(content.decode('utf-8'))
    if category == 'tank' and wiki_id.endswith('_fcs'):
        launcher_id = wiki_id.removesuffix('_fcs') + '_launcher'
        links = doc.xpath(f'//a[@href="/unit/{launcher_id}"]')
        if not links or not any(re.search(r'\(TEL(?:AR)?\)', link.text_content()) for link in links):
            raise ValueError('Missing matching TEL/TELAR link on TADS Wiki page')
        weapons, unresolved = collect({'wikiId': launcher_id}, 'tank', cache)
        missiles = {key: weapon
            for key, weapon in weapons.items() if weapon.get('missileGuidance') or weapon.get('ammoType') == 'SAM'}
        if not missiles and not unresolved:
            raise ValueError('Matching launcher has no confirmed missile ammunition')
        return missiles, unresolved
    return parse_ground(doc, wiki_id) if category == 'tank' else air.parse_aircraft(doc, wiki_id)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'assets/data/tier-units.json').read_text(encoding='utf-8'))
    cache = ROOT / 'local-artifacts/wiki-ground-heli-armaments'
    cache.mkdir(parents=True, exist_ok=True)
    data = {'schemaVersion': 1, 'source': air.WIKI,
        'checkedAt': datetime.now(timezone.utc).isoformat(), 'weapons': {}, 'ground': {}, 'helicopters': {}}
    report = {'failures': {}, 'unresolved': {}}
    jobs = [(category, unit) for category in ['tank', 'heli'] for unit in catalog['categories'][category]['units']]
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        futures = {}
        for category, unit in jobs:
            bucket = data['ground' if category == 'tank' else 'helicopters']
            if unit.get('wikiPending'):
                bucket[unit['wikiId']] = {'status': 'pending-wiki', 'weapons': []}
            else:
                futures[executor.submit(collect, unit, category, cache)] = (category, unit)
        for i, future in enumerate(as_completed(futures), 1):
            category, unit = futures[future]
            wiki_id = unit['wikiId']
            try:
                weapons, unresolved = future.result()
                for key, weapon in weapons.items():
                    previous = data['weapons'].get(key)
                    if previous and any(previous.get(k) != weapon.get(k) for k in ['name', 'type', 'guidance']):
                        raise ValueError(f'Conflicting weapon {key}')
                    data['weapons'].setdefault(key, weapon)
                entry = {'status': 'partial' if unresolved else 'verified', 'weapons': sorted(weapons)}
                if category == 'tank' and wiki_id.endswith('_fcs'):
                    entry['launcherWikiId'] = wiki_id.removesuffix('_fcs') + '_launcher'
                    entry['armamentSource'] = f'{air.WIKI}/unit/{entry["launcherWikiId"]}'
                if unresolved:
                    report['unresolved'][wiki_id] = unresolved
            except Exception as error:
                report['failures'][wiki_id] = str(error)
                entry = {'status': 'unverified', 'weapons': []}
                print(f'FAILED {wiki_id}: {error}', flush=True)
            data['ground' if category == 'tank' else 'helicopters'][wiki_id] = entry
            if i % 50 == 0 or i == len(futures):
                print(f'{i}/{len(futures)} collected; {len(report["failures"])} failed; {len(report["unresolved"])} partial', flush=True)
    # Aircraft helper supplies official generic icons for rare preset-only missiles.
    guided = {k: w for k, w in data['weapons'].items() if w['type'] != 'ammunition'}
    air.prepare_icons(guided, args.workers)
    icons = sorted({w['iconSource'] for w in data['weapons'].values() if w.get('iconSource')})
    icons = sorted(set(icons) | {round['iconSource'] for w in data['weapons'].values() for round in w.get('belt', [])})
    with ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(air.download_icon, icons))
    for weapon in data['weapons'].values():
        if weapon.get('iconSource'):
            weapon['icon'] = '/icon/weapon-wiki/' + weapon['iconSource'].rsplit('/', 1)[-1]
    (cache / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    output = ROOT / 'assets/data/ground-heli-armaments.json'
    temporary = output.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(output)
    print(f'Wrote {len(data["ground"])} ground vehicles, {len(data["helicopters"])} helicopters, {len(data["weapons"])} weapons', flush=True)


if __name__ == '__main__':
    main()
