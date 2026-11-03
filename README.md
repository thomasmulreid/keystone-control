# Keystone Control

Two control panels on one commercetools project.

- **Keystone panel** — what the merchant's team sees, split by the role that opens it:
  Performance (CEO), Accounts (CRO), Catalogue (Marketing), Operations (Ops & CS).
- **Customer panel** — what one of Keystone's customers sees of their own account:
  Spend, Governance, Continuity, Requests. Scoped to a single business unit.

A toggle in the header switches between them; a dropdown picks which customer. The
accent colour changes with the scope, so you can tell which side you are on from
across the room.

Every figure comes from the live `demo-orium-b2b` project — 262 orders, 12 trading
accounts, 19 quote requests, 62 SKUs, between 2026-04-29 and 2026-10-02. Nothing on
either panel is illustrative.

---

## The idea

Both panels are the same engine. What differs is scope and objective:

|  | Customer panel | Keystone panel |
|---|---|---|
| Scope | one business unit tree | the whole project |
| Optimises for | spend efficiency, continuity, governance | revenue, margin, account health |
| Shares | scorecard, work queue, approval drawer, audit trail | same |

The payoff is that the same fact appears on both sides with different meaning.
Buyer concentration is *account risk* to Keystone and *continuity risk* to the
customer. A spend limit is one commercetools field that both parties can change and
both can see. Where that happens, the queue item carries a `⇄` note naming the
counterpart's view of it.

---

## Current snapshot — refreshed 2026-10-26

| | |
|---|---|
| Orders | 2,666 |
| Trading accounts | 58 |
| Revenue in window | $55,732,292 |
| Window | 2024-10-02 to 2026-10-26 |
| Last complete month (2026-09) | $5,612,121 |
| Stopped revenue | $2,626,473 across 185 orders |
| Contract leakage | $26,941 |

The project grew roughly tenfold between the first build (262 orders / 12 accounts)
and this one. Two consequences worth knowing:

- **There is no monthly revenue target any more.** The $1.2M figure taken from the
  older panel was written for a 12-account book doing ~$1M a month. Against a
  $5,612,121 month it reads as 468% and means nothing, so the panel
  now states that no target is set rather than printing a flattering number.
- **47 of 58 accounts stop ordering within two weeks of 2026-09-28.**
  The panel calls this out as a data-coverage question rather than emitting
  47 churn alerts. See `quietCluster` in the extractor — accounts churn one at
  a time; they do not all leave in the same fortnight, and a queue that claims they
  did teaches its reader to ignore it.

## Reconciliation with the existing control panel

This panel's numbers were checked against `keystone-control-panel.vercel.app`:

| | here | existing panel |
|---|---|---|
| Sep 2026 revenue | $1,055,223 | $1,054,863 (0.03%) |
| % of $1.2M monthly target | 88% | 88% |
| Northgate Aug→Sep | +$570,420 | +$570,420 |
| Active accounts | 12 | 12 |
| Orders | 262 | 256 |

The 6-order gap is almost certainly cancelled/open orders the existing panel excludes
from revenue. Worth confirming before anyone quotes both in the same room.

**The date field matters more than anything else here.** `createdAt` is when the
order *record* was written; on this project that is the seed/import date and it puts
98% of the year's revenue in September. The trading date is on
`custom.fields.orderDate`. Everything in this panel — revenue by month, order ages,
reorder cadence — uses `business_date()`, which is `orderDate` falling back to
`createdAt` for the handful of still-Open orders that have none. Getting this wrong
does not produce a slightly-off chart; it produces a confident, completely false one.

## What the real data turned up

These are findings, not fixtures:

- **$18,244 of contract leakage at Company A.** 25 lines billed above a rate that
  same account had already been given. The worst is a DEWALT hammer drill at
  $179.99 against an agreed $143.99, 209 units, twice in one day.
- **Company A's spend limit is $1,000,000** against $827,062 of annual spend and a
  $10,741 average order — 93× the typical order. The approval gate has never fired,
  so the control exists but cannot work.
- **$566,785 across 20 orders authorised but never captured**, the oldest 11 days.
  The single biggest pool of stopped revenue in the project.
- **7 of 12 accounts place every order through one named person.**
- **The hammer drill sells at four different prices across nine accounts**, a 60%
  spread.
- **Revenue grows cleanly from $214K in January to $1,055,223 in September**, 88% of
  the $1.2M monthly target.

---

## Assumptions to replace with real company inputs

Nothing below came from Orium or Keystone source material — it was inferred from the
commercetools project and the three public demo URLs. Each one is a dial someone
should set deliberately:

| Assumption | Current value | Where |
|---|---|---|
| Monthly revenue target | $1.2M (read off the existing panel's text) | `performance/page.tsx` |
| Quote goes cold after | 3 days | `queue.ts`, `DEFINITIONS.quoteAge` |
| Account "gone quiet" at | 1.5× its own median order gap | `build-snapshot.py` |
| Buyer concentration risk at | one buyer, or one placing ≥90% | `build-snapshot.py` |
| Second approver required over | $5,000 | `mutations.ts` |
| Exception age thresholds | 1–5 days by reason | `REASONS` in `build-snapshot.py` |
| Suggested spend limit | average order rounded to a readable step | `previews.ts` |
| Category tree | inferred from SKU tokens | `CATEGORY_RULES` |
| Associate role descriptions | written here, not from Keystone policy | `governance/page.tsx` |

Business-unit metadata is now generated by `scripts/build-business-units.py` from a
live `read_business_units` payload, replacing the hand-transcribed file.

---

## The three mutations

Chosen to cover three risk levels and to include exactly one that proves the
two-panel thesis.

| Mutation | Panel | commercetools action | Risk | Reversible |
|---|---|---|---|---|
| Release a held order | Keystone | `changeOrderState` → Confirmed | medium | yes |
| Change a spend limit | **both** | `setCustomField` buyerLimit | low | yes |
| Accept a quote request | Keystone | `changeQuoteRequestState` → Accepted | medium | no |

Rules that apply to all of them:

1. **The agent proposes, a human disposes.** Nothing that touches money or
   customer-visible state both detects and executes on its own.
2. **The preview shows the literal payload.** If an operator cannot see what they
   are authorising, they are not authorising anything.
3. **Two steps, never one.** No click in a list view can change a customer's order.
4. **Every run is audited** with before/after and a named reversal path.
5. **Writes are off by default** (`CT_WRITE_ENABLED`), so a demo cannot mutate a
   live project by accident.

### What the panel deliberately will not do

The $566K of payment-pending orders is the largest number on the Operations page and
the panel offers **no button for it**. Marking an order paid when the money has not
arrived hides a real debt behind a green tick, so it routes to AR and says so.
Prices and catalogue belong to Merchant Center. Anything needing more than three
fields is a form, and forms belong in Merchant Center too.

A panel that writes to everything is not one you can hand to a new starter.

---

## Running it

```bash
npm install
npm run dev
```

Rebuild the dataset from saved commercetools reads:

```bash
CT_TOOL_RESULTS=/path/to/mcp-read-payloads python3 scripts/build-snapshot.py
```

---

## Hardening: what changes to make this real

The prototype seams are marked in the source. In rough order of effort:

**1. Live data instead of a build artefact.**
`src/lib/snapshot.ts` imports `data/snapshot.json`. Replace it with an async data
layer backed by the commercetools MCP (or the HTTP API) plus a short cache. Every
call site already treats it as read-only and opaque, so the change is local.
`scripts/build-snapshot.py` becomes a scheduled job, or its logic moves server-side.

**2. Live execution.**
`src/app/api/actions/route.ts` has the gate order already correct: unknown action →
guardrail blocked → writes disabled → send. Fill in `ctClient()`. Three things are
easy to get wrong there and are commented in place:
- **re-read the version immediately before writing** — the preview's version may be
  minutes old and commercetools will reject it;
- **carry an idempotency key** so a double-click cannot double-apply;
- **record failures.** A silent catch is worse than the original problem.

**3. Real identity.**
The audit trail hardcodes `demo.operator@orium.com`. Wire SSO and record who
actually approved. The second-approver checkbox should check a different person's
identity, not a checkbox.

**4. Persistent audit.**
`src/lib/audit.ts` is in-memory and resets on a cold start. Move to an append-only
table or a commercetools custom object. The record shape is already what you want
to persist.

**5. Scoped credentials, per mutation.**
Each `MutationDef` declares `requiredScopes`. Issue an API client that holds only
those, never an admin key. The release mutation should not be able to touch a
business unit.

**6. Categories from the real tree.**
`CATEGORY_RULES` in the extractor infers category from SKU tokens because the
project has a single productType. Replace with `read_categories`.

**7. Price integrity against the actual price list.**
Leakage currently compares an account to the lowest price *that same account* has
been given — deliberately conservative, since it never assumes a rate the account
was never offered. With standalone prices and product selections read directly, it
can compare against the contracted rate instead and catch the cases where a
contract price was never applied at all.

---

## Layout

```
scripts/build-snapshot.py     the analytical core — every metric defined in one place
scripts/business-units.json   business unit metadata incl. real commercetools ids
data/snapshot.json            generated

src/lib/snapshot.ts           typed access + the data seam
src/lib/queue.ts              work queue derivation; run / route / open
src/lib/mutations.ts          the three mutations, their previews and guardrails
src/lib/previews.ts           queue item -> full preview, server-side only
src/lib/audit.ts              audit trail (in-memory; see hardening)

src/components/Shell.tsx          chrome, nav, scope-driven theming
src/components/ScopeSwitcher.tsx  the toggle + customer dropdown
src/components/WorkQueue.tsx      queue cards + the approval drawer
src/components/Charts.tsx         single-hue SVG charts with hover + table fallback
src/components/ui.tsx             tiles, pills, tables, definitions, empty states
```

Every metric carries its own definition in `DEFINITIONS`, surfaced behind the `?`
next to the figure. No number ships without one.
