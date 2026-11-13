# Demo guide — Keystone Control

For Ana. Everything you need to run this in front of a customer, with no technical
prep. **https://keystone-control-dun.vercel.app**

Read the two-minute version, then the script. The rest is there for when someone asks
something hard.

---

## The two-minute version

**What it is:** a working control panel over a live B2B commerce business. It reads
real orders, finds real money, and can make a defined set of real changes.

**Why it matters:** no engineer built it. It was made in conversation with an AI that
can reach the actual systems through MCP. That is the pitch — *the people who
understand the business can now build the tools for it.*

**The one line to open with:**

> "This is a real commerce business with 58 trade accounts and $55 million of orders.
> Everything you're about to see was built by talking to an AI. No developer touched
> it. Let me show you what it found."

**What makes it land:** not the dashboard. The moment it tells you what it *refuses*
to do.

---

## Before you start (60 seconds)

1. Open **https://keystone-control-dun.vercel.app** — check it loads.
2. You will see an amber banner: *"Data to Oct 26, 2026 — 17 days ago."* **This is
   fine and it is on purpose.** See *The banner* below for your line.
3. Have the second tab ready on `/keystone/operations` so you can switch fast.

That's it. Nothing to install, no login, no VPN.

---

## The 10-minute demo

Five beats. Each has what to click, what to say, and the point you're making.

### 1 · The homepage — set the frame (1 min)

**Click:** the home page.

**Say:**
> "Four numbers. 58 trading accounts, $55 million of live order data, zero engineers,
> and five actions it's allowed to take. Hold on to that last one, it's the
> interesting bit."

**Point:** this is not a mock-up. It's reading a real commerce project.

---

### 2 · The CEO view — "it tells you what's wrong, not what happened" (2 min)

**Click:** *Open the demo* → lands on **Performance**.

**Say:**
> "This is what a CEO opens. Three numbers, not twelve. Revenue, concentration — and
> $2.6 million of revenue that has stopped moving. That's already sold. Nobody has to
> sell it again. Most dashboards would never show you that."

**Point:** density follows the job. Scroll to the work queue — three items, nothing
else.

> "Three things that matter today. Not a report. A to-do list with evidence attached."

---

### 3 · Operations — **the one that wins the room** (3 min)

**Click:** *Operations* in the nav.

**Say:**
> "This is where the ops team lives, so it's allowed to be dense. Everything that's
> stopped, grouped by *what's actually wrong with it* — not by status. Because the fix
> is different for each one."

**Now the important bit.** Point at the biggest item — *$2.5M authorised but never
captured* — and the blue tag that says **routes to Accounts receivable**.

**Say:**
> "That's the single biggest pile of money on the screen, and there is no button for
> it. Look — *'This panel will not change it.'* Marking an order paid when the money
> hasn't arrived would hide a real debt behind a green tick. So it hands it to AR and
> says why.
>
> That's the thing to take away. It's not that the AI can do everything. It's that it
> knows what it isn't allowed to touch."

**Then scroll to the bottom** — *"What this panel will and will not change."*

> "Two columns. What it can change, and what it refuses. This is the conversation you'd
> have on day one of a real deployment."

**Point:** trust comes from restraint. This is the slide people remember.

---

### 4 · Flip to the customer's side (2 min)

**Click:** the **Customer** toggle in the header → Company A → **Governance**.

Notice the whole page turns teal. Let them see that.

**Say:**
> "Same data, same engine — the customer's side of the glass. And it found this."

Point at the amber box: **"Your approval gate has never fired."**

> "Their spend limit is a million dollars. Their average order is seven and a half
> thousand. That limit is 135 times a typical order — nobody has ever needed a second
> signature. The control exists, it just can't fire.
>
> On the supplier's side, their commercial team sees the same field flagged as a
> conversation to have. One commercetools field, read from two directions. Neither
> side has to ring the other to find out what's going on."

**Point:** this is the bit nobody else shows.

**If you have time**, click **Spend** and show the $26,941 table — every line with an
order number.

> "They were charged above a rate they'd already been given, 25 times. Each row is a
> credit they can ask for. The supplier sees the identical lines flagged as *their*
> pricing error. The conversation starts from an agreed number instead of an argument
> about whose spreadsheet is right."

---

### 5 · Sources — the MACH close (2 min)

**Click:** back to **Keystone** → **Sources**.

**Say:**
> "Commerce is connected — that's commercetools over MCP. Content and search are
> declared but not connected yet, and the panel says so rather than quietly leaving
> the section out.
>
> That's the extensibility story. Point your CMS MCP at it, point your search MCP at
> it, and those light up. For you that's Contentstack and Algolia. It's a config entry,
> not a project."

**Close:**
> "Everything here was built in conversation. The thing that limits how many of these
> you have isn't engineering capacity any more — it's knowing what to ask for. That's
> the part your commercial team already has."

---

## The banner — your line for it

The amber bar at the top says the data is 17 days old. **Do not apologise for it.**
It is a feature and a good one:

> "See that? It's telling you the data is seventeen days old, and every 'days waiting'
> figure below is counted against today, not against when the snapshot was taken.
>
> The first version of this got that wrong — a quote that had been waiting four weeks
> still said three days. Someone working that queue would have been reading fiction. So
> now it says, out loud, how old its own picture is."

That answer usually earns more credibility than fresh data would have.

If you'd rather demo on fresh data, ask Thomas to re-run the snapshot — it takes a few
minutes and needs the commercetools connection.

---

## Questions you will get

**"Is this real or a mock-up?"**
> Real. 2,666 orders, 58 accounts, two years of trading, from a live commercetools
> project. Every number on the page is computed from it — the footer on each page says
> exactly what it read.

**"Can it actually change anything, or is that a screenshot?"**
> It can, and right now it's deliberately switched off. There are three modes —
> *observe* (read-only), *propose* (shows you the exact change and records the
> decision, sends nothing), and *act*. This is in propose. You'd start in observe.
> Click *Review* on any action and you'll see the literal payload it would send.
> **Do click one.** The drawer is the most convincing thing in the product.

**"What stops it doing something stupid?"**
> Four things. It only ever proposes — a person approves. The approval is a separate
> step from the detection. Every action has an allowlist per role, so the CEO view
> can't change anything at all even in act mode. And every run is recorded with a
> before, an after, and how to undo it.

**"How long did this take?"**
> Days, in conversation. The honest version: the structure took longer than the screens,
> because deciding what it's *not* allowed to do is the real work.

**"Could we have one?"**
> Yes — it's a template. Four functions, one file each, with your targets and your
> thresholds. Swapping commerce backend is a config file. That's a Thomas conversation.

**"What about our stack — we're not on commercetools."**
> The field mapping is a config file. Another backend is a new profile, not a rewrite.
> Worth saying that honestly: it's designed for it and it hasn't been done yet for a
> second system.

**"Who sets the thresholds?"**
> You do. Every one has a named owner in the config — quote goes cold after three days,
> second approver above five thousand. Those are our placeholders, not advice. Setting
> them properly is part of the engagement.

---

## Do not say

- ❌ **"It's fully autonomous."** It isn't, and that's the selling point. It proposes;
  a human approves.
- ❌ **"It writes to your live systems today."** Writes are off. Say *propose mode*.
- ❌ **"No one needs engineers any more."** Say: the constraint moves from engineering
  capacity to knowing what to ask for.
- ❌ **Don't promise CMS or search working.** They're declared, not connected. The
  Sources page is honest about it — stay on that side of the line.
- ❌ **Don't quote the thresholds as best practice.** They're placeholders with our
  names on them.

---

## If something goes wrong

**Site won't load** — it's on Vercel, no login. Try the URL fresh. If it's genuinely
down, message Thomas; it's a one-command redeploy.

**A number looks wrong** — check the banner date. Everything in days is measured
against today, so an old snapshot makes ages large. That's correct behaviour, not a bug.

**Someone asks something you can't answer** — "Good question, I don't want to guess —
let me get you a straight answer." Nobody has ever lost a deal that way, and this
product's whole argument is about not overclaiming.

---

## The one sentence, if you only get one

> "It found $2.6 million of stopped revenue and $27,000 the customer was overcharged —
> and the most important thing on the screen is the button it refuses to give you."
