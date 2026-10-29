"""Regression checks for importing browser evidence without weakening matches."""
import copy
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


if __name__ == '__main__':
    unittest.main()
