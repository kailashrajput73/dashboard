import os
import unittest
from pathlib import Path
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.deps.auth import ADMIN_TOKEN_SQL, PARTNER_TOKEN_SQL

BACKEND_DIR = Path(__file__).resolve().parents[1]
EXPECTED_TABLES = {
    "admin_tokens",
    "alembic_version",
    "money_config",
    "partner_tokens",
    "partners",
    "users",
}
EXPECTED_TAXONOMY_TABLES = {
    "brands",
    "categories",
    "product_types",
    "subcategories",
}
EXPECTED_ROW4_TABLES = EXPECTED_TABLES | EXPECTED_TAXONOMY_TABLES | {
    "product_group_items",
    "product_groups",
}
EXPECTED_ROW5_TABLES = EXPECTED_ROW4_TABLES | {
    "rack_slots",
    "racks",
}
EXPECTED_ROW6_TABLES = EXPECTED_ROW5_TABLES | {"catalog"}
EXPECTED_ROW7_TABLES = EXPECTED_ROW6_TABLES | {"pricing", "pricing_history"}
EXPECTED_SCHEMA_TABLES = EXPECTED_ROW7_TABLES


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database to test migrations.",
)
class PostgresSchemaMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database_url = os.environ["TEST_DATABASE_URL"]
        cls.engine = create_engine(cls.database_url)
        before = set(inspect(cls.engine).get_table_names())
        allowed_before = (
            set(),
            {"alembic_version"},
            EXPECTED_TABLES,
            EXPECTED_TABLES | EXPECTED_TAXONOMY_TABLES,
            EXPECTED_ROW4_TABLES,
            EXPECTED_ROW5_TABLES,
            EXPECTED_ROW6_TABLES,
            EXPECTED_ROW7_TABLES,
        )
        if before not in allowed_before:
            cls.engine.dispose()
            raise AssertionError(
                "TEST_DATABASE_URL must point to an empty database, the row-1 "
                "baseline, the row-2 schema, the row-3 taxonomy schema, or the "
                "row-4 product-groups schema, the row-5 rack schema, or the "
                "row-6 catalog schema, or the row-7 pricing schema; "
                "found tables: "
                f"{sorted(before)}"
            )

        with patch.dict(os.environ, {"DATABASE_URL": cls.database_url}):
            config = Config(str(BACKEND_DIR / "alembic.ini"))
            command.upgrade(config, "head")

        cls.tables = set(inspect(cls.engine).get_table_names())

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def test_row_seven_schema_tables_exist_after_migration(self) -> None:
        self.assertEqual(self.tables, EXPECTED_SCHEMA_TABLES)

    def test_foreign_keys_unique_constraints_and_indexes_exist(self) -> None:
        inspector = inspect(self.engine)
        expected_foreign_keys = {
            ("admin_tokens", "admin_id", "users", "id"),
            ("partner_tokens", "partner_id", "partners", "id"),
            ("money_config", "admin_id", "users", "id"),
            ("subcategories", "category_id", "categories", "id"),
            ("product_group_items", "product_group_id", "product_groups", "id"),
            ("product_group_items", "product_id", "catalog", "id"),
            ("rack_slots", "rack_id", "racks", "id"),
            ("rack_slots", "product_id", "catalog", "id"),
            ("catalog", "category_id", "categories", "id"),
            ("catalog", "subcategory_id", "subcategories", "id"),
            ("catalog", "brand_id", "brands", "id"),
            ("catalog", "product_type_id", "product_types", "id"),
            ("catalog", "rack_id", "racks", "id"),
            ("pricing", "product_code", "catalog", "product_code"),
            ("pricing_history", "product_code", "catalog", "product_code"),
        }
        actual_foreign_keys = {
            (
                table,
                fk["constrained_columns"][0],
                fk["referred_table"],
                fk["referred_columns"][0],
            )
            for table in (
                "admin_tokens",
                "partner_tokens",
                "money_config",
                "subcategories",
                "product_group_items",
                "rack_slots",
                "catalog",
                "pricing",
                "pricing_history",
            )
            for fk in inspector.get_foreign_keys(table)
        }
        self.assertEqual(actual_foreign_keys, expected_foreign_keys)

        expected_fk_deletes = {
            ("admin_tokens", "admin_id"): "RESTRICT",
            ("partner_tokens", "partner_id"): "RESTRICT",
            ("money_config", "admin_id"): "RESTRICT",
            ("subcategories", "category_id"): "RESTRICT",
            ("product_group_items", "product_group_id"): "CASCADE",
            ("product_group_items", "product_id"): "CASCADE",
            ("rack_slots", "rack_id"): "CASCADE",
            ("rack_slots", "product_id"): "SET NULL",
            ("catalog", "category_id"): "RESTRICT",
            ("catalog", "subcategory_id"): "RESTRICT",
            ("catalog", "brand_id"): "RESTRICT",
            ("catalog", "product_type_id"): "RESTRICT",
            ("catalog", "rack_id"): "RESTRICT",
            ("pricing", "product_code"): "CASCADE",
            ("pricing_history", "product_code"): "CASCADE",
        }
        for table in (
            "admin_tokens",
            "partner_tokens",
            "money_config",
            "subcategories",
            "product_group_items",
            "rack_slots",
            "catalog",
            "pricing",
            "pricing_history",
        ):
            for foreign_key in inspector.get_foreign_keys(table):
                self.assertEqual(
                    foreign_key["options"]["ondelete"],
                    expected_fk_deletes[(table, foreign_key["constrained_columns"][0])],
                )

        self.assertEqual(
            {
                (table, constraint["name"])
                for table in (
                    "admin_tokens",
                    "partner_tokens",
                    "money_config",
                    "categories",
                    "subcategories",
                    "brands",
                    "product_types",
                    "product_groups",
                    "racks",
                    "rack_slots",
                    "catalog",
                    "pricing",
                )
                for constraint in inspector.get_unique_constraints(table)
            },
            {
                ("admin_tokens", "admin_tokens_token_uq"),
                ("partner_tokens", "partner_tokens_token_uq"),
                ("money_config", "money_config_admin_id_uq"),
                ("categories", "categories_name_uq"),
                ("subcategories", "subcategories_category_name_uq"),
                ("brands", "brands_name_uq"),
                ("product_types", "product_types_name_uq"),
                ("product_groups", "product_groups_name_uq"),
                ("racks", "racks_name_uq"),
                ("rack_slots", "rack_slots_rack_code_uq"),
                ("catalog", "catalog_product_code_uq"),
                ("pricing", "pricing_product_code_uq"),
            },
        )
        indexes = {
            (table, index["name"], index["unique"])
            for table in (
                "users",
                "admin_tokens",
                "partners",
                "partner_tokens",
                "categories",
                "subcategories",
                "brands",
                "product_types",
                "product_groups",
                "product_group_items",
                "racks",
                "rack_slots",
                "catalog",
                "pricing",
                "pricing_history",
            )
            for index in inspector.get_indexes(table)
        }
        self.assertTrue(
            {
                ("users", "users_role_contact", False),
                ("users", "users_contact", False),
                ("users", "users_role_name_sort", False),
                ("admin_tokens", "admin_tokens_admin_id", False),
                ("partners", "partners_phone_uq", True),
                ("partners", "partners_kyc_name_sort", False),
                ("partners", "partners_sales_manager", False),
                ("partners", "partners_name_sort", False),
                ("partner_tokens", "partner_tokens_partner_id", False),
                ("categories", "categories_name_sort", False),
                ("subcategories", "subcategories_category_id", False),
                ("subcategories", "subcategories_category_name_sort", False),
                ("brands", "brands_name_sort", False),
                ("product_types", "product_types_name_sort", False),
                ("product_groups", "product_groups_name_sort", False),
                ("product_group_items", "product_group_items_group_id", False),
                ("product_group_items", "product_group_items_product_id", False),
                ("racks", "racks_name_sort", False),
                ("rack_slots", "rack_slots_rack_id", False),
                ("rack_slots", "rack_slots_product_id", False),
                ("rack_slots", "rack_slots_product_id_uq", True),
                ("catalog", "catalog_category_id", False),
                ("catalog", "catalog_subcategory_id", False),
                ("catalog", "catalog_brand_id", False),
                ("catalog", "catalog_product_type_id", False),
                ("catalog", "catalog_rack_id", False),
                ("catalog", "catalog_category_name_sort", False),
                ("catalog", "catalog_brand", False),
                ("catalog", "catalog_rack_name_sort", False),
                ("catalog", "catalog_type_name", False),
                ("catalog", "catalog_product_group", False),
                ("catalog", "catalog_subcategory", False),
                ("catalog", "catalog_product_class", False),
                ("catalog", "catalog_size_mm", False),
                ("catalog", "catalog_name_sort", False),
                ("catalog", "catalog_stock_reorder", False),
                ("pricing_history", "pricing_history_code_updated", False),
            }.issubset(indexes)
        )

    def test_catalog_relations_and_product_delete_policies(self) -> None:
        with self.engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.execute(
                    text("INSERT INTO categories (id, name) VALUES ('row6-category', 'Test')")
                )
                connection.execute(
                    text("INSERT INTO subcategories (id, name, category_id) "
                         "VALUES ('row6-subcategory', 'Test sub', 'row6-category')")
                )
                connection.execute(
                    text("INSERT INTO brands (id, name) VALUES ('row6-brand', 'Test brand')")
                )
                connection.execute(
                    text("INSERT INTO product_types (id, name) "
                         "VALUES ('row6-type', 'Test type')")
                )
                connection.execute(
                    text("INSERT INTO product_groups (id, name) "
                         "VALUES ('row6-group', 'Test group')")
                )
                connection.execute(
                    text("INSERT INTO racks (id, name, row_count, column_count) "
                         "VALUES ('row6-rack', 'Test rack', 1, 1)")
                )
                connection.execute(
                    text(
                        "INSERT INTO catalog (id, name, product_name, category_id, "
                        "category, unit, standard_rate, product_code, brand_id, "
                        "subcategory_id, product_type_id, rack_id) VALUES "
                        "('row6-product', 'Test product', 'Test product', "
                        "'row6-category', 'Test', 'pcs', 1, 'ROW6-CODE', "
                        "'row6-brand', 'row6-subcategory', 'row6-type', 'row6-rack')"
                    )
                )
                connection.execute(
                    text("INSERT INTO product_group_items "
                         "(product_group_id, product_id) "
                         "VALUES ('row6-group', 'row6-product')")
                )
                connection.execute(
                    text("INSERT INTO rack_slots (rack_id, slot_code, product_id) "
                         "VALUES ('row6-rack', 'R1C1', 'row6-product')")
                )
                self.assertNotIn(
                    "product_group_ids",
                    {column["name"] for column in inspect(self.engine).get_columns("catalog")},
                )

                connection.execute(
                    text("DELETE FROM catalog WHERE id = 'row6-product'")
                )
                membership_count = connection.execute(
                    text("SELECT count(*) FROM product_group_items "
                         "WHERE product_id = 'row6-product'")
                ).scalar_one()
                slot_product = connection.execute(
                    text("SELECT product_id FROM rack_slots "
                         "WHERE rack_id = 'row6-rack' AND slot_code = 'R1C1'")
                ).scalar_one()
                self.assertEqual(membership_count, 0)
                self.assertIsNone(slot_product)
            finally:
                transaction.rollback()

    def test_pricing_foreign_keys_uniqueness_and_catalog_cascade(self) -> None:
        with self.engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.execute(
                    text("INSERT INTO categories (id, name) "
                         "VALUES ('row7-category', 'Pricing test')")
                )
                connection.execute(
                    text(
                        "INSERT INTO catalog (id, name, product_name, category_id, "
                        "category, unit, standard_rate, product_code) VALUES "
                        "('row7-product', 'Pricing test', 'Pricing test', "
                        "'row7-category', 'Pricing test', 'pcs', 1, 'ROW7-CODE')"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO pricing (product_code, mrp, selling_price, "
                        "purchase_price, discount) "
                        "VALUES ('ROW7-CODE', 10, 9, 5, 10)"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO pricing_history (product_code, mrp, "
                        "selling_price, purchase_price, discount) "
                        "VALUES ('ROW7-CODE', 10, 9, 5, 10)"
                    )
                )

                connection.execute(
                    text("DELETE FROM catalog WHERE id = 'row7-product'")
                )
                pricing_count = connection.execute(
                    text("SELECT count(*) FROM pricing "
                         "WHERE product_code = 'ROW7-CODE'")
                ).scalar_one()
                history_count = connection.execute(
                    text("SELECT count(*) FROM pricing_history "
                         "WHERE product_code = 'ROW7-CODE'")
                ).scalar_one()
                self.assertEqual(pricing_count, 0)
                self.assertEqual(history_count, 0)
            finally:
                transaction.rollback()

    def test_auth_queries_and_foreign_keys_work_and_rollback(self) -> None:
        with self.engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.execute(
                    text(
                        "INSERT INTO users (id, role, is_active) "
                        "VALUES ('row2-test-admin', 'admin', true)"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO partners (id, name, phone) "
                        "VALUES ('row2-test-partner', 'Test Partner', "
                        "'row2-test-phone')"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO admin_tokens (token, admin_id) "
                        "VALUES ('row2-admin-token', 'row2-test-admin')"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO partner_tokens (token, partner_id) "
                        "VALUES ('row2-partner-token', 'row2-test-partner')"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO money_config (admin_id) "
                        "VALUES ('row2-test-admin')"
                    )
                )

                admin = connection.execute(
                    ADMIN_TOKEN_SQL, {"token": "row2-admin-token"}
                ).mappings().one()
                partner = connection.execute(
                    PARTNER_TOKEN_SQL, {"token": "row2-partner-token"}
                ).mappings().one()
                config = connection.execute(
                    text(
                        "SELECT discount_percent, gst_percent, "
                        "special_discount_percent, show_discount, show_gst, "
                        "show_special_discount FROM money_config "
                        "WHERE admin_id = 'row2-test-admin'"
                    )
                ).mappings().one()

                self.assertEqual(admin["user_id"], "row2-test-admin")
                self.assertEqual(admin["role"], "admin")
                self.assertTrue(admin["is_active"])
                self.assertEqual(partner["partner_id"], "row2-test-partner")
                self.assertEqual(
                    dict(config),
                    {
                        "discount_percent": 0,
                        "gst_percent": 18,
                        "special_discount_percent": 0,
                        "show_discount": True,
                        "show_gst": True,
                        "show_special_discount": False,
                    },
                )
            finally:
                transaction.rollback()

        with self.engine.connect() as verification_connection:
            for table_name, key_column, fixture_value in (
                ("users", "id", "row2-test-admin"),
                ("partners", "id", "row2-test-partner"),
                ("admin_tokens", "token", "row2-admin-token"),
                ("partner_tokens", "token", "row2-partner-token"),
                ("money_config", "admin_id", "row2-test-admin"),
            ):
                count = verification_connection.execute(
                    text(
                        f"SELECT count(*) FROM {table_name} "
                        f"WHERE {key_column} = :fixture_value"
                    ),
                    {"fixture_value": fixture_value},
                ).scalar_one()
                self.assertEqual(count, 0, f"{table_name} fixture was not rolled back")


if __name__ == "__main__":
    unittest.main()
