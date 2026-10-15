from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi.responses import JSONResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import ServiceRequest
from app.schemas.operational import (
    ServiceRequestCreateRequest,
    ServiceRequestUpdateRequest,
)
from app.services._common import envelope, error_response, escaped_like, isoformat

VALID_SERVICE_TYPES = frozenset({"plumber", "electrician"})
VALID_STATUSES = frozenset({"pending", "in_progress", "completed", "cancelled"})


def _history_event(
    status: str,
    actor: str = "system",
    note: str | None = None,
    recommended_person: dict[str, str | None] | None = None,
    at: str | None = None,
) -> dict[str, object]:
    event: dict[str, object] = {
        "status": status,
        "actor": actor,
        "at": at or datetime.now(timezone.utc).isoformat(),
    }
    if note:
        event["note"] = note
    if recommended_person:
        event["recommendedPerson"] = recommended_person
    return event


def _request_json(request: ServiceRequest) -> dict[str, Any]:
    return {
        "id": request.id,
        "serviceType": request.service_type,
        "customerName": request.customer_name,
        "customerPhone": request.customer_phone,
        "description": request.description,
        "address": request.address,
        "pincode": request.pincode,
        "city": request.city,
        "area": request.area,
        "status": request.status,
        "recommendedName": request.recommended_name,
        "recommendedPhone": request.recommended_phone,
        "adminNote": request.admin_note,
        "createdAt": isoformat(request.created_at),
        "updatedAt": isoformat(request.updated_at),
        "history": request.history or [],
    }


def create_service_request(
    session: Session,
    body: ServiceRequestCreateRequest,
) -> dict[str, object] | JSONResponse:
    service_type = body.serviceType.strip()
    customer_name = body.customerName.strip()
    customer_phone = body.customerPhone.strip()
    description = body.description.strip()

    errors: list[str] = []
    if service_type not in VALID_SERVICE_TYPES:
        errors.append("serviceType must be 'plumber' or 'electrician'")
    if not customer_name:
        errors.append("customerName is required")
    if not customer_phone:
        errors.append("customerPhone is required")
    if not description:
        errors.append("description is required")
    if errors:
        return error_response(400, "Service request validation failed", {"errors": errors})

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    request = ServiceRequest(
        id=str(uuid4()),
        service_type=service_type,
        customer_name=customer_name,
        customer_phone=customer_phone,
        description=description,
        address=body.address.strip(),
        pincode=body.pincode.strip(),
        city=body.city.strip(),
        area=body.area.strip(),
        status="pending",
        recommended_name=None,
        recommended_phone=None,
        admin_note=None,
        history=[
            _history_event(
                "pending",
                actor="system",
                note="New service request created",
                at=now_iso,
            )
        ],
        created_at=now,
        updated_at=now,
    )
    with session.begin():
        session.add(request)
        session.flush()
    return envelope(_request_json(request))


def list_service_requests(
    session: Session,
    *,
    service_type: str | None = None,
    status: str | None = None,
    search: str | None = None,
    created_from: str | None = None,
    created_to: str | None = None,
) -> dict[str, object]:
    statement = select(ServiceRequest).where(ServiceRequest.deleted_at.is_(None))
    if service_type:
        statement = statement.where(ServiceRequest.service_type == service_type)
    if status:
        statement = statement.where(ServiceRequest.status == status)
    if search and search.strip():
        pattern = f"%{escaped_like(search.strip())}%"
        statement = statement.where(
            or_(
                ServiceRequest.customer_name.ilike(pattern, escape="\\"),
                ServiceRequest.customer_phone.ilike(pattern, escape="\\"),
                ServiceRequest.service_type.ilike(pattern, escape="\\"),
                ServiceRequest.description.ilike(pattern, escape="\\"),
                ServiceRequest.city.ilike(pattern, escape="\\"),
                ServiceRequest.area.ilike(pattern, escape="\\"),
            )
        )
    requests = session.scalars(
        statement.order_by(ServiceRequest.created_at.desc())
    ).all()
    if created_from or created_to:
        requests = [
            request
            for request in requests
            if (created_from is None or request.created_at.isoformat() >= created_from)
            and (created_to is None or request.created_at.isoformat() <= created_to)
        ]
    return envelope([_request_json(request) for request in requests])


def get_service_request(
    session: Session,
    *,
    request_id: str,
) -> dict[str, object] | JSONResponse:
    request = session.scalar(
        select(ServiceRequest).where(
            ServiceRequest.id == request_id,
            ServiceRequest.deleted_at.is_(None),
        )
    )
    if request is None:
        return error_response(404, "Service request not found")
    return envelope(_request_json(request))


def update_service_request(
    session: Session,
    *,
    request_id: str,
    body: ServiceRequestUpdateRequest,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    with session.begin():
        request = session.scalar(
            select(ServiceRequest)
            .where(
                ServiceRequest.id == request_id,
                ServiceRequest.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if request is None:
            return error_response(404, "Service request not found")

        next_status = body.status or request.status or "pending"
        if next_status not in VALID_STATUSES:
            return error_response(
                400,
                "Service request validation failed",
                {"errors": ["status must be pending, in_progress, completed, or cancelled"]},
            )

        recommended_name = (
            body.recommendedName
            if body.recommendedName is not None
            else request.recommended_name
        )
        recommended_phone = (
            body.recommendedPhone
            if body.recommendedPhone is not None
            else request.recommended_phone
        )
        admin_note = (
            body.adminNote if body.adminNote is not None else request.admin_note
        )
        if recommended_name is not None:
            recommended_name = recommended_name.strip()
        if recommended_phone is not None:
            recommended_phone = recommended_phone.strip()
        if admin_note is not None:
            admin_note = admin_note.strip()

        note = body.note or None
        if next_status == "in_progress" and (recommended_name or recommended_phone):
            note = note or "Assigned recommended person"

        recommended_person = None
        if recommended_name or recommended_phone:
            recommended_person = {
                "name": recommended_name or request.recommended_name,
                "phone": recommended_phone or request.recommended_phone,
            }
        history = list(request.history or [])
        history.append(
            _history_event(
                next_status,
                actor=body.actor or "admin",
                note=note,
                recommended_person=recommended_person,
                at=now.isoformat(),
            )
        )

        request.status = next_status
        request.recommended_name = recommended_name
        request.recommended_phone = recommended_phone
        request.admin_note = admin_note
        request.updated_at = now
        request.history = history
        session.flush()
        response = _request_json(request)
    return envelope(response)


def list_service_request_history(
    session: Session,
    *,
    request_id: str,
) -> dict[str, object] | JSONResponse:
    request = session.scalar(
        select(ServiceRequest).where(
            ServiceRequest.id == request_id,
            ServiceRequest.deleted_at.is_(None),
        )
    )
    if request is None:
        return error_response(404, "Service request not found")
    return envelope(request.history or [])
