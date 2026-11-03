/* ==================================================================
   THE WRITE-BACK LAYER

   Three mutations, chosen on purpose:

   1. release-held-order   Ops/CS. Money is stopped; releasing it moves
                           revenue. Medium risk, customer-visible.
   2. set-buyer-limit      Appears on BOTH panels — the customer admin
                           raising their own buyer's limit, and Keystone
                           recommending the same change. Same object, two
                           owners. Low risk, instantly reversible.
   3. accept-quote-request CRO/Ops. Starts the priced response on an
                           aging quote. Medium risk, revenue-bearing.

   They were picked to cover three different risk levels and to include
   exactly one that proves the two-panels-one-object thesis.

   DESIGN RULES THAT APPLY TO ALL OF THEM
   --------------------------------------
   - The agent proposes. A human disposes. Nothing that touches money or
     customer-visible state both detects and executes on its own.
   - The preview shows the literal update actions that will be sent.
     If you cannot show the payload, you cannot ship the button.
   - Every run is recorded with before/after and a named reversal.
   - Autonomy is set per deployment by GOVERNANCE_MODE (see lib/governance).
     The default is propose, so a demo can never mutate a live project by
     accident.
   ================================================================== */

export type Scope = "keystone" | "customer" | "both";
export type Risk = "low" | "medium" | "high";

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export interface Guardrail {
  label: string;
  status: "ok" | "triggered" | "blocked";
  detail: string;
}

export interface ApiCall {
  mcpTool: string;
  method: string;
  endpoint: string;
  body: unknown;
}

export interface Preview {
  title: string;
  /** One plain sentence. No jargon. This is what the operator reads first. */
  plainEnglish: string;
  whyNow: string;
  evidence: { label: string; value: string }[];
  changes: FieldChange[];
  apiCall: ApiCall;
  reversal: string;
  guardrails: Guardrail[];
  impactCents?: number;
}

export interface MutationDef {
  id: string;
  /** Button label. A verb phrase, always. */
  verb: string;
  title: string;
  scope: Scope;
  persona: string;
  resource: string;
  risk: Risk;
  reversible: boolean;
  requiredScopes: string[];
  /** Above this order/limit value a second named approver is required. */
  secondApprovalOverCents: number | null;
}

export const MUTATIONS: Record<string, MutationDef> = {
  "release-held-order": {
    id: "release-held-order",
    verb: "Release order",
    title: "Release a held order",
    scope: "keystone",
    persona: "Order operations",
    resource: "order",
    risk: "medium",
    reversible: true,
    requiredScopes: ["manage_orders:demo-orium-b2b"],
    secondApprovalOverCents: 5_000_00,
  },
  "set-buyer-limit": {
    id: "set-buyer-limit",
    verb: "Update limit",
    title: "Change a spend limit",
    scope: "both",
    persona: "Account admin / Commercial",
    resource: "business-unit",
    risk: "low",
    reversible: true,
    requiredScopes: ["manage_business_units:demo-orium-b2b"],
    secondApprovalOverCents: null,
  },
  "accept-quote-request": {
    id: "accept-quote-request",
    verb: "Accept for pricing",
    title: "Accept a quote request",
    scope: "keystone",
    persona: "Commercial / Order operations",
    resource: "quote-request",
    risk: "medium",
    reversible: false,
    requiredScopes: ["manage_quote_requests:demo-orium-b2b"],
    secondApprovalOverCents: null,
  },
};

const PROJECT = "demo-orium-b2b";

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

function baseGuardrails(def: MutationDef, valueCents: number | null): Guardrail[] {
  const g: Guardrail[] = [
    {
      label: "Scoped credentials",
      status: "ok",
      detail: `Runs as an API client limited to ${def.requiredScopes.join(", ")}. Not an admin key.`,
    },
    {
      label: "Audit record",
      status: "ok",
      detail: "Operator, timestamp, before/after and the exact actions sent are written to the trail.",
    },
    {
      label: def.reversible ? "Reversible" : "One-way",
      status: def.reversible ? "ok" : "triggered",
      detail: def.reversible
        ? "Can be put back to its previous value from the audit trail."
        : "No automatic undo. The customer sees this change.",
    },
  ];
  if (def.secondApprovalOverCents && valueCents !== null) {
    const over = valueCents > def.secondApprovalOverCents;
    g.push({
      label: "Second approver",
      status: over ? "triggered" : "ok",
      detail: over
        ? `Value is above ${usd(def.secondApprovalOverCents)}. A second named approver must sign off before this runs.`
        : `Value is under the ${usd(def.secondApprovalOverCents)} threshold. One approver is enough.`,
    });
  }
  return g;
}

/* ---------------------------- 1. Release ---------------------------- */
export interface ReleaseInput {
  orderId: string; orderNumber: string; version?: number;
  totalCents: number; accountName: string; buyer: string | null;
  ageDays: number; buyerLimitCents: number | null; poNumber: string | null;
  orderState: string; reasonLabel: string;
}

export function previewRelease(i: ReleaseInput): Preview {
  const def = MUTATIONS["release-held-order"];
  const overLimit = i.buyerLimitCents !== null && i.totalCents > i.buyerLimitCents;
  return {
    title: `Release ${i.orderNumber}`,
    plainEnglish:
      `This confirms ${i.orderNumber} for ${i.accountName} so it can be picked and shipped. ` +
      `The customer will see the order move from pending to confirmed.`,
    whyNow:
      `${usd(i.totalCents)} has been stopped for ${i.ageDays} ${i.ageDays === 1 ? "day" : "days"}` +
      (overLimit
        ? ` because it is above ${i.buyer ?? "the buyer"}'s spend limit of ${usd(i.buyerLimitCents!)}.`
        : ` as "${i.reasonLabel.toLowerCase()}".`),
    evidence: [
      { label: "Account", value: i.accountName },
      { label: "Buyer", value: i.buyer ?? "—" },
      { label: "PO number", value: i.poNumber ?? "not supplied" },
      { label: "Order value", value: usd(i.totalCents) },
      { label: "Held for", value: `${i.ageDays} days` },
      ...(overLimit
        ? [{ label: "Spend limit", value: `${usd(i.buyerLimitCents!)} — exceeded by ${usd(i.totalCents - i.buyerLimitCents!)}` }]
        : []),
    ],
    changes: [{ field: "orderState", before: i.orderState, after: "Confirmed" }],
    apiCall: {
      mcpTool: "update_orders",
      method: "POST",
      endpoint: `/${PROJECT}/orders/${i.orderId}`,
      body: {
        version: i.version ?? "<current version>",
        actions: [{ action: "changeOrderState", orderState: "Confirmed" }],
      },
    },
    reversal:
      "Send changeOrderState back to its previous value. Safe until the order is picked; " +
      "after dispatch it becomes a return rather than a reversal.",
    guardrails: baseGuardrails(def, i.totalCents),
    impactCents: i.totalCents,
  };
}

/* -------------------------- 2. Spend limit -------------------------- */
export interface LimitInput {
  businessUnitId: string; businessUnitKey: string; accountName: string;
  version?: number; currentLimit: number | null; proposedLimit: number;
  scope: "keystone" | "customer";
  /** Why the number was proposed — always shown, never just a suggestion. */
  rationale: string;
  blockedOrders: number; blockedValueCents: number;
}

export function previewLimit(i: LimitInput): Preview {
  const def = MUTATIONS["set-buyer-limit"];
  const raising = i.currentLimit === null || i.proposedLimit > i.currentLimit;
  const who = i.scope === "customer" ? "your buyers" : `${i.accountName}'s buyers`;
  return {
    title: `${raising ? "Raise" : "Lower"} the spend limit for ${i.accountName}`,
    plainEnglish:
      `This ${raising ? "raises" : "lowers"} the per-order spend limit for ${who} from ` +
      `${i.currentLimit === null ? "no limit" : usd(i.currentLimit * 100)} to ${usd(i.proposedLimit * 100)}. ` +
      `Orders under the new limit go straight through; orders over it still need an approver.`,
    whyNow: i.rationale,
    evidence: [
      { label: "Business unit", value: i.businessUnitKey },
      { label: "Current limit", value: i.currentLimit === null ? "not set" : usd(i.currentLimit * 100) },
      { label: "Proposed limit", value: usd(i.proposedLimit * 100) },
      { label: "Orders held by the current limit", value: String(i.blockedOrders) },
      { label: "Value held", value: usd(i.blockedValueCents) },
      { label: "Behaviour over limit", value: "pending — routed to an approver" },
    ],
    changes: [
      {
        field: "custom.fields.buyerLimit",
        before: i.currentLimit === null ? "—" : String(i.currentLimit),
        after: String(i.proposedLimit),
      },
    ],
    apiCall: {
      mcpTool: "update_business_units",
      method: "POST",
      endpoint: `/${PROJECT}/business-units/${i.businessUnitId}`,
      body: {
        version: i.version ?? "<current version>",
        actions: [{ action: "setCustomField", name: "buyerLimit", value: i.proposedLimit }],
      },
    },
    reversal: `Set buyerLimit back to ${i.currentLimit ?? "its previous value"}. Takes effect on the next order; nothing already placed changes.`,
    guardrails: [
      ...baseGuardrails(def, null),
      {
        label: "Both parties see this",
        status: "triggered",
        detail:
          "This field is visible on the Keystone panel and on the customer's own panel. " +
          "Whoever changes it, the other side sees the new value and the audit entry.",
      },
    ],
    impactCents: i.blockedValueCents,
  };
}

/* --------------------------- 3. Quote ------------------------------ */
export interface QuoteInput {
  quoteRequestId: string; version?: number; accountName: string;
  buyer: string | null; totalCents: number; ageDays: number; lineCount: number;
  comment: string | null;
}

export function previewQuote(i: QuoteInput): Preview {
  const def = MUTATIONS["accept-quote-request"];
  return {
    title: "Accept this quote request for pricing",
    plainEnglish:
      `This accepts ${i.accountName}'s request so it can be priced. ` +
      `Accepting does not send a price — it creates the staged quote your pricer works in. ` +
      `The customer sees the request move from submitted to accepted.`,
    whyNow:
      `${usd(i.totalCents)} across ${i.lineCount} ${i.lineCount === 1 ? "line" : "lines"} has been waiting ` +
      `${i.ageDays} days with no response. Quote requests older than three days convert materially worse.`,
    evidence: [
      { label: "Account", value: i.accountName },
      { label: "Requested by", value: i.buyer ?? "—" },
      { label: "Value", value: usd(i.totalCents) },
      { label: "Lines", value: String(i.lineCount) },
      { label: "Waiting", value: `${i.ageDays} days` },
      ...(i.comment ? [{ label: "Customer note", value: i.comment }] : []),
    ],
    changes: [{ field: "quoteRequestState", before: "Submitted", after: "Accepted" }],
    apiCall: {
      mcpTool: "update_quote_requests",
      method: "POST",
      endpoint: `/${PROJECT}/quote-requests/${i.quoteRequestId}`,
      body: {
        version: i.version ?? "<current version>",
        actions: [{ action: "changeQuoteRequestState", quoteRequestState: "Accepted" }],
      },
    },
    reversal:
      "None automatically. Accepting is visible to the customer. To withdraw, the request must be " +
      "cancelled and re-raised, which the customer sees.",
    guardrails: [
      ...baseGuardrails(def, i.totalCents),
      {
        label: "Pricing stays with a person",
        status: "ok",
        detail:
          "This moves the request into the pricer's queue. No price is set, offered or sent by this action.",
      },
    ],
    impactCents: i.totalCents,
  };
}

