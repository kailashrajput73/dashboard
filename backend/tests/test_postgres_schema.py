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
EXPECTED_SCHEMA_TABLES = EXPECTED_ROW5_TABLES


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
        )
        if before not in allowed_before:
            cls.engine.dispose()
            raise AssertionError(
                "TEST_DATABASE_URL must point to an empty database, the row-1 "
                "baseline, the row-2 schema, the row-3 taxonomy schema, or the "
                "row-4 product-groups schema; found tables: "
                f"{sorted(before)}"
            )

        with patch.dict(os.environ, {"DATABASE_URL": cls.database_url}):
            config = Config(str(BACKEND_DIR / "alembic.ini"))
            command.upgrade(config, "head")

        cls.tables = set(inspect(cls.engine).get_table_names())

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def test_row_five_schema_tables_exist_after_migration(self) -> None:
        self.assertEqual(self.tables, EXPECTED_SCHEMA_TABLES)

    def test_foreign_keys_unique_constraints_and_indexes_exist(self) -> None:
        inspector = inspect(self.engine)
        expected_foreign_keys = {
            ("admin_tokens", "admin_id", "users", "id"),
            ("partner_tokens", "partner_id", "partners", "id"),
            ("money_config", "admin_id", "users", "id"),
            ("subcategories", "category_id", "categories", "id"),
            ("product_group_items", "product_group_id", "product_groups", "id"),
            ("rack_slots", "rack_id", "racks", "id"),
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
            )
            for fk in inspector.get_foreign_keys(table)
        }
        self.assertEqual(actual_foreign_keys, expected_foreign_keys)

        expected_ondelete = {
            "admin_tokens": "RESTRICT",
            "partner_tokens": "RESTRICT",
            "money_config": "RESTRICT",
            "subcategories": "RESTRICT",
            "product_group_items": "CASCADE",
            "rack_slots": "CASCADE",
        }
        for table, expected_delete in expected_ondelete.items():
            for foreign_key in inspector.get_foreign_keys(table):
                self.assertEqual(foreign_key["options"]["ondelete"], expected_delete)

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
            }.issubset(indexes)
        )

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
