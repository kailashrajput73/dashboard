from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Catalog, Dispatch, DispatchLine, Rfq


class DispatchLineInput(BaseModel):
    productCode: str = Field(min_length=1)
    quantity: float = Field(gt=0)


class DispatchServiceError(Exception):
    status_code: int

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)

    def envelope(self) -> dict[str, Any]:
        return {"success": False, "data": None, "error": self.message}


class DispatchNotFoundError(DispatchServiceError):
    status_code = 404


class DispatchConflictError(DispatchServiceError):
    status_code = 409


class DispatchValidationError(DispatchServiceError):
    status_code = 400

    def __init__(self, errors: Sequence[str]) -> None:
        self.errors = list(errors)
        super().__init__("Dispatch validation failed")

    def envelope(self) -> dict[str, Any]:
        return {
            "success": False,
            "data": {"errors": self.errors},
            "error": self.message,
        }


def _is_duplicate_source_rfq(error: IntegrityError) -> bool:
    diagnostic = getattr(error.orig, "diag", None)
    return (
        getattr(diagnostic, "constraint_name", None)
        == "dispatches_source_rfq_id_uq"
    )


def create_dispatch(
    session: Session,
    *,
    lines: Sequence[DispatchLineInput],
    source_rfq_id: str | None = None,
    customer_name: str | None = None,
    customer_phone: str | None = None,
) -> dict[str, Any]:
    source_rfq_id = (
        source_rfq_id.strip() if source_rfq_id and source_rfq_id.strip() else None
    )

    try:
        with session.begin():
            rfq: Rfq | None = None
            if source_rfq_id is not None:
                rfq = session.scalar(
                    select(Rfq).where(Rfq.id == source_rfq_id).with_for_update()
                )
                if rfq is None:
                    raise DispatchNotFoundError("Source RFQ not found")
                if session.scalar(
                    select(Dispatch.id).where(
                        Dispatch.source_rfq_id == source_rfq_id
                    )
                ) is not None:
                    raise DispatchConflictError("RFQ already has a dispatch")
                if rfq.status != "approved":
                    raise DispatchConflictError(
                        "Only approved RFQs can be dispatched"
                    )

            errors: list[str] = []
            prepared: list[tuple[DispatchLineInput, Catalog]] = []
            for index, line in enumerate(lines, start=1):
                product_code = line.productCode.strip()
                product = session.scalar(
                    select(Catalog).where(
                        Catalog.product_code == product_code,
                        Catalog.deleted_at.is_(None),
                    )
                )
                if product is None:
                    errors.append(
                        f"Line {index}: valid product code and positive quantity "
                        "are required"
                    )
                elif product.stock < line.quantity:
                    errors.append(
                        f"Line {index}: insufficient stock for {product.name} "
                        f"(available {float(product.stock)})"
                    )
                else:
                    prepared.append((line, product))

            if errors or not prepared:
                raise DispatchValidationError(
                    errors or ["At least one valid dispatch line is required"]
                )

            dispatch_id = str(uuid4())
            created_at = datetime.now(timezone.utc)
            response_lines: list[dict[str, Any]] = []
            dispatch = Dispatch(
                id=dispatch_id,
                source_rfq_id=source_rfq_id,
                customer_name=customer_name,
                customer_phone=customer_phone,
                created_at=created_at,
            )
            session.add(dispatch)
            session.flush([dispatch])

            for line, product in prepared:
                product_code = line.productCode.strip()
                stock_result = session.execute(
                    update(Catalog)
                    .where(
                        Catalog.id == product.id,
                        Catalog.deleted_at.is_(None),
                        Catalog.stock >= line.quantity,
                    )
                    .values(stock=Catalog.stock - line.quantity)
                )
                if stock_result.rowcount != 1:
                    raise DispatchConflictError(
                        "Stock changed; please retry dispatch"
                    )

                session.add(
                    DispatchLine(
                        id=str(uuid4()),
                        dispatch_id=dispatch_id,
                        product_id=product.id,
                        product_code=product_code,
                        product_name=product.name,
                        quantity=line.quantity,
                        unit_price=product.standard_rate,
                    )
                )
                response_lines.append(
                    {
                        "productId": product.id,
                        "productCode": product_code,
                        "productName": product.name,
                        "quantity": line.quantity,
                        "unitPrice": product.standard_rate,
                    }
                )

            if rfq is not None:
                rfq.status = "dispatched"
                rfq.updated_at = created_at
                history = list(rfq.history or [])
                history.append(
                    {
                        "action": "dispatched",
                        "actor": "admin",
                        "details": {"dispatchId": dispatch_id},
                        "at": created_at.isoformat(),
                    }
                )
                rfq.history = history

            session.flush()
            return {
                "success": True,
                "data": {
                    "id": dispatch_id,
                    "sourceRfqId": source_rfq_id,
                    "customerName": customer_name,
                    "customerPhone": customer_phone,
                    "lines": response_lines,
                    "createdAt": created_at.isoformat(),
                },
                "error": None,
            }
    except IntegrityError as error:
        if _is_duplicate_source_rfq(error):
            raise DispatchConflictError("RFQ already has a dispatch") from error
        raise
