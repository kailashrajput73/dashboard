"""
Quotation Generator — Mirror Backend.

Implements the EXACT API contract used by the teammate's FastAPI + MongoDB backend.
Field names, collections, and endpoints match the schema in the problem statement 1:1
so the mobile app can hit either this preview backend or the teammate's laptop backend
without any code change (just switch API_BASE_URL on the client).

Collections & documents (mirrored):
    - users          { _id, role, name, phone, address, companyName, gstin, contactNumber, passcodeHash, createdAt }
    - catalog        { _id, name, category, unit, standardRate, createdAt, updatedAt }
    - categories     { _id, name, isDefault, imageUrl }
    - product_types  { _id, id, name, imageUrl, isActive }
    - money_config   { _id, adminId, discountPercent, gstPercent, specialDiscountPercent,
                       showDiscount, showGst, showSpecialDiscount }

Response envelope for every endpoint: { success: bool, data: any, error: str|None }
"""

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from utils import client, logger, ensure_indexes, ensure_default_categories
from routers.auth import router as auth_router
from routers.partners_team import router as partners_team_router
from routers.taxonomy import router as taxonomy_router
from routers.product_groups_racks import router as product_groups_racks_router
from routers.purchases_rfq import router as purchases_rfq_router
from routers.dispatch_inventory import router as dispatch_inventory_router
from routers.subcategories import router as subcategories_router
from routers.catalog import router as catalog_router
from routers.config_dashboard import router as config_dashboard_router
from routers.system import router as system_router

app = FastAPI(title="Quotation Generator API (Mirror)")

origins = [
    "http://localhost:5173",    # Default port for Vite React Web
    "http://localhost:3000",    # Default port for Standard React Web
    "http://localhost:8081",    # Default port for Expo / React Native Web
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Opens doors for your laptop's local ports
    allow_credentials=True,
    allow_methods=["*"],         # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],         # Allows content-type, authorization, etc.
)

app.include_router(auth_router)
app.include_router(partners_team_router)
app.include_router(taxonomy_router)
app.include_router(product_groups_racks_router)
app.include_router(purchases_rfq_router)
app.include_router(dispatch_inventory_router)
app.include_router(subcategories_router)
app.include_router(catalog_router)
app.include_router(config_dashboard_router)
app.include_router(system_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await ensure_default_categories()
    logger.info("Quotation mirror backend started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
