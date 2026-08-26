# Reward Points System — Design Specification

This describes HOW the reward feature works and WHY it's built this way —
independent of backend technology (works the same whether built in
Node/MongoDB, .NET, Firebase, or anything else). Read this fully before
writing any code.

---

## 1. The Core Rule

**Points are never awarded when a Requester generates a quotation.**
A quotation is just an estimate — nothing has actually been sold yet.
Points are only awarded when **Admin confirms a real sale happened**,
by taking one explicit action: **"Mark as Sold."**

This mirrors how real B2B loyalty programs work (e.g. Astral Pipes'
loyalty program): staff bills a real sale → that action, not the
buyer's request, is what triggers points.

```
Requester generates quotation   →  status: "pending"    (NO points yet)
                ↓
Admin reviews it on the dashboard
                ↓
Admin clicks "Mark as Sold"     →  status: "sold"        (points fire NOW)
                ↓
System automatically:
  1. Calculates points (formula below)
  2. Writes ONE new entry into the reward ledger
                ↓
Requester's wallet balance updates
```

---

## 2. Why It's Built as a "Ledger," Not a Single Editable Number

**The wrong way (don't do this):** give each user a `points` field and
directly `+=` or `-=` it whenever something happens.

**The right way (what we're building):** every points event is its own
permanent record in a separate collection/table — call it
`reward_ledger`. Each record looks like this:

```json
{
  "requesterId": "u123",
  "quotationId": "q456",
  "points": 150,
  "type": "earned",
  "createdAt": "2026-08-14T10:00:00Z"
}
```

The user's **current balance is never stored anywhere** — it's
calculated fresh, every time it's needed, by summing all their records:

```
balance = (sum of all "earned" entries) − (sum of all "redeemed" entries)
```

**Why this matters:**
- Full audit trail — if a user disputes their balance, there's a
  complete, unchangeable history explaining exactly how they got there
- Can never "drift" out of sync, because there's only ONE source of
  truth (the ledger entries), not a stored number that could get
  edited incorrectly somewhere
- This is literally how real banking/wallet systems are built —
  matches the model the client referenced

---

## 3. Data You Need (two pieces)

### A. Add a `status` field to your existing Quotation record
```
status: "pending" (default on creation) → "sold" (after Admin confirms)
soldAt: null → timestamp when marked sold
```

### B. A new Reward Ledger collection/table
```
requesterId   — who earned the points
quotationId   — which sale triggered it
points        — how many points (whole number)
type          — "earned" for now ("redeemed" is reserved for a future phase)
createdAt     — timestamp
```

That's the entire data model. No separate "balance" field anywhere —
intentionally.

---

## 4. The Two Actions That Matter

### Action 1: "Mark as Sold" (Admin side)
Triggered by a button on the Admin's quotation detail screen. When
clicked:

1. **Check first:** is this quotation's status already `"sold"`? If
   yes, stop and show an error — a quotation can only ever be marked
   sold ONCE. This prevents duplicate points if the button is clicked
   twice or a network request retries.
2. Flip `status` to `"sold"`, set `soldAt` to now.
3. Calculate points using this formula:
   ```
   points = floor(grandTotal / 100)
   ```
   (i.e. 1 point per ₹100 of the quotation's grand total — this is a
   placeholder formula; when the client gives a real formula later,
   this is the ONLY thing that changes.)
4. Insert one new row into the reward ledger with those points,
   `type: "earned"`.
5. Return confirmation so the Admin UI can show something like
   "Marked as sold — 150 points credited to Ramesh."

### Action 2: View Wallet (Requester side)
Powers the "My Rewards" screen. When a Requester opens it:

1. Fetch every ledger entry where `requesterId` matches them.
2. Sum them up to get the current balance (formula in Section 2).
3. Show the balance, plus the list of entries as transaction history
   (newest first) — this is their "passbook."

No other logic needed for this screen. It's a read + sum operation.

---

## 5. What's Deliberately NOT Included Yet

Don't build these now — they're intentionally future phases:

- ❌ **Redemption** (converting points into real money/vouchers) — this
  needs KYC verification (PAN/bank details) and a payment gateway's
  payout API, which are separate integrations with real approval
  timelines from third-party providers
- ❌ **Fraud detection / tamper-proofing** on the ledger (e.g. detecting
  someone intercepting a network request to fake their balance) — a
  deeper security layer for a later phase
- ❌ **Push notifications** — a simple in-app banner ("You earned 150
  points!") shown next time they open the app is enough for now,
  doesn't need a real notification service

If you're tempted to add any of these while implementing, don't — stay
scoped to Sections 1–4 above.

---

## 6. How to Verify It Works (test this exact sequence)

1. Create a quotation → confirm it's saved with `status: "pending"`
2. Confirm NO reward ledger entry exists yet for that quotation
3. Trigger "Mark as Sold" on it → confirm status flips to `"sold"`
4. Confirm exactly ONE new reward ledger entry now exists, with the
   correct points (grandTotal ÷ 100, rounded down)
5. Fetch that requester's wallet → confirm the balance matches, and
   the entry shows up in their history
6. Try triggering "Mark as Sold" on the SAME quotation again → confirm
   it's rejected with an error, and NO second ledger entry gets created

If all 6 steps pass, the feature is implemented correctly — regardless
of which backend/database it's built on.
