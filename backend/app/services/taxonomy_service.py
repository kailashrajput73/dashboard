from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Brand,
    Catalog,
    Category,
    ProductType,
    Subcategory,
    User,
)
from app.schemas.taxonomy import (
    AdminPasscodeIn,
    BrandIn,
    BrandUpdateIn,
    CategoryIn,
    CategoryUpdateIn,
    ProductTypeIn,
    ProductTypeUpdateIn,
)
from app.services._common import (
    constraint_name,
    envelope,
    error_response,
    isoformat,
)


_ACTIVE_TEAM_ROLES = ("admin", "store_manager", "staff")
_TYPE_LABELS = ("UPVC", "CPVC", "PPR", "HDPE", "PVC", "PE", "PP")
_CLASS_PATTERNS = (
    (r"SDR\s*13\.?5", "SDR13.5"),
    (r"SDR\s*11", "SDR11"),
    (r"SCH(?:EDULE)?\s*80", "Sch 80"),
    (r"SCH(?:EDULE)?\s*40", "Sch 40"),
)


def _infer_product_type(*values: str | None) -> str | None:
    blob = " ".join(value for value in values if value)
    if not blob.strip():
        return None
    for label in _TYPE_LABELS:
        if re.search(rf"\b{re.escape(label)}\b", blob, re.IGNORECASE):
            return label
    return None


def _infer_product_class(*values: str | None) -> str | None:
    blob = " ".join(value for value in values if value)
    if not blob.strip():
        return None
    for pattern, label in _CLASS_PATTERNS:
        if re.search(pattern, blob, re.IGNORECASE):
            return label
    return None


def _looks_like_schedule(value: str | None) -> bool:
    return bool(
        re.match(
            r"^\s*(sch(?:edule)?\s*\d+|sdr\s*[\d.]+)\s*$",
            value or "",
            re.IGNORECASE,
        )
    )


def _resolve_product_taxonomy(
    type_value: str | None,
    subcategory: str | None,
    product_class: str | None,
    *names: str | None,
) -> tuple[str | None, str | None]:
    type_raw = (type_value or "").strip() or None
    sub_raw = (subcategory or "").strip() or None
    class_raw = (product_class or "").strip() or None

    if class_raw:
        return _infer_product_type(type_raw, sub_raw, *names) or type_raw, class_raw
    if _looks_like_schedule(type_raw):
        out_class = _infer_product_class(type_raw, class_raw, *names) or type_raw
        return _infer_product_type(sub_raw, *names), out_class
    out_type = (
        _infer_product_type(type_raw)
        or _infer_product_type(type_raw, sub_raw, *names)
        or type_raw
    )
    return out_type, _infer_product_class(class_raw, type_raw, *names)


def _category_json(category: Category, product_count: int) -> dict[str, object]:
    return {
        "id": category.id,
        "name": category.name,
        "isDefault": category.is_default,
        "isActive": category.is_active,
        "productCount": product_count,
        "imageUrl": category.image_url,
    }


def _brand_json(brand: Brand, product_count: int) -> dict[str, object]:
    return {
        "id": brand.id,
        "name": brand.name,
        "isActive": brand.is_active,
        "productCount": product_count,
        "logoUrl": brand.logo_url,
        "createdAt": isoformat(brand.created_at),
        "updatedAt": isoformat(brand.updated_at),
    }


def _product_type_json(
    product_type: ProductType,
    product_count: int,
) -> dict[str, object]:
    return {
        "id": product_type.id,
        "name": product_type.name,
        "isActive": product_type.is_active,
        "imageUrl": product_type.image_url,
        "productCount": product_count,
        "createdAt": isoformat(product_type.created_at),
        "updatedAt": isoformat(product_type.updated_at),
    }


def _verify_admin_passcode(session: Session, body: AdminPasscodeIn) -> bool:
    user = session.scalar(
        select(User).where(
            User.contact_number == body.contactNumber.strip(),
            User.role.in_(_ACTIVE_TEAM_ROLES),
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


def _name_exists(session: Session, model: type[Category] | type[Brand] | type[ProductType], name: str, *, exclude_id: str | None = None) -> bool:
    query = select(model.id).where(
        func.lower(model.name) == name.lower(),
        model.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)
    return session.scalar(query) is not None


def _category_product_count(session: Session, category_name: str) -> int:
    return session.scalar(
        select(func.count(Catalog.id)).where(
            Catalog.category == category_name,
            Catalog.deleted_at.is_(None),
        )
    ) or 0


def list_categories(session: Session, *, active_only: bool = False) -> dict[str, object]:
    query = select(Category).where(Category.deleted_at.is_(None))
    if active_only:
        query = query.where(Category.is_active.is_(True))
    categories = session.scalars(query.order_by(Category.name)).all()
    return envelope(
        [
            _category_json(category, _category_product_count(session, category.name))
            for category in categories
        ]
    )


def create_category(
    session: Session,
    body: CategoryIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    category = Category(
        id=str(uuid4()),
        name=name,
        is_default=False,
        is_active=True,
        product_count=0,
        image_url=(body.imageUrl or "").strip() or None,
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            if _name_exists(session, Category, name):
                return error_response(409, "Category name already exists")
            session.add(category)
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "categories_name_ci_uq":
            return error_response(409, "Category name already exists")
        raise
    return envelope(_category_json(category, 0))


def update_category(
    session: Session,
    *,
    category_id: str,
    body: CategoryUpdateIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            category = session.scalar(
                select(Category)
                .where(
                    Category.id == category_id,
                    Category.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if category is None:
                return error_response(404, "Category not found")
            if _name_exists(session, Category, name, exclude_id=category_id):
                return error_response(409, "Category name already exists")

            old_name = category.name
            category.name = name
            category.is_active = body.isActive
            if "imageUrl" in body.model_fields_set:
                category.image_url = (body.imageUrl or "").strip() or None
            category.updated_at = now
            if old_name != name:
                session.execute(
                    update(Catalog)
                    .where(
                        Catalog.category == old_name,
                        Catalog.deleted_at.is_(None),
                    )
                    .values(category=name, updated_at=now)
                )
            session.flush()
            product_count = _category_product_count(session, name)
            result = _category_json(category, product_count)
    except IntegrityError as error:
        if constraint_name(error) == "categories_name_ci_uq":
            return error_response(409, "Category name already exists")
        raise
    return envelope(result)


def delete_category(
    session: Session,
    *,
    category_id: str,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        category = session.scalar(
            select(Category)
            .where(Category.id == category_id, Category.deleted_at.is_(None))
            .with_for_update()
        )
        if category is None:
            return error_response(404, "Category not found")
        session.execute(
            update(Subcategory)
            .where(
                Subcategory.category_id == category_id,
                Subcategory.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        category.deleted_at = now
        category.updated_at = now
        result = {"deleted": True, "id": category_id, "name": category.name}
        session.flush()
    return envelope(result)


def delete_category_cascade(
    session: Session,
    *,
    category_id: str,
    body: AdminPasscodeIn,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        if not _verify_admin_passcode(session, body):
            return _passcode_denied()
        category = session.scalar(
            select(Category)
            .where(Category.id == category_id, Category.deleted_at.is_(None))
            .with_for_update()
        )
        if category is None:
            return error_response(404, "Category not found")
        products_removed = session.execute(
            update(Catalog)
            .where(
                Catalog.category == category.name,
                Catalog.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        ).rowcount
        session.execute(
            update(Subcategory)
            .where(
                Subcategory.category_id == category_id,
                Subcategory.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        category.deleted_at = now
        category.updated_at = now
        session.flush()
    return envelope(
        {
            "deleted": True,
            "id": category_id,
            "productsRemoved": products_removed,
        }
    )


def list_brands(session: Session) -> dict[str, object]:
    brands = session.scalars(
        select(Brand)
        .where(Brand.deleted_at.is_(None))
        .order_by(Brand.name)
    ).all()
    result = []
    for brand in brands:
        count = session.scalar(
            select(func.count(Catalog.id)).where(
                Catalog.deleted_at.is_(None),
                or_(
                    Catalog.brand_id == brand.id,
                    func.lower(Catalog.brand) == brand.name.lower(),
                ),
            )
        ) or 0
        result.append(_brand_json(brand, count))
    return envelope(result)


def create_brand(
    session: Session,
    body: BrandIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    brand = Brand(
        id=str(uuid4()),
        name=name,
        is_active=True,
        product_count=0,
        logo_url=(body.logoUrl or "").strip() or None,
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            if _name_exists(session, Brand, name):
                return error_response(409, "Brand name already exists")
            session.add(brand)
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "brands_name_ci_uq":
            return error_response(409, "Brand name already exists")
        raise
    return envelope(_brand_json(brand, 0))


def update_brand(
    session: Session,
    *,
    brand_id: str,
    body: BrandUpdateIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            brand = session.scalar(
                select(Brand)
                .where(Brand.id == brand_id, Brand.deleted_at.is_(None))
                .with_for_update()
            )
            if brand is None:
                return error_response(404, "Brand not found")
            if _name_exists(session, Brand, name, exclude_id=brand_id):
                return error_response(409, "Brand name already exists")

            renamed = brand.name != name
            brand.name = name
            brand.is_active = body.isActive
            if "logoUrl" in body.model_fields_set:
                brand.logo_url = (body.logoUrl or "").strip() or None
            brand.updated_at = now
            if renamed:
                session.execute(
                    update(Catalog)
                    .where(
                        Catalog.brand_id == brand_id,
                        Catalog.deleted_at.is_(None),
                    )
                    .values(brand=name, updated_at=now)
                )
            session.flush()
            product_count = session.scalar(
                select(func.count(Catalog.id)).where(
                    Catalog.brand_id == brand_id,
                    Catalog.deleted_at.is_(None),
                )
            ) or 0
            result = _brand_json(brand, product_count)
    except IntegrityError as error:
        if constraint_name(error) == "brands_name_ci_uq":
            return error_response(409, "Brand name already exists")
        raise
    return envelope(result)


def delete_brand_cascade(
    session: Session,
    *,
    brand_id: str,
    body: AdminPasscodeIn,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        if not _verify_admin_passcode(session, body):
            return _passcode_denied()
        brand = session.scalar(
            select(Brand)
            .where(Brand.id == brand_id, Brand.deleted_at.is_(None))
            .with_for_update()
        )
        if brand is None:
            return error_response(404, "Brand not found")
        products_removed = session.execute(
            update(Catalog)
            .where(
                Catalog.deleted_at.is_(None),
                or_(
                    Catalog.brand_id == brand_id,
                    func.lower(Catalog.brand) == brand.name.lower(),
                ),
            )
            .values(deleted_at=now, updated_at=now)
        ).rowcount
        brand.deleted_at = now
        brand.updated_at = now
        session.flush()
    return envelope(
        {"deleted": True, "id": brand_id, "productsRemoved": products_removed}
    )


def _ensure_product_type(session: Session, name: str | None, now: datetime) -> None:
    cleaned = (name or "").strip()
    if not cleaned:
        return
    exists = session.scalar(
        select(ProductType.id).where(
            func.lower(ProductType.name) == cleaned.lower(),
            ProductType.deleted_at.is_(None),
        )
    )
    if exists is None:
        session.add(
            ProductType(
                id=str(uuid4()),
                name=cleaned,
                is_active=True,
                image_url=None,
                created_at=now,
                updated_at=now,
            )
        )
        session.flush()


def _sync_product_types(session: Session, now: datetime) -> None:
    products = session.scalars(
        select(Catalog)
        .where(Catalog.deleted_at.is_(None))
        .with_for_update()
    ).all()
    names: set[str] = set()
    for product in products:
        resolved_type, resolved_class = _resolve_product_taxonomy(
            product.type_name,
            product.subcategory,
            product.product_class,
            product.name,
            product.product_name,
        )
        if resolved_type and product.type_name != resolved_type:
            product.type_name = resolved_type
            product.updated_at = now
        if resolved_class and product.product_class != resolved_class:
            product.product_class = resolved_class
            product.updated_at = now
        name = resolved_type or product.type_name
        if name:
            names.add(name)
            _ensure_product_type(session, name, now)
    for name in names:
        _ensure_product_type(session, name, now)


def list_product_types(
    session: Session,
    *,
    active_only: bool = False,
) -> dict[str, object]:
    now = datetime.now(timezone.utc)
    with session.begin():
        _sync_product_types(session, now)
        query = select(ProductType).where(ProductType.deleted_at.is_(None))
        if active_only:
            query = query.where(ProductType.is_active.is_(True))
        product_types = session.scalars(query.order_by(ProductType.name)).all()
        result = []
        for product_type in product_types:
            count = session.scalar(
                select(func.count(Catalog.id)).where(
                    func.lower(Catalog.type_name) == product_type.name.lower(),
                    Catalog.deleted_at.is_(None),
                )
            ) or 0
            result.append(_product_type_json(product_type, count))
    return envelope(result)


def create_product_type(
    session: Session,
    body: ProductTypeIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    product_type = ProductType(
        id=str(uuid4()),
        name=name,
        is_active=True,
        image_url=(body.imageUrl or "").strip() or None,
        product_count=0,
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            if _name_exists(session, ProductType, name):
                return error_response(409, "Product type already exists")
            session.add(product_type)
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "product_types_name_ci_uq":
            return error_response(409, "Product type already exists")
        raise
    return envelope(_product_type_json(product_type, 0))


def update_product_type(
    session: Session,
    *,
    type_id: str,
    body: ProductTypeUpdateIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    if not name:
        return error_response(400, "Name required")
    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            product_type = session.scalar(
                select(ProductType)
                .where(
                    ProductType.id == type_id,
                    ProductType.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if product_type is None:
                return error_response(404, "Product type not found")
            if _name_exists(
                session,
                ProductType,
                name,
                exclude_id=type_id,
            ):
                return error_response(409, "Product type already exists")

            old_name = product_type.name
            product_type.name = name
            product_type.is_active = body.isActive
            if "imageUrl" in body.model_fields_set:
                product_type.image_url = (body.imageUrl or "").strip() or None
            product_type.updated_at = now
            if old_name != name:
                session.execute(
                    update(Catalog)
                    .where(
                        func.lower(Catalog.type_name) == old_name.lower(),
                        Catalog.deleted_at.is_(None),
                    )
                    .values(type_name=name, updated_at=now)
                )
            session.flush()
            count = session.scalar(
                select(func.count(Catalog.id)).where(
                    func.lower(Catalog.type_name) == name.lower(),
                    Catalog.deleted_at.is_(None),
                )
            ) or 0
            result = _product_type_json(product_type, count)
    except IntegrityError as error:
        if constraint_name(error) == "product_types_name_ci_uq":
            return error_response(409, "Product type already exists")
        raise
    return envelope(result)
