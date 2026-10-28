import unittest

from app.services.electrical_import import parse_rows


def _row(**kwargs: object) -> dict[str, object]:
    base = {
        "Category": "Electrical",
        "Type": "CABLE",
        "Sub-Category": "FR",
        "Colours": "Red",
        "Compound": "FR-LSH LF",
        "Conductor/Core/Pair": "Class-5",
        "Brand": "POLYCAB",
        "product_family": "FR PVC",
        "HSN Code": "85444999",
        "GST": "0.18",
        "UoM": "Mtr",
        "Size (mm,cm,in)": "1.5 sqmm",
        "Length": "90 m",
        "Product Code": "EL-R-15-90",
        "MRP (Rs) per nos": "1200",
        "discount": "0.1",
        "Selling Price": "",
        "Pack Size": "",
        "MRP Pkg": "",
        "ROL": "0",
        "status": "active",
    }
    base.update(kwargs)
    return base


class ElectricalValidationTests(unittest.TestCase):
    def test_valid_row_parses(self) -> None:
        result = parse_rows([_row()])
        self.assertTrue(result.ok, result.errors)
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].colours, "Red")
        self.assertEqual(result.rows[0].compound, "FR-LSH LF")
        self.assertEqual(result.rows[0].conductor_core_pair, "CLASS-5")

    def test_missing_colours_fails(self) -> None:
        result = parse_rows([_row(**{"Colours": ""})])
        self.assertFalse(result.ok)
        self.assertTrue(any("Colours" in e["message"] for e in result.errors))

    def test_missing_compound_fails(self) -> None:
        result = parse_rows([_row(**{"Compound": ""})])
        self.assertFalse(result.ok)
        self.assertTrue(any("Compound" in e["message"] for e in result.errors))

    def test_missing_conductor_fails(self) -> None:
        result = parse_rows([_row(**{"Conductor/Core/Pair": ""})])
        self.assertFalse(result.ok)
        self.assertTrue(any("Conductor" in e["message"] for e in result.errors))

    def test_wrong_category_fails(self) -> None:
        result = parse_rows([_row(**{"Category": "Pipes & Fitting"})])
        self.assertFalse(result.ok)
        self.assertTrue(any("Electrical" in e["message"] for e in result.errors))

    def test_missing_header_fails(self) -> None:
        row = _row()
        del row["Conductor/Core/Pair"]
        result = parse_rows([row])
        self.assertFalse(result.ok)


if __name__ == "__main__":
    unittest.main()
