import { Snapshot, Account, gateNeverFired } from "./snapshot";

/* ==================================================================
   WORK QUEUE

   A queue item is not an insight. It is a piece of work with an owner,
   a reason it is surfacing today, a size, and a next step.

   Three kinds of next step, and the distinction is deliberate:

     run    - the panel can make this change itself, under preview and
              approval, via a scoped commercetools client.
     route  - the panel will NOT change this object. Payment state is
              not ops' to flip; it belongs to AR and to the payment
              provider. The panel hands it over and says so.
     open   - judgement work for a person. The panel supplies evidence
              and gets out of the way.

   Knowing which is which is the product. A panel that writes everything
   is not trustworthy; a panel that writes nothing is a report.
   ================================================================== */

export type Urgency = "now" | "week" | "watch";
export type Confidence = "high" | "medium" | "low";

export interface QueueItem {
  id: string;
  title: string;
  why: string;
  impactCents: number | null;
  impactLabel: string;
  urgency: Urgency;
  confidence: Confidence;
  evidence: { label: string; value: string }[];
  /** How the same fact reads on the other panel. The two-sides-of-the-glass link. */
  counterpart?: string;
  run?: { mutationId: string; ref: string };
  route?: { to: string; because: string };
  open?: { note: string };
}

const pct = (n: number) => `${Math.round(n)}%`;
const usd = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(c / 100);

/* ---------------------------------------------------------------- */
/* Keystone: the merchant's queue                                     */
/* ---------------------------------------------------------------- */
export function keystoneQueue(snapshot: Snapshot): QueueItem[] {
  const items: QueueItem[] = [];
  const ex = snapshot.exceptions;

  // 1. Orders sitting unconfirmed — the panel can release these.
  const awaiting = ex.filter((e) => e.reason === "awaiting-release");
  if (awaiting.length) {
    const val = awaiting.reduce((s, e) => s + e.totalCents, 0);
    const oldest = Math.max(...awaiting.map((e) => e.ageDays));
    items.push({
      id: "release-queue",
      title: `Release ${awaiting.length} orders waiting on confirmation`,
      why: `These were created but never confirmed. The oldest has been sitting ${oldest} days and the customer has had no signal either way.`,
      impactCents: val,
      impactLabel: "value held",
      urgency: "now",
      confidence: "high",
      evidence: [
        { label: "Orders", value: String(awaiting.length) },
        { label: "Oldest", value: `${oldest} days` },
        { label: "Accounts", value: [...new Set(awaiting.map((e) => e.accountName))].join(", ") },
      ],
      run: { mutationId: "release-held-order", ref: awaiting[0].id },
    });
  }

  // 2. The big money — and the panel explicitly declines to touch it.
  const pending = ex.filter((e) => e.reason === "payment-pending");
  if (pending.length) {
    const val = pending.reduce((s, e) => s + e.totalCents, 0);
    const oldest = Math.max(...pending.map((e) => e.ageDays));
    items.push({
      id: "ar-queue",
      title: `${usd(val)} authorised but never captured`,
      why: `${pending.length} orders are confirmed and most are already picked, but payment has not settled. The oldest is ${oldest} days. This is the single largest pool of stopped revenue.`,
      impactCents: val,
      impactLabel: "value stopped",
      urgency: "now",
      confidence: "high",
      evidence: [
        { label: "Orders", value: String(pending.length) },
        { label: "Oldest", value: `${oldest} days` },
        { label: "Already shipped", value: String(pending.filter((e) => e.shipmentState === "Shipped").length) },
        { label: "Picked, not shipped", value: String(pending.filter((e) => e.shipmentState === "Ready").length) },
      ],
      route: {
        to: "Accounts receivable",
        because:
          "Payment state belongs to AR and the payment provider. This panel will not mark an order paid — doing so would hide a real debt behind a green tick.",
      },
    });
  }

  // 3. Picked and staged but never dispatched.
  const stuck = ex.filter((e) => e.reason === "ready-not-shipped");
  if (stuck.length) {
    const val = stuck.reduce((s, e) => s + e.totalCents, 0);
    items.push({
      id: "dispatch-queue",
      title: `${stuck.length} paid orders picked but not dispatched`,
      why: `Paid, staged and going nowhere for more than five days. Usually a carrier booking gap rather than a stock problem.`,
      impactCents: val,
      impactLabel: "value staged",
      urgency: "week",
      confidence: "high",
      evidence: [
        { label: "Orders", value: String(stuck.length) },
        { label: "Oldest", value: `${Math.max(...stuck.map((e) => e.ageDays))} days` },
      ],
      open: { note: "Confirm the carrier booking, then mark shipped from the order." },
    });
  }

  // 4. Aging quote requests.
  const openQuotes = snapshot.quotes.filter((q) => q.state === "Submitted");
  for (const q of openQuotes) {
    const acct = snapshot.accounts.find((a) => a.key === q.businessUnit);
    items.push({
      id: `quote-${q.id}`,
      title: `Price ${acct?.name ?? q.businessUnit}'s request before it goes cold`,
      why: `${usd(q.totalCents)} across ${q.lineCount} lines, submitted ${q.ageDays} days ago with no response yet.`,
      impactCents: q.totalCents,
      impactLabel: "quote value",
      urgency: q.ageDays >= 3 ? "now" : "week",
      confidence: "high",
      evidence: [
        { label: "Requested by", value: q.customerEmail ?? "—" },
        { label: "Waiting", value: `${q.ageDays} days` },
        { label: "Lines", value: String(q.lineCount) },
      ],
      counterpart: `${acct?.name ?? "The customer"} sees this on their own panel as "waiting on Keystone".`,
      run: { mutationId: "accept-quote-request", ref: q.id },
    });
  }

  // 5. Governance: limits set so high they are not limits.
  const toothless = snapshot.accounts.filter((a) => gateNeverFired(a, 10) !== null);
  for (const a of toothless.slice(0, 2)) {
    items.push({
      id: `limit-${a.key}`,
      title: `${a.name}'s spend limit is above its entire year of spend`,
      why: `The per-order limit is ${usd(a.buyerLimit! * 100)} but the account has spent ${usd(a.revenueCents)} in total across ${a.orderCount} orders. No order can ever trigger an approval, so the control does nothing.`,
      impactCents: a.revenueCents,
      impactLabel: "spend with no approval gate",
      urgency: "week",
      confidence: "high",
      evidence: [
        { label: "Current limit", value: usd(a.buyerLimit! * 100) },
        { label: "Largest order", value: usd(a.aovCents * 3) },
        { label: "Average order", value: usd(a.aovCents) },
        { label: "Buyers", value: `${a.buyerCount} (top buyer places ${pct(a.topBuyerSharePct)} of spend)` },
      ],
      counterpart: `${a.name}'s own admin sees this as "one person can spend ${usd(a.buyerLimit! * 100)} without a second signature".`,
      run: { mutationId: "set-buyer-limit", ref: a.key },
    });
  }

  // 6. Contract leakage.
  const leaking = snapshot.accounts.filter((a) => a.leakageCents > 0).sort((a, b) => b.leakageCents - a.leakageCents);
  for (const a of leaking.slice(0, 1)) {
    const top = a.leakageLines[0];
    items.push({
      id: `leak-${a.key}`,
      title: `${a.name} paid above its own agreed rate on ${a.leakageLines.length} lines`,
      why: `${usd(a.leakageCents)} was charged above the rate this same account has been given before. The largest single case is ${top.name} at ${usd(top.paidCents)} against an agreed ${usd(top.contractCents)}.`,
      impactCents: a.leakageCents,
      impactLabel: "overcharged",
      urgency: "now",
      confidence: "high",
      evidence: [
        { label: "Lines affected", value: String(a.leakageLines.length) },
        { label: "Worst case", value: `${top.name} — ${top.qty} units` },
        { label: "Paid", value: `${usd(top.paidCents)} vs ${usd(top.contractCents)} agreed` },
        { label: "First seen", value: a.leakageLines[a.leakageLines.length - 1]?.createdAt.slice(0, 10) ?? "—" },
      ],
      counterpart: `${a.name} sees the same lines on their panel under "what your contract did not cover".`,
      open: {
        note: "Find out whether the contract price was missing on these SKUs or the buyer ordered outside the agreement, then credit or fix the price list.",
      },
    });
  }

  // 7. Accounts that have gone quiet.
  //
  // Branches on whether the quiet is distributed (real churn risk) or
  // bunched against the edge of the data (a coverage problem wearing a
  // churn costume). Reporting the second as the first would put 47
  // fictitious churn alerts in front of a rep.
  const qc = snapshot.totals.quietCluster;
  const quiet = snapshot.accounts
    .filter((a) => a.overdue && a.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);

  if (qc?.clustered) {
    items.push({
      id: "quiet-cluster",
      title: `${qc.accounts} of ${qc.ofAccounts} accounts stop ordering at the same date — check the data before the customers`,
      why: `${qc.atCliff} of them place their last order within two weeks of ${qc.cliffDate}, and nothing since. Accounts churn one at a time, for their own reasons; they do not all leave in the same fortnight. This pattern is what a feed that stopped looks like, not what ${qc.accounts} lost customers look like.`,
      impactCents: qc.revenueCents,
      impactLabel: "revenue on the affected accounts",
      urgency: "now",
      confidence: "high",
      evidence: [
        { label: "Accounts quiet", value: `${qc.accounts} of ${qc.ofAccounts} (${pct(qc.sharePct)})` },
        { label: "Stopping within 14 days of the same date", value: `${qc.atCliff}` },
        { label: "That date", value: qc.cliffDate ?? "—" },
        { label: "Last order anywhere in the book", value: snapshot.window.to },
        { label: "Revenue involved", value: usd(qc.revenueCents) },
      ],
      open: {
        note: "Confirm the order feed is still writing before treating any of this as churn. If the feed is healthy, then it is churn and it is an emergency — but establish which one first.",
      },
    });
  } else if (quiet.length) {
    const top = quiet[0];
    items.push({
      id: "quiet-accounts",
      title: `${quiet.length} accounts have stopped ordering on their usual rhythm`,
      why: `Led by ${top.name}, which normally orders every ${top.medianGapDays} days and has now been quiet for ${top.daysSinceLastOrder}. In B2B this is the churn signal, and it almost never shows up in a conversion report.`,
      impactCents: quiet.reduce((s, a) => s + a.revenueCents, 0),
      impactLabel: "revenue on the quiet accounts",
      urgency: "week",
      confidence: "medium",
      evidence: quiet.slice(0, 4).map((a) => ({
        label: a.name,
        value: `every ${a.medianGapDays}d, quiet ${a.daysSinceLastOrder}d — ${usd(a.revenueCents)}`,
      })),
      open: { note: "Give the list to the rep who owns each account with the last order and the usual cadence attached." },
    });
  }

  // 8. Continuity risk concentrated in one person.
  const conc = snapshot.accounts.filter((a) => a.effectivelySingleBuyer && a.revenueCents > 100_000_00);
  if (conc.length) {
    items.push({
      id: "buyer-concentration",
      title: `${conc.length} accounts depend on a single person to place every order`,
      why: `Together they are ${usd(conc.reduce((s, a) => s + a.revenueCents, 0))} of revenue resting on one named buyer each. If that person changes job, the account stops.`,
      impactCents: conc.reduce((s, a) => s + a.revenueCents, 0),
      impactLabel: "revenue on one buyer each",
      urgency: "watch",
      confidence: "high",
      evidence: conc.slice(0, 5).map((a) => ({
        label: a.name,
        value: `${a.buyerCount === 1 ? "1 buyer" : `${a.buyerCount} buyers, top places ${pct(a.topBuyerSharePct)}`} — ${usd(a.revenueCents)}`,
      })),
      counterpart: "Each of these accounts sees the same number as a continuity risk on their own panel.",
      open: { note: "Offer to set up a second buyer and an approver. It protects the account and it protects the revenue." },
    });
  }

  return rank(items);
}

/* ---------------------------------------------------------------- */
/* Customer: one account's own queue                                  */
/* ---------------------------------------------------------------- */
export function customerQueue(a: Account, snapshot: Snapshot): QueueItem[] {
  const items: QueueItem[] = [];
  const ex = snapshot.exceptions.filter((e) => e.businessUnit === a.key);

  // 1. Governance — their own limit, read from their side.
  const ownGate = gateNeverFired(a, 10);
  if (ownGate) {
    items.push({
      id: "own-limit",
      title: `One person can spend ${usd(a.buyerLimit! * 100)} without a second signature`,
      why: `Your per-order limit is ${ownGate.ratio} times a typical order on this account, and in ${a.orderCount} orders not one has ever reached it. Nothing is going to an approver, so no order is being checked.`,
      impactCents: a.revenueCents,
      impactLabel: "spend with no approval step",
      urgency: "now",
      confidence: "high",
      evidence: [
        { label: "Current limit", value: usd(a.buyerLimit! * 100) },
        { label: "Your average order", value: usd(a.aovCents) },
        { label: "Buyers on the account", value: String(a.buyerCount) },
        { label: "Share placed by one person", value: pct(a.topBuyerSharePct) },
      ],
      counterpart: "Keystone sees the same field, and will see your change in their audit trail.",
      run: { mutationId: "set-buyer-limit", ref: a.key },
    });
  }

  // 2. What the contract has been worth — and what it missed.
  if (a.savingsCents > 0) {
    items.push({
      id: "contract-value",
      title: `Your agreed rates have saved ${usd(a.savingsCents)} this year`,
      why:
        a.leakageCents > 0
          ? `That is real money off list. But ${usd(a.leakageCents)} was still charged above a rate you have already been given elsewhere, on ${a.leakageLines.length} lines.`
          : `Every line this year was billed at or below your agreed rate. Nothing to chase.`,
      impactCents: a.leakageCents > 0 ? a.leakageCents : a.savingsCents,
      impactLabel: a.leakageCents > 0 ? "to recover" : "saved",
      urgency: a.leakageCents > 0 ? "now" : "watch",
      confidence: "high",
      evidence: [
        { label: "Saved against list", value: usd(a.savingsCents) },
        { label: "Charged above your rate", value: usd(a.leakageCents) },
        ...(a.leakageLines[0]
          ? [{
              label: "Worst line",
              value: `${a.leakageLines[0].name} — ${a.leakageLines[0].qty} units at ${usd(a.leakageLines[0].paidCents)} vs ${usd(a.leakageLines[0].contractCents)}`,
            }]
          : []),
      ],
      counterpart: a.leakageCents > 0 ? "Keystone's commercial team sees the same lines flagged as a pricing error." : undefined,
      open: a.leakageCents > 0 ? { note: "Send these lines to your Keystone rep and ask for the difference as a credit." } : undefined,
    });
  }

  // 3. Continuity inside their own organisation.
  if (a.effectivelySingleBuyer) {
    items.push({
      id: "own-concentration",
      title:
        a.buyerCount === 1
          ? "Every order runs through one person"
          : `One of your ${a.buyerCount} buyers places ${pct(a.topBuyerSharePct)} of orders`,
      why: `If ${a.buyers[0]?.email ?? "that person"} is away, ordering stops. There is no second buyer carrying any real volume and no approver set up behind them.`,
      impactCents: a.revenueCents,
      impactLabel: "annual spend through one person",
      urgency: "week",
      confidence: "high",
      evidence: a.buyers.slice(0, 4).map((b) => ({ label: b.email, value: usd(b.revenueCents) })),
      counterpart: "Keystone flags this as an account risk on their side.",
      open: { note: "Add a second buyer and an approver. It takes one change and removes the single point of failure." },
    });
  }

  // 4. Their own stopped orders.
  if (ex.length) {
    const val = ex.reduce((s, e) => s + e.totalCents, 0);
    const byReason = [...new Set(ex.map((e) => e.reasonLabel))];
    items.push({
      id: "own-exceptions",
      title: `${ex.length} of your orders have stopped moving`,
      why: `${usd(val)} is sitting in ${byReason.join(", ").toLowerCase()}. Each one is something you would otherwise find out about by chasing it.`,
      impactCents: val,
      impactLabel: "your value held",
      urgency: "now",
      confidence: "high",
      evidence: ex.slice(0, 5).map((e) => ({
        label: e.orderNumber,
        value: `${usd(e.totalCents)} — ${e.reasonLabel.toLowerCase()}, ${e.ageDays}d${e.poNumber ? ` · PO ${e.poNumber}` : ""}`,
      })),
      counterpart: "These appear on Keystone's exception desk with the same ages.",
      open: { note: "Nothing for you to do on most of these. They sit with Keystone — the point is that you can see them without asking." },
    });
  }

  // 5. Their quotes.
  const open = a.openQuotes;
  if (open.length) {
    items.push({
      id: "own-quotes",
      title: `${open.length} quote ${open.length === 1 ? "request is" : "requests are"} waiting on Keystone`,
      why: `${usd(open.reduce((s, q) => s + q.totalCents, 0))} submitted and not yet priced. The oldest has been waiting ${Math.max(...open.map((q) => q.ageDays))} days.`,
      impactCents: open.reduce((s, q) => s + q.totalCents, 0),
      impactLabel: "awaiting a price",
      urgency: "week",
      confidence: "high",
      evidence: open.map((q) => ({
        label: q.customerEmail ?? "—",
        value: `${usd(q.totalCents)}, ${q.lineCount} lines, ${q.ageDays}d`,
      })),
      counterpart: "This sits at the top of Keystone's quote desk.",
      open: { note: "No action needed from you. Chase your rep if it passes a week." },
    });
  }

  // 6. Divisions configured but unused.
  const emptyDivs = a.divisions.filter((d) => d.buyerLimit !== null);
  if (emptyDivs.length) {
    items.push({
      id: "divisions",
      title: `${emptyDivs.length} divisions are set up but nothing is ordered through them`,
      why: `Every order is being placed against the parent account, so division budgets and ship-to addresses are not doing anything. Spend cannot be attributed back to a site.`,
      impactCents: null,
      impactLabel: "",
      urgency: "watch",
      confidence: "medium",
      evidence: emptyDivs.map((d) => ({
        label: d.name,
        value: d.buyerLimit !== null ? `limit ${usd(d.buyerLimit * 100)} — no orders` : "no limit set",
      })),
      open: { note: "Either assign buyers to the divisions or retire them. Half-configured hierarchy is worse than none." },
    });
  }

  return rank(items);
}

const URGENCY_WEIGHT: Record<Urgency, number> = { now: 3, week: 2, watch: 1 };

/** Rank by urgency band first, then by value inside the band. */
function rank(items: QueueItem[]): QueueItem[] {
  return items.sort(
    (a, b) =>
      URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency] ||
      (b.impactCents ?? 0) - (a.impactCents ?? 0),
  );
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  now: "Today",
  week: "This week",
  watch: "Watch",
};
