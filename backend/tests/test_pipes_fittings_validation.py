import unittest

from app.services.pipes_fittings_import import parse_rows


def _row(**kwargs: object) -> dict[str, object]:
    base = {
        "Category": "PIPES & FITTING",
        "Type": "CPVC",
        "Sub-Category": "FITTING",
        "class": "SDR 11",
        "Brand": "KING",
        "product_family": "COUPLER",
        "HSN Code": "39174000",
        "GST": "0.18",
        "UoM": "Pcs",
        "Size (mm,cm,in)": '15mm (½")',
        "Length": "",
        "product code": "C1115CKG",
        "MRP (Rs) per nos": "7.42",
        "discount": "0.05",
        "Selling Price": "",
        "Pack Size": "",
        "MRP Pkg": "",
        "ROL": "0",
    }
    base.update(kwargs)
    return base


class PipesFittingsValidationTests(unittest.TestCase):
    def test_repeated_hsn_same_family_passes(self) -> None:
        rows = [
            _row(**{"product code": "A1", "Size (mm,cm,in)": "15mm"}),
            _row(**{"product code": "A2", "Size (mm,cm,in)": "20mm"}),
        ]
        result = parse_rows(rows)
        self.assertTrue(result.ok)
        self.assertEqual(len(result.rows), 2)

    def test_conflicting_hsn_same_family_fails(self) -> None:
        rows = [
            _row(**{"product code": "A1", "HSN Code": "39174000"}),
            _row(**{"product code": "A2", "HSN Code": "39181090"}),
        ]
        result = parse_rows(rows)
        self.assertFalse(result.ok)
        self.assertTrue(any("HSN" in e["message"] for e in result.errors))

    def test_missing_header_fails(self) -> None:
        row = _row()
        del row["product_family"]
        result = parse_rows([row])
        self.assertFalse(result.ok)
        self.assertTrue(any("product_family" in e["message"] for e in result.errors))

    def test_duplicate_code_in_file(self) -> None:
        rows = [_row(), _row()]
        result = parse_rows(rows)
        self.assertFalse(result.ok)
        self.assertTrue(any("Duplicate" in e["message"] for e in result.errors))

    def test_status_blank_is_inactive(self) -> None:
        result = parse_rows([_row(**{"status": ""})])
        self.assertTrue(result.ok)
        self.assertFalse(result.rows[0].is_active)

    def test_status_active_is_live(self) -> None:
        result = parse_rows([_row(**{"status": "active"})])
        self.assertTrue(result.ok)
        self.assertTrue(result.rows[0].is_active)

    def test_brand_casefold_same_family_key(self) -> None:
        rows = [
            _row(**{"Brand": "KING", "product code": "A1"}),
            _row(**{"Brand": "King", "product code": "A2", "Size (mm,cm,in)": "20mm"}),
        ]
        result = parse_rows(rows)
        self.assertTrue(result.ok)
        self.assertEqual(result.rows[0].family_key, result.rows[1].family_key)


if __name__ == "__main__":
    unittest.main()
