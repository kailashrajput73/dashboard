from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.responses import JSONResponse
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Catalog, Rack, RackSlot
from app.schemas.operational import RackAssignmentRequest, RackRequest
from app.services._common import constraint_name, envelope, error_response, isoformat
from app.services.catalog_service import _catalog_json, _pricing_for


def _now() -> datetime:
    return datetime.now(timezone.utc)


def rack_slots(rows: int, columns: int) -> list[dict[str, str | None]]:
    return [
        {"code": f"{chr(65 + row)}{column + 1}", "productId": None}
        for row in range(rows)
        for column in range(columns)
    ]


def _rack_json(
    rack: Rack,
    slots: list[RackSlot],
) -> dict[str, object]:
    return {
        "id": rack.id,
        "name": rack.name,
        "rows": rack.row_count,
        "columns": rack.column_count,
        "slots": [
            {"code": slot.slot_code, "productId": slot.product_id}
            for slot in slots
        ],
        "createdAt": isoformat(rack.created_at),
    }


def _duplicate_name_response(error: IntegrityError) -> JSONResponse | None:
    if constraint_name(error) in {"racks_name_uq", "racks_name_ci"}:
        return error_response(409, "Rack name already exists")
    return None


def _ensure_rack_slots(
    session: Session,
    rack: Rack,
    rows: int,
    columns: int,
    now: datetime,
) -> list[RackSlot]:
    codes = [slot["code"] for slot in rack_slots(rows, columns)]
    existing = session.scalars(
        select(RackSlot)
        .where(RackSlot.rack_id == rack.id)
        .with_for_update()
    ).all()
    slots_by_code = {slot.slot_code: slot for slot in existing}
    wanted = set(codes)

    for slot in existing:
        if slot.slot_code not in wanted:
            slot.deleted_at = now
            slot.product_id = None
            slot.updated_at = now

    for code in codes:
        slot = slots_by_code.get(code)
        if slot is None:
            slot = RackSlot(
                id=str(uuid4()),
                rack_id=rack.id,
                slot_code=code,
                product_id=None,
                created_at=now,
                updated_at=now,
            )
            session.add(slot)
            slots_by_code[code] = slot
        else:
            slot.deleted_at = None
            slot.product_id = None
            slot.updated_at = now

    session.flush()
    return [slots_by_code[code] for code in codes]


def list_racks(session: Session) -> dict[str, object]:
    racks = session.scalars(
        select(Rack)
        .where(Rack.deleted_at.is_(None))
        .order_by(Rack.name)
    ).all()
    if not racks:
        return envelope([])

    rack_ids = [rack.id for rack in racks]
    slots_by_rack: dict[str, list[RackSlot]] = {
        rack_id: [] for rack_id in rack_ids
    }
    slots = session.scalars(
        select(RackSlot)
        .where(
            RackSlot.rack_id.in_(rack_ids),
            RackSlot.deleted_at.is_(None),
        )
        .order_by(RackSlot.rack_id, RackSlot.slot_code)
    ).all()
    for slot in slots:
        slots_by_rack[slot.rack_id].append(slot)
    for rack_slots_for_rack in slots_by_rack.values():
        rack_slots_for_rack.sort(
            key=lambda slot: (slot.slot_code[0], int(slot.slot_code[1:]))
        )

    return envelope(
        [_rack_json(rack, slots_by_rack[rack.id]) for rack in racks]
    )


def create_rack(
    session: Session,
    body: RackRequest,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if (
        not name
        or body.rows < 1
        or body.rows > 26
        or body.columns < 1
        or body.columns > 100
    ):
        return error_response(
            400,
            "Rack needs a name and dimensions within 1-26 rows and 1-100 columns",
        )

    now = _now()
    try:
        with session.begin():
            duplicate = session.scalar(
                select(Rack.id).where(
                    func.lower(Rack.name) == name.lower(),
                    Rack.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(409, "Rack name already exists")

            rack = session.scalar(
                select(Rack)
                .where(
                    func.lower(Rack.name) == name.lower(),
                    Rack.deleted_at.is_not(None),
                )
                .order_by(Rack.created_at.desc())
                .limit(1)
                .with_for_update()
            )
            if rack is None:
                rack = Rack(
                    id=str(uuid4()),
                    name=name,
                    row_count=body.rows,
                    column_count=body.columns,
                    created_at=now,
                    updated_at=now,
                )
                session.add(rack)
                session.flush()
            else:
                rack.name = name
                rack.row_count = body.rows
                rack.column_count = body.columns
                rack.deleted_at = None
                rack.updated_at = now

            slots = _ensure_rack_slots(
                session,
                rack,
                body.rows,
                body.columns,
                now,
            )
            result = _rack_json(rack, slots)
    except IntegrityError as error:
        duplicate_response = _duplicate_name_response(error)
        if duplicate_response is not None:
            return duplicate_response
        raise
    return envelope(result)


def delete_rack(
    session: Session,
    *,
    rack_id: str,
) -> dict[str, object] | JSONResponse:
    now = _now()
    with session.begin():
        rack = session.scalar(
            select(Rack)
            .where(Rack.id == rack_id, Rack.deleted_at.is_(None))
            .with_for_update()
        )
        if rack is None:
            return error_response(404, "Rack not found")
        slots = session.scalars(
            select(RackSlot)
            .where(
                RackSlot.rack_id == rack_id,
                RackSlot.deleted_at.is_(None),
            )
            .with_for_update()
        ).all()
        if any(slot.product_id for slot in slots):
            return error_response(
                409,
                "Rack with assigned products cannot be deleted",
            )

        session.execute(
            update(RackSlot)
            .where(
                RackSlot.rack_id == rack_id,
                RackSlot.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        rack.deleted_at = now
        rack.updated_at = now
        session.flush()

    return envelope({"deleted": True, "id": rack_id})


def assign_rack_slot(
    session: Session,
    *,
    rack_id: str,
    body: RackAssignmentRequest,
) -> dict[str, object] | JSONResponse:
    now = _now()
    with session.begin():
        rack = session.scalar(
            select(Rack)
            .where(Rack.id == rack_id, Rack.deleted_at.is_(None))
            .with_for_update()
        )
        product = session.scalar(
            select(Catalog)
            .where(
                Catalog.id == body.productId,
                Catalog.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if product is None:
            product = session.scalar(
                select(Catalog)
                .where(
                    Catalog.product_code == body.productId,
                    Catalog.deleted_at.is_(None),
                )
                .with_for_update()
            )
        if rack is None or product is None:
            return error_response(404, "Rack or product not found")

        slot = session.scalar(
            select(RackSlot)
            .where(
                RackSlot.rack_id == rack.id,
                RackSlot.slot_code == body.slotCode,
                RackSlot.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if slot is None:
            return error_response(400, "Slot does not exist in this rack")

        previous_product_id = slot.product_id
        previous_product = None
        if previous_product_id and previous_product_id != product.id:
            previous_product = session.scalar(
                select(Catalog)
                .where(Catalog.id == previous_product_id)
                .with_for_update()
            )

        product_slots = session.scalars(
            select(RackSlot)
            .where(RackSlot.product_id == product.id)
            .with_for_update()
        ).all()
        previous_slot_ids = [
            previous_slot.id
            for previous_slot in product_slots
            if previous_slot.id != slot.id
        ]
        if previous_slot_ids:
            session.execute(
                update(RackSlot)
                .where(RackSlot.id.in_(previous_slot_ids))
                .values(product_id=None, updated_at=now)
            )

        if previous_product is not None:
            if (
                previous_product.rack_id == rack.id
                and previous_product.rack_slot == slot.slot_code
            ):
                previous_product.rack_id = None
                previous_product.rack_name = None
                previous_product.rack_slot = None
                previous_product.updated_at = now

        slot.product_id = product.id
        slot.updated_at = now
        product.rack_id = rack.id
        product.rack_name = rack.name
        product.rack_slot = slot.slot_code
        product.updated_at = now
        session.flush()

        result = {
            "rackId": rack.id,
            "rackName": rack.name,
            "slotCode": slot.slot_code,
            "productId": product.id,
        }
    return envelope(result)


def rack_products(
    session: Session,
    *,
    rack_id: str,
) -> dict[str, object] | JSONResponse:
    rack = session.scalar(
        select(Rack).where(Rack.id == rack_id, Rack.deleted_at.is_(None))
    )
    if rack is None:
        return error_response(404, "Rack not found")

    products = session.scalars(
        select(Catalog)
        .where(
            Catalog.rack_id == rack_id,
            Catalog.deleted_at.is_(None),
        )
        .order_by(Catalog.name)
    ).all()
    return envelope(
        [
            _catalog_json(session, product, _pricing_for(session, product.product_code))
            for product in products
        ]
    )
