import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('collector_api', Path(__file__).with_name('collect-247-equipment-api.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


class SourceCollectorTests(unittest.TestCase):
    def test_nearest_store_rows_are_excluded(self):
        rows = [{'id': 1, 'inventoryId': 10, 'storeId': None},
                {'id': 2, 'inventoryId': 11, 'storeId': 441}]
        self.assertEqual([r['id'] for r in c.local_inventory(rows, 441)], [2])

    def test_foreign_store_assignments_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'different store'):
            c.local_inventory([{'id': 1, 'inventoryId': 10, 'storeId': 371}], 441)

    def test_same_named_inventory_keeps_distinct_ids(self):
        store = {'storeId': 441, 'storeName': 'Fanling Third Branch', 'area': 'NT'}
        rows = [{'id': i, 'inventoryId': i, 'storeId': 441, 'brandName': 'Life Fitness',
                 'inventoryName': 'Abdominal', 'i18nList': [{'langTag': 'zh-HK', 'name': '腹肌機'}]}
                for i in (1, 2)]
        record = c.record_for(store, rows, 'https://example.test', 'digest')
        self.assertEqual(record['row_count'], 2)
        self.assertEqual(record['unique_equipment_count'], 1)
        self.assertEqual(record['unique_inventory_count'], 2)
        self.assertEqual(record['equipment'][0]['names']['zh-HK'], '腹肌機')

    def test_same_order_as_app(self):
        rows = [dict(id=1, inventoryId=1, storeId=441, hasCourseware=False, sortOrder=0),
                dict(id=2, inventoryId=2, storeId=441, hasCourseware=True, sortOrder=5, createTime=10),
                dict(id=3, inventoryId=3, storeId=441, hasCourseware=True, sortOrder=5, createTime=20)]
        self.assertEqual([r['id'] for r in c.local_inventory(rows, 441)], [3, 2, 1])

    def test_truncated_club_name_requires_unique_match(self):
        gyms = [{'name': 'Aberdeen Fourth Branch (Tin ...'}]
        stores = [{'storeName': 'Aberdeen Fourth Branch (Tin Wan)', 'storeId': 1}]
        self.assertEqual(c.match_stores(gyms, stores), stores)
        with self.assertRaises(ValueError):
            c.match_stores(gyms, stores+[{'storeName': 'Aberdeen Fourth Branch (Other)', 'storeId': 2}])

    def test_full_source_name_can_validate_against_ui_ellipsis(self):
        result = c.validate_ui({'store_name': 'Test', 'store_id': 1, 'equipment': [{'name': 'Row Erg Standard Concept 2 PM5'}]},
                               {'equipment': [{'name': 'Row Erg Standard Concept 2 P...', 'name_truncated': True}]})
        self.assertTrue(result['row_counts_match'])
        self.assertEqual(result['minimum_name_similarity'], 1)


if __name__ == '__main__':
    unittest.main()
