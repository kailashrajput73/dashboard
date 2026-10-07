from typing import Any, Optional
from fastapi.responses import JSONResponse

try:
    from ..utils import *
except ImportError:
    from utils import *

VALID_SERVICE_TYPES = {"plumber", "electrician"}
VALID_STATUSES = {"pending", "in_progress", "completed", "cancelled"}


def _history_event(status: str, actor: str = "system", note: Optional[str] = None, recommended_person: Optional[dict] = None) -> dict:
    event = {"status": status, "actor": actor, "at": now_iso()}
    if note:
        event["note"] = note
    if recommended_person:
        event["recommendedPerson"] = recommended_person
    return event


async def create_service_request(body: ServiceRequestIn):
    errors: list[str] = []
    service_type = (body.serviceType or "").strip()
    customer_name = (body.customerName or "").strip()
    customer_phone = (body.customerPhone or "").strip()
    description = (body.description or "").strip()

    if service_type not in VALID_SERVICE_TYPES:
        errors.append("serviceType must be 'plumber' or 'electrician'")
    if not customer_name:
        errors.append("customerName is required")
    if not customer_phone:
        errors.append("customerPhone is required")
    if not description:
        errors.append("description is required")

    if errors:
        return JSONResponse(status_code=400, content=envelope({"errors": errors}, False, "Service request validation failed"))

    now = now_iso()
    doc = {
        "id": new_id(),
        "serviceType": service_type,
        "customerName": customer_name,
        "customerPhone": customer_phone,
        "address": (body.address or "").strip(),
        "pincode": (body.pincode or "").strip(),
        "city": (body.city or "").strip(),
        "area": (body.area or "").strip(),
        "description": description,
        "status": "pending",
        "recommendedName": None,
        "recommendedPhone": None,
        "adminNote": None,
        "createdAt": now,
        "updatedAt": now,
        "history": [_history_event("pending", "system", "New service request created")],
    }
    await db.service_requests.insert_one(doc.copy())
    return envelope(doc)


async def list_service_requests(service_type: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None, created_from: Optional[str] = None, created_to: Optional[str] = None):
    query: dict[str, Any] = {}
    if service_type:
        query["serviceType"] = service_type
    if status:
        query["status"] = status
    if created_from or created_to:
        query["createdAt"] = {}
        if created_from:
            query["createdAt"]["$gte"] = created_from
        if created_to:
            query["createdAt"]["$lte"] = created_to
    if search and search.strip():
        term = re.escape(search.strip())
        query["$or"] = [
            {"customerName": {"$regex": term, "$options": "i"}},
            {"customerPhone": {"$regex": term, "$options": "i"}},
            {"serviceType": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"city": {"$regex": term, "$options": "i"}},
            {"area": {"$regex": term, "$options": "i"}},
        ]
    cursor = db.service_requests.find(query, {"_id": 0}).sort("createdAt", -1)
    return envelope([doc async for doc in cursor])


async def get_service_request(request_id: str):
    doc = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    if not doc:
        return JSONResponse(status_code=404, content=envelope(None, False, "Service request not found"))
    return envelope(doc)


async def update_service_request(request_id: str, body: ServiceRequestUpdateIn):
    current = await db.service_requests.find_one({"id": request_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Service request not found"))

    next_status = body.status or current.get("status") or "pending"
    if next_status not in VALID_STATUSES:
        return JSONResponse(status_code=400, content=envelope({"errors": ["status must be pending, in_progress, completed, or cancelled"]}, False, "Service request validation failed"))

    recommended_name = body.recommendedName if body.recommendedName is not None else current.get("recommendedName")
    recommended_phone = body.recommendedPhone if body.recommendedPhone is not None else current.get("recommendedPhone")
    admin_note = body.adminNote if body.adminNote is not None else current.get("adminNote")
    note = body.note or None

    if recommended_name is not None:
        recommended_name = recommended_name.strip()
    if recommended_phone is not None:
        recommended_phone = recommended_phone.strip()
    if admin_note is not None:
        admin_note = admin_note.strip()

    if next_status == "in_progress" and (recommended_name or recommended_phone):
        note = note or "Assigned recommended person"

    history = list(current.get("history", []))
    recommended_person = None
    if recommended_name or recommended_phone:
        recommended_person = {"name": recommended_name or current.get("recommendedName"), "phone": recommended_phone or current.get("recommendedPhone")}
    history.append(_history_event(next_status, body.actor or "admin", note, recommended_person))

    updates = {
        "status": next_status,
        "recommendedName": recommended_name,
        "recommendedPhone": recommended_phone,
        "adminNote": admin_note,
        "updatedAt": now_iso(),
        "history": history,
    }
    await db.service_requests.update_one({"id": request_id}, {"$set": updates})
    updated = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    return envelope(updated)


async def list_service_request_history(request_id: str):
    doc = await db.service_requests.find_one({"id": request_id}, {"_id": 0, "history": 1})
    if not doc:
        return JSONResponse(status_code=404, content=envelope(None, False, "Service request not found"))
    return envelope(doc.get("history", []))
