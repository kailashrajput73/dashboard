from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Catalog, Category, Subcategory, User
from app.schemas.taxonomy import (
    AdminPasscodeIn,
    SubcategoryImportIn,
    SubcategoryIn,
    SubcategoryUpdateIn,
)
from app.services._common import (
    constraint_name,
    envelope,
    error_response,
    isoformat,
)


def _verify_admin_passcode(session: Session, body: AdminPasscodeIn) -> bool:
    user = session.scalar(
        select(User).where(
            User.contact_number == body.contactNumber.strip(),
            User.role.in_(("admin", "store_manager", "staff")),
            User.deleted_at.is_(None),
        )
    )
    if user is None or not user.passcode_hash or user.is_active is False:
        return False
    try:
        return bcrypt.checkpw(body.passcode.encode(), user.passcode_hash.encode())
    except (ValueError, TypeError):
        return False


def _passcode_denied() -> JSONResponse:
    return error_response(401, "Invalid admin contact or passcode")


def _find_category_by_name(session: Session, name: str) -> Category | None:
    return session.scalar(
        select(Category).where(
            func.lower(Category.name) == name.strip().lower(),
            Category.deleted_at.is_(None),
        )
    )


def _product_count(session: Session, subcategory: Subcategory, category_name: str) -> int:
    return session.scalar(
        select(func.count(Catalog.id)).where(
            Catalog.deleted_at.is_(None),
            or_(
                Catalog.subcategory_id == subcategory.id,
                (
                    (func.lower(Catalog.category) == category_name.lower())
                    & (func.lower(Catalog.subcategory) == subcategory.name.lower())
                ),
                (
                    (func.lower(Catalog.category) == category_name.lower())
                    & (func.lower(Catalog.type_name) == subcategory.name.lower())
                ),
            ),
        )
    ) or 0


def _subcategory_json(
    session: Session,
    subcategory: Subcategory,
    category_name: str,
) -> dict[str, object]:
    return {
        "id": subcategory.id,
        "name": subcategory.name,
        "categoryId": subcategory.category_id,
        "category": category_name,
        "createdAt": isoformat(subcategory.created_at),
        "updatedAt": isoformat(subcategory.updated_at),
        "productCount": _product_count(session, subcategory, category_name),
    }


def list_subcategories(
    session: Session,
    *,
    category_id: str | None = None,
) -> dict[str, object]:
    query = (
        select(Subcategory, Category.name)
        .join(Category, Category.id == Subcategory.category_id)
        .where(
            Subcategory.deleted_at.is_(None),
            Category.deleted_at.is_(None),
        )
    )
    if category_id:
        query = query.where(Subcategory.category_id == category_id)
    rows = session.execute(query.order_by(Subcategory.name)).all()
    return envelope(
        [
            _subcategory_json(session, subcategory, category_name)
            for subcategory, category_name in rows
        ]
    )


def create_subcategory(
    session: Session,
    body: SubcategoryIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            category = session.scalar(
                select(Category).where(
                    Category.id == body.categoryId,
                    Category.deleted_at.is_(None),
                )
            )
            if category is None:
                return error_response(400, "Parent category not found")
            duplicate = session.scalar(
                select(Subcategory.id).where(
                    Subcategory.category_id == category.id,
                    func.lower(Subcategory.name) == name.lower(),
                    Subcategory.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(
                    409,
                    "Subcategory already exists under this category",
                )
            subcategory = Subcategory(
                id=str(uuid4()),
                name=name,
                category_id=category.id,
                created_at=now,
                updated_at=now,
            )
            session.add(subcategory)
            session.flush()
            result = _subcategory_json(session, subcategory, category.name)
    except IntegrityError as error:
        if constraint_name(error) == "subcategories_category_name_ci_uq":
            return error_response(
                409,
                "Subcategory already exists under this category",
            )
        raise
    return envelope(result)


def update_subcategory(
    session: Session,
    *,
    subcategory_id: str,
    body: SubcategoryUpdateIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            category = session.scalar(
                select(Category).where(
                    Category.id == body.categoryId,
                    Category.deleted_at.is_(None),
                )
            )
            if category is None:
                return error_response(400, "Parent category not found")
            duplicate = session.scalar(
                select(Subcategory.id).where(
                    Subcategory.id != subcategory_id,
                    Subcategory.category_id == category.id,
                    func.lower(Subcategory.name) == name.lower(),
                    Subcategory.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(
                    409,
                    "Subcategory already exists under this category",
                )
            subcategory = session.scalar(
                select(Subcategory)
                .where(
                    Subcategory.id == subcategory_id,
                    Subcategory.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if subcategory is None:
                return error_response(404, "Subcategory not found")
            subcategory.name = name
            subcategory.category_id = category.id
            subcategory.updated_at = now
            session.flush()
            result = _subcategory_json(session, subcategory, category.name)
    except IntegrityError as error:
        if constraint_name(error) == "subcategories_category_name_ci_uq":
            return error_response(
                409,
                "Subcategory already exists under this category",
            )
        raise
    return envelope(result)


def delete_subcategory(
    session: Session,
    *,
    subcategory_id: str,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        subcategory = session.scalar(
            select(Subcategory)
            .where(
                Subcategory.id == subcategory_id,
                Subcategory.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if subcategory is None:
            return error_response(404, "Subcategory not found")
        subcategory.deleted_at = now
        subcategory.updated_at = now
        session.flush()
    return envelope({"deleted": True, "id": subcategory_id})


def delete_subcategory_cascade(
    session: Session,
    *,
    subcategory_id: str,
    body: AdminPasscodeIn,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        if not _verify_admin_passcode(session, body):
            return _passcode_denied()
        subcategory = session.scalar(
            select(Subcategory)
            .where(
                Subcategory.id == subcategory_id,
                Subcategory.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if subcategory is None:
            return error_response(404, "Subcategory not found")
        category = session.scalar(
            select(Category).where(Category.id == subcategory.category_id)
        )
        category_name = category.name if category else ""
        products_removed = session.execute(
            update(Catalog)
            .where(
                Catalog.deleted_at.is_(None),
                or_(
                    Catalog.subcategory_id == subcategory_id,
                    (
                        (Catalog.category == category_name)
                        & or_(
                            Catalog.subcategory == subcategory.name,
                            Catalog.type_name == subcategory.name,
                        )
                    ),
                ),
            )
            .values(deleted_at=now, updated_at=now)
        ).rowcount
        subcategory.deleted_at = now
        subcategory.updated_at = now
        session.flush()
    return envelope(
        {
            "deleted": True,
            "id": subcategory_id,
            "productsRemoved": products_removed,
        }
    )


def import_subcategories(
    session: Session,
    body: SubcategoryImportIn,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    errors: list[str] = []
    prepared: list[Subcategory] = []
    seen: set[tuple[str, str]] = set()

    with session.begin():
        for index, row in enumerate(body.items, start=2):
            name = row.name.strip()
            category: Category | None = None
            if row.categoryId:
                category = session.scalar(
                    select(Category).where(
                        Category.id == row.categoryId,
                        Category.deleted_at.is_(None),
                    )
                )
            if category is None and row.category:
                category = _find_category_by_name(session, row.category)
            if not name or category is None:
                errors.append(
                    f"Row {index}: name and a valid category are required"
                )
                continue

            key = (category.id, name.casefold())
            duplicate = key in seen or session.scalar(
                select(Subcategory.id).where(
                    Subcategory.category_id == category.id,
                    func.lower(Subcategory.name) == name.lower(),
                    Subcategory.deleted_at.is_(None),
                )
            ) is not None
            if duplicate:
                errors.append(
                    f"Row {index}: duplicate subcategory '{name}' under "
                    f"'{category.name}'"
                )
                continue
            seen.add(key)
            prepared.append(
                Subcategory(
                    id=str(uuid4()),
                    name=name,
                    category_id=category.id,
                    created_at=now,
                    updated_at=now,
                )
            )

        if errors:
            return error_response(
                400,
                "Import validation failed",
                {"errors": errors},
            )
        session.add_all(prepared)
        session.flush()

    return envelope({"inserted": len(prepared), "skipped": 0})
