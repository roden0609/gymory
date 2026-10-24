#!/usr/bin/env python3
"""Read the foreground 24/7 Fitness equipment UI using ADB and local Vision OCR.

No API/database writes. Screenshots stay in the configured temporary directory.
Only bright local-store cards in All are recorded. Nearest Store is excluded.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import shlex
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/equipments'
ADB = '/Users/rodenmacmini/Library/Android/sdk/platform-tools/adb'
OCR = '/private/tmp/gymory-collector/ocr'
TMP = Path('/private/tmp/gymory-collector')


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def log(message):
    print(datetime.now(timezone.utc).isoformat(timespec='seconds'), message, flush=True)


def adb(*args):
    return subprocess.check_output([ADB, '-s', 'emulator-5554', *map(str, args)], timeout=30)


def shell(*args):
    return adb('shell', ' '.join(shlex.quote(str(a)) for a in args))


def tap(x, y, wait=1.2):
    shell('input', 'tap', x, y)
    time.sleep(wait)


def swipe(distance=265, y=1700):
    shell('input', 'swipe', 700, y, 700, y-distance, 1500)
    time.sleep(0.2)


def capture(label):
    path = TMP / (label + '.png')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(adb('exec-out', 'screencap', '-p'))
    result = json.loads(subprocess.check_output([OCR, str(path)], timeout=30))
    result['screenshot_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def normalize(text):
    return re.sub(r'[^a-z0-9\u3400-\u9fff]', '', text.casefold())


def clubs_on_screen(screen):
    lines = screen['lines']
    clubs = []
    for line in lines:
        if 'straight' not in line['text'].lower() or not 845 < line['y'] < 2150:
            continue
        previous = [l for l in lines if l['x'] > 420 and
                    line['y']-85 < l['y'] < line['y']-15]
        if not previous:
            if line['y'] < 960:
                continue  # Title of top card is clipped under selector toolbar.
            raise RuntimeError('Cannot read club title above distance label')
        title = max(previous, key=lambda l: l['y'])
        if title['y'] < 840:
            continue
        fragments = sorted([l for l in previous if abs(l['y']-title['y']) < 20], key=lambda l: l['x'])
        clubs.append({'name': ' '.join(l['text'] for l in fragments), 'x': 750,
                      'y': int(title['y']+title['height']/2)})
    return clubs


def discover():
    """Begin with Select Club open, HK / All regions / ALL selected."""
    manifest_path = OUT / '247-fitness-hk-manifest.json'
    existing = json.loads(manifest_path.read_text())['gyms'] if manifest_path.exists() else []
    found = {normalize(c['name']): c for c in existing}
    last = None
    still = 0
    start = len(list((TMP / 'discovery').glob('*.png')))
    for step in range(start, start+200):
        screen = capture(f'discovery/{step:03}')
        visible = clubs_on_screen(screen)
        if not visible:
            raise RuntimeError('No club cards detected; selector may not be open')
        names = tuple(normalize(c['name']) for c in visible)
        for club in visible:
            key = normalize(club['name'])
            found.setdefault(key, {'name': club['name'], 'slug': slug(club['name']),
                                   'country_code': 'HK'})
        write_json(OUT / '247-fitness-hk-manifest.json', {
            'scope': 'HK / All regions / ALL',
            'discovery_complete': False, 'gyms': list(found.values())})
        log(f'Discovery screen {step}: {len(found)} clubs; {visible[-1]["name"]}')
        still = still+1 if names == last else 0
        if still >= 2:
            manifest = {'scope': 'HK / All regions / ALL',
                        'discovery_complete': True, 'gyms': list(found.values())}
            write_json(OUT / '247-fitness-hk-manifest.json', manifest)
            return manifest
        last = names
        swipe(700, 2000)
    raise RuntimeError('Club discovery exceeded screen limit')


def clean_brand(text):
    return text.strip(' [](){}|«»‹›<>【】')


def local_cards(screen):
    cards = []
    for band in screen['local_card_bands']:
        if band['bottom']-band['top'] < 220:
            continue  # Read clipped rows on the next overlapping screenshot.
        lines = [l for l in screen['lines'] if l['x'] > 520 and
                 band['top'] <= l['y']+l['height']/2 <= band['bottom']]
        if len(lines) < 2:
            raise RuntimeError(f'Unreadable local card: {band}')
        brand = lines[0]
        if not 15 < brand['y']-band['top'] < 85:
            continue  # Top-clipped card with missing brand.
        names = lines[1:]
        if any('nearest' in l['text'].lower() for l in lines):
            raise RuntimeError('Nearest Store incorrectly classified as local')
        cards.append({'brand': clean_brand(brand['text']),
                      'name': ' '.join(l['text'] for l in names),
                      'name_truncated': any('...' in l['text'] or '…' in l['text'] for l in names),
                      'text_verification': 'local_ocr_unreviewed',
                      'ocr_confidence': min(l['confidence'] for l in lines),
                      'evidence_frame': Path(screen['path']).stem})
    return cards


def same(a, b):
    return SequenceMatcher(None, normalize(a['brand']+' '+a['name']),
                           normalize(b['brand']+' '+b['name'])).ratio() >= 0.88


def merge(rows, frame):
    if not rows:
        return list(frame), len(frame)
    if not frame:
        return rows, 0
    for overlap in range(min(len(rows), len(frame)), 1, -1):
        if all(same(a, b) for a, b in zip(rows[-overlap:], frame[:overlap])):
            if len(frame)-overlap > 2:
                raise RuntimeError('Scroll skipped more than one row; cannot certify overlap')
            for offset in range(overlap):
                i = len(rows)-overlap+offset
                if frame[offset]['ocr_confidence'] > rows[i]['ocr_confidence']:
                    rows[i] = frame[offset]
            return rows+frame[overlap:], len(frame)-overlap
    # Once inside Nearest Store, the remaining visible local prefix is already read.
    if len(frame) <= len(rows) and all(same(a, b) for a, b in zip(rows[-len(frame):], frame)):
        return rows, 0
    raise RuntimeError('Consecutive screenshots do not overlap reliably')


def header_matches(header, name):
    if '...' in header or '…' in header:
        prefix = re.split(r'\.\.\.|…', header)[0]
        return len(normalize(prefix)) >= 8 and normalize(name).startswith(normalize(prefix))
    return normalize(name) in normalize(header)


def select_club(club, selector_open=False):
    if not selector_open:
        before = capture('before-selector')
        headers = [l for l in before['lines'] if l['x'] > 600 and 170 < l['y'] < 265]
        if not headers:
            raise RuntimeError('Cannot locate store selector in equipment header')
        header_line = headers[0]
        tap(int(header_line['x']+header_line['width']/2), int(header_line['y']+header_line['height']/2))
        opened = capture('selector-open')
        if not any(l['text'] == 'Select Club' for l in opened['lines']):
            raise RuntimeError('Store selector did not open; refusing to type into equipment screen')
    tap(350, 620, 1.2)
    shell('input', 'keycombination', 113, 29)  # Ctrl+A, only in selector search.
    query = club.get('search_name', club['name'])
    shell('input', 'text', query.replace(' ', '%s'))
    time.sleep(0.6)
    shell('input', 'keyevent', 66)  # Submit search; typing alone does not filter.
    time.sleep(1.5)
    # Search updates asynchronously. An old list can contain the target at a
    # different position; never click until every displayed result matches query.
    target = None
    for attempt in range(12):
        screen = capture('selection/'+club['slug'])
        candidates = clubs_on_screen(screen)
        filtered = candidates and all(normalize(query) in normalize(c['name']) for c in candidates)
        if filtered:
            target = next((c for c in candidates if normalize(c['name']) == normalize(club['name'])), None)
            if not target and len(candidates) == 1 and normalize(query) in normalize(candidates[0]['name']):
                target = candidates[0]
            if target:
                break
        if attempt in (3, 7):
            tap(350, 620, 0.8)
            shell('input', 'keyevent', 66)
        time.sleep(0.7)
    if not target:
        raise RuntimeError(f'Exact club search did not match {club["name"]}: {candidates}')
    tap(target['x'], target['y'], 2.0)
    # Verify the selected header while the modal is still open.
    for _ in range(8):
        selected = capture('selection/'+club['slug']+'-confirmation')
        header = ' '.join(l['text'] for l in selected['lines'] if l['x'] > 600 and 170 < l['y'] < 265)
        if header_matches(header, club['name']):
            break
        time.sleep(0.7)
    else:
        raise RuntimeError(f'Club selection was not applied: {header!r}')
    tap(1025, 458, 2.0)
    screen = capture('selection/'+club['slug']+'-selected')
    if any(l['text'] == 'Select Club' for l in screen['lines']):
        raise RuntimeError('Club selector did not close')
    header = ' '.join(l['text'] for l in screen['lines'] if l['x'] > 600 and 170 < l['y'] < 265)
    if not header_matches(header, club['name']):
        raise RuntimeError(f'Wrong club header: {header!r}; expected {club["name"]!r}')
    # Changing club normally resets All to the top; verify by scrolling to top.
    for _ in range(5):
        swipe(-1200, 700)
    return capture(club['slug']+'/000')


def collect(club, selector_open=False):
    screen = select_club(club, selector_open)
    rows = []
    no_new_after_boundary = 0
    frames = []
    for step in range(400):
        if step:
            swipe()
            screen = capture(club['slug']+f'/{step:03}')
        frame = local_cards(screen)
        rows, added = merge(rows, frame)
        boundary = any('nearest store' in l['text'].lower() and 445 < l['y'] < 2055
                       for l in screen['lines'])
        no_new_after_boundary = no_new_after_boundary+1 if boundary and not added else 0
        frames.append({'frame': step, 'local_cards': frame,
                       'screenshot_sha256': screen['screenshot_sha256'],
                       'nearest_store_visible': boundary, 'lines': screen['lines']})
        record = {'schema_version': 1, 'source': '24/7 Fitness Android Equipment Library',
                  'country_code': 'HK', 'store_name': club['name'], 'store_slug': club['slug'],
                  'captured_at': datetime.now(timezone.utc).isoformat(),
                  'status': 'in_progress', 'tab': 'All', 'brand_filter': 'All Brands',
                  'method': 'ADB 265px slow swipe / 1500ms; overlapping local OCR screenshots',
                  'scope': 'Bright local-store section only; Nearest Store excluded',
                  'completeness_basis': 'Continuous overlapping frames from top through local/Nearest Store divider; not a backend total',
                  'row_count': len(rows),
                  'unique_equipment_count': len({(normalize(r['brand']), normalize(r['name'])) for r in rows}),
                  'equipment': [dict(sequence=i, **r) for i, r in enumerate(rows, 1)]}
        if not rows and any('no matching equipment' in l['text'].lower() for l in screen['lines']):
            record['status'] = 'empty_in_app'
        elif no_new_after_boundary >= 3:
            record['status'] = 'local_section_complete'
        write_json(OUT / '247-fitness-hk' / (club['slug']+'.json'), record)
        write_json(OUT / 'captures' / (club['slug']+'.json'), frames)
        if step % 10 == 0 or record['status'] != 'in_progress':
            log(f'{club["name"]}: frame={step}, rows={len(rows)}, status={record["status"]}')
        if record['status'] != 'in_progress':
            return record
    raise RuntimeError('Equipment screen limit reached')


def run(limit=None):
    manifest = json.loads((OUT / '247-fitness-hk-manifest.json').read_text())
    current = capture('resume-state')
    selector_open = any(l['text'] == 'Select Club' for l in current['lines'])
    processed = 0
    for club in manifest['gyms']:
        path = OUT / '247-fitness-hk' / (club['slug']+'.json')
        if path.exists() and json.loads(path.read_text())['status'] in (
                'local_section_complete', 'empty_in_app', 'source_api_complete', 'empty_in_source'):
            continue
        log('Starting '+club['name'])
        try:
            result = collect(club, selector_open)
            selector_open = False
            club.update(status=result['status'], row_count=result['row_count'])
            write_json(OUT / '247-fitness-hk-manifest.json', manifest)
        except Exception as error:
            club.update(status='needs_review', error=str(error))
            write_json(OUT / '247-fitness-hk-manifest.json', manifest)
            raise  # Never silently skip a store or continue against an unknown screen.
        processed += 1
        if limit and processed >= limit:
            return


def summarize():
    manifest = json.loads((OUT / '247-fitness-hk-manifest.json').read_text())
    records = {}
    for path in (OUT / '247-fitness-hk').glob('*.json'):
        record = json.loads(path.read_text())
        records[record['store_slug']] = record
    statuses = Counter()
    review = []
    for club in manifest['gyms']:
        record = records.get(club['slug'])
        status = record['status'] if record else club.get('status', 'pending')
        statuses[status] += 1
        if record:
            for row in record['equipment']:
                if row.get('name_truncated') or row.get('ocr_confidence', 1) < 0.8:
                    review.append(dict(store_slug=club['slug'], **row))
    result = {'updated_at': datetime.now(timezone.utc).isoformat(),
              'total_gyms': len(manifest['gyms']), 'status_counts': dict(statuses),
              'stored_rows': sum(r['row_count'] for r in records.values()),
              'text_review_items': len(review)}
    write_json(OUT / 'progress.json', result)
    write_json(OUT / 'text-review.json', review)
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['discover', 'collect', 'status'])
    parser.add_argument('--limit', type=int)
    args = parser.parse_args()
    TMP.mkdir(parents=True, exist_ok=True)
    if args.mode == 'discover':
        discover()
    elif args.mode == 'collect':
        run(args.limit)
    else:
        summarize()
