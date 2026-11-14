# Keystone Control

A control panel for a MACH commerce business, organised around the four people who
run it — **CEO, CRO, Marketing, Operations** — plus a mirror panel for the customer's
own side of the account.

It reads live data through MCP, surfaces what needs a decision, and can make a defined
and auditable set of changes. Built conversationally; no engineer wrote it.

**Live demo:** https://commercial-autonomy-dashboard.vercel.app

**Demoing this to a customer?** Read [DEMO-GUIDE.md](DEMO-GUIDE.md) — a 10-minute
script, the questions you will get, and the things not to claim. No technical prep.

---

## Run it

```bash
npm install
cp .env.example .env.local     # GOVERNANCE_MODE=propose is a safe default
npm run dev
```

It boots against a committed data snapshot, so it works before you connect anything.

To point it at your own commercetools project, fill in the `CTP_*` variables and
re-run the extractor:

```bash
CT_TOOL_RESULTS=<dir of saved MCP read payloads> python3 scripts/build-snapshot.py
```

---

## Customising it for a customer

Everything a deployment needs to change lives in **`src/functions/`** — one file per
function. Nothing else in the app decides density, thresholds or permissions.

```ts
export const CRO: FunctionDef = {
  label: "Accounts",
  role: "CRO",
  question: "Which accounts need a conversation, and about what?",

  principles: [ /* why this view looks the way it does */ ],

  display: {                    // the display principle
    density: "balanced",
    tiles: 4, queueMax: 5, queueCompact: false,
    tableRows: 8, breakdownRows: 6,
  },

  targets: [ {                  // the enrichment area
    key: "buyer_concentration_pct",
    label: "Concentration risk when one buyer places over",
    unit: "percent", direction: "lower-is-better",
    value: 90,
    rationale: "Three buyers where one places 97% is a single-buyer account in disguise.",
    owner: "CRO",
  } ],

  reads:   ["commerce.orders", "commerce.accounts", "commerce.quotes"],
  actions: ["set-buyer-limit"], // allowlist — CEO is deliberately empty
}
```

**Density follows the job.** A CEO gets three tiles and three clamped queue items.
Operations is allowed to be dense, because someone sits in it all day. Change
`display` and the pages follow.

**There is one copy of every number.** A `TargetDef`'s value is read from
`config/policy.json`, which the Python extractor reads too — so the threshold the UI
shows as a target is literally the one that produced the rows. Change it in one place
and both follow.

**Every target has an owner.** `rationale` and `owner` are required, so no threshold
is anonymous. Where a customer has no real target, leave `value: null` — the panel
says "no target set" rather than printing a percentage against a number nobody agreed
to.

---

## Governance

One environment variable decides how much autonomy a deployment has.

| `GOVERNANCE_MODE` | Behaviour |
|---|---|
| `observe` | Read-only. No action controls render at all. **Start here.** |
| `propose` | Composes the change, shows the literal payload, records the approval — sends nothing. *(default)* |
| `act` | Approved changes are sent under a client scoped to that one mutation. |

It is an environment variable rather than a UI toggle because "can this change my
orders" deserves a paper trail, not a switch someone can flip mid-demo. An unset or
misspelt value falls back to `propose`, never `act`.

Two gates must both pass before an action is offered: the deployment mode **and** the
function's own `actions` allowlist.

`propose` is not a crippled `act` — it is where an organisation measures how often the
proposal was right, and earns the move to `act` with evidence instead of optimism.

---

## Adding sources (MACH)

`reads` entries are source ids — `commerce.orders`, `cms.content`, `search.queries` —
resolved against `src/sources/index.ts`, which records the MCP that supplies each and
whether it is actually connected. Commerce statuses are **derived from the data**, so
the registry cannot claim a connection that is not there.

A declared-but-unconnected source renders an explained empty state where the analysis
would have gone, rather than silently disappearing — an absent section looks identical
to "there is no problem here". See `/keystone/sources` for what is connected and what
each function is waiting on.

**Swapping commerce backend:** add `config/profiles/<id>.json` mapping the fields, set
`COMMERCE_PROFILE=<id>`. No code changes.

---

## Where things are

| Looking for | File |
|---|---|
| Every tunable number | **`config/policy.json`** — read by both the app and the extractor |
| Field map for a commerce backend | **`config/profiles/<id>.json`** |
| Density, permissions, principles, target metadata | `src/functions/*.ts` |
| Which MCP sources exist and what is connected | `src/sources/index.ts` |
| Why it behaves as it does | `DECISIONS.md` |
| What the panel may and may not change | `src/lib/mutations.ts` |
| Autonomy gate | `src/lib/governance.ts` |
| Metric definitions (shown behind the `?`) | `scripts/build-snapshot.py` → `DEFINITIONS` |
| The data pull and every derived figure | `scripts/build-snapshot.py` |

**Read `DECISIONS.md` before changing the extractor.** It records the mistakes —
including attributing revenue by record date instead of trading date, which put 98% of
a year in one month and looked entirely convincing.

---

## Contributing

The repository is private. Ask Thomas for collaborator access, then:

```bash
git clone https://github.com/thomasmulreid/keystone-control
npm install
npm run dev
```

It boots on committed data, so it runs immediately with nothing connected.

**Where to change things**

| What | File |
|---|---|
| Any tunable number | `config/policy.json` |
| A role's density, targets, permissions, principles | `src/functions/<role>.ts` |
| Field map for a commerce backend | `config/profiles/<id>.json` |
| Which MCP sources exist and their status | `src/sources/index.ts` |

After editing config, run `python3 scripts/check-config.py`. It guards the
single-source-of-truth property and catches three failure modes that have each
happened at least once, including a target silently reading a different key.

**Pushing to `main` deploys to production.** The repo is connected to the Vercel
project `commercial-autonomy-dashboard` on the Orium Pro team, so a merge goes live
on the demo URL. Work on a branch, open a PR, and check the Vercel preview before
merging. If a customer demo is imminent, do not merge.

**Read `DECISIONS.md` before changing the extractor.** It records the mistakes,
including two findings that silently stopped rendering when the data moved. The
principle worth carrying: a finding whose truth depends on a drifting number will
eventually be wrong in front of a customer.

## Not yet done

Deliberately, to keep this simple:

- **No database.** Targets are code defaults; the audit trail is in-memory and resets
  on cold start. When that stops being acceptable: Neon via
  `vercel integration add neon`, three tables — `targets`, `audit`, `snapshots` — and
  the database wins over the code defaults.
- **No live execution.** `act` mode needs a scoped client, a version re-read
  immediately before writing, and an idempotency key.
- **No real identity.** The audit trail hardcodes a demo operator. SSO before `act`.

---

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
