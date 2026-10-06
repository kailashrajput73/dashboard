import asyncio
from types import SimpleNamespace

from backend_refactor.services import service_requests_service as svc
from backend_refactor.utils import ServiceRequestIn, ServiceRequestUpdateIn


class FakeCollection:
    def __init__(self):
        self.items = []

    async def insert_one(self, doc):
        self.items.append(doc)
        return None

    async def find_one(self, query, *args, **kwargs):
        for item in self.items:
            if query.get("id") == item.get("id"):
                return item
        return None

    async def count_documents(self, query):
        return len(self.items)

    def find(self, query=None, projection=None):
        return FakeCursor(self.items)

    async def update_one(self, query, update):
        for item in self.items:
            if query.get("id") == item.get("id"):
                if "$set" in update:
                    item.update(update["$set"])
                if "$push" in update:
                    item.setdefault("history", [])
                    item["history"].extend(update["$push"].get("history", []))
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)


class FakeCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *args, **kwargs):
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.items:
            raise StopAsyncIteration
        return self.items.pop(0)


def test_create_service_request_adds_pending_history(monkeypatch):
    collection = FakeCollection()
    monkeypatch.setattr(svc, "db", SimpleNamespace(service_requests=collection))

    body = ServiceRequestIn(
        serviceType="plumber",
        customerName="Ravi",
        customerPhone="9876543210",
        description="Kitchen tap leaking",
        address="",
        pincode="",
        city="",
        area="",
    )

    response = asyncio.run(svc.create_service_request(body))

    assert response["success"] is True
    assert response["data"]["status"] == "pending"
    assert response["data"]["serviceType"] == "plumber"
    assert response["data"]["history"][0]["status"] == "pending"


def test_update_service_request_moves_status_and_records_history(monkeypatch):
    collection = FakeCollection()
    current = {
        "id": "req-1",
        "serviceType": "electrician",
        "customerName": "Asha",
        "customerPhone": "9988776655",
        "description": "Fan issue",
        "status": "pending",
        "history": [{"status": "pending", "actor": "system", "at": "2026-01-01T00:00:00+00:00"}],
    }
    collection.items.append(current)
    monkeypatch.setattr(svc, "db", SimpleNamespace(service_requests=collection))

    body = ServiceRequestUpdateIn(
        status="in_progress",
        recommendedName="Rahul",
        recommendedPhone="9090909090",
        adminNote="Assigned to electrician team",
    )

    response = asyncio.run(svc.update_service_request("req-1", body))

    assert response["success"] is True
    assert response["data"]["status"] == "in_progress"
    assert response["data"]["recommendedName"] == "Rahul"
    assert response["data"]["history"][-1]["recommendedPerson"]["name"] == "Rahul"
