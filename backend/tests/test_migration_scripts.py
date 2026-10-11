import unittest
from datetime import datetime, timezone

from scripts.migrate.row12_auth_taxonomy import normalize_iso_datetime
from scripts.migrate.row13_catalog_pricing import normalize_product_code


class MigrationScriptTests(unittest.TestCase):
    def test_normalize_iso_datetime_handles_z_and_naive_values(self):
        self.assertEqual(
            normalize_iso_datetime("2024-05-20T12:00:00Z"),
            datetime(2024, 5, 20, 12, 0, tzinfo=timezone.utc),
        )
        self.assertEqual(
            normalize_iso_datetime("2024-05-20T12:00:00"),
            datetime(2024, 5, 20, 12, 0, tzinfo=timezone.utc),
        )
        self.assertIsNone(normalize_iso_datetime(None))
        self.assertIsNone(normalize_iso_datetime(""))

    def test_normalize_product_code_trims_and_blank_values(self):
        self.assertEqual(normalize_product_code("  ABC-123  "), "ABC-123")
        self.assertIsNone(normalize_product_code("   "))
        self.assertIsNone(normalize_product_code(None))


if __name__ == "__main__":
    unittest.main()
