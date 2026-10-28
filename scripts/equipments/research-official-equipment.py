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
from pathlib import Path
import re
import ssl
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


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', value or ''))).strip()


def norm(value):
    return re.sub('[^a-z0-9]', '', value.lower())


def model_key(value, brand):
    value = re.sub(r'\s+', '', value).casefold()
    # These brands publish both ILSP / IL-SP and LBRDB / LBR-DB forms.
    # Keep letter/digit separators, notably XTTM3C-101 vs XTTM3-C-101.
    if brand in ('HAMMER STRENGTH', 'Life Fitness'):
        value = re.sub(r'(?<=[a-z])-(?=[a-z])', '', value)
    return value


def url_encode(value):
    return urllib.parse.quote(value, safe=":/?&=%#@+;,~!$'()*[]")


def tokens(value):
    return set(re.findall('[a-z0-9]+', (value or '').lower())) - {'machine', 'fitness', 'series', 'the', 'and'}


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
    args = ap.parse_args()
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
                       'evidence_sha256': r['sha256'], 'retrieved_at': r['retrieved_at']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for brand, p in pool.map(read_product, tasks):
            if p:
                products[brand].append(p)

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
        exact = list({p['url']: (p, method) for p, method in exact}.values())
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
        e.update(official_name=None, official_product_url=None, official_image_url=None,
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
    output = ROOT / args.output
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (cache / 'parsed-products.json').write_text(json.dumps(products, ensure_ascii=False))
    print(json.dumps(result['summary']), flush=True)
    report = ROOT / 'docs/data/247-fitness-hk-official-equipment-research-2026-10-28.md'
    def cell(value):
        return str(value or '—').replace('|', '\\|').replace('\n', ' ')
    def link(label, url):
        return f'[{label}]({url})' if url else '—'
    lines = ['# 24/7 Fitness HK official equipment research', '',
             'Research date: 2026-10-28 (Hong Kong). All 159 branch JSON files are preserved.', '',
             f'The cross-reference covers all {len(entries)} unique inventory IDs. It records manufacturer names and image URLs separately from the original 24/7 data. No database changes or image substitutions were made.', '',
             '## Interpretation', '',
             '- `model_verified`: a manufacturer SKU, product title or relevant product description matches the source model. When image checks are enabled, the image URL returns an image content type.',
             '- `model_verified_image_missing` / `model_verified_image_unavailable`: model evidence exists, but the official image is absent or could not be retrieved.',
             '- `name_indexed_image_missing`: exact model/name found in the search index of the manufacturer catalog; direct access and official image remain unverified.',
             '- `candidate_requires_review`: an official candidate exists, but model, generation or configuration is not established.',
             '- `ambiguous_model`: multiple different official products or bundles refer to the source model.',
             '- `unresolved`: no usable match found in this pass; this does not mean the product has no official source.', '',
             'Images are manufacturer catalog images, not visual confirmation of the physical machine installed in a branch. Colors, upholstery, console configuration and revisions may differ. Image URLs are supplied as research references; no local photo library was downloaded.', '',
             '## Totals', '', '| Status | Count |', '| --- | ---: |']
    lines.extend(f'| {status} | {count} |' for status, count in sorted(result['summary'].items()))
    lines += ['', '## Coverage by brand', '', '| Brand | Total | Model + image | Model, image missing/unavailable | Indexed name only | Candidates / ambiguous | Unresolved |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for brand in sorted(products):
        group = [e for e in entries if e['brand'] == brand]
        c = Counter(e['status'] for e in group)
        lines.append(f"| {cell(brand)} | {len(group)} | {c['model_verified']} | {c['model_verified_image_missing'] + c['model_verified_image_unavailable']} | {c['name_indexed_image_missing']} | {c['candidate_requires_review'] + c['ambiguous_model']} | {c['unresolved']} |")
    lines += ['', '## Known discrepancies requiring care', '',
              '- NEWTECH `NT-OH-SLC`: the source says Leg Extension; the manufacturer identifies OnHim Seated Leg Curl.',
              '- NEWTECH `NT-T-SDCP`: the source says Seated Incline Chest Press; the manufacturer catalog identifies Torture Chest & Decline Combo.',
              '- A model mention in a kit description does not prove the kit image depicts the standalone component. Such ambiguity is retained.',
              '- Missing models, generic brand-only entries (such as InBody) and custom 24/7 racks cannot be assigned an exact manufacturer image from their names alone.', '',
              '## Full inventory cross-reference', '',
              '| Inventory ID | Brand | Source model | Source name | Official name | Status | Official source | Official image | First candidate |',
              '| ---: | --- | --- | --- | --- | --- | --- | --- | --- |']
    for e in entries:
        source = e['official_product_url'] or (e['evidence'] or {}).get('evidence_url')
        candidate = e['candidates'][0] if e['candidates'] else None
        lines.append('| ' + ' | '.join([str(e['inventory_id']), cell(e['brand']), cell(e['source_model']), cell(e['source_name']),
                                      cell(e['official_name']), e['status'], link('source', source),
                                      link('image', e['official_image_url']),
                                      link(cell(candidate['name']), candidate['product_url']) if candidate else '—']) + ' |')
    lines += ['', '## Reproduce and continue', '',
              '```bash', 'python3 scripts/equipments/research-official-equipment.py --check-images', 'pnpm test', '```', '',
              'The public catalogs and product pages are cached under `/tmp/gymory-official-equipment/cache` by default. Use `--cache-dir` to select a different cache or a fresh directory. Network access is required for uncached URLs. Python uses the system certificate store and adds certifi certificates when that optional package is installed.', '',
              'The evidence sidecar retains search queries, official-domain search results and supplemental product URLs. Search results are collected in batches; candidates in those batches are leads, not individual match confirmations. The catalog includes retrieval timestamps, source hashes, exact matching methods and branch slugs. Original branch files remain the source of truth.']
    report.write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
