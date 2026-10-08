# SYSTEM-MAP.md — read this slowly, it's for you, not the agent

This file is not an instruction for any AI agent. It's for you to read when
you have time, to connect "what happens in real life" to "what table holds
that." No task comes out of this file — just understanding.

---

## The big picture, in one sentence
Every real-world action in this business (a partner asking for a quote, a
delivery going out, stock running low) becomes a row being added or changed
in a table. The tables don't do anything by themselves — they just remember
what happened, so the next action can check what's true right now.

---

## Flow 1: A product gets into the system
**Real life:** You decide to sell a new tap brand. You create a category
("Plumbing"), a brand ("Jaguar"), then the product itself ("Jaguar 1-inch
tap").

**In the database:** `categories` table gets one new row. `brands` table
gets one new row. `catalog` table gets one new row for the product — and
that row *points at* the category row and the brand row using their ids,
not their names. That pointing is the "relationship" we keep talking about.

**Why it matters:** If you ever rename "Jaguar" to "Jaguar Ltd," every
product pointing at it by id updates automatically. If it pointed at it by
the text "Jaguar," you'd have to fix every product by hand.

---

## Flow 2: Stock comes in (Purchase)
**Real life:** A supplier delivers 200 taps. You record the purchase,
including which rack they're stored on.

**In the database:** One row in `purchases` (who delivered, when). Multiple
rows in `purchase_lines` (one per product in that delivery — in this case,
one line for the taps, quantity 200). The `catalog` row's stock count goes
up by 200.

**Why it matters (the transaction rule):** Both the purchase record AND the
stock increase must happen together. If the power goes out after the
purchase is recorded but before stock updates, you'd have a purchase on
paper that never actually added stock — a real mismatch a staff member
would eventually discover the hard way. This is why we wrap this in "one
transaction": either both happen, or neither does.

---

## Flow 3: A partner asks for a quote (RFQ)
**Real life:** A plumber (your referral partner) opens the app, picks 10
taps, and submits a request. You review it, apply a discount, and approve
it. You decide if they'll pick it up or you'll deliver it.

**In the database:** One row in `rfqs` (which partner, status: pending).
Rows in `rfq_lines` (one per product requested). When you approve, the
`rfqs` row's status changes to "approved," and a row is added to
`reward_ledger` crediting the partner's reward points.

**Why it matters:** The RFQ doesn't touch stock yet — it's just a request.
Stock only actually changes later, at dispatch (Flow 4). This is a real
business decision baked into the system: approving a quote doesn't yet
guarantee the stock will still be there when they come to collect it. That
gap is a known risk worth discussing with your client eventually.

---

## Flow 4: The order goes out (Dispatch)
**Real life:** The partner arrives at the store. Staff may add/remove a
few items based on what the partner actually wants now, then the order is
billed and handed over.

**In the database:** The approved `rfqs` row gets converted: a new row in
`dispatches` is created, `dispatch_lines` rows record the final list of
products, the `catalog` stock numbers go down by those quantities, and the
`rfqs` row's status changes to "dispatched" so it can't be dispatched a
second time by mistake.

**Why it matters (the "unique constraint" rule):** Without a rule stopping
it, the same approved RFQ could accidentally be dispatched twice — once by
you, once by a staff member, both thinking they're doing it first. A unique
rule on "one dispatch per RFQ" makes the database itself refuse the second
attempt, instead of relying on everyone remembering not to do it twice.

---

## Flow 5: Reward points
**Real life:** Partners earn points for buying through you, as a loyalty
incentive.

**In the database:** `reward_ledger` is just a running list: "+50 points,
RFQ #123, dated X." It's a ledger, not a single changing number — so you
can always look back and see exactly where every point came from. (Right
now there's no "spend points" entry type yet — that's a feature gap noted
elsewhere, not a bug.)

---

## Flow 6: Who's allowed to do what
**Real life:** A store manager can approve small discounts; maybe only you
can approve large ones, or delete a category.

**In the database:** The `users` table has a role field. Every sensitive
action (delete, approve, wipe) is supposed to check that role before doing
anything. Right now, several of these checks are missing in the code — this
is the "authentication" gap we flagged. Fixing it means: before the delete
button's backend code runs, it asks "who is this, and are they allowed?"
every single time, not just sometimes.

---

## How to use this file
Don't try to memorize it in one sitting. Come back to one "Flow" section at
a time, whenever a real question comes up — like "why did dispatch fail"
or "why can a quote be approved but the item is gone." Match the real-life
question to the Flow section above, and you'll usually find the table
that's actually responsible.
