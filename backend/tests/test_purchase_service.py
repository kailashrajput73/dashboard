import os
import unittest
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.services.purchase_service import (
    PurchaseLineInput,
    PurchaseValidationError,
    create_purchase,
)


class PurchaseLineInputTests(unittest.TestCase):
    def test_rejects_invalid_quantity_price_and_discount(self) -> None:
        invalid_lines = (
            {"productCode": "TEST", "quantity": 0, "listPrice": 1},
            {"productCode": "TEST", "quantity": 1, "listPrice": -1},
            {
                "productCode": "TEST",
                "quantity": 1,
                "listPrice": 1,
                "purchaseDiscount": -1,
            },
        )
        for values in invalid_lines:
            with self.subTest(values=values):
                with self.assertRaises(ValidationError):
                    PurchaseLineInput(**values)


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class PurchaseServiceTransactionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(os.environ["TEST_DATABASE_URL"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        self.connection = self.engine.connect()
        self.outer_transaction = self.connection.begin()
        self.session = Session(
            bind=self.connection,
            join_transaction_mode="create_savepoint",
        )
        suffix = uuid4().hex
        self.partner_id = str(uuid4())
        self.category_id = str(uuid4())
        self.product_ids = [str(uuid4()), str(uuid4())]
        self.product_codes = [f"TXN15-A-{suffix}", f"TXN15-B-{suffix}"]
        self.rack_id = str(uuid4())
        self.rack_name = f"TXN15 rack {suffix}"
        self.slot_id = str(uuid4())

        self.connection.execute(
            text("INSERT INTO partners (id, name) VALUES (:id, :name)"),
            {"id": self.partner_id, "name": f"TXN15 partner {suffix}"},
        )
        self.connection.execute(
            text("INSERT INTO categories (id, name) VALUES (:id, :name)"),
            {"id": self.category_id, "name": f"TXN15 category {suffix}"},
        )
        for product_id, product_code in zip(self.product_ids, self.product_codes):
            self.connection.execute(
                text(
                    """
                    INSERT INTO catalog
                        (id, name, product_name, category_id, category, unit,
                         standard_rate, product_code, stock)
                    VALUES
                        (:id, :name, :product_name, :category_id, :category,
                         :unit, :standard_rate, :product_code, 10)
                    """
                ),
                {
                    "id": product_id,
                    "name": f"Product {product_code}",
                    "product_name": f"Product {product_code}",
                    "category_id": self.category_id,
                    "category": f"TXN15 category {suffix}",
                    "unit": "each",
                    "standard_rate": 1,
                    "product_code": product_code,
                },
            )

        self.connection.execute(
            text(
                """
                INSERT INTO racks (id, name, row_count, column_count)
                VALUES (:id, :name, 1, 1)
                """
            ),
            {"id": self.rack_id, "name": self.rack_name},
        )
        self.connection.execute(
            text(
                """
                INSERT INTO rack_slots (id, rack_id, slot_code)
                VALUES (:id, :rack_id, 'A1')
                """
            ),
            {"id": self.slot_id, "rack_id": self.rack_id},
        )

    def tearDown(self) -> None:
        self.session.close()
        self.outer_transaction.rollback()
        self.connection.close()

    def test_create_purchase_updates_stock_and_rack_in_one_commit(self) -> None:
        result = create_purchase(
            self.session,
            partner_id=self.partner_id,
            lines=[
                PurchaseLineInput(
                    productCode=self.product_codes[0],
                    quantity=3,
                    listPrice=12.5,
                    purchaseDiscount=1.5,
                    rackId=self.rack_id,
                    rackSlot="A1",
                )
            ],
        )

        self.assertTrue(result["success"])
        purchase = result["data"]
        self.assertEqual(
            set(purchase),
            {"id", "lines", "createdAt"},
        )
        self.assertEqual(purchase["lines"][0]["productId"], self.product_ids[0])
        self.assertEqual(
            purchase["lines"][0]["productName"],
            f"Product {self.product_codes[0]}",
        )

        saved_purchase = self.session.execute(
            text("SELECT partner_id FROM purchases WHERE id = :purchase_id"),
            {"purchase_id": purchase["id"]},
        ).one()
        self.assertEqual(saved_purchase.partner_id, self.partner_id)
        saved_line = self.session.execute(
            text(
                """
                SELECT product_id, product_code, quantity, list_price,
                       purchase_discount, rack_id, rack_slot
                FROM purchase_lines
                WHERE purchase_id = :purchase_id
                """
            ),
            {"purchase_id": purchase["id"]},
        ).one()
        self.assertEqual(saved_line.product_id, self.product_ids[0])
        self.assertEqual(saved_line.product_code, self.product_codes[0])
        self.assertEqual(saved_line.quantity, 3)
        self.assertEqual(saved_line.list_price, 12.5)
        self.assertEqual(saved_line.purchase_discount, 1.5)
        self.assertEqual(saved_line.rack_id, self.rack_id)
        self.assertEqual(saved_line.rack_slot, "A1")

        catalog = self.session.execute(
            text(
                """
                SELECT stock, last_purchase_price, last_purchase_discount,
                       rack_id, rack_name, rack_slot
                FROM catalog WHERE id = :product_id
                """
            ),
            {"product_id": self.product_ids[0]},
        ).one()
        self.assertEqual(catalog.stock, 13)
        self.assertEqual(catalog.last_purchase_price, 12.5)
        self.assertEqual(catalog.last_purchase_discount, 1.5)
        self.assertEqual(catalog.rack_id, self.rack_id)
        self.assertEqual(catalog.rack_name, self.rack_name)
        self.assertEqual(catalog.rack_slot, "A1")
        self.assertEqual(
            self.session.execute(
                text("SELECT product_id FROM rack_slots WHERE id = :slot_id"),
                {"slot_id": self.slot_id},
            ).scalar_one(),
            self.product_ids[0],
        )

    def test_missing_partner_is_rejected_before_writes(self) -> None:
        with self.assertRaises(PurchaseValidationError) as raised:
            create_purchase(
                self.session,
                partner_id=" ",
                lines=[
                    PurchaseLineInput(
                        productCode=self.product_codes[0],
                        quantity=2,
                        listPrice=5,
                    )
                ],
            )

        self.assertEqual(raised.exception.errors, ["Partner id is required"])
        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM purchases WHERE partner_id = :partner_id"),
                {"partner_id": self.partner_id},
            ).scalar_one(),
            0,
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_ids[0]},
            ).scalar_one(),
            10,
        )

    def test_later_stock_failure_rolls_back_earlier_purchase_writes(self) -> None:
        self.connection.execute(
            text(
                """
                CREATE FUNCTION txn15_force_stock_failure() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    IF NEW.product_code LIKE 'TXN15-B-%' THEN
                        RAISE EXCEPTION 'forced TXN-16 stock failure';
                    END IF;
                    RETURN NEW;
                END;
                $$
                """
            )
        )
        self.connection.execute(
            text(
                """
                CREATE TRIGGER txn15_force_stock_failure
                BEFORE UPDATE OF stock ON catalog
                FOR EACH ROW EXECUTE FUNCTION txn15_force_stock_failure()
                """
            )
        )

        with self.assertRaises(DBAPIError):
            create_purchase(
                self.session,
                partner_id=self.partner_id,
                lines=[
                    PurchaseLineInput(
                        productCode=self.product_codes[0],
                        quantity=3,
                        listPrice=12,
                    ),
                    PurchaseLineInput(
                        productCode=self.product_codes[1],
                        quantity=4,
                        listPrice=15,
                    ),
                ],
            )

        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM purchases WHERE partner_id = :partner_id"),
                {"partner_id": self.partner_id},
            ).scalar_one(),
            0,
        )
        self.assertEqual(
            self.session.execute(
                text(
                    """
                    SELECT count(*)
                    FROM purchase_lines AS purchase_line
                    JOIN purchases AS purchase
                      ON purchase.id = purchase_line.purchase_id
                    WHERE purchase.partner_id = :partner_id
                    """
                ),
                {"partner_id": self.partner_id},
            ).scalar_one(),
            0,
        )
        stocks = self.session.execute(
            text(
                "SELECT stock FROM catalog WHERE id IN (:first, :second) ORDER BY product_code"
            ),
            {
                "first": self.product_ids[0],
                "second": self.product_ids[1],
            },
        ).scalars().all()
        self.assertEqual(stocks, [10, 10])
