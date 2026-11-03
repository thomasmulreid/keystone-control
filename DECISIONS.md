# Decisions

The judgement calls worth inheriting. Each one cost something to learn.

---

## 1. Code holds the shape; the database holds the values

A customer clones this repo to get the **structure** — four functions, their display
rules, which actions exist. They fill in their own **targets** through the app,
without touching a file.

Defaults live in `src/functions/*.ts` and seed the database on first run. After that
the database wins. If targets lived only in code, a CRO could not change their own
number without a pull request, and the thing stops being usable on a Tuesday.

## 2. Density follows the job, not a template

Every page originally had exactly four tiles. That was a grid being filled, not a
judgement being made — and it produced an 8,500-word Accounts page that was a styled
CSV.

Each function now declares its own `DisplaySpec`. A CEO gets three tiles, three
clamped queue items, no deep tables. Operations is allowed to be dense because
someone sits in it all day. Nothing is deleted — the long tail is one click away.

## 3. Three levels of autonomy, and the panel knows which is which

Every queue item resolves to exactly one of:

- **Act** — the panel can make the change, after a human sees the literal payload
  and approves it. Two steps, never one.
- **Hand over** — the panel refuses, says why, and routes it to whoever owns it.
- **Leave to a person** — judgement work. The panel supplies evidence and gets out
  of the way.

Knowing which is which *is* the product. A panel that writes to everything is not one
you can hand to a new starter; a panel that writes to nothing is a report.

## 4. Payment state is never ours to change

The largest pool of stopped revenue is nearly always unsettled payment. There is no
button for it and there should not be. Marking an order paid when the money has not
arrived hides a real debt behind a green tick. It goes to AR.

Same logic: prices and catalogue belong to Merchant Center. Anything needing more than
three fields is a form, and forms belong in the system of record. This panel decides;
it does not author.

## 5. Governance is a deployment decision, not a UI toggle

`GOVERNANCE_MODE` is `observe` → `propose` → `act`. It is an environment variable
because "can this change my orders" deserves a paper trail, not a switch someone can
flip mid-demo. An unset or misspelt value falls back to `propose`, never `act`.

`propose` is not a crippled `act`. It is the stage where an organisation measures how
often the proposal was right, and earns the move to `act` with evidence.

## 6. Trading date, not record date

**The most expensive mistake in this project.** The first build attributed revenue by
`createdAt` — when the order *record was written*. On a seeded or migrated project
that is the import date. It put 98% of a year's trading in one month and the panel
confidently reported a trend that did not exist.

The real date was on `custom.fields.orderDate`. Everything now uses `business_date()`,
which prefers the trading date and falls back to `createdAt` only for records that
have none.

It was caught by a person asking whether the numbers reconciled against an existing
report — **not** by the AI noticing. Reconcile against something you already trust
before believing a new panel.

## 7. "Complete" is a property of the data, not the clock

Month-completeness was once decided by `AS_OF.day <= 5`. The same untouched dataset
therefore read correctly on the 3rd and reported a $1.06M month-over-month collapse on
the 27th. Nothing had changed but the date.

A month is partial when the *data* stops before the month does. Any time-based rule
should be asked of the data, never of `now()`.

## 8. Ages are computed at render, never baked

The snapshot stores absolute dates only. Everything expressed in days is derived
against the real clock per request, and the gap between the data horizon and today is
shown in a banner rather than hidden.

The first version baked ages at build time. Twenty-four days later the panel still
said a quote had been waiting 3 days when it had been waiting 28. An operator working
that queue would have been reading fiction with a straight face.

## 9. Mass-quiet is a data question before it is a churn question

When 47 of 58 accounts stop ordering within the same fortnight, that is not 47 churns.
Accounts leave one at a time, for their own reasons. The panel detects the cliff and
reports one honest finding — *check the order feed before the customers* — instead of
firing 47 alerts.

Firing them would have been worse than firing none, because it teaches the person
reading the queue that the queue is noise.

## 10. No number without a definition; no target we invented

Every metric carries its definition, surfaced behind the `?` beside it. Every
threshold has a named owner in its `TargetDef`.

Where no real target exists, the panel says **"no target set"** rather than printing a
percentage against a number nobody agreed to. An inherited $1.2M target read as "468%
of target" once the book grew — technically true, completely meaningless.

## 11. Show the payload or don't ship the button

A permitted change is defined once, as data: which tool, which endpoint, which update
actions. That definition is what renders for a person and what an agent would execute.

If an operator cannot see what they are authorising, they are not authorising
anything.

---

## Open items

- **Second-approver threshold ($5,000)** and every other value in `src/functions/*.ts`
  are placeholders. They need a named owner per deployment.
- **Live execution** needs a version re-read immediately before writing, an idempotency
  key, and failure recorded rather than swallowed.
- **Identity** is hardcoded to a demo operator. Real SSO before `act` mode.
