#!/usr/bin/env python3
"""Read-only manufacturer research; never modifies branch inventory or the database.

Uses public catalog APIs and product pages. Exact model matches are distinguished
from name-only candidates. Cache lives outside the repository by default.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import ssl
import subprocess
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
CATALOGS = {
    'NEWTECH': 'https://newtechworldwide.com',
    'Life Fitness': 'https://shop.lifefitness.com',
    'HAMMER STRENGTH': 'https://shop.lifefitness.com',
    'Cybex': 'https://shop.lifefitness.com',
    'NAUTILUS': 'https://www.corehandf.com',
    'STAR TRAC': 'https://www.corehandf.com',
    'StairMaster': 'https://www.corehandf.com',
    'SCHWINN': 'https://www.corehandf.com',
    'THROWDOWN': 'https://www.corehandf.com',
    'PRECOR': 'https://www.precor.com',
    'GLUTE BUILDER': 'https://www.precor.com',
    'BOLT FITNESS': 'https://www.boltfitnesssupply.com',
    'ABS': 'https://theabscompany.com',
    'Torque Fitness': 'https://www.torquefitness.com',
    'XMASTER': 'https://www.xmasterfitness.com',
    'ZIVA': 'https://ziva.com',
}
SITEMAPS = {
    'PANATTA': 'https://www.panattasport.com/sitemap_index.xml',
    'SportArt': 'https://www.gosportsart.com/product-sitemap.xml',
    'Arsenal': 'https://www.myarsenalstrength.com/sitemap.xml',
    'BOOTY BUILDER': 'https://bootybuilder.com/product-sitemap.xml',
    'FREEMOTION': 'https://www.freemotionfitness.com/sitemap_index.xml',
    'TechnoGym': 'https://www.technogym.com/sitemap.xml',
    'ELEIKO': 'https://eleiko.com/sitemap.xml',
    'SKELCORE': 'https://www.skelcore.com/sitemap.xml',
    'ASSAULT FITNESS': 'https://www.assaultfitness.com/sitemap.xml',
    'Concept 2': 'https://www.concept2.com/sitemap.xml',
    'ROGERS': 'https://rogersathletic.com/product-sitemap.xml',
    'ROGUE': 'https://www.roguefitness.com/sitemap.xml',
    'MATRIX': 'https://www.matrixfitness.com/sitemap.xml',
    'Escape Fitness': 'https://escapefitness.com/sitemap.xml',
    'FORWARD': 'https://www.fwdkorea.com/sitemap.xml',
    'Repcon': 'https://repconcompany.com/sitemap.xml',
    'KAYAKPRO': 'https://kayakpro.com/sitemap_index.xml',
    'InBody': 'https://inbody.com/sitemap.xml',
    'HOWBODY': 'https://howbody.com/sitemap.xml',
    'IRONWOD': 'https://ironwod.com/sitemap.xml',
}

# CDN paths actually observed on the manufacturers' public product pages.
# Restrict shared CDNs to the manufacturer's account, not the whole CDN host.
BROWSER_IMAGE_PREFIXES = {
    'Life Fitness': ('https://production-gvckb4eyhna3g6c7.a03.azurefd.net/',
                     'https://cdn.shopify.com/s/files/1/0538/8307/6805/'),
    'FREEMOTION': ('https://images.contentstack.io/v3/assets/blt57f09fe1af8ef70f/',),
    'FORWARD': ('https://cdn-optimized.imweb.me/upload/S20221208a9a497601a979/',),
    'XMASTER': ('https://img-va.myshopline.com/image/store/1688111732036/',),
    'ZIVA': ('https://res.cloudinary.com/dy1ralqpm/image/fetch/',),
    'ROGERS': ('https://cdn11.bigcommerce.com/s-jeg6lfft5f/',),
}


def validate_browser_urls(record):
    brand = record['brand']
    origin = CATALOGS.get(brand) or SITEMAPS.get(brand)
    host = urllib.parse.urlparse(origin or '').hostname
    if not host:
        raise ValueError(f'No manufacturer origin configured for browser evidence: {brand}')
    if brand in ('Life Fitness', 'HAMMER STRENGTH', 'Cybex'):
        host = 'lifefitness.com'
    elif brand == 'MATRIX':
        host = 'matrixfitness.com'
    else:
        host = host.removeprefix('www.')
    for key in ('product_url', 'evidence_url', 'image_evidence_url', 'image_url'):
        value = record.get(key)
        if key in ('image_url', 'image_evidence_url') and not value:
            continue
        parsed = urllib.parse.urlparse(value or '')
        actual = (parsed.hostname or '').removeprefix('www.')
        own_host = actual == host or actual.endswith('.' + host)
        observed_cdn = (key == 'image_url' and
                        record.get('image_observed_on') == record.get('image_evidence_url', record.get('evidence_url')) and
                        any((value or '').startswith(prefix) for prefix in BROWSER_IMAGE_PREFIXES.get(brand, ())))
        if parsed.scheme != 'https' or parsed.username or parsed.password or not (own_host or observed_cdn):
            raise ValueError(f'Browser evidence is outside the manufacturer origin: {key}')


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', value or ''))).strip()


def extract_specification_model_names(source):
    """Read named submodels in specification cells, independently of the page H1."""
    class SpecificationRows(HTMLParser):
        def __init__(self):
            super().__init__()
            self.rows, self.cells, self.cell = [], None, None
            self.skip = 0

        def handle_starttag(self, tag, attrs):
            if tag in ('script', 'style', 'template'):
                self.skip += 1
            if self.skip:
                return
            if tag == 'tr':
                self.cells = []
            elif tag in ('td', 'th') and self.cells is not None:
                self.cell = []

        def handle_data(self, value):
            if not self.skip and self.cell is not None:
                self.cell.append(value)

        def handle_endtag(self, tag):
            if tag in ('script', 'style', 'template'):
                self.skip = max(0, self.skip - 1)
                return
            if self.skip:
                return
            if tag in ('td', 'th') and self.cell is not None:
                self.cells.append(re.sub(r'\s+', ' ', ' '.join(self.cell)).strip())
                self.cell = None
            elif tag == 'tr' and self.cells is not None:
                self.rows.append(self.cells)
                self.cells, self.cell = None, None

    parser = SpecificationRows()
    parser.feed(source)
    names, seen = [], set()
    for row in parser.rows:
        if not row:
            continue
        # Match the row label, never model mentions in a value or paragraph.
        match = re.match(r'^(.{2,140}?)\s*[（(]\s*([A-Z][A-Z0-9_-]{2,35})\s*[）)]', row[0])
        if match:
            name, model = match.group(1).strip(), match.group(2)
            if (model, name) not in seen:
                names.append({'model': model, 'name': name, 'source_label': row[0]})
                seen.add((model, name))
    return names


def specification_products(product):
    """Submodels keep their own row names and never inherit a whole-system photo."""
    return [{**product, 'name': row['name'], 'models': [row['model']],
             'component_model': row['model'], 'image_url': None, 'text': row['source_label'],
             'specification_names': []}
            for row in product.get('specification_names', [])
            if not re.search(r'[\u3400-\u9fff]', row['name'])]


def norm(value):
    return re.sub('[^a-z0-9]', '', value.lower())


def model_key(value, brand):
    value = re.sub(r'\s+', '', value).casefold()
    # These brands publish both ILSP / IL-SP and LBRDB / LBR-DB forms.
    # Keep letter/digit separators, notably XTTM3C-101 vs XTTM3-C-101.
    if brand in ('HAMMER STRENGTH', 'Life Fitness'):
        value = re.sub(r'(?<=[a-z])-(?=[a-z])', '', value)
    if brand == 'HAMMER STRENGTH' and value == 'pl-4w':
        value = 'pl4w'  # Published PL-4W is written PL4W in the source inventory.
    return value


def url_encode(value):
    return urllib.parse.quote(value, safe=":/?&=%#@+;,~!$'()*[]")


def tokens(value):
    return set(re.findall('[a-z0-9]+', (value or '').lower())) - {'machine', 'fitness', 'series', 'the', 'and'}


def lifefitness_lookup_model(source_model):
    """Separate recognized inventory annotations; never truncate real model codes."""
    model = source_model.strip()
    model = re.sub(r'\s*[（(](?:LP|SP)[）)]\s*Full\s*$', '', model, flags=re.I).strip()
    if model.startswith('OP-') and model.endswith('-FS'):
        model = model[:-3]
    return model


def preserve_official_chinese_names(result, previous):
    """Retain recorded manufacturer wording only for unchanged product identities."""
    identity = lambda e: tuple(e.get(k) for k in ('inventory_id', 'brand', 'source_model', 'official_name', 'official_product_url'))
    names = {identity(e): e['official_name_zh'] for e in previous.get('equipment', [])
             if isinstance(e.get('official_name_zh'), str) and e['official_name_zh'].strip()}
    for entry in result['equipment']:
        if not entry.get('official_name_zh'):
            entry['official_name_zh'] = names.get(identity(entry))


def apply_official_chinese_names(result, supplemental):
    """Manufacturer translations name a product; they do not verify inventory identity."""
    def chinese_model_key(value, brand):
        key = model_key(value, brand)
        # SportsArt publishes DF207; the inventory also writes the DF series as DF-207.
        return re.sub(r'^df-(?=\d{3}$)', 'df', key) if brand == 'SportArt' else key

    for record in supplemental.get('official_chinese_names', []):
        entry = next((e for e in result['equipment'] if e.get('inventory_id') == record['inventory_id']
                      and e['brand'] == record['brand'] and e['source_model'] == record['source_model']), None)
        if entry is None:
            continue
        candidates = [c for c in entry.get('candidates', []) if c['product_url'] == record['product_url']]
        if entry.get('official_product_url') != record['product_url'] and not candidates:
            # A newly discovered Chinese page can establish its own exact source
            # model without changing the existing English match or image.
            exact_chinese_model = (record.get('match_scope') == 'exact_source_model_chinese_name_only'
                                   and bool(entry['source_model'].strip())
                                   and chinese_model_key(entry['source_model'], entry['brand']) in {
                                       chinese_model_key(code, entry['brand']) for code in record.get('manufacturer_model_codes', [])})
            if not exact_chinese_model:
                continue
        validate_browser_urls(record)
        name = record.get('official_name_zh')
        locale_name = (record.get('name_language') == 'manufacturer_locale_unchanged'
                       and record.get('source_locale') == 'zh-Hant'
                       and name == record.get('original_name') == record.get('source_heading')
                       and '/zh-hk/' in record.get('evidence_url', ''))
        if not isinstance(name, str) or not name.strip() or (not re.search(r'[\u3400-\u9fff]', name) and not locale_name):
            raise ValueError('Official Chinese name requires manufacturer Chinese wording')
        if record.get('source_locale') == 'zh-Hans' and (
                not record.get('original_name') or record.get('conversion_method') != 'OpenCC cn-to-hk'):
            raise ValueError('Converted Chinese names require the original Simplified wording and conversion method')
        entry['official_name_zh'] = record['official_name_zh']
        entry['official_name_zh_evidence'] = {k: record[k] for k in (
            'product_url', 'evidence_url', 'retrieved_at', 'retrieval_method', 'original_name',
            'source_locale', 'conversion_method', 'evidence_sha256', 'localized_product_url',
            'manufacturer_model_codes', 'match_scope', 'identity_evidence', 'document_page',
            'source_heading', 'source_label', 'name_language', 'note') if k in record}
        for candidate in candidates:
            candidate['name_zh'] = record['official_name_zh']
    reviews = supplemental.get('official_chinese_name_reviews', [])
    for entry in result['equipment']:
        review = next((r for r in reviews if all(r.get(k) == entry.get(k)
                      for k in ('inventory_id', 'brand', 'source_model'))), None)
        if review:
            entry['official_name_zh_review'] = {k: review[k] for k in ('review_date', 'status', 'reason')}
    if supplemental.get('official_chinese_name_followup'):
        followup = supplemental['official_chinese_name_followup']
        result['official_chinese_name_followup'] = {k: followup[k] for k in (
            'review_date', 'inventory_count', 'brand_count', 'policy', 'review_outcomes',
            'recorded_name_count', 'converted_name_count', 'name_search_followup', 'specification_followup') if k in followup}


def apply_official_english_names(result, supplemental):
    """Confirm exact manufacturer model names independently of image availability."""
    from collections import Counter
    for record in supplemental.get('official_english_names', []):
        entry = next((e for e in result['equipment'] if all(e.get(k) == record.get(k)
                      for k in ('inventory_id', 'brand', 'source_model'))), None)
        if entry is None or (entry.get('official_name') and entry.get('match_method') != 'manufacturer_model_name_evidence'):
            continue
        if (not entry['source_model'].strip() or model_key(entry['source_model'], entry['brand']) not in {
                model_key(code, entry['brand']) for code in record.get('manufacturer_model_codes', [])}):
            raise ValueError('English name evidence requires the exact source model')
        if not record.get('official_name') or re.search(r'[\u3400-\u9fff]', record['official_name']):
            raise ValueError('English name evidence requires manufacturer English wording')
        validate_browser_urls(record)
        entry.update(official_name=record['official_name'], official_product_url=record['product_url'],
                     official_model=record['manufacturer_model_codes'][0],
                     status='model_verified' if entry.get('official_image_url') else 'model_verified_image_missing',
                     match_method='manufacturer_model_name_evidence',
                     evidence={k: record[k] for k in ('evidence_url', 'retrieved_at', 'retrieval_method',
                                                     'evidence_sha256', 'manufacturer_model_codes', 'source_label') if k in record},
                     reason='Manufacturer model code confirms the English product name. Image availability is reviewed separately.')
    result['summary'] = dict(Counter(e['status'] for e in result['equipment']))


def apply_lifefitness_reviews(result, supplemental):
    """Apply individually researched model identities separately from configurations."""
    from collections import Counter
    reviews = supplemental.get('lifefitness_item_reviews', [])
    if not reviews:
        return
    seen = set()
    for review in reviews:
        inventory_id = review['inventory_id']
        if inventory_id in seen:
            raise ValueError(f'Duplicate Life Fitness review: {inventory_id}')
        seen.add(inventory_id)
        entry = next((e for e in result['equipment'] if e.get('inventory_id') == inventory_id and
                      e['brand'] == 'Life Fitness' and e['source_model'] == review['source_model']), None)
        if entry is None:
            raise ValueError(f'Life Fitness review does not match original inventory: {inventory_id}')
        if not review.get('query') or not review.get('configuration_note'):
            raise ValueError('Life Fitness review requires an individual search and configuration note')
        entry['lookup_model'] = lifefitness_lookup_model(entry['source_model'])
        entry['individual_review'] = review
        entry['match_scope'] = review['match_scope']
        entry['configuration_status'] = review['configuration_status']
        entry['configuration_note'] = review['configuration_note']
        if review['outcome'] == 'model_confirmed':
            if not review.get('model_evidence'):
                raise ValueError('Confirmed Life Fitness models require product-specific code evidence')
            if review['match_scope'] == 'product_name_and_image':
                visual = review.get('visual_review', {})
                if (visual.get('source_image_url') != entry.get('source_image_url')
                        or visual.get('official_image_url') != review.get('official_image_url')
                        or visual.get('result') != 'product_identity_confirmed'
                        or not visual.get('observations') or not visual.get('review_date')):
                    raise ValueError('Visual product confirmation requires source-bound image comparison evidence')
            if review['match_scope'] == 'base_model' and model_key(entry['lookup_model'], 'Life Fitness') != model_key(review['official_model'], 'Life Fitness'):
                raise ValueError('Base-model review must match the conservatively normalized source model')
            validate_browser_urls({'brand': 'Life Fitness', 'product_url': review['official_product_url'],
                                   'evidence_url': review['evidence_url'], 'image_url': review.get('official_image_url'),
                                   'image_observed_on': review.get('image_observed_on'),
                                   'image_evidence_url': review.get('image_evidence_url', review['evidence_url'])})
            image = review.get('official_image_url')
            check = review.get('image_check')
            if image and (not check or check.get('available') is not True or check.get('url') != image):
                raise ValueError('Life Fitness official images must have a successful image check')
            entry.update(official_name=review['official_name'], official_product_url=review['official_product_url'],
                         official_image_url=image, official_model=review['official_model'],
                         status='model_verified' if image else 'model_verified_image_missing',
                         match_method='individually_verified_' + review['match_scope'],
                         image_check=check, candidates=[],
                         evidence={key: review.get(key) for key in ('evidence_url', 'evidence_sha256', 'retrieved_at',
                                                                  'retrieval_method', 'model_evidence', 'image_evidence_url')},
                         reason=review['configuration_note'])
            for key in ('visual_review', 'identity_evidence'):
                if key in review:
                    entry['evidence'][key] = review[key]
            if review['match_scope'] in ('product_name_and_image', 'exact_model_manual'):
                entry['image_verification_status'] = 'manufacturer_image_checked' if image else 'image_missing'
            if review.get('image_match_status') == 'candidate_requires_review':
                if not image or not review.get('identity_evidence'):
                    raise ValueError('Unverified image references require a candidate image and identity evidence')
                entry.update(status='model_verified_image_missing', image_verification_status='candidate_requires_review',
                             candidates=[{'name': review['official_name'], 'product_url': review['official_product_url'],
                                          'image_url': image, 'evidence_url': review['image_evidence_url'],
                                          'reason': review['configuration_note']}])
        elif review['outcome'] == 'candidate':
            candidate = {'name': review['candidate_name'], 'product_url': review['candidate_product_url'],
                         'image_url': review.get('candidate_image_url'), 'score': 0,
                         'evidence_url': review.get('evidence_url', review['candidate_product_url']),
                         'retrieval_method': 'individual_search_and_official_page', 'reason': review['configuration_note']}
            validate_browser_urls({'brand': 'Life Fitness', 'product_url': candidate['product_url'],
                                   'evidence_url': candidate['evidence_url']})
            entry.update(official_name=None, official_product_url=None, official_image_url=None,
                         official_model=None,
                         status='candidate_requires_review', match_method=None, evidence=None, image_check=None,
                         candidates=[candidate], reason=review['configuration_note'])
            if review.get('record_candidate_official_data'):
                validate_browser_urls({'brand': 'Life Fitness', 'product_url': candidate['product_url'],
                                       'evidence_url': candidate['evidence_url'], 'image_url': candidate['image_url']})
                entry.update(official_name=candidate['name'], official_product_url=candidate['product_url'],
                             official_image_url=candidate['image_url'],
                             match_method='manufacturer_family_candidate',
                             image_verification_status='candidate_requires_review',
                             evidence={'evidence_url': candidate['evidence_url'],
                                       'retrieval_method': 'manufacturer_family_candidate',
                                       'note': 'Manufacturer name and image recorded as candidates; inventory configuration and image match are unverified.'})
        elif review['outcome'] == 'unresolved':
            entry.update(official_name=None, official_product_url=None, official_image_url=None,
                         official_model=None,
                         status='unresolved', match_method=None, evidence=None, image_check=None,
                         candidates=[], reason=review['configuration_note'])
        else:
            raise ValueError(f'Unsupported Life Fitness review outcome: {review["outcome"]}')
    result['summary'] = dict(Counter(e['status'] for e in result['equipment']))
    result['lifefitness_review'] = supplemental.get('lifefitness_review', {})


def apply_manual_equipment_reviews(result, supplemental):
    """Replay explicit user decisions only while the reviewed source and official data match."""
    from collections import Counter
    seen = set()
    for review in supplemental.get('manual_equipment_reviews', []):
        inventory_id = review['inventory_id']
        if inventory_id in seen:
            raise ValueError('Duplicate manual equipment review')
        seen.add(inventory_id)
        entry = next((e for e in result['equipment'] if e['inventory_id'] == inventory_id), None)
        approved = review.get('approved_candidate')
        if approved:
            source_fields = ('brand', 'source_model', 'source_image_url')
            if entry is None or any(entry.get(k) != review.get(k) for k in source_fields):
                raise ValueError(f'Manual candidate review no longer matches source: {inventory_id}')
            selected_fields = {'official_name': 'name', 'official_product_url': 'product_url',
                               'official_image_url': 'image_url'}
            first = next(iter(entry.get('candidates', [])), {})
            already_applied = all(entry.get(k) == approved.get(v) for k, v in selected_fields.items())
            if not already_applied and any(first.get(v) != approved.get(v) for v in selected_fields.values()):
                raise ValueError(f'First candidate changed after manual review: {inventory_id}')
            if any(review.get(k) != approved.get(v) for k, v in selected_fields.items()):
                raise ValueError('Manual candidate decision must use the approved candidate data')
            entry.update({k: approved[v] for k, v in selected_fields.items()})
            entry['candidates'] = []
        fields = ('brand', 'source_model', 'source_image_url', 'official_name',
                  'official_product_url', 'official_image_url')
        if entry is None or any(entry.get(k) != review.get(k) for k in fields):
            raise ValueError(f'Manual review no longer matches equipment data: {inventory_id}')
        if (review.get('status') != 'model_verified' or not entry.get('official_image_url')
                or not review.get('review_date') or not review.get('review_source')
                or review.get('reviewed_by') != 'user'):
            raise ValueError('Manual model verification requires an explicit user decision and image reference')
        entry.update(status='model_verified', match_method='manual_equipment_review',
                     match_scope='manual_review', configuration_status='manually_reviewed',
                     image_verification_status='manually_reviewed', manual_review=review,
                     reason=review['note'], configuration_note=review['note'])
    result['summary'] = dict(Counter(e['status'] for e in result['equipment']))
    if result.get('lifefitness_review'):
        counts = Counter(e['status'] for e in result['equipment'] if e['brand'] == 'Life Fitness')
        result['lifefitness_review'] = {**result['lifefitness_review'],
            'model_with_image': counts['model_verified'], 'model_without_image': counts['model_verified_image_missing'],
            'candidate_count': counts['candidate_requires_review'], 'unresolved_count': counts['unresolved']}


def apply_browser_evidence(result, supplemental):
    """Apply exact, standalone model cards actually displayed in a browser.

    Run after HTTP image checks: an HTTP 403 must not erase successful browser
    verification. This imports captured DOM evidence, never browser sessions.
    """
    from collections import Counter
    records = {}
    for record in supplemental.get('browser_models', []):
        if (not record.get('model', '').strip() or record.get('model') == '-' or
                record.get('retrieval_method') != 'browser_dom' or
                record.get('image_loaded') is not True or record.get('image_width', 0) <= 0 or
                record.get('displayed_models') != [record.get('model')]):
            continue
        brand = record['brand']
        if not record.get('image_url'):
            raise ValueError('Decoded browser evidence requires an image URL')
        validate_browser_urls(record)
        if not record.get('name') or not record.get('retrieved_at'):
            raise ValueError('Browser evidence requires a product name and retrieval timestamp')
        key = (brand, record['model'])
        if key in records and records[key]['product_url'] != record['product_url']:
            raise ValueError(f'Ambiguous browser model: {key}')
        records[key] = record
    for entry in result['equipment']:
        record = records.get((entry['brand'], entry['source_model'].strip()))
        if not record:
            continue
        entry.update(
            official_name=record['name'], official_product_url=record['product_url'],
            official_image_url=record['image_url'], status='model_verified',
            match_method='exact_model_in_browser_catalog', candidates=[],
            evidence={
                'evidence_url': record['evidence_url'], 'retrieved_at': record['retrieved_at'],
                'retrieval_method': 'browser_dom', 'displayed_models': record['displayed_models'],
                'browser_evidence_sha256': hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False).encode()).hexdigest(),
                **({'model_evidence': record['model_evidence']} if record.get('model_evidence') else {}),
            },
            image_check={
                'checked_at': record['retrieved_at'], 'available': True,
                'method': 'browser_image_decoded', 'image_width': record['image_width'],
            },
            reason=record.get('model_evidence') or 'The manufacturer catalog was opened in Chrome. The standalone card displays this exact model and name, and its official image decoded successfully in the browser.',
        )
    # Browser-confirmed names/photos with incomplete model evidence stay candidates.
    for record in supplemental.get('browser_candidates', []):
        if record.get('retrieval_method') != 'browser_dom':
            continue
        validate_browser_urls(record)
        entry = next((e for e in result['equipment'] if
                      e.get('inventory_id') == record['inventory_id'] and e['brand'] == record['brand'] and
                      e['source_model'] == record['source_model']), None)
        if entry is None or entry['status'].startswith('model_verified'):
            continue
        if record.get('image_url') and (record.get('image_loaded') is not True or record.get('image_width', 0) <= 0):
            raise ValueError('Candidate browser images must have decoded successfully')
        candidate = {key: record[key] for key in ('name', 'product_url', 'image_url', 'evidence_url',
                                                 'retrieved_at', 'retrieval_method', 'reason')}
        candidate['score'] = 0  # Manual lead, not a computed name-similarity score.
        entry['candidates'] = [candidate] + [c for c in entry.get('candidates', []) if c['product_url'] != record['product_url']]
        entry['browser_review'] = {key: record[key] for key in ('evidence_url', 'retrieved_at', 'reason')}
        if entry['status'] == 'unresolved':
            entry['status'] = 'candidate_requires_review'
        entry['reason'] = record['reason']
    for review in supplemental.get('browser_inventory_reviews', []):
        entry = next((e for e in result['equipment'] if e.get('inventory_id') == review['inventory_id'] and
                      e['brand'] == review['brand'] and e['source_model'] == review['source_model']), None)
        if entry is not None:
            entry['browser_review'] = review
            if not entry['status'].startswith('model_verified'):
                entry['reason'] = review['reason']
    result['summary'] = dict(Counter(e['status'] for e in result['equipment']))
    if supplemental.get('browser_followup'):
        followup = supplemental['browser_followup']
        result['browser_followup'] = followup
        counts = result.setdefault('catalog_product_counts', {})
        counts[followup['brand']] = max(counts.get(followup['brand'], 0), followup['catalog_card_count'])
    if supplemental.get('brand_reviews'):
        result['brand_reviews'] = supplemental['brand_reviews']
        result['last_review_date'] = max(review['review_date'] for review in result['brand_reviews'])
    apply_lifefitness_reviews(result, supplemental)
    apply_official_english_names(result, supplemental)
    apply_official_chinese_names(result, supplemental)
    apply_manual_equipment_reviews(result, supplemental)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta = {}
        self.headings = []
        self.texts = []
        self.images = []
        self.language = ''
        self.h1 = False
        self.skip = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.language = a.get('lang', '')
        if tag == 'meta':
            self.meta[a.get('property', a.get('name', ''))] = a.get('content', '')
        if tag == 'h1':
            self.h1 = True
        if tag == 'img' and a.get('src'):
            self.images.append((a['src'], a.get('alt', '')))
        if tag in ('script', 'style'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == 'h1':
            self.h1 = False
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip:
            self.texts.append(data)
            if self.h1:
                self.headings.append(data)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache-dir', default='/tmp/gymory-official-equipment/cache')
    ap.add_argument('--output', default='data/equipments/247-fitness-hk-official-catalog.json')
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--check-images', action='store_true', help='Check that official image URLs return an image content type')
    ap.add_argument('--evidence-file', default='data/equipments/247-fitness-hk-official-evidence.json')
    ap.add_argument('--report-only', action='store_true', help='Regenerate Markdown and Excel from the existing catalog without fetching websites')
    ap.add_argument('--apply-browser-evidence', action='store_true', help='Apply captured browser verification to the existing catalog and regenerate reports without HTTP requests')
    args = ap.parse_args()
    if args.report_only or args.apply_browser_evidence:
        output = ROOT / args.output
        result = json.loads(output.read_text())
        if args.apply_browser_evidence:
            supplemental = json.loads((ROOT / args.evidence_file).read_text())
            apply_browser_evidence(result, supplemental)
            output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        write_reports(result)
        return
    cache = Path(args.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    ctx = ssl.create_default_context(cafile='/etc/ssl/cert.pem') if Path('/etc/ssl/cert.pem').exists() else ssl.create_default_context()
    try:
        import certifi
        ctx.load_verify_locations(certifi.where())
    except ImportError:
        pass
    attempts = []

    def fetch(url):
        key = hashlib.sha256(url.encode()).hexdigest()
        path = cache / (key + '.json')
        result = None
        if path.exists():
            try:
                result = json.loads(path.read_text())
            except json.JSONDecodeError:
                result = None
            if result and 'CERTIFICATE_VERIFY_FAILED' in result.get('error', '') and not result.get('certificate_retry_attempted'):
                result = None
        if result is None:
            result = {'url': url, 'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'GymoryEquipmentResearch/1.0 (public product catalog verification)'})
                with urllib.request.urlopen(req, context=ctx, timeout=25) as response:
                    body = response.read(12_000_000)
                    result.update(status=response.status, final_url=response.url,
                                  sha256=hashlib.sha256(body).hexdigest(), body=body.decode('utf-8', errors='replace'))
            except Exception as exc:
                result['error'] = str(exc)
                result['certificate_retry_attempted'] = True
            with tempfile.NamedTemporaryFile('w', dir=cache, suffix='.tmp', delete=False) as temporary:
                json.dump(result, temporary, ensure_ascii=False)
                temporary_path = Path(temporary.name)
            temporary_path.replace(path)
        attempts.append({k: v for k, v in result.items() if k != 'body'})
        return result

    rows = {}
    for path in sorted((ROOT / 'data/equipments/247-fitness-hk').glob('*.json')):
        for e in json.loads(path.read_text())['equipment']:
            entry = rows.setdefault(e['inventory_id'], {
                'inventory_id': e['inventory_id'], 'brand': e['brand'], 'source_name': e['name'],
                'source_names': e['names'], 'source_model': e['model'],
                'source_image_url': e['cover_image_url'], 'branch_slugs': [],
            })
            if path.stem not in entry['branch_slugs']:
                entry['branch_slugs'].append(path.stem)
    products = {b: [] for b in {e['brand'] for e in rows.values()}}
    evidence_path = ROOT / args.evidence_file
    supplemental = json.loads(evidence_path.read_text()) if evidence_path.exists() else {}

    def shop(base):
        found = []
        for page in range(1, 9):
            url = base + '/products.json?limit=250&page=' + str(page)
            result = fetch(url)
            try:
                batch = json.loads(result.get('body', '')).get('products', [])
            except (ValueError, AttributeError):
                break
            for p in batch:
                found.append({'name': plain(p['title']), 'url': base + '/products/' + p['handle'],
                              'image_url': next((i['src'] for i in p.get('images', []) if i.get('src')), None),
                              'models': [v['sku'] for v in p.get('variants', []) if v.get('sku')],
                              'text': plain(p.get('body_html', '')), 'evidence_url': url,
                              'evidence_sha256': result['sha256'], 'retrieved_at': result['retrieved_at']})
            if len(batch) < 250:
                break
        print(base, len(found), 'catalog products', flush=True)
        return base, found

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for base, found in pool.map(shop, sorted(set(CATALOGS.values()))):
            for b, domain in CATALOGS.items():
                if domain == base:
                    products[b].extend(found)

    def sitemap(url, depth=0):
        result = fetch(url)
        try:
            tree = ET.fromstring(result.get('body', ''))
        except ET.ParseError:
            return []
        locs = [e.text for e in tree.iter() if e.tag.endswith('}loc') and e.text]
        if tree.tag.endswith('sitemapindex') and depth < 2:
            children = [u for u in locs if not any(x in u for x in ['post-sitemap', 'category-sitemap', 'author', 'tag-sitemap'])]
            return [v for child in children[:15] for v in sitemap(child, depth + 1)]
        return locs

    def crawl_brand(item):
        brand, seed = item
        urls = sitemap(seed)
        inventory = [e for e in rows.values() if e['brand'] == brand]
        chosen = []
        for url in urls:
            if '?' in url or any(x in url for x in ['/blog/', '/news/', '/case-stud', '/wp-content/']):
                continue
            slug = urllib.parse.unquote(urllib.parse.urlparse(url).path)
            if brand == 'PANATTA' and not slug.startswith('/en/'):
                continue
            if any((len(norm(e['source_model'])) >= 4 and norm(e['source_model']) in norm(slug)) or
                   (len(tokens(e['source_name']) & tokens(slug)) >= max(2, len(tokens(e['source_name'])) * .65))
                   for e in inventory):
                chosen.append(url)
        print(brand, len(urls), 'sitemap URLs;', len(chosen), 'relevant pages', flush=True)
        return brand, sorted(set(chosen))[:350]

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        selected = list(pool.map(crawl_brand, SITEMAPS.items()))
    tasks = [(b, u) for b, urls in selected for u in urls]
    tasks.extend((p['brand'], p['url']) for p in supplemental.get('product_pages', []))
    tasks = sorted(set(tasks))

    def read_product(item):
        brand, url = item
        r = fetch(url)
        if not r.get('body'):
            return brand, None
        p = Page(r['body'])
        name = plain(' '.join(dict.fromkeys(h.strip() for h in p.headings if h.strip()))) or plain(p.meta.get('og:title', ''))
        if not name:
            return brand, None
        image = p.meta.get('og:image', '')
        if image and any(x in image.lower() for x in ['logo', 'favicon']):
            image = ''
        if '/www.precor.com/' in image:
            image = ''  # Precor currently emits a malformed OpenGraph URL.
        if not image:
            code = urllib.parse.urlparse(url).path.rstrip('/').split('/')[-1]
            image = next((src for src, alt in p.images if
                          len(tokens(name) & tokens(alt)) >= 2 or
                          (brand in ('PRECOR', 'GLUTE BUILDER') and len(code) >= 5 and norm(code) in norm(alt or '')) or
                          (brand == 'Arsenal' and any(x in src for x in ['/2026%20Product%20Updates/', '/Hero%20Images/']))), '')
        return brand, {'name': name, 'url': url,
                       'image_url': url_encode(urllib.parse.urljoin(url, image)) if image else None,
                       'models': [], 'language': p.language, 'text': plain(' '.join(p.texts)), 'evidence_url': url,
                       'specification_names': extract_specification_model_names(r['body']),
                       'evidence_sha256': r['sha256'], 'retrieved_at': r['retrieved_at']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for brand, p in pool.map(read_product, tasks):
            if p:
                products[brand].append(p)
                products[brand].extend(specification_products(p))

    def match(e):
        model = e['source_model'].strip()
        # A leading inventory annotation is not part of a manufacturer model.
        model = re.sub(r'^\d+\s+(?=NT-)', '', model)
        e['lookup_model'] = model
        exact, candidates = [], []
        for p in products[e['brand']]:
            # Preserve hyphens: XTTM3C-101 (sled) and XTTM3-C-101
            # (console accessory) must never collapse to the same model.
            sku_match = len(norm(model)) >= 4 and any(model_key(model, e['brand']) == model_key(s, e['brand']) for s in p['models'])
            pattern = r'(?<![A-Za-z0-9-])' + re.escape(model) + r'(?![A-Za-z0-9-])'
            title_match = len(norm(model)) >= 4 and bool(re.search(pattern, p['name'], re.I))
            text_match = len(norm(model)) >= 5 and bool(re.search(pattern, p['text'], re.I))
            a, b = tokens(e['source_name']), tokens(p['name'])
            score = len(a & b) / max(len(a | b), 1)
            # A full-page mention can describe recommended products, kits or
            # accessories. Require a relevant product heading as well.
            text_match = text_match and score >= .2
            if e['brand'] in ('SportArt', 'Concept 2'):
                # Their page footer contains model names of recommended products.
                text_match = False
            if sku_match or title_match or text_match:
                direct_sku = any(re.sub(r'\s+', '', model).casefold() == re.sub(r'\s+', '', s).casefold() for s in p['models'])
                exact.append((p, ('exact_sku' if direct_sku else 'manufacturer_sku_alias') if sku_match else 'exact_model_in_product_title' if title_match else 'exact_model_in_product_text'))
            if len(a & b) >= 2 and score >= .4:
                candidates.append((score, p))
        # Multiple variants/product pages can share a model: retain ambiguity.
        exact = list({(p['url'], p.get('component_model')): (p, method) for p, method in exact}.values())
        if exact:
            priority = {'exact_sku': 0, 'manufacturer_sku_alias': 0, 'exact_model_in_product_title': 1, 'exact_model_in_product_text': 2}
            best = min(priority[method] for _, method in exact)
            exact = [(p, method) for p, method in exact if priority[method] == best]
            english = [(p, method) for p, method in exact if p.get('language', 'en').lower().startswith('en')]
            if english:
                exact = english
            # Localized URLs and the manufacturer's shop can describe the same
            # exact model. Collapse identical product names, not different kits.
            def product_key(p):
                name = re.sub(r'^(?:Life Fitness|Hammer Strength)\s+', '', p['name'], flags=re.I)
                return norm(name)
            def locale_priority(item):
                url = item[0]['url'].lower()
                return (0 if '/en-hk/' in url else 1 if '/en-us/' in url else 2 if '/en-gb/' in url else 3, url)
            by_name = {}
            for p, method in sorted(exact, key=locale_priority):
                by_name.setdefault(product_key(p), (p, method))
            exact = list(by_name.values())
        e.update(official_name=None, official_name_zh=None, official_product_url=None, official_image_url=None,
                 status='unresolved', match_method=None, evidence=None, candidates=[])
        if len(exact) == 1:
            p, method = exact[0]
            e.update(official_name=p['name'], official_product_url=p['url'], official_image_url=p['image_url'],
                     status='model_verified' if p['image_url'] else 'model_verified_image_missing',
                     match_method=method, evidence={k: p[k] for k in ['evidence_url', 'evidence_sha256', 'retrieved_at']})
            e['evidence']['manufacturer_skus'] = p['models']
            e['reason'] = 'Manufacturer catalog contains the exact model. Image is manufacturer-provided; appearance has not been visually compared with the branch photo.'
        else:
            chosen = [(1, p) for p, _ in exact] if exact else sorted(candidates, key=lambda x: -x[0])[:3]
            e['candidates'] = [{'name': p['name'], 'product_url': p['url'], 'image_url': p['image_url'],
                                'score': round(score, 3), 'evidence_url': p['evidence_url']} for score, p in chosen]
            e['status'] = 'ambiguous_model' if exact else 'candidate_requires_review' if chosen else 'unresolved'
            e['reason'] = ('Multiple official products contain this model.' if exact else
                           'Name similarity only; exact model or generation is not verified.' if chosen else
                           'No exact match in accessible official catalog; this does not establish that no official product exists.')
        if not model or model == '-':
            e['source_model_missing'] = True
        index = next((p for p in supplemental.get('indexed_models', []) if
                      p['brand'] == e['brand'] and p['model'] == model), None)
        if index and e['status'] in ('unresolved', 'candidate_requires_review'):
            e.update(official_name=index['name'], official_product_url=None,
                     status='name_indexed_image_missing', match_method='exact_model_in_indexed_manufacturer_catalog',
                     evidence={'evidence_url': index['url'], 'retrieved_at': index['retrieved_at'],
                               'retrieval_method': 'web_search_index'},
                     reason='Exact model and name appear in the search index of the manufacturer catalog. Direct page access was blocked; no official image was verified.')
        e['search_evidence'] = next((s for s in supplemental.get('searches', []) if s['inventory_id'] == e['inventory_id']), None)
        if e['search_evidence'] and not e['status'].startswith('model_verified'):
            search = e['search_evidence']
            hits = search.get('official_domain_results', []) + search.get('name_search', {}).get('official_domain_results', [])
            seen = {c['product_url'] for c in e['candidates']}
            more = []
            for hit in hits:
                a, b = tokens(e['source_name']), tokens(hit['title'])
                score = len(a & b) / max(len(a | b), 1)
                if len(a & b) >= 2 and score >= .35 and hit['url'] not in seen:
                    more.append({'name': hit['title'], 'product_url': hit['url'], 'image_url': None,
                                 'score': round(score, 3), 'evidence_url': hit['url'],
                                 'retrieval_method': 'web_search_index'})
                    seen.add(hit['url'])
            e['candidates'].extend(sorted(more, key=lambda c: -c['score'])[:3])
            if e['status'] == 'unresolved' and e['candidates']:
                e.update(status='candidate_requires_review', reason='Official search-index candidate only; exact model or generation is not verified.')
        return e

    entries = [match(e) for e in sorted(rows.values(), key=lambda e: (e['brand'], e['inventory_id']))]
    if args.check_images:
        def check_image(url):
            key = hashlib.sha256(('image:' + url).encode()).hexdigest()
            path = cache / ('image-' + key + '.json')
            if path.exists():
                return url, json.loads(path.read_text())
            check = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'GymoryEquipmentResearch/1.0', 'Range': 'bytes=0-1023'})
                with urllib.request.urlopen(req, context=ctx, timeout=20) as response:
                    check.update(http_status=response.status, content_type=response.headers.get('Content-Type', ''),
                                 final_url=response.url)
                    check['available'] = check['content_type'].split(';')[0].startswith('image/') and bool(response.read(1024))
            except Exception as exc:
                check.update(available=False, error=str(exc))
            path.write_text(json.dumps(check))
            return url, check
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            image_checks = dict(pool.map(check_image, sorted({e['official_image_url'] for e in entries if e['official_image_url']})))
        for e in entries:
            e['image_check'] = image_checks.get(e['official_image_url'])
            if e['official_image_url'] and not e['image_check']['available']:
                e['status'] = 'model_verified_image_unavailable'
    from collections import Counter
    result = {'schema_version': 1, 'research_date': '2026-10-28',
              'scope': 'All unique inventory_id values in data/equipments/247-fitness-hk/*.json',
              'image_policy': 'Official image URLs only in official_image_url. Existing 24/7 images are retained separately. No permission to republish images is inferred.',
              'summary': dict(Counter(e['status'] for e in entries)),
              'catalog_product_counts': {b: len(v) for b, v in sorted(products.items())},
              'source_attempts': sorted({a['url']: a for a in attempts}.values(), key=lambda a: a['url']),
              'equipment': entries}
    apply_browser_evidence(result, supplemental)
    output = ROOT / args.output
    if output.exists():
        preserve_official_chinese_names(result, json.loads(output.read_text()))
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (cache / 'parsed-products.json').write_text(json.dumps(products, ensure_ascii=False))
    print(json.dumps(result['summary']), flush=True)
    write_reports(result)


def name_coverage_by_brand(entries):
    """Count recorded names separately from unconfirmed English candidates."""
    rows = []
    for brand in sorted({entry['brand'] for entry in entries}):
        group = [entry for entry in entries if entry['brand'] == brand]
        present = lambda entry, field: isinstance(entry.get(field), str) and bool(entry[field].strip())
        english = sum(present(entry, 'official_name') for entry in group)
        chinese = sum(present(entry, 'official_name_zh') for entry in group)
        candidates = sum(not present(entry, 'official_name') and any(
            re.search(r'[A-Za-z]', candidate.get('name', '')) for candidate in entry.get('candidates', []))
            for entry in group)
        rows.append({'brand': brand, 'total': len(group), 'english_names': english,
                     'english_missing': len(group) - english, 'chinese_names': chinese,
                     'chinese_missing': len(group) - chinese, 'english_candidates_only': candidates})
    return rows


def write_reports(result):
    """Always publish matching Markdown and Excel reports from the same tables."""
    from collections import Counter
    entries = result['equipment']
    manual_counts = Counter(e['brand'] for e in entries if e.get('manual_review'))
    products = result['catalog_product_counts']
    report = ROOT / 'docs/data/247-fitness-hk-official-equipment-research-2026-10-28.md'
    def cell(value):
        return str(value or '—').replace('|', '\\|').replace('\n', ' ')
    def link(label, url):
        return f'[{label}]({url})' if url else '—'
    lines = ['# 24/7 Fitness HK official equipment research', '',
             'Initial research date: 2026-10-28 (Hong Kong).' +
             (f" Latest all-brand follow-up: {result['last_review_date']} (Hong Kong)." if result.get('last_review_date') else '') +
             ' All 159 branch JSON files are preserved.', '',
             f'The cross-reference covers all {len(entries)} unique inventory IDs. It records manufacturer names and image URLs separately from the original 24/7 data. No database changes or image substitutions were made.', '',
             '## Interpretation', '',
             '- `model_verified`: a manufacturer SKU, product title/URL, relevant product description or directly viewed catalog card matches the source model. Image checks use HTTP image content types or a successfully decoded image in the browser.',
             '- `model_verified_image_missing` / `model_verified_image_unavailable`: model evidence exists, but a verified image is missing, unavailable or not matched to the source model. An official candidate image URL may be recorded with its unresolved scope in Review note.',
             '- `name_indexed_image_missing`: exact model/name found in the search index of the manufacturer catalog; direct access and official image remain unverified.',
             '- `candidate_requires_review`: an official candidate exists, but model, generation or configuration is not established. Recorded official names, product links or images can describe that candidate; their presence does not verify the inventory match.',
             '- `ambiguous_model`: multiple different official products or bundles refer to the source model.',
             '- `unresolved`: no usable match found in this pass; this does not mean the product has no official source.', '',
             'Images are manufacturer catalog images, not visual confirmation of the physical machine installed in a branch. Colors, upholstery, console configuration and revisions may differ. Image URLs are supplied as research references; no local photo library was downloaded.', '',
             *(['User-confirmed manual reviews: ' + ', '.join(f'{brand}: {count}' for brand, count in sorted(manual_counts.items())) + '. These records use model_verified based on explicit user approval, with the approved names, URLs and previous candidates retained in manual review evidence.', ''] if manual_counts else []),
             '## Totals', '', '| Status | Count |', '| --- | ---: |']
    lines.extend(f'| {status} | {count} |' for status, count in sorted(result['summary'].items()))
    lines += ['', '## Coverage by brand', '', '| Brand | Total | Model + image | Model, image missing/unavailable | Indexed name only | Candidates / ambiguous | Unresolved | Official Chinese names |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    for brand in sorted(products):
        group = [e for e in entries if e['brand'] == brand]
        c = Counter(e['status'] for e in group)
        lines.append(f"| {cell(brand)} | {len(group)} | {c['model_verified']} | {c['model_verified_image_missing'] + c['model_verified_image_unavailable']} | {c['name_indexed_image_missing']} | {c['candidate_requires_review'] + c['ambiguous_model']} | {c['unresolved']} | {sum(bool(e.get('official_name_zh')) for e in group)} |")
    coverage = name_coverage_by_brand(entries)
    lines += ['', '## Name coverage by brand', '',
              f"Across {len(entries)} inventory IDs: {sum(r['english_missing'] for r in coverage)} official English name fields and {sum(r['chinese_missing'] for r in coverage)} Chinese-locale name fields are blank. Counts use `official_name` and `official_name_zh`, independently of verification status and image availability. Recorded names may describe a candidate; check status and evidence scope for inventory identity. Captured names are not substituted. English candidates only counts blank English fields with a named candidate. Chinese-locale names include trademarks the manufacturer leaves unchanged, such as SYNRGY360. Missing does not mean that no official name exists.", '',
              '| Brand | Total | Official English names | English names missing | Chinese names recorded | Chinese names missing | English candidates only |',
              '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for row in coverage:
        lines.append('| ' + ' | '.join([cell(row['brand'])] + [str(row[k]) for k in (
            'total', 'english_names', 'english_missing', 'chinese_names', 'chinese_missing', 'english_candidates_only')]) + ' |')
    if result.get('browser_followup'):
        followup = result['browser_followup']
        lines += ['', '## Browser follow-up', '',
                  f"On {followup['review_date']} (Hong Kong), {followup['browser']} displayed all {followup['catalog_page_count']} official {followup['brand']} catalog pages ({followup['catalog_card_count']} product cards) after direct HTTP requests returned 403. Exact standalone model cards and successfully decoded product images verified {followup['matched_model_count']} of the 176 source models.", '',
                  'Combined-machine cards were excluded from standalone matches. The following source models were not found as exact standalone matches in the current catalog: ' + ', '.join(f'`{model}`' for model in followup['unmatched_models']) + '.', '',
                  'The candidate page for `1SC034A` displays `1SC034`; these remain distinct. The official catalog identifies `1HP233` as Power tower, while the original 24/7 name is Military bench; the original inventory is preserved for review.']
    if result.get('brand_reviews'):
        reviews = result['brand_reviews']
        lines += ['', '## All-brand follow-up', '',
                  f"On {result['last_review_date']} (Hong Kong), all {sum(r['inventory_count'] for r in reviews)} inventory IDs across the other {len(reviews)} brands were reprocessed using fresh HTTP catalog, product-page and image requests. Where HTTP could not supply usable catalog/product content, Chrome was used to inspect the official website. Browser pages were also used to resolve ambiguous catalog matches. The previous PANATTA browser evidence is retained.", '',
                  'A successful website visit is not an exact equipment match. Configuration suffixes and console options remain unverified unless supported by the manufacturer. Exact base models can establish a base-model match without confirming a longer source SKU; generic or missing models require separate evidence. The subsequent Life Fitness item review records those distinctions individually. Browser image URLs are the actual decoded images, including manufacturer-selected CDNs.', '',
                  '| Brand | Inventory IDs | HTTP catalog products | Browser pages | Review result |',
                  '| --- | ---: | ---: | ---: | --- |']
        for review in reviews:
            lines.append('| ' + ' | '.join([cell(review['brand']), str(review['inventory_count']),
                                           str(products.get(review['brand'], 0)), str(len(review['browser_pages'])),
                                           cell(review['notes'])]) + ' |')
    if result.get('lifefitness_review'):
        group = [e for e in entries if e['brand'] == 'Life Fitness']
        counts = Counter(e['status'] for e in group)
        lines += ['', '## Life Fitness item review', '',
                  f"Initial individual review: {result['lifefitness_review']['review_date']} (Hong Kong), covering all {len(group)} Life Fitness inventory IDs using their equipment name and conservatively normalized model. Official product pages, support articles and manufacturer-linked manuals were inspected; Chrome supplied content where direct HTTP failed. Current results after follow-ups: {counts['model_verified']} model + image, {counts['model_verified_image_missing']} model confirmed without a verified product image, {counts['candidate_requires_review']} candidates and {counts['unresolved']} unresolved.", '',
                  'Recognized LP/SP Full and OP-series -FS annotations are separated from the base model. A verified base model does not verify those configuration annotations. Source codes, names and 24/7 images are preserved. Manual-only components are not assigned whole-system photos. Configuration notes describe console, generation and source-name discrepancies.', '',
                  ]
        if result['lifefitness_review'].get('candidate_followup'):
            followup = result['lifefitness_review']['candidate_followup']
            lines += [f"Candidate follow-up on {followup['review_date']}: all {followup['inventory_count']} prior candidates rechecked. {followup['model_verified_count']} now have verified product identity and manufacturer images; {followup['model_verified_image_missing_count']} has an exact manufacturer model but no verified image; {followup['candidate_requires_review_count']} remained candidates at that stage because source configuration text conflicts with its shared SE4 photo. Product-image comparisons do not certify branch installation, full SKU prefixes or production revisions. Per-item evidence: `lifefitness_candidate_followup` and `lifefitness_item_reviews` in the evidence JSON.", '']
        manual = [e for e in group if e.get('manual_review')]
        if manual:
            lines += [f"User manual review applied for Inventory IDs {', '.join(str(e['inventory_id']) for e in manual)}: Status is `model_verified`, based on the user's `Manual Review Comment` in the Reviewing workbook and explicit instruction to apply it. These decisions override earlier automated candidate outcomes. Original console/photo discrepancies and reviewed source/image references remain in `manual_equipment_reviews` in the evidence JSON; these are user decisions, not new manufacturer SKU evidence.", '']
        lines += ['Per-equipment Match scope and Review note are included in Full inventory cross-reference.', '']
    if result.get('official_chinese_name_followup'):
        names = [e for e in entries if e.get('official_name_zh')]
        converted = sum(e.get('official_name_zh_evidence', {}).get('conversion_method') == 'OpenCC cn-to-hk' for e in names)
        lines += ['', '## Official Chinese name evidence', '',
                  f"Chinese-name follow-up: {result['official_chinese_name_followup']['review_date']}. The review covers {len(entries)} inventory records across {len({e['brand'] for e in entries})} brands: {len(names)} manufacturer Chinese names recorded, including {converted} names converted to Traditional Chinese with OpenCC (cn-to-hk). {len(entries) - len(names)} names remain unverified; a blank does not establish that no official Chinese name exists.", '',
                  'Original manufacturer wording is included in Full inventory cross-reference; Chinese source links remain in the catalog and evidence JSON. Only character conversion is applied; English names are not translated. Candidate names describe the candidate product and do not establish an inventory match or upgrade its status. A new Chinese source can establish an exact source-model name independently of the existing English match; this does not replace the English product/candidate, image or status. Base-model Chinese names do not verify console, full-shroud, prefix or generation variants. Manufacturer pages with conflicting product names, mismatched model generations, generic navigation labels or automatic support-article translations are excluded. Per-inventory review outcomes and checked URLs are retained in the evidence JSON under `official_chinese_name_reviews`.', '']
        if result['official_chinese_name_followup'].get('name_search_followup'):
            search = result['official_chinese_name_followup']['name_search_followup']
            lines += [f"Name-based follow-up on {search['review_date']}: all {search['inventory_count']} previously blank records were searched independently of their stored URLs ({search['unique_name_queries']} unique equipment-name groups, {search['search_query_count']} queries across general name and manufacturer-domain Chinese searches). Official shop/catalog identity review, normal-browser pages and model-specific Chinese manufacturer PDFs supplied {search['new_name_count']} additional names. Search queries and official result links are retained in the evidence JSON under `official_chinese_name_search_followup`. Search results are leads, not automatic matches.", '']
        if result['official_chinese_name_followup'].get('specification_followup'):
            review = result['official_chinese_name_followup']['specification_followup']
            lines += [f"Life Fitness specification/body follow-up on {review['review_date']}: {review['new_name_count']} additional Chinese names recorded from exact-model specification rows, parallel-language component cards backed by manufacturer manuals, and product body wording. At that stage, {review['remaining_unverified_count']} of {review['inventory_count']} Life Fitness Chinese names remained unconfirmed. Current counts are in Name coverage by brand. Component wording does not verify a whole-system image. Full audit: `lifefitness_specification_name_followup` in the evidence JSON.", '']
        lines += ['Original manufacturer wording, Source locale, Conversion and Chinese name scope are included in Full inventory cross-reference. Chinese source URLs remain in the catalog and evidence JSON.', '']
    lines += ['', '## Known discrepancies requiring care', '',
              '- Life Fitness inventory IDs 130 and 155: the official manual identifies SS-GLD as Glute Bridge; ID 130 source name says Seated Leg Press. The current SS-GLB photo and Chinese name are recorded as product-family references. SS-GLD/SS-GLB equivalence and exact image match remain unverified.',
              '- NEWTECH `NT-OH-SLC`: the source says Leg Extension; the manufacturer identifies OnHim Seated Leg Curl.',
              '- NEWTECH `NT-T-SDCP`: the source says Seated Incline Chest Press; the manufacturer catalog identifies Torture Chest & Decline Combo.',
              '- A model mention in a kit description does not prove the kit image depicts the standalone component. Such ambiguity is retained.',
              '- Missing models, generic brand-only entries (such as InBody) and custom 24/7 racks cannot be assigned an exact manufacturer image from their names alone.', '',
              '## Full inventory cross-reference', '',
              'Official Chinese name (`official_name_zh`) is populated only when manufacturer-provided Chinese wording is recorded in the catalog. Missing values are shown as —; captured Chinese names and manual translations are not substituted.', '',
              '| # | Inventory ID | Brand | Source model | Source name | Official name | Official Chinese name | Status | Official source | Official image | 24/7 image | First candidate | Match scope | Review note | Original manufacturer wording | Source locale | Conversion | Chinese name scope |',
              '| ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for row_number, e in enumerate(entries, start=1):
        source = e['official_product_url'] or (e['evidence'] or {}).get('evidence_url')
        candidate = e['candidates'][0] if e['candidates'] else None
        chinese_evidence = e.get('official_name_zh_evidence') or {}
        lines.append('| ' + ' | '.join([str(row_number), str(e['inventory_id']), cell(e['brand']), cell(e['source_model']), cell(e['source_name']),
                                      cell(e['official_name']), cell(e.get('official_name_zh')), e['status'], link('source', source),
                                      link('image', e['official_image_url']),
                                      link('image', e['source_image_url']),
                                      link(cell(candidate['name']), candidate['product_url']) if candidate else '—',
                                      cell(e.get('match_scope')), cell(e.get('configuration_note')),
                                      cell(chinese_evidence.get('original_name')), cell(chinese_evidence.get('source_locale')),
                                      cell(chinese_evidence.get('conversion_method')), cell(chinese_evidence.get('match_scope'))]) + ' |')
    lines += ['', '## Reproduce and continue', '',
              '```bash', 'python3 scripts/equipments/research-official-equipment.py --check-images', 'pnpm test', '```', '',
              'Every report generation also writes the matching `.xlsx` beside this Markdown file. Each Markdown table has its own Excel sheet, with image/source hyperlinks and filterable headers. To regenerate both reports from the existing catalog without fetching websites, run `python3 scripts/equipments/research-official-equipment.py --report-only`.', '',
              'When HTTP requests cannot read an official site, inspect it in a normal browser. Captured exact-model cards and decoded-image evidence are stored in `247-fitness-hk-official-evidence.json` under `browser_models`. Apply those records to the existing catalog with `python3 scripts/equipments/research-official-equipment.py --apply-browser-evidence`. Full research runs also reapply these records after HTTP image checks.', '',
              'Excel export uses Node.js and `@oai/artifact-tool` from the Codex runtime. The runtime is detected automatically; for another installation, set `ARTIFACT_TOOL_NODE_MODULES` to its `node_modules` directory and optionally `ARTIFACT_TOOL_NODE` to its Node executable. Export failures cause the command to fail instead of silently skipping Excel.', '',
              'The public catalogs and product pages are cached under `/tmp/gymory-official-equipment/cache` by default. Use `--cache-dir` to select a different cache or a fresh directory. Network access is required for uncached URLs. Python uses the system certificate store and adds certifi certificates when that optional package is installed.', '',
              'The evidence sidecar retains search queries, official-domain search results and supplemental product URLs. Earlier batch search results are leads, not match confirmations. The Life Fitness follow-up stores one individual search and review per inventory ID under `lifefitness_item_reviews`; full research and `--apply-browser-evidence` reapply those reviews after other evidence. The catalog includes retrieval timestamps, source hashes, exact matching methods and branch slugs. Original branch files remain the source of truth.']
    runtime_node = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
    node = os.environ.get('ARTIFACT_TOOL_NODE') or (str(runtime_node) if runtime_node.is_file() else shutil.which('node'))
    if not node:
        raise RuntimeError('Excel export requires Node.js. Install Node.js or set ARTIFACT_TOOL_NODE.')
    # Publish only after both formats have been generated successfully.
    with tempfile.TemporaryDirectory(prefix='.equipment-report-', dir=report.parent) as staging:
        staged_report = Path(staging) / report.name
        staged_report.write_text('\n'.join(lines) + '\n')
        subprocess.run([node, str(ROOT / 'scripts/equipments/export-equipment-research-excel.mjs'), str(staged_report)], check=True)
        staged_report.with_suffix('.xlsx').replace(report.with_suffix('.xlsx'))
        staged_report.replace(report)


if __name__ == '__main__':
    main()
