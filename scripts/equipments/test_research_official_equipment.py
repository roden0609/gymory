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


if __name__ == '__main__':
    unittest.main()
