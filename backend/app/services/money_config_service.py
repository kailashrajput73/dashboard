from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import MoneyConfig
from app.schemas.operational import MoneyConfigRequest
from app.services._common import envelope


def _money_config_json(config: MoneyConfig) -> dict[str, object]:
    return {
        "id": config.id,
        "adminId": config.admin_id,
        "discountPercent": config.discount_percent,
        "gstPercent": config.gst_percent,
        "specialDiscountPercent": config.special_discount_percent,
        "showDiscount": config.show_discount,
        "showGst": config.show_gst,
        "showSpecialDiscount": config.show_special_discount,
    }


def get_money_config(
    session: Session,
    *,
    admin_id: str,
) -> dict[str, object]:
    with session.begin():
        session.execute(
            insert(MoneyConfig)
            .values(
                id=str(uuid4()),
                admin_id=admin_id,
                discount_percent=0,
                gst_percent=18,
                special_discount_percent=0,
                show_discount=True,
                show_gst=True,
                show_special_discount=False,
            )
            .on_conflict_do_nothing(index_elements=[MoneyConfig.admin_id])
        )
        config = session.scalar(
            select(MoneyConfig).where(
                MoneyConfig.admin_id == admin_id,
            )
        )
        if config is None:
            raise RuntimeError(
                f"Money configuration was not available after provisioning "
                f"defaults for admin {admin_id}."
            )
        if config.deleted_at is not None:
            config.deleted_at = None
            config.updated_at = datetime.now(timezone.utc)
            session.flush()
        payload = _money_config_json(config)
    return envelope(payload)


def update_money_config(
    session: Session,
    *,
    admin_id: str,
    body: MoneyConfigRequest,
) -> dict[str, object]:
    now = datetime.now(timezone.utc)
    values = body.model_dump()
    config_values = {
        "discount_percent": values["discountPercent"],
        "gst_percent": values["gstPercent"],
        "special_discount_percent": values["specialDiscountPercent"],
        "show_discount": values["showDiscount"],
        "show_gst": values["showGst"],
        "show_special_discount": values["showSpecialDiscount"],
        "updated_at": now,
    }
    with session.begin():
        config = session.scalar(
            insert(MoneyConfig)
            .values(
                id=str(uuid4()),
                admin_id=admin_id,
                created_at=now,
                **config_values,
            )
            .on_conflict_do_update(
                index_elements=[MoneyConfig.admin_id],
                set_=config_values,
            )
            .returning(MoneyConfig)
        )
        if config is None:
            raise RuntimeError(f"Money config upsert returned no row for {admin_id}.")
        config.deleted_at = None
        payload = _money_config_json(config)
    return envelope(payload)
