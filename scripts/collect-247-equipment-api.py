#!/usr/bin/env python3
"""Read public GET endpoints used by the installed 24/7 Fitness HK app.

No authentication, account data, mutations, or database imports. Scope is the
Hong Kong gyms independently enumerated in the App selector using ADB/OCR.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/equipments'
BASE = 'https://www.247fitness.hk'
ENDPOINT = '/app-api/app-client/store-equipment-inventory/clentList'


def normalize(text):
    return re.sub(r'[^a-z0-9\u3400-\u9fff]', '', str(text).casefold())


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
    temp.replace(path)


def request(path, params):
    url = BASE+path+'?'+urlencode(params)
    last_error = None
    for attempt in range(3):
        try:
            raw = subprocess.check_output([
                'curl', '--fail', '--silent', '--show-error', '--max-time', '45',
                '-H', 'tenant-id: 1', '-H', 'X-Brand-Id: 1', '-H', 'tag: zy',
                '-H', 'accept-language: en-US,en;q=0.9', url], timeout=50)
            result = json.loads(raw)
            if result.get('code') != 0 or not isinstance(result.get('data'), list):
                raise ValueError(f'Unexpected API envelope: {result.get("code")} / {result.get("msg")}')
            return result['data'], url, hashlib.sha256(raw).hexdigest()
        except (ValueError, subprocess.SubprocessError) as error:
            last_error = error
            time.sleep(1+attempt)
    raise RuntimeError(f'Public GET failed after 3 attempts: {last_error}')


def name_for(row, language='en-US'):
    for value in row.get('i18nList') or []:
        if str(value.get('langTag', '')).lower() == language.lower() and value.get('name'):
            return value['name']
    return row.get('inventoryName') or ''


def numeric(value):
    try:
        return float(value or 0)
    except (ValueError, TypeError):
        return 0


def timestamp(value):
    if isinstance(value, (int, float)):
        return value
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp()*1000
    except (ValueError, TypeError):
        return 0


def local_inventory(rows, store_id):
    local = [r for r in rows if r.get('storeId') not in (None, '')]
    if any(str(r['storeId']) != str(store_id) for r in local):
        raise ValueError('Response contains assigned inventory for a different store')
    identities = [(r.get('id'), r.get('inventoryId')) for r in local]
    if len(identities) != len(set(identities)):
        raise ValueError('Duplicate inventory row identities in API response')
    # Same ordering as the App's All computed list: courseware, sortOrder,
    # descending createTime. Python sort is stable, as is the App JS sort.
    return sorted(local, key=lambda r: (0 if r.get('hasCourseware') else 1,
                                        numeric(r.get('sortOrder')),
                                        -timestamp(r.get('createTime'))))


def record_for(store, rows, url, digest):
    local = local_inventory(rows, store['storeId'])
    equipment = []
    for sequence, row in enumerate(local, 1):
        names = {v['langTag']: v['name'] for v in row.get('i18nList') or []
                 if v.get('langTag') and v.get('name')}
        equipment.append({
            'sequence': sequence, 'source_row_id': row.get('id'),
            'inventory_id': row.get('inventoryId'), 'inventory_code': row.get('inventoryCode'),
            'brand': row.get('brandName') or '', 'name': name_for(row),
            'names': names, 'model': row.get('model') or '',
            'category_names': [c.strip() for c in str(row.get('categoryNames') or '').split('/') if c.strip()],
            'cover_image_id': row.get('coverImageId'), 'cover_image_url': row.get('coverImageUrl'),
            'has_courseware': bool(row.get('hasCourseware')),
            'name_truncated': False, 'text_verification': 'source_api_text',
        })
    return {
        'schema_version': 1,
        'source': '24/7 Fitness Android Equipment Library public read endpoint',
        'country_code': 'HK', 'store_id': store['storeId'],
        'store_name': store['storeName'], 'store_slug': slug(store['storeName']),
        'store_name_en': store.get('nameEng'), 'store_name_bilingual': store.get('nameCnEn'),
        'area_name': store['area'], 'store_code': store.get('clubCode'),
        'source_store_status': store.get('status'), 'listed_in_app_selector': True,
        'captured_at': datetime.now(timezone.utc).isoformat(),
        'status': 'source_api_complete' if local else 'empty_in_source',
        'tab': 'All', 'brand_filter': 'All Brands',
        'method': 'Public GET used by App; exact storeId assignment; same All ordering',
        'scope': 'Only inventory assigned to this store; Nearest Store excluded',
        'source_url': url, 'response_sha256': digest,
        'response_row_count': len(rows), 'excluded_nearest_store_rows': len(rows)-len(local),
        'row_count': len(local),
        'unique_equipment_count': len({(normalize(r['brand']), normalize(r['name'])) for r in equipment}),
        'unique_inventory_count': len({r['inventory_id'] for r in equipment}),
        'equipment': equipment,
    }


def match_stores(ui_gyms, hk_stores):
    matched = []
    ids = set()
    for gym in ui_gyms:
        name = gym['name']
        query = re.split(r'[（(]', name)[0].strip() if re.search(r'\.{2,}|…', name) else name
        candidates = [s for s in hk_stores if normalize(s['storeName']) == normalize(query)]
        if not candidates:
            candidates = [s for s in hk_stores if normalize(s['storeName']).startswith(normalize(query))]
        if len(candidates) != 1:
            raise ValueError(f'Cannot unambiguously match App club {name!r}')
        store = candidates[0]
        if store['storeId'] in ids:
            raise ValueError(f'App selector has duplicate store identity: {name}')
        ids.add(store['storeId'])
        matched.append(store)
    return matched


def validate_ui(record, ui):
    source_rows = record['equipment']
    ui_rows = ui['equipment']
    scores = []
    for source_row, ui_row in zip(source_rows, ui_rows):
        a, b = normalize(source_row['name']), normalize(ui_row['name'])
        if ui_row.get('name_truncated') or '..' in ui_row['name'] or '…' in ui_row['name']:
            b = normalize(re.split(r'\.{2,}|…', ui_row['name'])[0])
            scores.append(1 if a.startswith(b) else SequenceMatcher(None, a, b).ratio())
        else:
            scores.append(SequenceMatcher(None, a, b).ratio())
    return {'store_name': record['store_name'], 'store_id': record['store_id'],
            'ui_row_count': len(ui_rows), 'source_row_count': len(source_rows),
            'row_counts_match': len(ui_rows) == len(source_rows),
            'minimum_name_similarity': min(scores) if scores else None,
            'average_name_similarity': sum(scores)/len(scores) if scores else None}


def run(workers=3):
    original = json.loads((OUT/'247-fitness-hk-manifest.json').read_text())
    tree, tree_url, tree_digest = request('/app-api/app-client/store/tree', {
        'langTag': 'en-US', 'lang': 'en-US', 'platform': 'app'})
    hk = next(country for country in tree if country['countryCode'] == 'HK')
    all_stores = [dict(area=area['areaName'], **s) for area in hk['areas'] for s in area['stores']]
    stores = match_stores(original['gyms'], all_stores)
    included_ids = {s['storeId'] for s in stores}
    ui_validation = {}
    for path in (OUT/'ui-validation').glob('*.json'):
        data = json.loads(path.read_text())
        ui_validation[normalize(data['store_name'])] = data
    for path in (OUT/'247-fitness-hk').glob('*.json'):
        data = json.loads(path.read_text())
        if data.get('status') == 'local_section_complete':
            ui_validation[normalize(data['store_name'])] = data
            write_json(OUT/'ui-validation'/path.name, data)
    manifest = {
        'schema_version': 1, 'scope': 'Hong Kong gyms independently listed in App selector',
        'discovery_complete': True, 'discovery_method': 'ADB/OCR selector enumeration through end; store IDs matched to public tree',
        'source_tree_url': tree_url, 'source_tree_sha256': tree_digest,
        'app_selector_gym_count': len(stores), 'source_tree_hk_store_count': len(all_stores),
        'excluded_not_in_app_selector': [dict(store_id=s['storeId'], store_name=s['storeName'],
             source_store_status=s.get('status'), reason='Not listed in App HK selector')
             for s in all_stores if s['storeId'] not in included_ids],
        'gyms': [dict(name=s['storeName'], slug=slug(s['storeName']), store_id=s['storeId'],
                      country_code='HK', status='pending') for s in stores],
    }
    write_json(OUT/'247-fitness-hk-manifest.json', manifest)
    validations = []
    failures = []

    def fetch(store):
        rows, url, digest = request(ENDPOINT, {
            'storeId': store['storeId'], 'club_id': store['storeId'], 'pageNo': 1,
            'pageSize': 100, 'status': 1, 'platform': 'app', 'lang': 'en-US'})
        return record_for(store, rows, url, digest)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        jobs = {executor.submit(fetch, store): index for index, store in enumerate(stores)}
        for number, job in enumerate(as_completed(jobs), 1):
            index = jobs[job]
            gym = manifest['gyms'][index]
            try:
                record = job.result()
                old = ui_validation.get(normalize(record['store_name']))
                if old:
                    validation = validate_ui(record, old)
                    validations.append(validation)
                    record['ui_validation'] = validation
                    if not validation['row_counts_match'] or validation['minimum_name_similarity'] < 0.85:
                        raise ValueError(f'Source differs from verified UI: {validation}')
                write_json(OUT/'247-fitness-hk'/(record['store_slug']+'.json'), record)
                gym.update(status=record['status'], row_count=record['row_count'])
                print(f'{number}/{len(stores)} {record["store_name"]}: {record["row_count"]} rows', flush=True)
            except Exception as error:
                gym.update(status='needs_review', error=str(error))
                failures.append(dict(store_id=gym['store_id'], name=gym['name'], error=str(error)))
                print(f'{number}/{len(stores)} FAILED {gym["name"]}: {error}', flush=True)
            write_json(OUT/'247-fitness-hk-manifest.json', manifest)
    write_json(OUT/'ui-source-validation.json', validations)
    write_json(OUT/'collection-errors.json', failures)
    if failures:
        raise RuntimeError(f'{len(failures)} store(s) need review')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=3, choices=range(1, 5))
    run(parser.parse_args().workers)
