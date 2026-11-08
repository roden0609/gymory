"""Regression checks for importing browser evidence without weakening matches."""
import copy
import json
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('research', Path(__file__).with_name('research-official-equipment.py'))
research = importlib.util.module_from_spec(spec)
spec.loader.exec_module(research)


class BrowserEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.entry = {
            'brand': 'PANATTA', 'source_model': '1FO086', 'source_name': 'LEG PRESS 45°',
            'source_image_url': 'https://oss-hk.247fitness.hk/original.jpg',
            'status': 'name_indexed_image_missing', 'official_image_url': None,
        }
        self.record = {
            'brand': 'PANATTA', 'model': '1FO086', 'name': 'Leg press 45°',
            'product_url': 'https://www.panattasport.com/en/freeweight-one/leg-press-45/',
            'image_url': 'https://www.panattasport.com/wp-content/uploads/leg-press.webp',
            'evidence_url': 'https://www.panattasport.com/en/catalog/page/4/',
            'retrieved_at': '2026-10-29T04:00:00Z', 'retrieval_method': 'browser_dom',
            'displayed_models': ['1FO086'], 'image_loaded': True, 'image_width': 450,
        }

    def apply(self, record=None, entries=None):
        result = {'equipment': entries or [copy.deepcopy(self.entry)]}
        research.apply_browser_evidence(result, {'browser_models': [record or self.record]})
        return result

    def test_exact_browser_match_preserves_original_inventory(self):
        result = self.apply()
        entry = result['equipment'][0]
        self.assertEqual(entry['status'], 'model_verified')
        self.assertEqual(entry['official_image_url'], self.record['image_url'])
        self.assertEqual(entry['image_check']['method'], 'browser_image_decoded')
        for key in ('source_model', 'source_name', 'source_image_url'):
            self.assertEqual(entry[key], self.entry[key])
        self.assertEqual(result['summary'], {'model_verified': 1})

    def test_different_suffix_and_brand_do_not_match(self):
        suffix = {**self.entry, 'source_model': '1FO086A'}
        brand = {**self.entry, 'brand': 'NEWTECH'}
        result = self.apply(entries=[suffix, brand])
        self.assertEqual(result['equipment'], [suffix, brand])

    def test_combined_model_cards_and_undecoded_images_are_not_promoted(self):
        for changes in ({'displayed_models': ['1FO086', '1FO080']}, {'image_loaded': False}, {'image_width': 0}):
            with self.subTest(changes=changes):
                result = self.apply(record={**self.record, **changes})
                self.assertEqual(result['equipment'][0], self.entry)

    def test_non_manufacturer_urls_are_rejected(self):
        for key in ('product_url', 'image_url', 'evidence_url'):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.apply(record={**self.record, key: 'https://example.org/unverified'})

    def test_two_products_with_the_same_model_are_rejected(self):
        with self.assertRaises(ValueError):
            research.apply_browser_evidence({'equipment': [self.entry]}, {'browser_models': [
                self.record, {**self.record, 'product_url': 'https://www.panattasport.com/en/other-product/'},
            ]})

    def test_http_failure_does_not_override_decoded_browser_evidence(self):
        result = self.apply(entries=[{**self.entry, 'status': 'model_verified_image_unavailable',
                                     'image_check': {'available': False, 'error': 'HTTP Error 403'}}])
        self.assertTrue(result['equipment'][0]['image_check']['available'])
        again = copy.deepcopy(result)
        research.apply_browser_evidence(result, {'browser_models': [self.record]})
        self.assertEqual(result, again)

    def test_browser_catalog_coverage_is_not_left_at_the_http_zero(self):
        result = {'equipment': [copy.deepcopy(self.entry)], 'catalog_product_counts': {'PANATTA': 0}}
        research.apply_browser_evidence(result, {'browser_models': [self.record], 'browser_followup': {
            'brand': 'PANATTA', 'catalog_card_count': 643,
        }})
        self.assertEqual(result['catalog_product_counts']['PANATTA'], 643)

    def test_manufacturer_subdomain_image_is_accepted(self):
        result = self.apply(record={**self.record, 'image_url': 'https://media.panattasport.com/product.webp'})
        self.assertEqual(result['equipment'][0]['status'], 'model_verified')

    def test_shared_cdn_requires_observed_manufacturer_account(self):
        record = {**self.record, 'brand': 'FREEMOTION', 'model': 'G624',
                  'displayed_models': ['G624'],
                  'product_url': 'https://www.freemotionfitness.com/strength-machine/dual-cable-cross/',
                  'evidence_url': 'https://www.freemotionfitness.com/strength-machine/dual-cable-cross/',
                  'image_url': 'https://images.contentstack.io/v3/assets/blt57f09fe1af8ef70f/product/G624.png'}
        entry = {**self.entry, 'brand': 'FREEMOTION', 'source_model': 'G624'}
        with self.assertRaises(ValueError):
            self.apply(record=record, entries=[entry])
        record['image_observed_on'] = record['evidence_url']
        self.assertEqual(self.apply(record=record, entries=[copy.deepcopy(entry)])['equipment'][0]['status'], 'model_verified')
        record['image_url'] = 'https://images.contentstack.io/v3/assets/another-account/product/G624.png'
        with self.assertRaises(ValueError):
            self.apply(record=record, entries=[entry])

    def test_missing_source_model_cannot_be_promoted(self):
        for model in ('', '-'):
            record = {**self.record, 'model': model, 'displayed_models': [model]}
            entry = {**self.entry, 'source_model': model}
            self.assertEqual(self.apply(record=record, entries=[entry])['equipment'][0]['status'], entry['status'])

    def test_browser_candidate_does_not_promote_full_configuration(self):
        entry = {**self.entry, 'inventory_id': 10, 'status': 'unresolved', 'candidates': []}
        candidate = {**self.record, 'inventory_id': 10, 'source_model': entry['source_model'],
                     'reason': 'Base model only; full configuration is unverified.'}
        result = {'equipment': [entry]}
        research.apply_browser_evidence(result, {'browser_candidates': [candidate]})
        self.assertEqual(entry['status'], 'candidate_requires_review')
        self.assertIsNone(entry['official_image_url'])
        self.assertEqual(entry['candidates'][0]['image_url'], candidate['image_url'])
        again = copy.deepcopy(result)
        research.apply_browser_evidence(result, {'browser_candidates': [candidate]})
        self.assertEqual(result, again)
        candidate['source_model'] += 'A'
        research.apply_browser_evidence(result, {'browser_candidates': [candidate]})
        self.assertEqual(result, again)

    def test_browser_candidate_never_replaces_verified_match(self):
        entry = {**self.entry, 'inventory_id': 10, 'status': 'model_verified'}
        candidate = {**self.record, 'inventory_id': 10, 'source_model': entry['source_model'], 'reason': 'Name only.'}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.apply_browser_evidence(result, {'browser_candidates': [candidate]})
        self.assertEqual(result['equipment'], [entry])


class OfficialChineseNameTests(unittest.TestCase):
    def test_shop_name_can_use_catalog_chinese_without_replacing_the_shop_identity(self):
        shop = 'https://shop-eu.lifefitness.com/ch/axiom-series-dual-seated-leg-extension-curl-ph-opslce'
        entry = {'inventory_id': 1376, 'brand': 'Life Fitness', 'source_model': 'PH-OPSLCE',
                 'official_product_url': shop, 'official_name': 'Axiom Series Dual Seated Leg Extension/Curl',
                 'official_image_url': 'https://shop-eu.lifefitness.com/media/original.jpg',
                 'status': 'model_verified', 'candidates': []}
        record = {**{k: entry[k] for k in ('inventory_id', 'brand', 'source_model')},
                  'product_url': shop,
                  'evidence_url': 'https://www.lifefitness.com/zh-hk/catalog/strength-training/selectorized/axiom-series-seated-leg-curl-extension',
                  'official_name_zh': 'Axiom 系列坐式屈腿訓練器/伸展機',
                  'original_name': 'Axiom 系列坐式屈腿訓練器/伸展機',
                  'retrieved_at': '2026-11-03', 'retrieval_method': 'http_product_h1_after_name_search',
                  'manufacturer_model_codes': ['OP-SLCE'], 'match_scope': 'base_model_name_only',
                  'identity_evidence': {'note': 'Chinese base-model name does not verify the PH prefix.'}}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.apply_official_chinese_names(result, {'official_chinese_names': [record]})
        actual = result['equipment'][0]
        for key, value in entry.items():
            self.assertEqual(actual[key], value)
        self.assertEqual(actual['official_name_zh'], record['official_name_zh'])
        self.assertEqual(actual['official_name_zh_evidence']['identity_evidence'], record['identity_evidence'])

    def test_new_chinese_source_requires_its_own_exact_model_evidence(self):
        entry = {'inventory_id': 1302, 'brand': 'MATRIX', 'source_model': 'C-ES-LED',
                 'official_product_url': None, 'official_name_zh': None, 'status': 'unresolved', 'candidates': []}
        record = {**{k: entry[k] for k in ('inventory_id', 'brand', 'source_model')},
                  'product_url': 'https://tw.matrixfitness.com/zht/cardio/endurance/climbmill/led',
                  'evidence_url': 'https://tw.matrixfitness.com/zht/cardio/endurance/climbmill/led',
                  'official_name_zh': 'Endurance 爬梯機附 LED 儀表', 'retrieved_at': '2026-11-03',
                  'retrieval_method': 'browser_dom', 'manufacturer_model_codes': ['C-ES-LED'],
                  'match_scope': 'exact_source_model_chinese_name_only'}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.apply_official_chinese_names(result, {'official_chinese_names': [record]})
        self.assertEqual(result['equipment'][0]['official_name_zh'], record['official_name_zh'])
        self.assertEqual(result['equipment'][0]['status'], 'unresolved')
        self.assertIsNone(result['equipment'][0]['official_product_url'])
        for change in ({'manufacturer_model_codes': ['C-ES-PLED']}, {'manufacturer_model_codes': ['R-ES-LED']},
                       {'manufacturer_model_codes': []}, {'match_scope': 'base_model_name_only'}):
            with self.subTest(change=change):
                result = {'equipment': [copy.deepcopy(entry)]}
                research.apply_official_chinese_names(result, {'official_chinese_names': [{**record, **change}]})
                self.assertEqual(result['equipment'][0], entry)

    def test_name_search_audit_covers_every_previously_blank_inventory(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        followup = evidence['official_chinese_name_search_followup']
        groups = followup['search_groups']
        self.assertEqual(sum(len(g['queries']) for g in groups), followup['summary']['search_query_count'])
        searched = {i for g in groups for q in g['queries'] for i in q['inventory_ids']}
        self.assertEqual(len(searched), followup['summary']['inventory_count'])
        self.assertEqual(len(followup['new_inventory_ids']), followup['summary']['new_name_count'])
        self.assertIn(1376, followup['new_inventory_ids'])
        for review in evidence['official_chinese_name_reviews']:
            if review['inventory_id'] in searched:
                self.assertEqual(len(review['name_search']['queries']), 2)

    def test_simplified_original_and_conversion_evidence_are_retained(self):
        url = 'https://shop.lifefitness.com/products/hammer-strength-select-biceps-curl'
        entry = {'inventory_id': 3, 'brand': 'HAMMER STRENGTH', 'source_model': 'HS-BC',
                 'official_product_url': url, 'status': 'model_verified', 'candidates': []}
        record = {'inventory_id': 3, 'brand': 'HAMMER STRENGTH', 'source_model': 'HS-BC',
                  'product_url': url, 'evidence_url': 'https://www.lifefitness.com/zh-cn/catalog/biceps-curl',
                  'official_name_zh': '二頭肌訓練器', 'original_name': '二头肌训练器',
                  'source_locale': 'zh-Hans', 'conversion_method': 'OpenCC cn-to-hk',
                  'retrieved_at': '2026-11-03', 'retrieval_method': 'http_product_h1'}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.apply_official_chinese_names(result, {'official_chinese_names': [record]})
        actual = result['equipment'][0]
        self.assertEqual(actual['official_name_zh_evidence']['original_name'], '二头肌训练器')
        self.assertEqual(actual['official_name_zh_evidence']['conversion_method'], 'OpenCC cn-to-hk')
        self.assertEqual(actual['status'], entry['status'])
        again = copy.deepcopy(result)
        research.apply_official_chinese_names(result, {'official_chinese_names': [record]})
        self.assertEqual(result, again)
        for change in ({'original_name': ''}, {'conversion_method': 'manual_translation'}, {'official_name_zh': 'Biceps Curl'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_official_chinese_names({'equipment': [entry.copy()]},
                                                      {'official_chinese_names': [{**record, **change}]})

    def test_research_has_a_unique_review_for_every_inventory_and_traceable_names(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['official_chinese_name_reviews']
        self.assertEqual(len(reviews), len(catalog['equipment']))
        self.assertEqual({r['inventory_id'] for r in reviews}, {e['inventory_id'] for e in catalog['equipment']})
        names = evidence['official_chinese_names']
        self.assertEqual(len(names), len({r['inventory_id'] for r in names}))
        for record in names:
            research.validate_browser_urls(record)
            self.assertTrue(record['original_name'])
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == record['inventory_id'])
            self.assertEqual(entry['official_name_zh'], record['official_name_zh'])
            self.assertEqual(entry['official_name_zh_evidence']['original_name'], record['original_name'])
        # These localized pages name a different SKU or generation.
        for inventory_id in (45, 79, 91, 92, 1422):
            self.assertIsNone(next(e for e in catalog['equipment'] if e['inventory_id'] == inventory_id)['official_name_zh'])

    def test_candidate_translation_does_not_promote_the_inventory_match(self):
        url = 'https://www.lifefitness.com/en-us/catalog/signature-series-multi-jungle-mj4'
        entry = {'inventory_id': 1472, 'brand': 'Life Fitness', 'source_model': '4合1MJ',
                 'official_product_url': None, 'status': 'candidate_requires_review',
                 'candidates': [{'product_url': url, 'name': 'Signature Series Multi-Jungle MJ4'}]}
        record = {'inventory_id': 1472, 'brand': 'Life Fitness', 'source_model': '4合1MJ',
                  'product_url': url, 'evidence_url': url.replace('/en-us/', '/zh-hk/'),
                  'official_name_zh': 'SIGNATURE 系列 MJ4 多功能訓練架', 'retrieved_at': '2026-11-03', 'retrieval_method': 'browser_dom'}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.apply_official_chinese_names(result, {'official_chinese_names': [record]})
        self.assertEqual(result['equipment'][0]['official_name_zh'], record['official_name_zh'])
        self.assertEqual(result['equipment'][0]['status'], 'candidate_requires_review')
        stale = {'equipment': [{**entry, 'source_model': 'MJ8'}]}
        research.apply_official_chinese_names(stale, {'official_chinese_names': [record]})
        self.assertNotIn('official_name_zh', stale['equipment'][0])

    def test_retains_recorded_names_only_for_the_same_official_identity(self):
        entry = {'inventory_id': 107, 'brand': 'Life Fitness', 'source_model': 'SS-BC',
                 'official_name': 'Insignia Series Biceps Curl', 'official_product_url': 'https://www.lifefitness.com/biceps',
                 'source_names': {'zh-HK': '來源名稱'}}
        previous = {'equipment': [{**entry, 'official_name_zh': '官方二頭肌訓練器'}]}
        result = {'equipment': [copy.deepcopy(entry)]}
        research.preserve_official_chinese_names(result, previous)
        self.assertEqual(result['equipment'][0]['official_name_zh'], '官方二頭肌訓練器')
        for change in ({'source_model': 'SS-BCD'}, {'official_product_url': 'https://www.lifefitness.com/other'}):
            result = {'equipment': [{**entry, **change}]}
            research.preserve_official_chinese_names(result, previous)
            self.assertIsNone(result['equipment'][0]['official_name_zh'])
        result = {'equipment': [{**entry, 'official_name_zh': '新官方名稱'}]}
        research.preserve_official_chinese_names(result, previous)
        self.assertEqual(result['equipment'][0]['official_name_zh'], '新官方名稱')


class LifeFitnessReviewTests(unittest.TestCase):
    def setUp(self):
        self.entry = {'inventory_id': 107, 'brand': 'Life Fitness', 'source_model': 'SS-BC（LP）Full',
                      'source_name': 'Biceps Curl', 'source_image_url': 'https://oss-hk.247fitness.hk/107.jpg'}
        self.review = {'inventory_id': 107, 'source_model': self.entry['source_model'],
                       'query': 'Life Fitness Biceps Curl SS-BC site:lifefitness.com',
                       'outcome': 'model_confirmed', 'official_model': 'SS-BC',
                       'official_name': 'Insignia Series Biceps Curl', 'match_scope': 'base_model',
                       'configuration_status': 'unverified', 'configuration_note': 'LP Full not independently verified.',
                       'model_evidence': 'Product Code SS-BC',
                       'official_product_url': 'https://www.lifefitness.com/en-hk/catalog/insignia-series-biceps-curl',
                       'evidence_url': 'https://www.lifefitness.com/en-hk/catalog/insignia-series-biceps-curl',
                       'official_image_url': 'https://www.lifefitness.com/SS-BC.png',
                       'image_check': {'url': 'https://www.lifefitness.com/SS-BC.png', 'available': True}}

    def apply(self, review=None, entries=None):
        result = {'equipment': copy.deepcopy(entries or [self.entry])}
        research.apply_lifefitness_reviews(result, {'lifefitness_item_reviews': [review or self.review]})
        return result

    def test_conservative_annotation_normalization(self):
        for source, expected in [(' SS-BC（LP）Full', 'SS-BC'), ('SS-BCD(SP)Full', 'SS-BCD'),
                                 ('OP-FLY-FS', 'OP-FLY'), ('LBR-FS', 'LBR-FS'),
                                 ('SS-FS', 'SS-FS'), ('MJSCOR22510592', 'MJSCOR22510592')]:
            self.assertEqual(research.lifefitness_lookup_model(source), expected)

    def test_confirmed_base_preserves_source_and_configuration_uncertainty(self):
        other = {'inventory_id': 9, 'brand': 'PANATTA', 'status': 'unresolved'}
        result = self.apply(entries=[self.entry, other]); entry = result['equipment'][0]
        self.assertEqual(entry['status'], 'model_verified')
        self.assertEqual(entry['official_model'], 'SS-BC')
        self.assertEqual(entry['configuration_status'], 'unverified')
        for key, value in self.entry.items():
            self.assertEqual(entry[key], value)
        self.assertEqual(result['equipment'][1], other)
        before = copy.deepcopy(result)
        research.apply_lifefitness_reviews(result, {'lifefitness_item_reviews': [self.review]})
        self.assertEqual(before, result)

    def test_wrong_model_or_stale_source_rejected(self):
        for change in ({'official_model': 'SS-BCD'}, {'source_model': 'SS-BCD（LP）Full'}, {'inventory_id': 999}):
            with self.assertRaises(ValueError):
                self.apply({**self.review, **change})

    def test_missing_photo_does_not_substitute_system_image(self):
        entry = self.apply({**self.review, 'official_image_url': None, 'image_check': None})['equipment'][0]
        self.assertEqual(entry['status'], 'model_verified_image_missing')
        self.assertIsNone(entry['official_image_url'])

    def test_image_check_must_correspond_to_the_selected_photo(self):
        with self.assertRaises(ValueError):
            self.apply({**self.review, 'image_check': {'url': 'https://www.lifefitness.com/other.png', 'available': True}})

    def test_cdn_requires_official_observed_context(self):
        review = {**self.review, 'official_image_url': 'https://production-gvckb4eyhna3g6c7.a03.azurefd.net/SS-BC.webp'}
        review['image_check'] = {'url': review['official_image_url'], 'available': True}
        with self.assertRaises(ValueError):
            self.apply(review)
        review.update(image_evidence_url=self.review['evidence_url'], image_observed_on=self.review['evidence_url'])
        self.assertEqual(self.apply(review)['equipment'][0]['status'], 'model_verified')
        review.update(image_evidence_url='https://example.com/product', image_observed_on='https://example.com/product')
        with self.assertRaises(ValueError):
            self.apply(review)


class SpecificationNameTests(unittest.TestCase):
    def test_user_assault_bike_correction_supersedes_the_wrong_runner_candidate(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        entry = next(e for e in catalog['equipment'] if e['inventory_id'] == 1492)
        review = next(r for r in evidence['user_product_corrections'] if r['inventory_id'] == 1492)
        self.assertEqual(entry['official_name'], 'AssaultBike Classic')
        self.assertEqual(entry['status'], 'model_verified')
        self.assertEqual(entry['official_product_url'], 'https://www.assaultfitness.com/bikes/assault-bike-classic/')
        self.assertEqual(entry['official_image_url'], review['official_image_url'])
        self.assertTrue(entry['image_check']['available'])
        self.assertEqual(entry['source_model'], 'ASSAULT AIRBIKE CLASSIC')
        self.assertIn('AssaultRunner', entry['manual_review']['official_name'])
        self.assertEqual(entry['manual_review_followup']['evidence_key'], 'user_product_corrections')
        for change in ({'source_heading': 'AssaultRunner Classic'}, {'source_model': 'OTHER'},
                       {'user_correction': {}}, {'image_observed_on': 'https://unrelated.example/product'}):
            with self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'user_product_corrections': [{**review, **change}]})

    def test_matrix_exact_console_pages_supersede_cpo_references_without_erasing_manual_history(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['matrix_product_reviews']
        self.assertEqual({r['inventory_id'] for r in reviews}, set(range(1302, 1313)))
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['official_model'], entry['source_model'])
            self.assertEqual(entry['official_name'], review['official_name'])
            self.assertEqual(entry['official_image_url'], review['hero_image_observed_href'])
            self.assertTrue(entry['image_check']['available'])
            self.assertTrue(entry['official_name_zh'])
            self.assertEqual(entry['official_name_zh_evidence']['product_url'], entry['official_product_url'])
            self.assertEqual(review['visual_review']['captured_console'], 'Touch')
            self.assertIn('not the actual console installed', review['visual_review']['observations'])
            if entry.get('manual_review'):
                self.assertIsNone(entry['manual_review']['official_image_url'])
                self.assertEqual(entry['manual_review_followup']['evidence_key'], 'matrix_product_reviews')
        led = next(r for r in reviews if r['inventory_id'] == 1306)
        pled = next(r for r in reviews if r['inventory_id'] == 1309)
        self.assertTrue(led['official_product_url'].endswith('/stepper/led'))
        self.assertTrue(pled['official_product_url'].endswith('/stepper/premium-led'))
        self.assertNotEqual(led['official_image_url'], pled['official_image_url'])
        entry = copy.deepcopy(next(e for e in catalog['equipment'] if e['inventory_id'] == 1306))
        for change in ({'manufacturer_model_codes': ['S-ES-PLED']}, {'catalog_console': 'Premium LED'},
                       {'official_image_url': pled['official_image_url']},
                       {'image_observed_on': 'https://unrelated.example/product'}):
            with self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [entry]}, {'matrix_product_reviews': [{**led, **change}]})

    def test_active_distributor_references_fill_gaps_without_verifying_identity(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        records = evidence['active_china_enrichment']
        self.assertEqual(len(records), 30)
        self.assertEqual(sum(bool(r.get('chinese_name')) for r in records), 29)
        self.assertEqual(sum(bool(r.get('english_name')) for r in records), 4)
        for record in records:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == record['inventory_id'])
            self.assertEqual(entry['distributor_enrichment']['source_type'], 'distributor')
            if record.get('chinese_name'):
                self.assertEqual(entry['official_name_zh'], record['chinese_name'])
                self.assertIn('distributor', entry['official_name_zh_evidence']['match_scope'])
                self.assertEqual(entry['official_name_zh_evidence']['original_name'], record['original_name'])
            if record.get('image_url'):
                self.assertEqual(entry['official_image_url'], record['image_url'])
                self.assertFalse(entry['image_check']['available'])
                self.assertEqual(entry['status'], 'unresolved')
        record = next(r for r in records if r['inventory_id'] == 170)
        entry = copy.deepcopy(next(e for e in catalog['equipment'] if e['inventory_id'] == 170))
        entry.update(official_name='Manufacturer name', official_name_zh='廠商名稱', official_image_url='https://example.com/manufacturer.png')
        research.apply_distributor_enrichment({'equipment': [entry]}, {'active_china_enrichment': [record]})
        self.assertEqual((entry['official_name'], entry['official_name_zh'], entry['official_image_url']),
                         ('Manufacturer name', '廠商名稱', 'https://example.com/manufacturer.png'))
        for change in ({'source_model': 'OTHER'}, {'evidence_url': 'https://unrelated.example/product'},
                       {'image_observed_on': 'https://www.active.cn/other'}):
            with self.assertRaises(ValueError):
                research.apply_distributor_enrichment({'equipment': [entry]}, {'active_china_enrichment': [{**record, **change}]})

    def test_unresolved_hammer_followup_matches_codes_without_erasing_configuration_conflicts(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['manufacturer_product_reviews']
        self.assertEqual({r['inventory_id'] for r in reviews}, {46, 65, 67, 68, 69, 89, 158, 1368, 1485, 1486})
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], entry.get('manual_review', review)['status'])
            self.assertTrue(entry['official_name'])
            self.assertEqual(entry['official_product_url'], review['official_product_url'])
            self.assertEqual(entry['source_model'], review['source_model'])
        byid = {e['inventory_id']: e for e in catalog['equipment']}
        self.assertEqual(byid[46]['status'], 'model_verified')
        self.assertEqual(byid[46]['official_model'], 'PL-GRIP')
        self.assertEqual(byid[68]['status'], 'model_verified_image_missing')
        self.assertEqual(byid[68]['image_verification_status'], 'candidate_requires_review')
        self.assertIsNone(byid[65]['official_image_url'])
        self.assertEqual(byid[1368]['status'], 'model_verified')
        self.assertEqual(byid[1368]['manual_review']['previous_status'], 'candidate_requires_review')
        self.assertEqual(next(r for r in reviews if r['inventory_id'] == 1368)['status'], 'candidate_requires_review')
        self.assertEqual(byid[1485]['brand'], 'HAMMER STRENGTH')
        self.assertIn('Life Fitness', byid[1485]['configuration_note'])
        review = next(r for r in reviews if r['inventory_id'] == 46)
        for change in ({'manufacturer_model_codes': ['PL-OTHER']}, {'source_model': 'OTHER'},
                       {'image_check': {'url': review['official_image_url'], 'available': False}}):
            with self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [copy.deepcopy(byid[46])]},
                    {'manufacturer_product_reviews': [{**review, **change}]})

    def test_hammer_manual_decisions_promote_only_the_approved_first_candidate(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['brand'] == 'HAMMER STRENGTH']
        self.assertEqual(len(reviews), 23)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['official_name'], review['approved_candidate']['name'])
            self.assertEqual(entry['official_product_url'], review['approved_candidate']['product_url'])
            self.assertEqual(entry['official_image_url'], review['approved_candidate']['image_url'])
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
        review = reviews[0]
        stale = copy.deepcopy(next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id']))
        stale.update(official_name=None, official_product_url=None, official_image_url=None,
                     candidates=[{**review['approved_candidate'], 'name': 'Changed candidate'}])
        with self.assertRaises(ValueError):
            research.apply_manual_equipment_reviews({'equipment': [stale]}, {'manual_equipment_reviews': [review]})

    def test_nautilus_user_approved_first_candidates(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['brand'] == 'NAUTILUS']
        self.assertEqual(len(reviews), 31)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], review['approved_candidate'][candidate_field])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
        self.assertFalse(any(e['brand'] == 'NAUTILUS' and e['status'] == 'candidate_requires_review' for e in catalog['equipment']))

    def test_newtech_user_approved_first_candidates(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['brand'] == 'NEWTECH']
        self.assertEqual(len(reviews), 20)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], review['approved_candidate'][candidate_field])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
        self.assertFalse(any(e['brand'] == 'NEWTECH' and e['status'] == 'candidate_requires_review' for e in catalog['equipment']))

    def test_technogym_user_approved_first_candidates(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['brand'] == 'TechnoGym']
        self.assertEqual(len(reviews), 20)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], review['approved_candidate'][candidate_field])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
        approved_ids = {r['inventory_id'] for r in reviews}
        self.assertFalse(any(e['status'] == 'candidate_requires_review' for e in catalog['equipment']
                             if e['inventory_id'] in approved_ids))

    def test_arsenal_user_approved_first_candidates(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['brand'] == 'Arsenal']
        self.assertEqual(len(reviews), 16)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            current = next((r for r in evidence.get('user_product_corrections', []) if r['inventory_id'] == review['inventory_id']), review)
            self.assertEqual(entry['status'], entry.get('manual_image_review', current)['status'])
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], current[field])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
        self.assertFalse(any(e['brand'] == 'Arsenal' and e['status'] == 'candidate_requires_review' for e in catalog['equipment']))

    def test_arsenal_user_product_corrections_preserve_configuration_and_history(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['user_product_corrections'] if r['brand'] == 'Arsenal']
        self.assertEqual({r['inventory_id'] for r in reviews}, {1190, 1198, 1199, 1208, 1294})
        for review in reviews:
            entry = next(x for x in catalog['equipment'] if x['inventory_id'] == review['inventory_id'])
            self.assertEqual(entry['status'], 'model_verified')
            for field in ('official_name', 'official_product_url', 'official_image_url', 'source_model', 'source_image_url'):
                self.assertEqual(entry[field], review[field])
            self.assertTrue(review['image_check']['available'])
            self.assertEqual(review['hero_image_observed_href'], entry['official_image_url'])
            if review['inventory_id'] in (1190, 1198, 1199):
                self.assertEqual(entry['manual_review_followup']['evidence_key'], 'user_product_corrections')
                self.assertEqual(entry['manual_review']['official_name'], review['previous_reference']['official_name'])
            else:
                self.assertNotIn('manual_review', entry)
        entries = {x['inventory_id']: x for x in catalog['equipment']}
        self.assertEqual(entries[1198]['official_name'], 'RELOADED ISO FLAT PRESS')
        self.assertEqual(entries[1199]['official_name'], 'RELOADED ISO INCLINE PRESS')
        self.assertNotEqual(entries[1198]['official_image_url'], entries[1199]['official_image_url'])
        basic = next(r for r in reviews if r['inventory_id'] == 1208)
        self.assertEqual(basic['identity_evidence']['configuration'], 'eight stations')

    def test_all_remaining_candidates_use_explicit_user_approved_snapshots(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['review_source'].get('scope') == 'all_remaining_candidates']
        self.assertEqual(len(reviews), 58)
        self.assertEqual(sum(not r['official_image_url'] for r in reviews), 11)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            current = next((r for r in [*evidence.get('user_product_corrections', []), *evidence.get('booty_builder_product_reviews', []), *evidence.get('cybex_product_reviews', [])] if r['inventory_id'] == review['inventory_id']), review)
            self.assertEqual(entry['status'], entry.get('manual_image_review', current)['status'])
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            self.assertEqual(entry['manual_review'], review)
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], current[field])
        approved_ids = {r['inventory_id'] for r in reviews}
        self.assertFalse(any(e['status'] == 'candidate_requires_review' for e in catalog['equipment']
                             if e['inventory_id'] in approved_ids))

    def test_ambiguous_models_use_user_approved_first_candidates(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = [r for r in evidence['manual_equipment_reviews'] if r['review_source'].get('scope') == 'all_remaining_ambiguous']
        self.assertEqual({r['inventory_id'] for r in reviews}, {792, 1303, 1305, 1306, 1308, 1311, 1312, 1104, 1275})
        self.assertEqual(sum(not r['official_image_url'] for r in reviews), 6)
        for review in reviews:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == review['inventory_id'])
            current = next((r for r in evidence.get('matrix_product_reviews', []) if r['inventory_id'] == review['inventory_id']), review)
            self.assertEqual(entry['status'], entry.get('manual_image_review', current)['status'])
            self.assertEqual(review['previous_status'], 'ambiguous_model')
            self.assertEqual(review['previous_candidates'][0], review['approved_candidate'])
            for field, candidate_field in [('official_name', 'name'), ('official_product_url', 'product_url'), ('official_image_url', 'image_url')]:
                self.assertEqual(entry[field], current[field])
        self.assertFalse(any(e['status'] == 'ambiguous_model' for e in catalog['equipment']))

    def test_glute_bridge_reference_image_does_not_verify_a_different_model_code(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        for inventory_id in (130, 155):
            entry = copy.deepcopy(next(e for e in catalog['equipment'] if e['inventory_id'] == inventory_id))
            review = next(r for r in evidence['lifefitness_item_reviews'] if r['inventory_id'] == inventory_id)
            research.apply_lifefitness_reviews({'equipment': [entry]}, {'lifefitness_item_reviews': [review]})
            self.assertEqual(entry['official_model'], 'SS-GLD')
            self.assertEqual(entry['status'], 'model_verified_image_missing')
            self.assertEqual(entry['image_verification_status'], 'candidate_requires_review')
            self.assertTrue(entry['image_check']['available'])
            self.assertEqual(entry['candidates'][0]['image_url'], entry['official_image_url'])
            self.assertEqual(entry['evidence']['identity_evidence']['catalog_model'], 'SS-GLB')
            self.assertEqual(entry['official_name_zh'], 'Insignia臀橋訓練機')
            research.apply_manual_equipment_reviews({'equipment': [entry]}, {'manual_equipment_reviews': [r for r in evidence['manual_equipment_reviews'] if r['inventory_id'] == inventory_id]})
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
            self.assertEqual(entry['official_model'], 'SS-GLD')
        self.assertEqual(next(e for e in catalog['equipment'] if e['inventory_id'] == 130)['source_name'], 'Seated Leg Press')

    def test_booty_builder_followup_covers_all_inventory_and_corrects_variants(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        entries = {x['inventory_id']: x for x in catalog['equipment'] if x['brand'] == 'BOOTY BUILDER'}
        audit = evidence['booty_builder_product_followup']
        self.assertEqual({r['inventory_id'] for r in audit['reviews']}, set(entries))
        self.assertEqual(len(entries), 16)
        expected = {749: 'Booty Builder Split Squat Stand', 752: 'Booty Builder Standing Hip Adduction',
                    754: 'Booty Builder Dual Hip Thrust', 756: 'Booty Builder Platinum V4',
                    757: 'Booty Builder V Squat', 758: 'Booty Builder Selectorized Standing Hip Thrust',
                    759: 'Booty Builder Selectorized Standing Abductor',
                    760: 'Booty Builder Selectorized Standing Hip Adduction', 761: 'Booty Builder V8',
                    765: 'Booty Builder Selectorized Kick Back'}
        self.assertEqual(set(audit['changed_inventory_ids']), set(expected))
        for id, name in expected.items():
            entry = entries[id]
            self.assertEqual(entry['official_name'], name)
            self.assertTrue(entry['official_image_url'])
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['manual_image_review']['reviewed_by'], 'user')
            self.assertEqual(entry['manual_image_review']['previous_status'], 'model_verified_image_missing')
            self.assertFalse(entry['image_check']['available'])
            self.assertEqual(entry['image_check']['content_type'], 'text/html')
            self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
            self.assertIsNone(entry['official_model'])
            if entry.get('manual_review'):
                self.assertEqual(entry['manual_review_followup']['evidence_key'], 'booty_builder_product_reviews')
        for id in (750, 751, 753, 755, 762, 764):
            self.assertEqual(entries[id]['status'], 'model_verified')
        self.assertNotEqual(entries[750]['official_product_url'], entries[758]['official_product_url'])
        self.assertNotEqual(entries[751]['official_product_url'], entries[759]['official_product_url'])
        self.assertNotEqual(entries[752]['official_product_url'], entries[760]['official_product_url'])
        self.assertNotEqual(entries[756]['official_image_url'], entries[761]['official_image_url'])
        self.assertTrue(all(x['official_name'] and x['official_image_url'] for x in entries.values()))
        self.assertTrue(all(not x.get('official_name_zh') for x in entries.values()))

    def test_booty_builder_image_approval_is_bound_to_reviewed_references(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['booty_builder_image_reviews']
        self.assertEqual({r['inventory_id'] for r in reviews}, {749, 752, 754, 756, 757, 758, 759, 760, 761, 765})
        self.assertTrue(all(x['status'] == 'model_verified' for x in catalog['equipment'] if x['brand'] == 'BOOTY BUILDER'))
        review = reviews[0]
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == review['inventory_id'])
        for field in ('source_model', 'source_image_url', 'official_name', 'official_product_url', 'official_image_url'):
            stale = copy.deepcopy(entry)
            stale[field] = 'changed'
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [stale]}, {'booty_builder_image_reviews': [review]})
        for change in ({'reviewed_by': 'automated'}, {'review_source': {}}, {'status': 'admin_verified'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'booty_builder_image_reviews': [{**review, **change}]})

    def test_booty_builder_followup_rejects_stale_source_and_wrong_resistance(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        review = next(r for r in evidence['booty_builder_product_reviews'] if r['inventory_id'] == 758)
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == 758)
        for change in ({'source_name': 'changed'}, {'source_heading': 'Standing Hip Thrust'},
                       {'identity_evidence': {**review['identity_evidence'], 'manufacturer_resistance_type': 'plate_loaded'}},
                       {'official_image_url': 'https://bootybuilder.com/wp-content/unobserved.jpg'},
                       {'status': 'model_verified'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'booty_builder_product_reviews': [{**review, **change}]})

    def test_cybex_catalog_followup_preserves_identifiers_and_compact_tall_conflict(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['cybex_product_reviews']
        ids = {1347, 1348, 1350, 1351, 1353, 1479, 1480, 1481, 1497, 1498, 1499}
        self.assertEqual({r['inventory_id'] for r in reviews}, ids)
        entries = {x['inventory_id']: x for x in catalog['equipment']}
        for review in reviews:
            entry = entries[review['inventory_id']]
            self.assertEqual(entry['official_name'], review['observed_page_facts']['heading'])
            self.assertEqual(entry['official_image_url'], review['official_image_url'])
            self.assertTrue(entry['image_check']['available'])
            self.assertEqual(entry['source_model'], review['source_model'])
            if review['match_scope'] == 'manufacturer_product_visual_match':
                self.assertEqual(review['manufacturer_model_codes'], [])
                self.assertIsNone(entry['official_model'])
                self.assertFalse(review['identity_evidence']['source_identifier_is_manufacturer_sku'])
        self.assertEqual(entries[1351]['status'], 'model_verified')
        self.assertEqual(entries[1353]['status'], 'model_verified')
        self.assertEqual(entries[1353]['official_model'], '8800')
        self.assertEqual(entries[1353]['candidates'], [])
        self.assertEqual(entries[1353]['manual_image_review']['previous_status'], 'model_verified_image_missing')
        self.assertTrue(entries[1353]['manual_image_review']['previous_candidates'])
        self.assertEqual(entries[1353]['image_verification_status'], 'manually_reviewed')
        self.assertEqual(entries[1353]['source_image_url'], entries[1351]['source_image_url'])
        for id in (1347, 1351):
            self.assertEqual(entries[id]['manual_review_followup']['evidence_key'], 'cybex_product_reviews')
            self.assertIsNone(entries[id]['manual_review']['approved_candidate']['image_url'])
        for id in (1347, 1481, 1499):
            self.assertEqual(entries[id]['official_name_zh'], 'V 系列跑步機')
        for id in (1348, 1480, 1498, 1350, 1479, 1497):
            self.assertIn('manufacturer-published', entries[id]['official_name_zh_evidence']['note'].lower())
            self.assertEqual(entries[id]['official_name_zh_evidence']['conversion_method'], 'none')
        for id in (1351, 1353):
            self.assertIsNone(entries[id]['official_name_zh'])

    def test_cybex_followup_rejects_changed_source_unobserved_images_and_configuration_promotion(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        review = next(r for r in evidence['cybex_product_reviews'] if r['inventory_id'] == 1480)
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == 1480)
        for field in ('source_name', 'source_model', 'source_image_url'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [{**entry, field: 'changed'}]},
                    {'cybex_product_reviews': [review]})
        for change in ({'official_name': 'Wrong product'}, {'official_image_url': 'https://example.org/image.jpg'},
                       {'image_observed_on': 'https://example.org/product'},
                       {'identity_evidence': {**review['identity_evidence'], 'source_identifier_is_manufacturer_sku': True}},
                       {'visual_review': {**review['visual_review'], 'source_image_sha256': 'changed'}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_manufacturer_product_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'cybex_product_reviews': [{**review, **change}]})
        conflict = next(r for r in evidence['cybex_product_reviews'] if r['inventory_id'] == 1353)
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == 1353)
        with self.assertRaises(ValueError):
            research.apply_manufacturer_product_reviews({'equipment': [copy.deepcopy(entry)]},
                {'cybex_product_reviews': [{**conflict, 'status': 'model_verified'}]})

    def test_cybex_image_approval_is_bound_to_current_references(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        approval, = evidence['cybex_image_reviews']
        entry = next(e for e in catalog['equipment'] if e['inventory_id'] == 1353)
        self.assertEqual(entry['manual_image_review'], approval)
        self.assertEqual(approval['review_date'], '2026-11-08')
        for field in ('brand', 'source_model', 'source_image_url', 'official_name', 'official_product_url', 'official_image_url'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [{**entry, field: 'changed'}]},
                    {'cybex_image_reviews': [approval]})
        for change in ({'reviewed_by': 'automated'}, {'review_date': ''}, {'review_source': {}}, {'status': 'admin_verified'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'cybex_image_reviews': [{**approval, **change}]})

    def test_technogym_unresolved_followup_preserves_variant_conflicts_and_blank_identifiers(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['technogym_product_reviews']
        self.assertEqual({r['inventory_id'] for r in reviews}, {1172,1173,1174,1175,1176,1327,1328,1331,1456,1458})
        entries = {x['inventory_id']: x for x in catalog['equipment']}
        for review in reviews:
            entry = entries[review['inventory_id']]
            self.assertEqual(entry['status'], entry.get('manual_image_review', review)['status'])
            self.assertEqual(entry['source_model'], review['source_model'])
            self.assertEqual(entry['source_image_url'], review['source_image_url'])
            if entry['status'] == 'model_verified' and review['inventory_id'] != 1456:
                self.assertTrue(entry['image_check']['available'])
                self.assertEqual(entry['official_name'], review['observed_page_facts']['product_name'])
                self.assertEqual(entry['evidence']['manufacturer_model_codes'], [])
        for id in (1173,1328):
            self.assertEqual(entries[id]['status'], 'model_verified')
            self.assertEqual(entries[id]['candidates'], [])
            self.assertTrue(entries[id]['manual_image_review']['previous_candidates'])
            self.assertEqual(entries[id]['manual_image_review']['reviewed_by'], 'user')
            self.assertTrue(entries[id]['evidence']['identity_evidence']['configuration_conflict'])
        self.assertEqual(entries[1173]['source_model'], 'DF5E')
        self.assertEqual(entries[1173]['official_model'], 'DFH-DGE')
        self.assertEqual(entries[1328]['source_model'], 'MB88EN0')
        self.assertEqual(entries[1328]['official_model'], 'MQ0D')
        self.assertEqual(entries[1331]['source_model'], '')
        self.assertEqual(entries[1331]['official_model'], 'MB91')
        self.assertEqual(entries[1458]['official_model'], 'PA04')
        self.assertEqual(entries[1456]['status'], 'model_verified')
        self.assertIsNone(entries[1456]['official_name'])
        self.assertEqual(entries[1456]['official_image_url'], entries[1456]['evidence']['user_supplied_reference']['image_url'])
        self.assertTrue(entries[1456]['image_check']['available'])
        self.assertEqual(entries[1456]['image_verification_status'], 'manually_reviewed')
        self.assertEqual(entries[1456]['candidates'], [])
        self.assertEqual(entries[1456]['manual_image_review']['previous_status'], 'unresolved')
        self.assertEqual(entries[1456]['manual_image_review']['reviewed_by'], 'user')

    def test_technogym_followup_rejects_stale_captures_unobserved_images_and_conflict_upgrades(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        review = next(r for r in evidence['technogym_product_reviews'] if r['inventory_id'] == 1172)
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == 1172)
        for field in ('brand','source_name','source_model','source_image_url'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_technogym_reviews({'equipment': [{**entry, field: 'changed'}]},
                    {'technogym_product_reviews': [review]})
        for change in ({'official_name': 'Wrong product'}, {'official_image_url': 'https://example.org/image.jpg'},
                       {'user_supplied_reference': {}}, {'evidence_sha256': ''},
                       {'image_check': {**review['image_check'], 'available': False}},
                       {'visual_review': {**review['visual_review'], 'source_image_sha256': 'changed'}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_technogym_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'technogym_product_reviews': [{**review, **change}]})
        for id in (1173,1328):
            conflict = next(r for r in evidence['technogym_product_reviews'] if r['inventory_id'] == id)
            entry = next(x for x in catalog['equipment'] if x['inventory_id'] == id)
            with self.subTest(id=id), self.assertRaises(ValueError):
                research.apply_technogym_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'technogym_product_reviews': [{**conflict, 'status': 'model_verified'}]})
            initial = {'equipment': [copy.deepcopy(entry)]}
            research.apply_technogym_reviews(initial, {'technogym_product_reviews': [conflict]})
            self.assertEqual(initial['equipment'][0]['status'], 'candidate_requires_review')
            approval = next(r for r in evidence['technogym_image_reviews'] if r['inventory_id'] == id)
            research.apply_manual_equipment_reviews(initial, {'technogym_image_reviews': [approval]})
            self.assertEqual(initial['equipment'][0]['status'], 'model_verified')
            for change in ({'official_image_url': 'https://example.org/changed.jpg'}, {'reviewed_by': 'automated'}):
                with self.subTest(id=id, change=change), self.assertRaises(ValueError):
                    research.apply_manual_equipment_reviews(initial, {'technogym_image_reviews': [{**approval, **change}]})

    def test_manual_review_replays_and_rejects_changed_reviewed_data(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reviews = evidence['manual_equipment_reviews']
        self.assertEqual({r['inventory_id'] for r in reviews if r['brand'] == 'Life Fitness'}, {130, 155, 1339, 1369, 1184, 1383, 1392, 1500, 1503})
        result = {'equipment': copy.deepcopy(catalog['equipment'])}
        research.apply_browser_evidence(result, evidence)
        first = copy.deepcopy(result)
        research.apply_browser_evidence(result, evidence)
        self.assertEqual(result, first)
        for review in reviews:
            entry = next(e for e in result['equipment'] if e['inventory_id'] == review['inventory_id'])
            followup = entry.get('manual_review_followup')
            current = next((r for r in evidence.get(followup['evidence_key'], []) if r['inventory_id'] == review['inventory_id']), review) if followup else review
            self.assertEqual(entry['status'], entry.get('manual_image_review', current)['status'])
            self.assertEqual(entry['match_method'], 'manufacturer_product_review' if followup else 'manual_equipment_review')
            self.assertEqual(entry['manual_review']['previous_status'], review['previous_status'])
        for field in ('source_model', 'source_image_url', 'official_image_url'):
            stale = copy.deepcopy(first)
            entry = next(e for e in stale['equipment'] if e['inventory_id'] == 1339)
            entry[field] = 'changed'
            with self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews(stale, evidence)

    def test_candidate_followup_requires_bound_visual_evidence_and_preserves_conflicts(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        entries = {e['inventory_id']: e for e in catalog['equipment']}
        audit = evidence['lifefitness_candidate_followup']['reviews']
        self.assertEqual({r['inventory_id'] for r in audit}, {1153, 1339, 1346, 1369, 1375, 1383, 1470, 1472})
        for row in audit:
            entry = entries[row['inventory_id']]
            self.assertEqual(entry['status'], entry.get('manual_review', {}).get('status', row['result']))
            self.assertTrue(entry['official_name'])
            if entry.get('manual_review'):
                self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
                self.assertEqual(entry['manual_review']['reviewed_by'], 'user')
            elif entry['status'] == 'model_verified':
                self.assertEqual(entry['image_check']['url'], entry['official_image_url'])
                self.assertTrue(entry['image_check']['available'])
                self.assertEqual(entry['evidence']['visual_review']['source_image_url'], entry['source_image_url'])
            elif entry['status'] == 'candidate_requires_review':
                self.assertEqual(entry['image_verification_status'], 'candidate_requires_review')
                self.assertIsNone(entry['image_check'])
        self.assertEqual(entries[1383]['image_verification_status'], 'manually_reviewed')
        self.assertEqual(entries[1383]['user_reference_image']['expected_status'], 'model_verified_image_missing')
        self.assertEqual(entries[1339]['source_image_url'], entries[1369]['source_image_url'])
        review = next(r for r in evidence['lifefitness_item_reviews'] if r['inventory_id'] == 1375)
        entry = copy.deepcopy(entries[1375])
        for visual in ({}, {**review['visual_review'], 'source_image_url': 'https://example.com/stale.png'}):
            with self.assertRaises(ValueError):
                research.apply_lifefitness_reviews({'equipment': [entry]},
                    {'lifefitness_item_reviews': [{**review, 'visual_review': visual}]})

    def test_lifefitness_gap_followup_keeps_models_components_and_generations_distinct(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        entries = {x['inventory_id']: x for x in catalog['equipment']}
        audit = evidence['lifefitness_catalog_gap_followup']
        self.assertEqual(audit['initial_gap_count'], 19)
        self.assertEqual(len(audit['reviews']), 19)
        self.assertEqual(set(audit['image_inventory_ids']), {1393, 1394, 1395, 1396, 1504, 1505, 1510, 1511, 1518})
        self.assertEqual(entries[1392]['official_model'], 'MJLP')
        self.assertEqual(entries[1392]['image_source_type'], 'external_cdn_unattributed')
        self.assertEqual(entries[1392]['status'], 'model_verified')
        self.assertEqual(entries[1392]['evidence']['rejected_references'][0]['manufacturer_model'], 'HS-PD')
        for id in audit['image_review_required_ids']:
            entry = entries[id]
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['manual_image_review']['previous_status'], 'model_verified_image_missing')
            self.assertTrue(entry['image_check']['available'])
            self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
            self.assertEqual(entry['candidates'], [])
            self.assertTrue(entry['manual_image_review']['previous_candidates'])
        for id in (1510, 1511):
            self.assertEqual(entries[id]['status'], 'model_verified')
            self.assertEqual(entries[id]['image_verification_status'], 'manufacturer_image_checked')
            self.assertTrue(entries[id]['image_check']['available'])
        self.assertEqual(entries[1511]['evidence']['identity_evidence']['image_scope'], 'manufacturer_annotated_component_diagram')
        self.assertEqual(entries[1518]['evidence']['identity_evidence']['image_scope'], 'different_generation_component_reference')
        self.assertEqual(entries[1482]['official_name_zh'], 'Heat 划船機')
        self.assertEqual(entries[1510]['official_name_zh'], '核心')
        for id in (1379, 1381, 1384, 1487):
            self.assertIsNone(entries[id].get('official_name_zh'))
        self.assertEqual(entries[1383]['image_verification_status'], 'manually_reviewed')
        self.assertEqual(entries[1383]['user_reference_image']['expected_status'], 'model_verified_image_missing')
        for id in (1184, 1500):
            self.assertEqual(entries[id]['status'], 'model_verified')
            self.assertIsNone(entries[id]['official_name'])
        group = [x for x in entries.values() if x['brand'] == 'Life Fitness']
        self.assertEqual([sum(not x.get(k) for x in group) for k in ('official_name', 'official_name_zh', 'official_image_url')], [2, 7, 0])

    def test_lifefitness_user_image_approvals_preserve_initial_evidence_and_reject_stale_references(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        approvals = evidence['lifefitness_image_reviews']
        self.assertEqual({r['inventory_id'] for r in approvals}, {1393, 1394, 1395, 1396, 1504, 1505, 1518})
        for approval in approvals:
            entry = next(x for x in catalog['equipment'] if x['inventory_id'] == approval['inventory_id'])
            self.assertEqual(entry['manual_image_review'], approval)
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
            self.assertEqual(approval['review_date'], '2026-11-06')
            initial = next(x for x in evidence['lifefitness_item_reviews'] if x['inventory_id'] == approval['inventory_id'])
            initial_result = {'equipment': [copy.deepcopy(entry)]}
            research.apply_lifefitness_reviews(initial_result, {'lifefitness_item_reviews': [initial]})
            self.assertEqual(initial_result['equipment'][0]['status'], 'model_verified_image_missing')
            research.apply_manual_equipment_reviews(initial_result, {'lifefitness_image_reviews': [approval]})
            self.assertEqual(initial_result['equipment'][0]['status'], 'model_verified')
        approval = approvals[0]
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == approval['inventory_id'])
        for field in ('brand', 'source_model', 'source_image_url', 'official_name', 'official_product_url', 'official_image_url'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [{**entry, field: 'changed'}]},
                    {'lifefitness_image_reviews': [approval]})
        for change in ({'reviewed_by': 'automated'}, {'review_date': ''}, {'review_source': {}}, {'status': 'admin_verified'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_manual_equipment_reviews({'equipment': [copy.deepcopy(entry)]},
                    {'lifefitness_image_reviews': [{**approval, **change}]})

    def test_lifefitness_gap_image_review_rejects_changed_capture(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        review = next(x for x in evidence['lifefitness_item_reviews'] if x['inventory_id'] == 1393)
        original = next(x for x in catalog['equipment'] if x['inventory_id'] == 1393)
        for field in ('source_name', 'source_image_url'):
            entry = {**original, field: 'changed'}
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_lifefitness_reviews({'equipment': [entry]}, {'lifefitness_item_reviews': [review]})

    def test_user_reference_images_preserve_status_and_identify_non_manufacturer_sources(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        references = evidence['lifefitness_user_reference_images']
        self.assertEqual({r['inventory_id'] for r in references}, {1184, 1383, 1392, 1500, 1503})
        entries = {x['inventory_id']: copy.deepcopy(x) for x in catalog['equipment']}
        for reference in references:
            entry = entries[reference['inventory_id']]
            self.assertEqual(entry['status'], 'model_verified')
            self.assertEqual(entry['manual_review']['reviewed_by'], 'user')
            entry['status'] = reference['expected_status']
            research.apply_user_reference_images({'equipment': [entry]},
                {'lifefitness_user_reference_images': [reference],
                 'lifefitness_user_reference_followup': evidence['lifefitness_user_reference_followup']})
            self.assertEqual(entry['status'], reference['expected_status'])
            self.assertEqual(entry['official_name'], reference['expected_official_name'])
            self.assertEqual(entry['official_image_url'], reference['image_url'])
            self.assertEqual(entry['image_source_type'], reference['image_source_type'])
            self.assertEqual(entry['image_verification_status'], 'candidate_requires_review')
            self.assertEqual(entry['user_reference_image'], reference)
            self.assertTrue(entry['image_check']['available'])
            self.assertTrue(entry['candidates'])
        self.assertEqual(entries[1184]['image_source_type'], 'user_shared_file')
        self.assertEqual(entries[1392]['image_source_type'], 'external_cdn_unattributed')
        self.assertIn('Rope Pull', entries[1503]['configuration_note'])
        self.assertEqual(entries[1503]['official_model'], 'MJAXO')
        self.assertIn('短款和長款', entries[1383]['official_name_zh'])
        zh = entries[1383]['official_name_zh_evidence']
        self.assertIn('哑铃架', zh['original_name'])
        self.assertEqual(zh['conversion_method'], 'OpenCC cn-to-hk')
        self.assertEqual(zh['match_scope'], 'manufacturer_short_long_family_name')
        for id in (1184, 1500):
            self.assertEqual(entries[id]['status'], 'unresolved')
            self.assertIsNone(entries[id]['official_name'])
        drive = entries[1184]['user_reference_image']
        self.assertEqual(drive['url_resolution'], 'google_drive_download')
        self.assertIn('1E5s-i3r73cU8ytCduO41BongxkHZrk5R', drive['image_url'])
        template = entries[1500]['user_reference_image']
        self.assertEqual(template['image_url'], template['supplied_image_url'].replace('{width}', '960'))

    def test_user_reference_images_reject_stale_source_url_and_unchecked_assets(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        reference = next(r for r in evidence['lifefitness_user_reference_images'] if r['inventory_id'] == 1392)
        entry = next(x for x in catalog['equipment'] if x['inventory_id'] == 1392)
        for field in ('source_model', 'source_image_url', 'official_name', 'official_product_url', 'official_image_url', 'status'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                research.apply_user_reference_images({'equipment': [{**entry, field: 'changed'}]},
                    {'lifefitness_user_reference_images': [reference]})
        for change in ({'image_url': 'https://example.org/unrequested.jpg'},
                       {'supplied_image_url': 'https://example.org/unrequested.jpg'},
                       {'reference_source': 'automated'}, {'image_source_type': 'manufacturer_verified'},
                       {'image_check': {**reference['image_check'], 'available': False}},
                       {'visual_comparison': {**reference['visual_comparison'], 'source_image_url': 'changed'}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                research.apply_user_reference_images({'equipment': [copy.deepcopy(entry)]},
                    {'lifefitness_user_reference_images': [{**reference, **change}]})
        for id in (1392, 1503):
            r = next(r for r in evidence['lifefitness_user_reference_images'] if r['inventory_id'] == id)
            with self.subTest(id=id), self.assertRaises(ValueError):
                research.validate_browser_urls({'brand': 'Life Fitness',
                    'product_url': entry['official_product_url'], 'evidence_url': entry['official_product_url'],
                    'image_url': r['image_url'], 'image_observed_on': entry['official_product_url']})

    def test_component_names_are_read_from_labels_without_system_images(self):
        source = '''<h1>Multi-Jungle MJ8</h1><table>
          <tr><td>MJ Lat Pulldown (MJLP) Weight</td><td>340 lbs</td></tr>
          <tr><td>MJ 高拉背肌訓練器 (MJLP) 重量</td><td>340 磅</td></tr>
          <tr><td>Related models</td><td>Fake Name (MJFAKE)</td></tr></table>
          <p>Another Name (MJOTHER)</p><template><tr><td>Hidden (MJHIDDEN)</td></tr></template>'''
        names = research.extract_specification_model_names(source)
        self.assertEqual([(r['model'], r['name']) for r in names],
                         [('MJLP', 'MJ Lat Pulldown'), ('MJLP', 'MJ 高拉背肌訓練器')])
        products = research.specification_products({'url': 'https://www.lifefitness.com/mj8',
                     'image_url': 'whole-system.jpg', 'specification_names': names})
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]['models'], ['MJLP'])
        self.assertIsNone(products[0]['image_url'])

    def test_lifefitness_followup_preserves_component_identity_and_original_wording(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        followup = evidence['lifefitness_specification_name_followup']
        self.assertEqual(followup['new_name_count'], 16)
        for inventory_id in followup['new_inventory_ids']:
            entry = next(e for e in catalog['equipment'] if e['inventory_id'] == inventory_id)
            self.assertEqual(entry['brand'], 'Life Fitness')
            self.assertTrue(entry['official_name_zh'])
            if entry['source_model'].startswith('MJ'):
                self.assertEqual(entry['official_name_zh_evidence']['manufacturer_model_codes'], [entry['source_model']])
                if inventory_id in (1393, 1394, 1395, 1396, 1504, 1505):
                    self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
                    self.assertEqual(entry['evidence']['identity_evidence']['image_scope'], 'whole_system_context_only')
                    self.assertEqual(entry['status'], 'model_verified')
                elif entry.get('user_reference_image'):
                    self.assertEqual(entry['image_verification_status'], 'manually_reviewed')
                    self.assertEqual(entry['status'], 'model_verified')
                    self.assertEqual(entry['manual_review']['reviewed_by'], 'user')
                else:
                    self.assertIsNone(entry['official_image_url'])
        mixed = next(e for e in catalog['equipment'] if e['inventory_id'] == 1394)
        self.assertIn('训练', mixed['official_name_zh_evidence']['original_name'])
        self.assertIn('訓練', mixed['official_name_zh'])
        life = next(r for r in research.name_coverage_by_brand(catalog['equipment']) if r['brand'] == 'Life Fitness')
        self.assertEqual((life['total'], life['chinese_names'], life['chinese_missing']), (112, 105, 7))

    def test_localized_trademark_and_candidate_image_do_not_verify_configuration(self):
        folder = Path(__file__).resolve().parents[2] / 'data/equipments'
        catalog = json.loads((folder / '247-fitness-hk-official-catalog.json').read_text())
        evidence = json.loads((folder / '247-fitness-hk-official-evidence.json').read_text())
        entry = copy.deepcopy(next(e for e in catalog['equipment'] if e['inventory_id'] == 1153))
        result = {'equipment': [entry]}
        review = {**next(r for r in evidence['lifefitness_item_reviews'] if r['inventory_id'] == 1153),
                  'outcome': 'candidate', 'match_scope': 'family_candidate',
                  'configuration_status': 'unverified', 'record_candidate_official_data': True}
        name = next(r for r in evidence['official_chinese_names'] if r['inventory_id'] == 1153)
        research.apply_lifefitness_reviews(result, {'lifefitness_item_reviews': [review]})
        research.apply_official_chinese_names(result, {'official_chinese_names': [name]})
        self.assertEqual(entry['official_name'], 'SYNRGY360')
        self.assertEqual(entry['official_name_zh'], 'SYNRGY360')
        self.assertEqual(entry['official_image_url'], review['candidate_image_url'])
        self.assertEqual(entry['status'], 'candidate_requires_review')
        self.assertEqual(entry['configuration_status'], 'unverified')
        self.assertEqual(entry['image_verification_status'], 'candidate_requires_review')
        self.assertIsNone(entry['image_check'])
        for change in ({'source_heading': 'Other'}, {'name_language': None}):
            with self.assertRaises(ValueError):
                research.apply_official_chinese_names(result, {'official_chinese_names': [{**name, **change}]})


if __name__ == '__main__':
    unittest.main()
