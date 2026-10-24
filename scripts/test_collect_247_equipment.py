import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-247-equipment.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


def item(name):
    return dict(brand='Life Fitness', name=name, ocr_confidence=1)


class CollectorTests(unittest.TestCase):
    def test_adjacent_same_name_rows_survive_overlap(self):
        rows = [item(n) for n in ['A', 'B', 'Abdominal', 'Abdominal', 'C', 'D']]
        frame = [item(n) for n in ['B', 'Abdominal', 'Abdominal', 'C', 'D', 'E']]
        merged, added = c.merge(rows, frame)
        self.assertEqual(added, 1)
        self.assertEqual([r['name'] for r in merged], ['A', 'B', 'Abdominal', 'Abdominal', 'C', 'D', 'E'])

    def test_missing_overlap_stops_collection(self):
        with self.assertRaisesRegex(RuntimeError, 'overlap'):
            c.merge([item(n) for n in ['Alpha', 'Bravo', 'Charlie']], [item(n) for n in ['Delta', 'Echo', 'Foxtrot']])

    def test_large_jump_cannot_be_marked_complete(self):
        with self.assertRaisesRegex(RuntimeError, 'skipped'):
            c.merge([item(n) for n in ['Alpha', 'Bravo', 'Charlie']],
                    [item(n) for n in ['Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']])

    def test_clipped_last_local_row_adds_nothing(self):
        rows = [item(n) for n in ['Alpha', 'Bravo', 'Charlie']]
        merged, added = c.merge(rows, [item('Charlie')])
        self.assertEqual(added, 0)
        self.assertEqual(len(merged), 3)

    def test_truncated_header_requires_matching_prefix(self):
        self.assertTrue(c.header_matches('Ma On Shan Second ... ›', 'Ma On Shan Second Branch'))
        self.assertFalse(c.header_matches('Ma On Shan >', 'Fanling Third Branch'))
        self.assertFalse(c.header_matches('Ma On Shan Third ... ›', 'Ma On Shan Second Branch'))

    def test_split_club_title_is_one_name(self):
        screen = {'lines': [
            {'x': 435, 'y': 900, 'height': 40, 'text': 'Tsuen Wan seventh branch'},
            {'x': 960, 'y': 898, 'height': 40, 'text': '(D-...'},
            {'x': 435, 'y': 950, 'height': 30, 'text': 'Straight line distance >999km'},
        ]}
        self.assertEqual(c.clubs_on_screen(screen)[0]['name'], 'Tsuen Wan seventh branch (D-...')


if __name__ == '__main__':
    unittest.main()
