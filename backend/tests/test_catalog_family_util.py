import unittest

from app.services.catalog_family_util import format_size_and_length, generate_sku_display_name


class CatalogFamilyUtilTests(unittest.TestCase):
    def test_size_and_length_both(self) -> None:
        self.assertEqual(
            format_size_and_length('15mm (½")', "3 m"),
            '15mm (½") (3 m)',
        )

    def test_size_only(self) -> None:
        self.assertEqual(format_size_and_length("20mm", ""), "20mm")

    def test_length_only(self) -> None:
        self.assertEqual(format_size_and_length("", "6 m"), "6 m")

    def test_display_name_matches_excel_order(self) -> None:
        name = generate_sku_display_name(
            type_name="CPVC",
            product_family="COUPLER",
            product_class="SDR 11",
            size='15mm (½")',
            length="",
            brand="KING",
        )
        self.assertEqual(name, "CPVC, COUPLER, SDR 11, 15mm (½\"), KING")

    def test_display_name_size_and_length(self) -> None:
        name = generate_sku_display_name(
            type_name="UPVC",
            product_family="PIPE",
            product_class="Sch 40",
            size="110mm",
            length="6 m",
            brand="Astral",
        )
        self.assertEqual(name, "UPVC, PIPE, Sch 40, 110mm (6 m), Astral")


if __name__ == "__main__":
    unittest.main()
