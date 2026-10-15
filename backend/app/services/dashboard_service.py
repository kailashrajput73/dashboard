from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Catalog,
    Dispatch,
    DispatchLine,
    Partner,
    Rfq,
    RfqLine,
)


def dashboard_snapshot(session: Session) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    cutoff_7d = now - timedelta(days=7)
    live_catalog = Catalog.deleted_at.is_(None)
    live_category = Category.deleted_at.is_(None)
    live_partner = Partner.deleted_at.is_(None)
    live_rfq = Rfq.deleted_at.is_(None)
    live_dispatch = Dispatch.deleted_at.is_(None)
    live_dispatch_line = DispatchLine.deleted_at.is_(None)

    catalog_count = session.scalar(
        select(func.count(Catalog.id)).where(live_catalog)
    ) or 0
    category_count = session.scalar(
        select(func.count(Category.id)).where(live_category)
    ) or 0
    stock_totals = session.execute(
        select(
            func.coalesce(func.sum(Catalog.stock), 0),
            func.count(Catalog.id).filter(
                Catalog.stock <= Catalog.reorder_level
            ),
        ).where(live_catalog)
    ).one()

    rfq_counts: dict[str, int] = {
        "pending": 0,
        "approved": 0,
        "rejected": 0,
        "dispatched": 0,
    }
    grouped_rfqs = session.execute(
        select(func.coalesce(Rfq.status, "pending"), func.count(Rfq.id))
        .where(live_rfq)
        .group_by(func.coalesce(Rfq.status, "pending"))
    )
    for status, count in grouped_rfqs:
        rfq_counts[status] = count

    pending_line_count = (
        select(func.count(RfqLine.id))
        .where(
            RfqLine.rfq_id == Rfq.id,
            RfqLine.deleted_at.is_(None),
        )
        .correlate(Rfq)
        .scalar_subquery()
    )
    pending_rows = session.execute(
        select(
            Rfq.id,
            Rfq.partner_id,
            Rfq.created_at,
            pending_line_count.label("line_count"),
        )
        .where(live_rfq, Rfq.status == "pending")
        .order_by(Rfq.created_at.desc())
        .limit(5)
    )
    pending_rfqs = [
        {
            "id": row.id,
            "partnerId": row.partner_id,
            "lineCount": row.line_count,
            "createdAt": row.created_at.isoformat() if row.created_at else None,
        }
        for row in pending_rows
    ]

    partners_total = session.scalar(
        select(func.count(Partner.id)).where(live_partner)
    ) or 0
    partners_kyc_approved = session.scalar(
        select(func.count(Partner.id)).where(
            live_partner,
            Partner.kyc_status == "approved",
        )
    ) or 0

    dispatch_count_7d = session.scalar(
        select(func.count(Dispatch.id)).where(
            live_dispatch,
            Dispatch.created_at >= cutoff_7d,
        )
    ) or 0
    dispatch_value_7d = session.scalar(
        select(
            func.coalesce(
                func.sum(DispatchLine.quantity * DispatchLine.unit_price),
                0,
            )
        )
        .join(Dispatch, Dispatch.id == DispatchLine.dispatch_id)
        .where(
            live_dispatch_line,
            live_dispatch,
            Dispatch.created_at >= cutoff_7d,
        )
    ) or 0

    normalized_product_code = func.trim(DispatchLine.product_code)
    moving_quantities = session.execute(
        select(
            normalized_product_code.label("product_code"),
            func.sum(DispatchLine.quantity).label("dispatch_qty"),
        )
        .join(Dispatch, Dispatch.id == DispatchLine.dispatch_id)
        .where(
            live_dispatch_line,
            live_dispatch,
            Dispatch.created_at >= cutoff,
            DispatchLine.product_code.is_not(None),
            normalized_product_code != "",
        )
        .group_by(normalized_product_code)
        .order_by(func.sum(DispatchLine.quantity).desc(), normalized_product_code)
        .limit(5)
    )
    top_moving = list(moving_quantities)
    moving_codes = [row.product_code for row in top_moving]
    names_by_code: dict[str, str] = {}
    if moving_codes:
        catalog_names = session.execute(
            select(Catalog.product_code, Catalog.name).where(
                live_catalog,
                Catalog.product_code.in_(moving_codes),
            )
        )
        names_by_code = {
            code: name
            for code, name in catalog_names
            if code is not None
        }
    top_products = [
        {
            "productCode": row.product_code,
            "name": names_by_code.get(row.product_code) or row.product_code,
            "dispatchQty": float(row.dispatch_qty or 0),
        }
        for row in top_moving
    ]

    movement_exists = (
        select(func.trim(DispatchLine.product_code))
        .join(Dispatch, Dispatch.id == DispatchLine.dispatch_id)
        .where(
            live_dispatch_line,
            live_dispatch,
            Dispatch.created_at >= cutoff,
            func.trim(DispatchLine.product_code) == Catalog.product_code,
        )
        .group_by(func.trim(DispatchLine.product_code))
        .having(func.sum(DispatchLine.quantity) > 0)
        .correlate(Catalog)
        .exists()
    )
    slow_rows = session.execute(
        select(Catalog.product_code, Catalog.name, Catalog.stock)
        .where(
            live_catalog,
            Catalog.stock > 0,
            Catalog.product_code.is_not(None),
            Catalog.product_code != "",
            ~movement_exists,
        )
        .order_by(Catalog.stock.desc(), Catalog.product_code)
        .limit(5)
    )
    slow_products = [
        {
            "productCode": row.product_code,
            "name": row.name or row.product_code,
            "stock": float(row.stock or 0),
        }
        for row in slow_rows
    ]

    return {
        "success": True,
        "data": {
            "catalogCount": catalog_count,
            "categoryCount": category_count,
            "totalStockUnits": round(float(stock_totals[0] or 0), 2),
            "lowStockCount": stock_totals[1],
            "rfqCounts": rfq_counts,
            "pendingRfqs": pending_rfqs,
            "partnersTotal": partners_total,
            "partnersKycApproved": partners_kyc_approved,
            "dispatchValue7d": round(float(dispatch_value_7d), 2),
            "dispatchCount7d": dispatch_count_7d,
            "salesWindowDays": 30,
            "topMovingProducts": top_products,
            "slowMovingProducts": slow_products,
        },
        "error": None,
    }
