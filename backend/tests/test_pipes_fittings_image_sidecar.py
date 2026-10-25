import unittest

from app.services.pipes_fittings_import import image_sidecar_row_key


class PipesFittingsImageSidecarTests(unittest.TestCase):
    def test_row_key_treats_case_and_spacing_equivalent(self) -> None:
        a = image_sidecar_row_key(
            brand="Astral",
            product_family="PIPE",
            type_name="UPVC",
            product_class="Sch 40",
        )
        b = image_sidecar_row_key(
            brand="astral",
            product_family="pipe",
            type_name="upvc",
            product_class="sch 40",
        )
        self.assertEqual(a, b)

    def test_row_key_distinguishes_class(self) -> None:
        sch40 = image_sidecar_row_key(
            brand="Astral",
            product_family="PIPE",
            type_name="UPVC",
            product_class="Sch 40",
        )
        sch80 = image_sidecar_row_key(
            brand="Astral",
            product_family="PIPE",
            type_name="UPVC",
            product_class="Sch 80",
        )
        self.assertNotEqual(sch40, sch80)


if __name__ == "__main__":
    unittest.main()
