# SOW progress — simple handover

**Project:** Web admin panel for a sanitary / building-materials business (catalog, stock, partners, quotes, dispatch, team).  
**Contract:** `Sow/SOW.pdf`  
**Updated:** 24 October 2026  

**Not included in this handover:** The **Referral Partner mobile app** (partners using phones to browse products and create quotes). That is a separate delivery. This document is only the **admin website** and the **server** that supports it.

**Overall:** Most day-to-day admin work from the SOW is **built**. The biggest missing piece is the **full reports / analytics dashboard** described in the SOW. A few items (push notifications, barcode scanning at the counter, strict role permissions) are only partly done or planned for later.

**Status words used below**

| Word | Meaning |
|------|---------|
| **Done** | Works in the admin panel for normal use. |
| **Partial** | Main workflow works; some SOW extras are missing. |
| **Not done** | Not built yet. |
| **Not in this delivery** | In the SOW for the mobile app or another phase — not counted here. |

---

## 1. Category management

**What it is about:** Top level of the product catalog (e.g. Pipes, Fittings). Staff create and organise categories so products and reports stay structured.

**Status:** **Done**

**What is done:** Create and edit categories; turn categories on/off; search; see how many products are in each category; avoid duplicate names; optional category image.

**What is left:** Nothing major for admin.

---

## 2. Subcategory management

**What it is about:** Finer grouping under a category (e.g. CPVC pipes under Pipes). Supports bulk upload from Excel/CSV for faster setup.

**Status:** **Done** (with one extra feature beyond SOW)

**What is done:** Create, edit, delete; link to parent category; bulk import; search; validation on import. There is also a **shelf price board** tool for shop display (extra, not in SOW).

**What is left:** Confirm with business if “export all subcategories to Excel” needs to match a specific report format.

---

## 3. Brand management

**What it is about:** List of brands (e.g. Astral, Jaguar). Products must link to a brand; partners often search by brand.

**Status:** **Done**

**What is done:** Create and edit brands; logo; active/inactive; search; product counts; link products to brands.

**What is left:** Nothing major for admin.

---

## 4. Product management

**What it is about:** The full product catalogue — names, codes, prices, stock, discounts, Hindi/Gujarati names, aliases, QR codes, imports from spreadsheets.

**Status:** **Partial**

**What is done:** Add and edit products; search by name, code, brand, alias; reorder level; regular discount; categories and subcategories; product groups; QR code on screen; bulk **import** (master sheet, prices, stock); pricing and stock updates; product types and classes (supporting fields).

**What is left:** SOW also asks for strong **bulk export** of the full product master to Excel — today export is a **shorter catalog list**, not the full master sheet. Auto product code on every new item — confirm business rules with owner.

---

## 5. Product group management

**What it is about:** Bundle related products (e.g. a “bathroom set”) so they can be managed and filtered together.

**Status:** **Done** (admin)

**What is done:** Create groups; add/remove products; edit groups; search.

**What is left:** Filtering groups inside the **partner mobile app** is **not in this delivery**.

---

## 6. Rack management (warehouse locations)

**What it is about:** Physical racks in the warehouse (rows and columns, slots like A1, B2). Stock is assigned to a slot when goods are purchased.

**Status:** **Done**

**What is done:** Create racks; auto slot codes; assign location when recording a purchase; see where a product is stored.

**What is left:** Dedicated “search entire warehouse by rack only” screen — partly covered via inventory and rack screens.

---

## 7. Purchase management

**What it is about:** Recording stock coming in from suppliers — quantities, prices, discounts, rack placement — and keeping purchase history.

**Status:** **Partial**

**What is done:** Manual purchase entry; bulk upload from file; discounts and list price; rack per line; stock increases automatically; view purchase history.

**What is left:** SOW mentions a separate **purchase report** / analytics view — not a full module yet (history and lists exist).

---

## 8. Referral partner KYC (admin)

**What it is about:** Plumbers, electricians, and contractors apply to become partners. Admin checks documents and location, then approves or rejects. Admin can also create a partner directly.

**Status:** **Partial**

**What is done:** List requests; view documents; approve/reject with reason; location flag; who approved and when; history; create partner from admin; export KYC history to CSV.

**What is left:** Full **Excel export** of all KYC data as in marketing SOW text; automatic “app unlocked on phone” is **partner app** — **not in this delivery**.

---

## 9. Referral partner management (admin)

**What it is about:** After KYC, admin manages the partner list — search by city, pincode, area, sales manager; see rewards and activity.

**Status:** **Partial**

**What is done:** Partner list; search and filters; KYC status; reward points (ledger-based); partner profile and documents.

**What is left:** Rich **sales performance** dashboards per partner; **export full partner list** to Excel (partial exports exist).

---

## 10. RFQ — request for quotation (admin)

**What it is about:** Partners request a quote for products. Admin reviews, applies special discount, sets pickup or delivery time, approves, and can change lines before goods leave the store. Reward points are granted on approval.

**Status:** **Partial**

**What is done:** See all RFQs; filter by partner, status, dates, category, product; export list; approve/reject; special discount; reward points on approve; pickup/delivery and schedule; edit lines before dispatch; full change history on admin.

**What is left:** Partner **creates** RFQ on **mobile** — **not in this delivery** (server can accept it when app exists). **Push notification** when approved — not built. **Scan barcode/QR** at counter to add lines — not built. Filter by “manager” — lighter than SOW wording.

---

## 11. Dispatch management

**What it is about:** Turn an approved quote into a sale: final product list, bill for walk-in customer if needed, reduce stock when goods go out.

**Status:** **Partial**

**What is done:** Dispatch from approved RFQ; change lines before billing; retail customer name/phone; stock goes down; dispatch history; prevent double dispatch of same RFQ.

**What is left:** **Barcode/QR scanning** at dispatch — not built. “Store manager only” — role exists but **menus are not locked** by role yet.

---

## 12. Stock / inventory management

**What it is about:** See current stock, what came in and went out, value of stock, and items below reorder level.

**Status:** **Partial**

**What is done:** Live stock; low-stock (ROL) list; stock in/out from purchases and dispatches; valuation; product-wise view; export in places.

**What is left:** Some SOW report names are covered by screens/exports but not as one formal “report pack.”

---

## 13. Team management

**What it is about:** Admin users for the business — admin, store manager, staff — with login for teammates.

**Status:** **Partial**

**What is done:** Add and edit users; roles (admin, store manager, staff); teammate login with phone and passcode.

**What is left:** SOW **role-based access** (each role sees only allowed menus/actions) — **not fully enforced**; everyone with login can reach most admin pages.

---

## 14. Dashboard and reports

**What it is about:** Business overview and reports — product performance, partners, categories, brands, sales, RFQ, purchase, dispatch, inventory, and monthly/quarterly/yearly analytics (SOW allows customisation).

**Status:** **Partial** (small part done)

**What is done:** **Operations snapshot** dashboard — high-level counts and quick view for daily work.

**What is not done:** Full **report centre** and **monthly / quarterly / yearly analytics hub** described in the SOW. This is the largest gap vs the contract.

---

## 15. Plumber and electrician service requests (admin)

**What it is about:** Customers request plumber or electrician help. Admin sees requests, filters them, updates status, and keeps history.

**Status:** **Partial** (admin done; customer side separate)

**What is done on admin:** List requests; filter by type (plumber/electrician), status, date; update status; notes; history.

**What is not in this delivery:** Customer submitting the request from **mobile app** — planned with partner/customer app; server endpoint exists for when that app is built.

---

## Extra admin features (not always listed as SOW chapters)

| Item | About | Status |
|------|--------|--------|
| Admin login | Staff sign-in to the panel | **Done** |
| Company register | First-time admin setup | **Done** |
| Settings | App/backend URL and preferences | **Done** |
| Spreadsheet imports hub | One place for master, prices, stock imports | **Done** |
| Money config (GST on quotes) | Quotation tax/discount setup | **Removed** from menu by product decision |
| Mobile-friendly admin layout | Use admin on tablet/phone browser | **Mostly done**; small layout fixes may remain |
| Live on production server | Hosted admin + database | **Not done** — still to deploy and test end-to-end |

---

## Database (short note for handover)

The system now runs on **PostgreSQL** (structured tables, safer stock and dispatch updates). Old MongoDB copy was removed from the project. Moving old live data for purchases, quotes, and dispatches into Postgres in one bulk job is **still pending** if you have historical data to move.

---

## Summary for the person taking over

1. **Built and usable:** Categories, brands, products (core), groups, racks, purchases, inventory, partners (KYC + list), RFQ workflow, dispatch, team users, service requests on admin, imports, login.  
2. **Biggest SOW gap:** **Reports and analytics dashboard** (Section 14).  
3. **Common partial gaps:** Full Excel exports, push notifications to partners, barcode scanning at RFQ/dispatch, strict role permissions.  
4. **Out of scope for this handover:** **Partner mobile app** (browse catalog, create RFQ on phone, partner notifications).  
5. **Next practical steps:** Finish reports if client requires them; deploy admin to VPS; one full test pass with the owner checklist; decide on barcode scanning and RBAC priority.

---

*For technical detail (files, migration rows, APIs), ask the dev team — this sheet is only for business handover.*
