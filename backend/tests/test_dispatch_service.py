import os
import unittest
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.services.dispatch_service import (
    DispatchConflictError,
    DispatchLineInput,
    DispatchValidationError,
    create_dispatch,
)


class DispatchLineInputTests(unittest.TestCase):
    def test_rejects_non_positive_quantities(self) -> None:
        for quantity in (0, -1):
            with self.subTest(quantity=quantity):
                with self.assertRaises(ValidationError):
                    DispatchLineInput(productCode="TEST", quantity=quantity)


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class DispatchServiceTransactionTests(unittest.TestCase):
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
        self.rfq_id = str(uuid4())
        self.product_ids = [str(uuid4()), str(uuid4())]
        self.product_codes = [f"TXN17-A-{suffix}", f"TXN17-B-{suffix}"]

        self.connection.execute(
            text("INSERT INTO partners (id, name) VALUES (:id, :name)"),
            {"id": self.partner_id, "name": f"TXN17 partner {suffix}"},
        )
        self.connection.execute(
            text("INSERT INTO categories (id, name) VALUES (:id, :name)"),
            {"id": self.category_id, "name": f"TXN17 category {suffix}"},
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
                    "category": f"TXN17 category {suffix}",
                    "unit": "each",
                    "standard_rate": 12.5,
                    "product_code": product_code,
                },
            )
        self.connection.execute(
            text(
                """
                INSERT INTO rfqs
                    (id, partner_id, status, grand_total,
                     special_discount_percent, reward_points, delivery_mode)
                VALUES
                    (:id, :partner_id, 'approved', 0, 0, 0, 'storePickup')
                """
            ),
            {"id": self.rfq_id, "partner_id": self.partner_id},
        )

    def tearDown(self) -> None:
        self.session.close()
        self.outer_transaction.rollback()
        self.connection.close()

    def test_create_dispatch_updates_stock_and_dispatches_rfq(self) -> None:
        result = create_dispatch(
            self.session,
            source_rfq_id=self.rfq_id,
            customer_name="Test customer",
            customer_phone="555-0100",
            lines=[
                DispatchLineInput(
                    productCode=self.product_codes[0],
                    quantity=3,
                )
            ],
        )

        self.assertEqual(
            (result["success"], result["error"]),
            (True, None),
        )
        dispatch = result["data"]
        self.assertEqual(dispatch["sourceRfqId"], self.rfq_id)
        self.assertEqual(dispatch["customerName"], "Test customer")
        self.assertEqual(dispatch["customerPhone"], "555-0100")
        self.assertEqual(
            dispatch["lines"],
            [
                {
                    "productId": self.product_ids[0],
                    "productCode": self.product_codes[0],
                    "productName": f"Product {self.product_codes[0]}",
                    "quantity": 3,
                    "unitPrice": 12.5,
                }
            ],
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_ids[0]},
            ).scalar_one(),
            7,
        )
        self.assertEqual(
            self.session.execute(
                text(
                    "SELECT count(*) FROM dispatches WHERE id = :dispatch_id"
                ),
                {"dispatch_id": dispatch["id"]},
            ).scalar_one(),
            1,
        )
        saved_line = self.session.execute(
            text(
                """
                SELECT product_id, product_code, product_name, quantity, unit_price
                FROM dispatch_lines
                WHERE dispatch_id = :dispatch_id
                """
            ),
            {"dispatch_id": dispatch["id"]},
        ).one()
        self.assertEqual(
            saved_line,
            (
                self.product_ids[0],
                self.product_codes[0],
                f"Product {self.product_codes[0]}",
                3,
                12.5,
            ),
        )
        rfq = self.session.execute(
            text("SELECT status, history FROM rfqs WHERE id = :rfq_id"),
            {"rfq_id": self.rfq_id},
        ).one()
        self.assertEqual(rfq.status, "dispatched")
        self.assertEqual(
            rfq.history[-1]["action"],
            "dispatched",
        )
        self.assertEqual(rfq.history[-1]["actor"], "admin")
        self.assertEqual(
            rfq.history[-1]["details"],
            {"dispatchId": dispatch["id"]},
        )

    def test_insufficient_stock_does_not_write_or_decrement(self) -> None:
        with self.assertRaises(DispatchValidationError) as raised:
            create_dispatch(
                self.session,
                source_rfq_id=self.rfq_id,
                lines=[
                    DispatchLineInput(
                        productCode=self.product_codes[0],
                        quantity=11,
                    )
                ],
            )

        self.assertIn(
            "insufficient stock",
            raised.exception.errors[0],
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_ids[0]},
            ).scalar_one(),
            10,
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM dispatches")
            ).scalar_one(),
            0,
        )

    def test_duplicate_source_rfq_is_rejected_without_second_stock_loss(self) -> None:
        first = create_dispatch(
            self.session,
            source_rfq_id=self.rfq_id,
            lines=[
                DispatchLineInput(
                    productCode=self.product_codes[0],
                    quantity=2,
                )
            ],
        )

        with self.assertRaises(DispatchConflictError) as raised:
            create_dispatch(
                self.session,
                source_rfq_id=self.rfq_id,
                lines=[
                    DispatchLineInput(
                        productCode=self.product_codes[0],
                        quantity=4,
                    )
                ],
            )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_ids[0]},
            ).scalar_one(),
            8,
        )
        self.assertEqual(
            self.session.execute(
                text(
                    "SELECT count(*) FROM dispatches WHERE source_rfq_id = :rfq_id"
                ),
                {"rfq_id": self.rfq_id},
            ).scalar_one(),
            1,
        )
        self.assertIsNotNone(first["data"]["id"])

    def test_mid_operation_failure_rolls_back_stock_dispatch_and_rfq(self) -> None:
        self.connection.execute(
            text(
                """
                CREATE FUNCTION txn17_force_dispatch_line_failure()
                RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'forced TXN-18 dispatch line failure';
                END;
                $$
                """
            )
        )
        self.connection.execute(
            text(
                """
                CREATE TRIGGER txn17_force_dispatch_line_failure
                BEFORE INSERT ON dispatch_lines
                FOR EACH ROW EXECUTE FUNCTION txn17_force_dispatch_line_failure()
                """
            )
        )

        with self.assertRaises(DBAPIError):
            create_dispatch(
                self.session,
                source_rfq_id=self.rfq_id,
                lines=[
                    DispatchLineInput(
                        productCode=self.product_codes[0],
                        quantity=3,
                    )
                ],
            )

        self.assertEqual(
            self.session.execute(
                text(
                    "SELECT stock FROM catalog WHERE id = :id"
                ),
                {"id": self.product_ids[0]},
            ).scalar_one(),
            10,
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM dispatches")
            ).scalar_one(),
            0,
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM dispatch_lines")
            ).scalar_one(),
            0,
        )
        rfq = self.session.execute(
            text("SELECT status, history FROM rfqs WHERE id = :rfq_id"),
            {"rfq_id": self.rfq_id},
        ).one()
        self.assertEqual(rfq.status, "approved")
        self.assertEqual(rfq.history, [])
