"""Backend tests for Quotation Generator mirror API."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://quotation-expo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _env_ok(r):
    j = r.json()
    assert set(j.keys()) >= {"success", "data", "error"}
    return j


# ---------- Health ----------

class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        j = _env_ok(r)
        assert j["success"] is True
        assert j["data"]["ok"] is True


# ---------- Categories ----------

class TestCategories:
    def test_default_categories_present(self, api_client):
        r = api_client.get(f"{API}/categories")
        assert r.status_code == 200
        j = _env_ok(r)
        names = {c["name"] for c in j["data"]}
        for expected in ["General", "Materials", "Labor", "Services", "Equipment"]:
            assert expected in names, f"Missing default category {expected}"

    def test_create_new_category(self, api_client):
        cname = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = api_client.post(f"{API}/categories", json={"name": cname})
        assert r.status_code == 200
        j = _env_ok(r)
        assert j["data"]["name"] == cname
        # Verify persistence via list
        r2 = api_client.get(f"{API}/categories")
        names = {c["name"] for c in r2.json()["data"]}
        assert cname in names

    def test_category_management(self, api_client):
        cname = f"TEST_Manage_{uuid.uuid4().hex[:6]}"
        created = api_client.post(f"{API}/categories", json={"name": cname})
        assert created.status_code == 200
        category = created.json()["data"]
        assert category["isActive"] is True
        assert category["productCount"] == 0

        duplicate = api_client.post(f"{API}/categories", json={"name": cname.lower()})
        assert duplicate.status_code == 409

        item = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_CategoryProduct_{uuid.uuid4().hex[:6]}",
            "category": cname,
            "unit": "ea",
            "standardRate": 10,
        })
        assert item.status_code == 200

        renamed = f"{cname}_Renamed"
        updated = api_client.put(f"{API}/categories/{category['id']}", json={
            "name": renamed,
            "isActive": False,
        })
        assert updated.status_code == 200
        assert updated.json()["data"]["isActive"] is False
        assert updated.json()["data"]["productCount"] == 1

        products = api_client.get(f"{API}/catalog", params={"category": renamed})
        assert len(products.json()["data"]) == 1

    def test_subcategory_crud_and_validated_import(self, api_client):
        cname = f"TEST_SubParent_{uuid.uuid4().hex[:6]}"
        category = api_client.post(f"{API}/categories", json={"name": cname}).json()["data"]
        sub_name = f"TEST_Sub_{uuid.uuid4().hex[:6]}"
        created = api_client.post(f"{API}/subcategories", json={"name": sub_name, "categoryId": category["id"]})
        assert created.status_code == 200
        subcategory = created.json()["data"]
        assert subcategory["categoryId"] == category["id"]

        duplicate = api_client.post(f"{API}/subcategories", json={"name": sub_name.lower(), "categoryId": category["id"]})
        assert duplicate.status_code == 409

        invalid_import = api_client.post(f"{API}/subcategories/import", json={
            "items": [{"name": "TEST_Invalid", "categoryId": "missing"}],
        })
        assert invalid_import.status_code == 400
        assert api_client.get(f"{API}/subcategories").json()["data"]

        deleted = api_client.delete(f"{API}/subcategories/{subcategory['id']}")
        assert deleted.status_code == 200
        assert deleted.json()["data"]["deleted"] is True

    def test_brand_lifecycle_and_product_link(self, api_client):
        brand_name = f"TEST_Brand_{uuid.uuid4().hex[:6]}"
        created = api_client.post(f"{API}/brands", json={"name": brand_name})
        assert created.status_code == 200
        brand = created.json()["data"]
        assert brand["isActive"] is True

        duplicate = api_client.post(f"{API}/brands", json={"name": brand_name.lower()})
        assert duplicate.status_code == 409

        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_BrandProduct_{uuid.uuid4().hex[:6]}",
            "category": "Materials", "unit": "ea", "standardRate": 10,
            "brandId": brand["id"],
        })
        assert product.status_code == 200
        assert product.json()["data"]["brandId"] == brand["id"]

        disabled = api_client.put(f"{API}/brands/{brand['id']}", json={"name": brand_name, "isActive": False})
        assert disabled.status_code == 200
        assert disabled.json()["data"]["productCount"] == 1

    def test_product_metadata_and_generated_code(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_MetaBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": "TEST_MetadataProduct", "category": "Materials", "unit": "box",
            "standardRate": 25, "brandId": brand["id"], "aliases": ["box item"],
            "multilingualNames": {"hi": "डिब्बा"}, "displaySequence": 4,
            "reorderLevel": 10, "regularDiscount": 3,
        })
        assert product.status_code == 200
        data = product.json()["data"]
        assert data["productCode"].startswith("PRD-")
        assert data["qrCode"] == data["productCode"]
        assert data["aliases"] == ["box item"]
        search = api_client.get(f"{API}/catalog", params={"search": "box item"})
        assert any(item["id"] == data["id"] for item in search.json()["data"])

    def test_product_group_requires_two_products_and_syncs_membership(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_GroupBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product_ids = []
        for index in range(2):
            product = api_client.post(f"{API}/catalog", json={
                "name": f"TEST_GroupProduct_{uuid.uuid4().hex[:6]}_{index}", "category": "Materials",
                "unit": "ea", "standardRate": 10, "brandId": brand["id"],
            }).json()["data"]
            product_ids.append(product["id"])
        too_small = api_client.post(f"{API}/product-groups", json={"name": "TEST_TooSmall", "productIds": product_ids[:1]})
        assert too_small.status_code == 400
        created = api_client.post(f"{API}/product-groups", json={"name": "TEST_Group", "productIds": product_ids})
        assert created.status_code == 200
        group = created.json()["data"]
        assert group["productCount"] == 2
        filtered = api_client.get(f"{API}/catalog", params={"group_id": group["id"]})
        assert {item["id"] for item in filtered.json()["data"]} == set(product_ids)

    def test_rack_generates_slots_and_assigns_product(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_RackBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_RackProduct_{uuid.uuid4().hex[:6]}", "category": "Materials",
            "unit": "ea", "standardRate": 10, "brandId": brand["id"],
        }).json()["data"]
        rack = api_client.post(f"{API}/racks", json={"name": f"TEST_Rack_{uuid.uuid4().hex[:6]}", "rows": 2, "columns": 3})
        assert rack.status_code == 200
        rack_data = rack.json()["data"]
        assert [slot["code"] for slot in rack_data["slots"]] == ["A1", "A2", "A3", "B1", "B2", "B3"]
        assigned = api_client.put(f"{API}/racks/{rack_data['id']}/assign", json={"productId": product["id"], "slotCode": "B2"})
        assert assigned.status_code == 200
        products = api_client.get(f"{API}/racks/{rack_data['id']}/products")
        assert products.json()["data"][0]["rackSlot"] == "B2"

    def test_purchase_updates_stock_and_history(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_PurchaseBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_PurchaseProduct_{uuid.uuid4().hex[:6]}", "category": "Materials",
            "unit": "ea", "standardRate": 10, "brandId": brand["id"],
        }).json()["data"]
        purchase = api_client.post(f"{API}/purchases", json={"lines": [{
            "productCode": product["productCode"], "quantity": 12, "listPrice": 11, "purchaseDiscount": 2,
        }]})
        assert purchase.status_code == 200
        current = api_client.get(f"{API}/catalog", params={"search": product["productCode"]}).json()["data"][0]
        assert current["stock"] == 12
        assert current["lastPurchasePrice"] == 11
        history = api_client.get(f"{API}/purchases").json()["data"]
        assert any(item["id"] == purchase.json()["data"]["id"] for item in history)

    def test_rfq_approval_edit_and_audit_history(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_RfqBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_RfqProduct_{uuid.uuid4().hex[:6]}", "category": "Materials",
            "unit": "ea", "standardRate": 10, "brandId": brand["id"],
        }).json()["data"]
        created = api_client.post(f"{API}/rfqs", json={"partnerId": "TEST_PARTNER", "lines": [{"productCode": product["productCode"], "quantity": 2}], "deliveryMode": "storePickup"})
        assert created.status_code == 200
        rfq = created.json()["data"]
        approved = api_client.post(f"{API}/rfqs/{rfq['id']}/approve", json={"approved": True, "specialDiscountPercent": 5, "scheduledAt": "2026-09-01 10:00"})
        assert approved.status_code == 200
        assert approved.json()["data"]["status"] == "approved"
        history = api_client.get(f"{API}/rfqs/{rfq['id']}/history")
        assert len(history.json()["data"]) == 2

    def test_dispatch_deducts_stock_and_converts_rfq(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_DispatchBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_DispatchProduct_{uuid.uuid4().hex[:6]}", "category": "Materials",
            "unit": "ea", "standardRate": 10, "brandId": brand["id"],
        }).json()["data"]
        api_client.post(f"{API}/purchases", json={"lines": [{"productCode": product["productCode"], "quantity": 5, "listPrice": 10}]})
        rfq = api_client.post(f"{API}/rfqs", json={"partnerId": "TEST_DISPATCH_PARTNER", "lines": [{"productCode": product["productCode"], "quantity": 2}]}).json()["data"]
        api_client.post(f"{API}/rfqs/{rfq['id']}/approve", json={"approved": True})
        dispatch = api_client.post(f"{API}/dispatches", json={"sourceRfqId": rfq["id"], "lines": [{"productCode": product["productCode"], "quantity": 2}]})
        assert dispatch.status_code == 200
        current = api_client.get(f"{API}/catalog", params={"search": product["productCode"]}).json()["data"][0]
        assert current["stock"] == 3
        rfqs = api_client.get(f"{API}/rfqs", params={"status": "dispatched"}).json()["data"]
        assert any(item["id"] == rfq["id"] for item in rfqs)

    def test_inventory_reports_stock_value_and_low_stock(self, api_client):
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_InventoryBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": f"TEST_InventoryProduct_{uuid.uuid4().hex[:6]}", "category": "Materials",
            "unit": "ea", "standardRate": 10, "reorderLevel": 5, "brandId": brand["id"],
        }).json()["data"]
        api_client.post(f"{API}/purchases", json={"lines": [{"productCode": product["productCode"], "quantity": 2, "listPrice": 12}]})
        inventory = api_client.get(f"{API}/inventory").json()["data"]
        current = next(item for item in inventory if item["productId"] == product["id"])
        assert current["stock"] == 2
        assert current["valuation"] == 24
        low = api_client.get(f"{API}/inventory/low-stock").json()["data"]
        assert any(item["productId"] == product["id"] for item in low)

    def test_team_user_roles_and_deactivation(self, api_client):
        contact = f"97{uuid.uuid4().int % 100000000:08d}"
        created = api_client.post(f"{API}/team/users", json={"name": "TEST_Manager", "contactNumber": contact, "role": "store_manager", "passcode": "1234"})
        assert created.status_code == 200
        user = created.json()["data"]
        assert "dispatch:write" in user["permissions"]
        updated = api_client.put(f"{API}/team/users/{user['id']}", json={"name": "TEST_Manager", "contactNumber": contact, "role": "store_manager", "isActive": False})
        assert updated.status_code == 200
        assert updated.json()["data"]["isActive"] is False

    def test_partner_kyc_and_reward_wallet(self, api_client):
        partner = api_client.post(f"{API}/partners/register", json={
            "name": "TEST_Partner", "phone": f"96{uuid.uuid4().int % 100000000:08d}",
            "businessName": "TEST_Business", "city": "TEST_City", "documents": ["doc-1"],
        })
        assert partner.status_code == 200
        partner_id = partner.json()["data"]["id"]
        reviewed = api_client.put(f"{API}/partners/{partner_id}/kyc", json={"approved": True, "locationVerified": True})
        assert reviewed.status_code == 200
        brand = api_client.post(f"{API}/brands", json={"name": f"TEST_PartnerRewardBrand_{uuid.uuid4().hex[:6]}"}).json()["data"]
        product = api_client.post(f"{API}/catalog", json={
            "name": "TEST_PartnerRewardProduct", "category": "Materials", "unit": "ea",
            "standardRate": 250, "brandId": brand["id"],
        }).json()["data"]
        rfq = api_client.post(f"{API}/rfqs", json={"partnerId": partner_id, "lines": [{"productCode": product["productCode"], "quantity": 1}]}).json()["data"]
        approved = api_client.post(f"{API}/rfqs/{rfq['id']}/approve", json={"approved": True})
        assert approved.status_code == 200
        assert approved.json()["data"]["rewardPoints"] == 2
        wallet = api_client.get(f"{API}/partners/{partner_id}/rewards")
        assert wallet.json()["data"]["balance"] == 2
        duplicate = api_client.post(f"{API}/rfqs/{rfq['id']}/approve", json={"approved": True})
        assert duplicate.status_code == 200
        wallet_after = api_client.get(f"{API}/partners/{partner_id}/rewards")
        assert len(wallet_after.json()["data"]["entries"]) == 1


# ---------- Auth ----------

class TestAuth:
    def test_requester_register(self, api_client):
        payload = {"name": "TEST_Alice", "phone": "9999999901", "address": "1 Test Ln"}
        r = api_client.post(f"{API}/auth/requester/register", json=payload)
        assert r.status_code == 200
        j = _env_ok(r)
        assert j["success"]
        d = j["data"]
        assert d["id"]
        assert d["name"] == "TEST_Alice"
        assert d["role"] == "requester"

    def test_admin_register_login_flow(self, api_client):
        contact = f"98{uuid.uuid4().int % 100000000:08d}"
        passcode = "secret123"
        reg = api_client.post(f"{API}/auth/admin/register", json={
            "companyName": "TEST_Co",
            "gstin": "27ABCDE1234F1Z5",
            "contactNumber": contact,
            "passcode": passcode,
        })
        assert reg.status_code == 200, reg.text
        jr = _env_ok(reg)
        assert jr["success"]
        admin_id = jr["data"]["adminId"]
        assert admin_id

        # Duplicate registration fails
        dup = api_client.post(f"{API}/auth/admin/register", json={
            "companyName": "X", "gstin": "Y", "contactNumber": contact, "passcode": "z"
        })
        assert dup.status_code == 400

        # Login
        li = api_client.post(f"{API}/auth/admin/login", json={
            "contactNumber": contact, "passcode": passcode,
        })
        assert li.status_code == 200
        jl = _env_ok(li)
        assert jl["data"]["token"]
        assert jl["data"]["adminId"] == admin_id
        assert jl["data"]["companyName"] == "TEST_Co"

        # store for subsequent tests
        pytest.admin_id = admin_id
        pytest.admin_contact = contact
        pytest.admin_pass = passcode

    def test_admin_login_wrong_credentials(self, api_client):
        r = api_client.post(f"{API}/auth/admin/login", json={
            "contactNumber": "0000000000", "passcode": "nope",
        })
        assert r.status_code == 401
        j = r.json()
        assert j["success"] is False
        assert j["error"]

    def test_admin_login_wrong_passcode(self, api_client):
        r = api_client.post(f"{API}/auth/admin/login", json={
            "contactNumber": pytest.admin_contact, "passcode": "wrong",
        })
        assert r.status_code == 401


# ---------- Catalog CRUD ----------

class TestCatalog:
    def test_full_crud(self, api_client):
        # Create
        payload = {"name": "TEST_Item_A", "category": "Materials", "unit": "kg", "standardRate": 12.5}
        r = api_client.post(f"{API}/catalog", json=payload)
        assert r.status_code == 200
        d = _env_ok(r)["data"]
        assert d["name"] == "TEST_Item_A"
        assert d["standardRate"] == 12.5
        item_id = d["id"]

        # List with category filter
        r2 = api_client.get(f"{API}/catalog", params={"category": "Materials"})
        items = _env_ok(r2)["data"]
        assert any(x["id"] == item_id for x in items)
        assert all(x["category"] == "Materials" for x in items)

        # Update
        upd = {"name": "TEST_Item_A2", "category": "Labor", "unit": "hr", "standardRate": 20}
        r3 = api_client.put(f"{API}/catalog/{item_id}", json=upd)
        assert r3.status_code == 200
        d3 = _env_ok(r3)["data"]
        assert d3["name"] == "TEST_Item_A2"
        assert d3["category"] == "Labor"

        # Update on unknown -> 404
        r4 = api_client.put(f"{API}/catalog/nonexistent-id", json=upd)
        assert r4.status_code == 404

        # Delete
        r5 = api_client.delete(f"{API}/catalog/{item_id}")
        assert r5.status_code == 200
        assert _env_ok(r5)["data"]["deleted"] is True

        # Delete again -> 404
        r6 = api_client.delete(f"{API}/catalog/{item_id}")
        assert r6.status_code == 404

    def test_import_from_csv(self, api_client):
        items = [
            {"name": "TEST_CSV_1", "category": "Services", "unit": "ea", "standardRate": 5},
            {"name": "TEST_CSV_2", "category": "", "unit": "ea", "standardRate": 3},
            {"name": "", "category": "X", "unit": "ea", "standardRate": 1},  # invalid, skipped
        ]
        r = api_client.post(f"{API}/catalog/import", json={
            "items": items, "categoryMode": "fromCsv", "overrideCategory": "",
        })
        assert r.status_code == 200, r.text
        d = _env_ok(r)["data"]
        assert d["inserted"] == 2
        assert d["skipped"] == 1
        # Verify CSV_2 got default category "General"
        r2 = api_client.get(f"{API}/catalog", params={"category": "General"})
        names = {x["name"] for x in _env_ok(r2)["data"]}
        assert "TEST_CSV_2" in names


# ---------- Money Config ----------

class TestMoneyConfig:
    def test_get_auto_provisions(self, api_client):
        fresh_id = str(uuid.uuid4())
        r = api_client.get(f"{API}/money-config/{fresh_id}")
        assert r.status_code == 200
        d = _env_ok(r)["data"]
        assert d["adminId"] == fresh_id
        assert d["gstPercent"] == 18
        assert d["showDiscount"] is True

    def test_update_money_config(self, api_client):
        admin_id = getattr(pytest, "admin_id", None)
        if not admin_id:
            pytest.skip("admin not created")
        upd = {
            "discountPercent": 5,
            "gstPercent": 12,
            "specialDiscountPercent": 2,
            "showDiscount": True,
            "showGst": False,
            "showSpecialDiscount": True,
        }
        r = api_client.put(f"{API}/money-config/{admin_id}", json=upd)
        assert r.status_code == 200
        d = _env_ok(r)["data"]
        assert d["discountPercent"] == 5
        assert d["gstPercent"] == 12
        assert d["showGst"] is False
        # GET back and confirm persistence
        r2 = api_client.get(f"{API}/money-config/{admin_id}")
        d2 = _env_ok(r2)["data"]
        assert d2["specialDiscountPercent"] == 2
        assert d2["showSpecialDiscount"] is True
