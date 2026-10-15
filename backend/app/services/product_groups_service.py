from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Catalog, ProductGroup, ProductGroupItem
from app.schemas.taxonomy import AdminPasscodeIn, ProductGroupIn
from app.services import taxonomy_service
from app.services._common import constraint_name, envelope, error_response, isoformat
from app.services.catalog_service import _soft_delete_products


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _valid_product_ids(session: Session, product_ids: list[str]) -> list[str]:
    unique_ids = list(dict.fromkeys(product_ids))
    if len(unique_ids) < 2:
        return []
    existing_ids = session.scalars(
        select(Catalog.id).where(
            Catalog.id.in_(unique_ids),
            Catalog.deleted_at.is_(None),
        )
    ).all()
    return unique_ids if len(existing_ids) == len(unique_ids) else []


def _group_json(
    group: ProductGroup,
    product_ids: list[str],
) -> dict[str, object]:
    return {
        "id": group.id,
        "name": group.name,
        "productIds": product_ids,
        "productCount": len(product_ids),
        "createdAt": isoformat(group.created_at),
        "updatedAt": isoformat(group.updated_at),
    }


def _replace_group_products(
    session: Session,
    group: ProductGroup,
    product_ids: list[str],
    now: datetime,
) -> None:
    links = session.scalars(
        select(ProductGroupItem)
        .where(ProductGroupItem.product_group_id == group.id)
        .with_for_update()
    ).all()
    links_by_product = {link.product_id: link for link in links}
    target_ids = set(product_ids)

    for link in links:
        if link.product_id in target_ids:
            if link.deleted_at is not None:
                link.deleted_at = None
                link.updated_at = now
        elif link.deleted_at is None:
            link.deleted_at = now
            link.updated_at = now

    for product_id in product_ids:
        if product_id not in links_by_product:
            session.add(
                ProductGroupItem(
                    product_group_id=group.id,
                    product_id=product_id,
                    created_at=now,
                    updated_at=now,
                )
            )

    group.product_count = len(product_ids)
    group.updated_at = now
    session.flush()


def _duplicate_name_response(error: IntegrityError) -> JSONResponse | None:
    if constraint_name(error) in {
        "product_groups_name_uq",
        "product_groups_name_ci",
    }:
        return error_response(409, "Product group name already exists")
    return None


def list_product_groups(session: Session) -> dict[str, object]:
    groups = session.scalars(
        select(ProductGroup)
        .where(ProductGroup.deleted_at.is_(None))
        .order_by(ProductGroup.name)
    ).all()
    if not groups:
        return envelope([])

    group_ids = [group.id for group in groups]
    product_ids_by_group: dict[str, list[str]] = {group_id: [] for group_id in group_ids}
    links = session.execute(
        select(ProductGroupItem.product_group_id, ProductGroupItem.product_id)
        .join(Catalog, Catalog.id == ProductGroupItem.product_id)
        .where(
            ProductGroupItem.product_group_id.in_(group_ids),
            ProductGroupItem.deleted_at.is_(None),
            Catalog.deleted_at.is_(None),
        )
        .order_by(
            ProductGroupItem.product_group_id,
            ProductGroupItem.created_at,
            ProductGroupItem.product_id,
        )
    ).all()
    for group_id, product_id in links:
        product_ids_by_group[group_id].append(product_id)

    return envelope(
        [
            _group_json(group, product_ids_by_group[group.id])
            for group in groups
        ]
    )


def create_product_group(
    session: Session,
    body: ProductGroupIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(
            400,
            "Group needs a name and at least two valid products",
        )

    now = _now()
    try:
        with session.begin():
            product_ids = _valid_product_ids(session, body.productIds)
            if not product_ids:
                return error_response(
                    400,
                    "Group needs a name and at least two valid products",
                )
            existing = session.scalar(
                select(ProductGroup.id).where(
                    func.lower(ProductGroup.name) == name.lower(),
                    ProductGroup.deleted_at.is_(None),
                )
            )
            if existing is not None:
                return error_response(409, "Product group name already exists")

            group = session.scalar(
                select(ProductGroup)
                .where(
                    func.lower(ProductGroup.name) == name.lower(),
                    ProductGroup.deleted_at.is_not(None),
                )
                .order_by(ProductGroup.created_at.desc())
                .limit(1)
                .with_for_update()
            )
            if group is None:
                group = ProductGroup(
                    id=str(uuid4()),
                    name=name,
                    product_count=0,
                    created_at=now,
                    updated_at=now,
                )
                session.add(group)
                session.flush()
            else:
                group.name = name
                group.deleted_at = None
                group.updated_at = now

            _replace_group_products(session, group, product_ids, now)
            result = _group_json(group, product_ids)
    except IntegrityError as error:
        duplicate = _duplicate_name_response(error)
        if duplicate is not None:
            return duplicate
        raise
    return envelope(result)


def update_product_group(
    session: Session,
    *,
    group_id: str,
    body: ProductGroupIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    now = _now()
    try:
        with session.begin():
            group = session.scalar(
                select(ProductGroup)
                .where(
                    ProductGroup.id == group_id,
                    ProductGroup.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if group is None:
                return error_response(404, "Product group not found")

            product_ids = _valid_product_ids(session, body.productIds)
            if not name or not product_ids:
                return error_response(
                    400,
                    "Group needs a name and at least two valid products",
                )
            duplicate = session.scalar(
                select(ProductGroup.id).where(
                    func.lower(ProductGroup.name) == name.lower(),
                    ProductGroup.id != group_id,
                    ProductGroup.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(409, "Product group name already exists")

            group.name = name
            _replace_group_products(session, group, product_ids, now)
            result = _group_json(group, product_ids)
    except IntegrityError as error:
        duplicate = _duplicate_name_response(error)
        if duplicate is not None:
            return duplicate
        raise
    return envelope(result)


def delete_product_group(
    session: Session,
    *,
    group_id: str,
) -> dict[str, object] | JSONResponse:
    now = _now()
    with session.begin():
        group = session.scalar(
            select(ProductGroup)
            .where(
                ProductGroup.id == group_id,
                ProductGroup.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if group is None:
            return error_response(404, "Product group not found")
        session.execute(
            update(ProductGroupItem)
            .where(
                ProductGroupItem.product_group_id == group_id,
                ProductGroupItem.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        group.deleted_at = now
        group.product_count = 0
        group.updated_at = now
        session.flush()
    return envelope({"deleted": True, "id": group_id})


def delete_product_group_cascade(
    session: Session,
    *,
    group_id: str,
    body: AdminPasscodeIn,
) -> dict[str, object] | JSONResponse:
    now = _now()
    with session.begin():
        if not taxonomy_service._verify_admin_passcode(session, body):
            return taxonomy_service._passcode_denied()
        group = session.scalar(
            select(ProductGroup)
            .where(
                ProductGroup.id == group_id,
                ProductGroup.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if group is None:
            return error_response(404, "Product group not found")

        group_product_ids = select(ProductGroupItem.product_id).where(
            ProductGroupItem.product_group_id == group_id,
            ProductGroupItem.deleted_at.is_(None),
        )
        product_filters = [Catalog.id.in_(group_product_ids)]
        group_name = group.name.strip()
        if group_name:
            product_filters.append(
                func.lower(Catalog.product_group) == group_name.lower()
            )
        products = session.scalars(
            select(Catalog)
            .where(
                Catalog.deleted_at.is_(None),
                or_(*product_filters),
            )
            .with_for_update()
        ).all()
        products_removed = _soft_delete_products(session, list(products))
        session.execute(
            update(ProductGroupItem)
            .where(
                ProductGroupItem.product_group_id == group_id,
                ProductGroupItem.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        group.deleted_at = now
        group.product_count = 0
        group.updated_at = now
        session.flush()

    return envelope(
        {
            "deleted": True,
            "id": group_id,
            "productsRemoved": products_removed,
        }
    )
