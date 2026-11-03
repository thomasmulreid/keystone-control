import { Snapshot, getAccount } from "./snapshot";
import { QueueItem } from "./queue";
import {
  MUTATIONS, previewRelease, previewLimit, previewQuote, Preview, MutationDef,
} from "./mutations";

/* ------------------------------------------------------------------
   Turn a queue item's `run` descriptor into a full preview.

   Kept out of the components on purpose: the proposal — including the
   literal payload — is built on the server from server data. The client
   renders it and collects an approval. It never composes a mutation.
   ------------------------------------------------------------------ */

export interface Runnable { preview: Preview; def: MutationDef }

/** A sane limit: the account's own average order, rounded to a readable number. */
export function suggestedLimit(aovCents: number): number {
  const dollars = aovCents / 100;
  const step = dollars > 50_000 ? 10_000 : dollars > 10_000 ? 5_000 : 1_000;
  return Math.max(step, Math.round(dollars / step) * step);
}

export function buildPreviews(
  snapshot: Snapshot,
  items: QueueItem[],
  scope: "keystone" | "customer",
): Record<string, Runnable> {
  const out: Record<string, Runnable> = {};

  for (const item of items) {
    if (!item.run) continue;
    const def = MUTATIONS[item.run.mutationId];
    if (!def) continue;

    if (def.id === "release-held-order") {
      const rows = snapshot.exceptions.filter((e) => e.reason === "awaiting-release");
      const e = rows.find((r) => r.id === item.run!.ref) ?? rows[0];
      if (!e) continue;
      out[item.id] = {
        def,
        preview: previewRelease({
          orderId: e.id,
          orderNumber: e.orderNumber,
          totalCents: e.totalCents,
          accountName: e.accountName,
          buyer: e.customerEmail,
          ageDays: e.ageDays,
          buyerLimitCents: e.buyerLimitCents,
          poNumber: e.poNumber,
          orderState: e.orderState,
          reasonLabel: e.reasonLabel,
        }),
      };
    }

    if (def.id === "set-buyer-limit") {
      const a = getAccount(snapshot, item.run.ref);
      if (!a) continue;
      const proposed = suggestedLimit(a.aovCents);
      out[item.id] = {
        def,
        preview: previewLimit({
          businessUnitId: a.id ?? `<${a.key} business-unit id>`,
          businessUnitKey: a.key,
          accountName: a.name,
          currentLimit: a.buyerLimit,
          proposedLimit: proposed,
          scope,
          rationale:
            scope === "customer"
              ? `Your average order is ${fmt(a.aovCents)}. A limit of ${fmt(proposed * 100)} lets ordinary ordering through untouched ` +
                `and sends only the unusual ones to an approver. Today the limit is ${a.buyerLimit === null ? "unset" : fmt(a.buyerLimit * 100)}, ` +
                `which is more than this account has spent all year — so nothing is ever checked.`
              : `${a.name}'s limit of ${a.buyerLimit === null ? "unset" : fmt(a.buyerLimit * 100)} is above their entire ${fmt(a.revenueCents)} of annual spend, ` +
                `so no order can reach an approver. Their average order is ${fmt(a.aovCents)}. ` +
                `Propose ${fmt(proposed * 100)} — it keeps normal buying frictionless and restores the control they think they already have.`,
          blockedOrders: a.overLimitCount,
          blockedValueCents: a.overLimitOrders.reduce((s, o) => s + o.totalCents, 0),
        }),
      };
    }

    if (def.id === "accept-quote-request") {
      const q = snapshot.quotes.find((x) => x.id === item.run!.ref);
      if (!q) continue;
      const a = getAccount(snapshot, q.businessUnit);
      out[item.id] = {
        def,
        preview: previewQuote({
          quoteRequestId: q.id,
          accountName: a?.name ?? q.businessUnit,
          buyer: q.customerEmail,
          totalCents: q.totalCents,
          ageDays: q.ageDays,
          lineCount: q.lineCount,
          comment: q.comment,
        }),
      };
    }
  }

  return out;
}

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(c / 100);
