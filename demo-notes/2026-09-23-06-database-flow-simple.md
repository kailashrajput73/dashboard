# How our app uses data (simple guide for UI design)

**For:** Frontend / UI designer  
**You do not need MongoDB or backend details** — this is *what happens in the product* and *which screens talk to which data*.

---

## Big picture

We run a **shop + warehouse** app for building materials (tiles, taps, pipes, etc.).

There are three kinds of people:

1. **Admin / store team** — sets up products, buys stock, approves quotes, ships orders.  
2. **Partner (dealer/referrer)** — registers, gets KYC approved, sends **RFQs** (price quotes).  
3. **Customer** — sometimes walk-in retail; often tied to a partner’s quote.

**Data lives in one database.** The mobile app always goes through our **API** (`/api/...`). You design screens; each screen loads or saves data through those APIs (see `frontend/src/api/endpoints.ts` when you wire things up).

---

## Step 1 — Set up the shop (do this first)

Think of it like filling shelves before you sell:

| Step | What the user does | What we store (name only) |
|------|--------------------|---------------------------|
| 1 | Create **categories** (e.g. Bathroom, Plumbing) | categories |
| 2 | Add **subcategories** under a category | subcategories |
| 3 | Add **brands** | brands |
| 4 | Add **products** (name, price, unit, photo, etc.) | catalog |
| 5 | Optional: **product groups** (bundle of products) | product_groups |
| 6 | Optional: **warehouse racks** (where items sit) | racks |

**UI tip:** If subcategories are empty, nudge user to pick a category first. Products need category (and usually brand).

**Screens:** Categories → Subcategories → Brands → Catalog → Product groups → Racks.

---

## Step 2 — Bring stock into the shop

| What happens | Simple explanation |
|--------------|-------------------|
| User records a **purchase** (what we bought, how many, from which list price) | A **purchase** record is saved |
| Stock count on each product **goes up** | Updated on each **product** in catalog |

**Screen:** Purchases.  
**Later:** Inventory screen **shows** stock — it does not replace “record a purchase” for stock coming in.

---

## Step 3 — Partner joins and gets verified

| Step | What the user sees | Status to show in UI |
|------|--------------------|----------------------|
| Partner signs up | Name, phone, documents | **KYC: Pending** |
| Admin reviews | Approve or reject | **Approved** or **Rejected** |
| Approved partner | Can use app / send quotes | **Active** (wording can vary) |

**Screen:** Partners.

---

## Step 4 — Quote request (RFQ) — the main sales flow

This is the heart of the app. Design around these states:

```
Partner sends quote request  →  PENDING (waiting for admin)
Admin reviews                →  APPROVED  or  REJECTED
If approved, later ship      →  DISPATCHED (order fulfilled)
```

### What to show on RFQ screens

**Pending**

- List of line items (product, qty, price if set).  
- Partner name.  
- Buttons for admin: **Approve** / **Reject** (and edit discount/delivery if your screen has it).

**Approved**

- Show final totals.  
- Partner may earn **reward points** (calculated on server when approved — not when they first submit).  
- Enable **Dispatch** (ship goods).

**Rejected**

- Read-only or archive; no dispatch.

**Dispatched**

- Treat as done; stock already reduced when dispatch was recorded.

**Screens:** RFQs, then Dispatches.

---

## Step 5 — Shipping (dispatch)

| Situation | What happens |
|-----------|----------------|
| From an **approved** quote | User creates dispatch → products **leave stock** → quote marked **dispatched** |
| **Walk-in retail** (no quote) | Dispatch screen can bill customer directly |

**UI tip:** Disable “Dispatch from quote” unless quote status is **Approved**.

**Screen:** Dispatches.

---

## Step 6 — Partner rewards (passbook)

- Partners do **not** have a simple “wallet number” stored forever on their profile.  
- We keep a **history of points** (earned when a quote is approved; redeemed later is future work).  
- Partner screen **shows balance + list** — that comes from one “rewards” API call.

**Screen:** Partners → rewards / passbook section.

---

## Step 7 — Home dashboard (one load)

When admin opens **Overview / Dashboard**, one API returns a **snapshot**:

- How many products, how much stock, low-stock alerts  
- How many quotes: pending / approved / dispatched  
- How many partners verified  
- Short lists: quotes needing review, best sellers, slow movers  

**Screen:** Dashboard.  
No need to design around multiple loading spinners for each tile if one snapshot call fills them.

---

## Step 8 — Quotation on phone (requester flow)

- Browsing products and building a **draft quote** (qty, prices, totals) can happen **on the device** before save.  
- **Discount / GST settings** come from admin **money config**.  
- When it becomes a real **RFQ**, it goes to the server and starts as **Pending** (Step 4).

**Screens:** Catalog browse + draft; Money config (admin).

---

## Quick map: screen → what it’s for

| Screen | Plain purpose |
|--------|----------------|
| Dashboard | “What needs attention today?” |
| Categories / Subcategories / Brands / Catalog | Build the product catalog |
| Purchases | Stock in |
| Inventory | See stock and movement |
| Partners | Signup + KYC + rewards |
| RFQs | Approve or reject quotes |
| Dispatches | Ship or retail bill |
| Team | Staff users and roles (mostly labels for now) |
| Money config | Discount, GST for quotes |

---

## What we are **not** asking you to design yet

- Full permission system per button (roles exist as labels).  
- Redeeming reward points to cash.  
- Heavy analytics / monthly reports (dashboard snapshot is enough for now).

---

## If you need more detail later

- Technical version (API names, collection names): `2026-09-23-06-database-flow-handoff.md`  
- Full project guide: `DASHBOARD.md` in project root  

For building UI, this file + talking through Figma flows is enough.
