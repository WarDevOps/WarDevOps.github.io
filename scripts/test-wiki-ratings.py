"""Regression checks for current Wiki RB/GRB extraction without network access."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from lxml import html

spec = importlib.util.spec_from_file_location("wiki_sync", Path(__file__).with_name("sync-war-thunder-units.py"))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def document(rows):
    return html.fromstring("<html><script>window.WT_UnitList = '" + json.dumps(rows) + "';</script></html>")


class WikiRatingTests(unittest.TestCase):
    def test_air_rb_and_ground_rb_are_read_by_mode(self):
        rows = [["test", "Test", "usa", 8, {"ab": 40, "rb": 39, "trb": 35, "sb": 41}],
                ["reserve", "Reserve", "usa", 1, {"rb": 0, "trb": 0}],
                ["sample", "Sample", "usa", 6, {"rb": 28, "trb": 29}]]
        values = sync.wiki_unit_ratings(document(rows), "air")
        self.assertEqual(values["test"], {"br": 14.0, "brGround": 12.7})
        self.assertEqual(values["reserve"], {"br": 1.0, "brGround": 1.0})
        self.assertEqual(values["sample"], {"br": 10.3, "brGround": 10.7})

    def test_missing_grb_never_uses_air_rb(self):
        for modes in [{"rb": 28}, {"rb": 28, "trb": None}, {"rb": 28, "trb": -1}, {"rb": 28, "trb": True}]:
            with self.subTest(modes=modes), self.assertRaises(RuntimeError):
                sync.wiki_unit_ratings(document([["test", "Test", "usa", 8, modes]]), "air")

    def test_unrated_auxiliary_units_are_not_given_invented_ratings(self):
        values = sync.wiki_unit_ratings(document([
            ["tank", "Tank", "usa", 8, {"rb": 35}], ["launcher", "Launcher", "usa", 8, []]
        ]), "tank")
        self.assertEqual(values, {"tank": {"br": 12.7}})

    def test_current_refresh_is_atomic_and_preserves_identity(self):
        before = {"battleRatingMode": "RB", "generatedAt": "original", "battleRatingUpdate": {"status": "planned"},
                  "categories": {key: {"count": 1, "units": [{"wikiId": key, "name": key, "br": 15.0, "file": key + ".webp"}]}
                                 for key in sync.CATEGORIES}}
        original = copy.deepcopy(before)
        docs = {key: document([[key, key, "usa", 8, {"rb": 35, "trb": 32}]]) for key in sync.CATEGORIES}
        after = sync.refresh_catalog_ratings(before, docs, "2026-10-24")
        self.assertEqual(before, original)
        self.assertEqual(after["generatedAt"], "original")
        self.assertNotIn("battleRatingUpdate", after)
        self.assertEqual(after["battleRatingSnapshot"]["status"], "current")
        self.assertEqual(after["categories"]["air"]["units"][0]["brGround"], 11.7)
        self.assertEqual(after["categories"]["air"]["units"][0]["file"], "air.webp")
        docs["air"] = document([["wrong-id", "Wrong", "usa", 8, {"rb": 35, "trb": 32}]])
        with self.assertRaises(RuntimeError):
            sync.refresh_catalog_ratings(before, docs, "2026-10-24")
        self.assertEqual(before, original)


if __name__ == "__main__":
    unittest.main()
