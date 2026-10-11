import os
import unittest
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.services.rfq_service import RfqApprovalInput, approve_rfq


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class RfqServiceTransactionTests(unittest.TestCase):
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
        self.product_id = str(uuid4())
        self.rfq_id = str(uuid4())

        self.connection.execute(
            text("INSERT INTO partners (id, name) VALUES (:id, :name)"),
            {"id": self.partner_id, "name": f"TXN16 partner {suffix}"},
        )
        self.connection.execute(
            text("INSERT INTO categories (id, name) VALUES (:id, :name)"),
            {"id": self.category_id, "name": f"TXN16 category {suffix}"},
        )
        self.connection.execute(
            text(
                """
                INSERT INTO catalog
                    (id, name, product_name, category_id, category, unit,
                     standard_rate, product_code, stock)
                VALUES
                    (:id, :name, :product_name, :category_id, :category,
                     :unit, :standard_rate, :product_code, 0)
                """
            ),
            {
                "id": self.product_id,
                "name": f"TXN16 product {suffix}",
                "product_name": f"TXN16 product {suffix}",
                "category_id": self.category_id,
                "category": f"TXN16 category {suffix}",
                "unit": "each",
                "standard_rate": 125,
                "product_code": f"TXN16-{suffix}",
            },
        )
        self.connection.execute(
            text(
                """
                INSERT INTO rfqs
                    (id, partner_id, status, grand_total,
                     special_discount_percent, reward_points, delivery_mode)
                VALUES
                    (:id, :partner_id, 'pending', 250, 0, 0, 'storePickup')
                """
            ),
            {"id": self.rfq_id, "partner_id": self.partner_id},
        )
        self.connection.execute(
            text(
                """
                INSERT INTO rfq_lines
                    (id, rfq_id, product_id, product_code, product_name,
                     quantity, unit_price)
                VALUES
                    (:id, :rfq_id, :product_id, :product_code, :product_name,
                     2, 125)
                """
            ),
            {
                "id": str(uuid4()),
                "rfq_id": self.rfq_id,
                "product_id": self.product_id,
                "product_code": f"TXN16-{suffix}",
                "product_name": f"TXN16 product {suffix}",
            },
        )

    def tearDown(self) -> None:
        self.session.close()
        self.outer_transaction.rollback()
        self.connection.close()

    def test_approval_updates_rfq_and_inserts_earned_ledger(self) -> None:
        result = approve_rfq(
            self.session,
            rfq_id=self.rfq_id,
            body=RfqApprovalInput(
                approved=True,
                specialDiscountPercent=10,
                deliveryMode="homeDelivery",
                scheduledAt="2026-10-12",
            ),
        )

        self.assertEqual(
            (result["success"], result["error"]),
            (True, None),
        )
        rfq = result["data"]
        self.assertEqual(rfq["status"], "approved")
        self.assertEqual(rfq["grandTotal"], 225)
        self.assertEqual(rfq["specialDiscountPercent"], 10)
        self.assertEqual(rfq["rewardPoints"], 2)
        self.assertEqual(rfq["deliveryMode"], "homeDelivery")
        self.assertEqual(rfq["scheduledAt"], "2026-10-12")
        self.assertEqual(rfq["history"][-1]["action"], "approved")
        self.assertEqual(
            self.session.execute(
                text(
                    """
                    SELECT requester_id, quotation_id, points, type
                    FROM reward_ledger
                    WHERE quotation_id = :rfq_id
                    """
                ),
                {"rfq_id": self.rfq_id},
            ).one(),
            (self.partner_id, self.rfq_id, 2, "earned"),
        )

    def test_double_approval_does_not_duplicate_earned_ledger(self) -> None:
        for _ in range(2):
            approve_rfq(
                self.session,
                rfq_id=self.rfq_id,
                body=RfqApprovalInput(approved=True),
            )

        self.assertEqual(
            self.session.execute(
                text(
                    """
                    SELECT count(*)
                    FROM reward_ledger
                    WHERE quotation_id = :rfq_id
                      AND type = 'earned'
                      AND deleted_at IS NULL
                    """
                ),
                {"rfq_id": self.rfq_id},
            ).scalar_one(),
            1,
        )

    def test_rejection_does_not_insert_earned_ledger(self) -> None:
        result = approve_rfq(
            self.session,
            rfq_id=self.rfq_id,
            body=RfqApprovalInput(approved=False, specialDiscountPercent=10),
        )

        self.assertEqual(result["data"]["status"], "rejected")
        self.assertEqual(result["data"]["rewardPoints"], 0)
        self.assertEqual(
            self.session.execute(
                text(
                    "SELECT count(*) FROM reward_ledger WHERE quotation_id = :rfq_id"
                ),
                {"rfq_id": self.rfq_id},
            ).scalar_one(),
            0,
        )

    def test_ledger_insert_failure_rolls_back_rfq_update(self) -> None:
        self.connection.execute(
            text(
                """
                CREATE FUNCTION txn16_force_reward_failure() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'forced TXN-17 ledger failure';
                END;
                $$
                """
            )
        )
        self.connection.execute(
            text(
                """
                CREATE TRIGGER txn16_force_reward_failure
                BEFORE INSERT ON reward_ledger
                FOR EACH ROW EXECUTE FUNCTION txn16_force_reward_failure()
                """
            )
        )

        with self.assertRaises(DBAPIError):
            approve_rfq(
                self.session,
                rfq_id=self.rfq_id,
                body=RfqApprovalInput(approved=True),
            )

        self.assertEqual(
            self.session.execute(
                text("SELECT status FROM rfqs WHERE id = :rfq_id"),
                {"rfq_id": self.rfq_id},
            ).scalar_one(),
            "pending",
        )
        self.assertEqual(
            self.session.execute(
                text("SELECT count(*) FROM reward_ledger WHERE quotation_id = :rfq_id"),
                {"rfq_id": self.rfq_id},
            ).scalar_one(),
            0,
        )
