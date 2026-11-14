import { ageDays, freshness, Freshness } from "./clock";
import snapshotJson from "../../data/snapshot.json";

/* ------------------------------------------------------------------
   Types mirror what scripts/build-snapshot.py emits.

   PROTOTYPE SEAM: the snapshot is a build artefact today. In hardening
   this module becomes an async data access layer backed by the
   commercetools MCP (or the HTTP API) with a short cache. Call sites
   already treat it as read-only and opaque, so swapping it is local.
   ------------------------------------------------------------------ */

export type Money = number; // cents

export interface Associate { id: string; role: string }
export interface Division { key: string; name: string; buyerLimit: number | null }

export interface LeakageLine {
  orderNumber: string; createdAt: string; sku: string; name: string;
  qty: number; paidCents: Money; contractCents: Money;
  overpaidCents: Money; buyer: string | null;
}

export interface OverLimitOrder {
  orderNumber: string; totalCents: Money; createdAt: string;
  buyer: string | null; orderState: string; paymentState: string | null;
}

export interface QuoteRequest {
  id: string; createdAt: string; ageDays: number; state: string;
  businessUnit: string; customerEmail: string | null;
  totalCents: Money; lineCount: number; comment: string | null;
}

export interface Account {
  key: string;
  /** Real commercetools business-unit id — used to build the update payload. */
  id: string | null;
  name: string; city: string | null; state: string | null;
  contactEmail: string | null; store: string | null;
  buyerLimit: number | null; limitExceededBehavior: string | null;
  associates: Associate[]; divisions: Division[];
  orderCount: number; revenueCents: Money; aovCents: Money;
  linesPerOrder: number; distinctSkus: number;
  monthly: Record<string, Money>;
  categories: Record<string, Money>;
  buyers: { email: string; revenueCents: Money }[];
  buyerCount: number; singleBuyer: boolean;
  /** Share of the account's spend placed by its single largest buyer. */
  topBuyerSharePct: number;
  /** One buyer, or one buyer placing 90%+ — a concentration risk either way. */
  effectivelySingleBuyer: boolean;
  lastOrderAt: string | null; daysSinceLastOrder: number | null;
  medianGapDays: number | null; overdue: boolean; recurringOrders: number;
  savingsCents: Money; leakageCents: Money; leakageLines: LeakageLine[];
  overLimitOrders: OverLimitOrder[]; overLimitCount: number;
  quoteCount: number; openQuotes: QuoteRequest[];
}

export interface ExceptionRow {
  id: string; orderNumber: string; createdAt: string; ageDays: number;
  businessUnit: string | null; accountName: string; customerEmail: string | null;
  totalCents: Money; orderState: string; paymentState: string | null;
  shipmentState: string | null; poNumber: string | null; lineCount: number;
  reason: string; reasonLabel: string; guidance: string;
  buyerLimitCents: Money | null; overLimit: boolean;
}

export interface OrderRow {
  id: string; orderNumber: string; createdAt: string; month: string;
  ageDays: number; businessUnit: string | null; customerEmail: string | null;
  orderState: string; paymentState: string | null; shipmentState: string | null;
  origin: string; poNumber: string | null; totalCents: Money; lineCount: number;
}

export interface SkuRow {
  sku: string; name: string; brand: string | null; category: string;
  units: number; revenueCents: Money; accountCount: number;
  lowestCents: Money; listCents: Money; spreadPct: number;
  priceCount: number; lastSold: string | null;
}

export interface Snapshot {
  generatedAt: string;
  /** Latest trading date in the data — the horizon of what this panel knows. */
  dataAsOf: string;
  project: string; currency: string;
  window: { from: string; to: string; currentMonth: string; priorMonth: string; partialMonth: string | null };
  totals: {
    revenueCents: Money; orderCount: number; aovCents: Money; activeAccounts: number;
    monthly: Record<string, Money>; categories: Record<string, Money>;
    savingsCents: Money; leakageCents: Money;
    exceptionCount: number; exceptionValueCents: Money; openQuoteCount: number;
    /** Set when most accounts stop at the same date — a data cliff, not churn. */
    quietCluster: {
      accounts: number; ofAccounts: number; sharePct: number;
      earliestLastOrder: string | null; latestLastOrder: string | null;
      cliffDate: string | null; atCliff: number;
      clustered: boolean; revenueCents: Money;
    };
    /** The month holding the most revenue, and its share of the window. */
    peakMonth: string; peakMonthSharePct: number;
    /** False when one month dominates — month-over-month is then not a real comparison. */
    monthlyComparable: boolean;
  };
  whatMoved: { name: string; key: string; kind: string; deltaCents: Money; currentCents: Money }[];
  accounts: Account[];
  exceptions: ExceptionRow[];
  skus: SkuRow[];
  brands: Record<string, Money>;
  quotes: QuoteRequest[];
  orders: OrderRow[];
  definitions: Record<string, string>;
}

const raw = snapshotJson as unknown as Snapshot;

/**
 * The snapshot with every age recomputed against the real clock.
 *
 * Call this per request, not at module scope: module scope is evaluated once
 * when the server boots (or at build time for a static page), which is exactly
 * the staleness bug this exists to kill. Pages set `revalidate` so the
 * regenerated HTML carries fresh ages.
 */
export function liveSnapshot(ref: Date = new Date()): Snapshot & { freshness: Freshness } {
  const dataAsOf = raw.dataAsOf ?? raw.generatedAt;
  const f = freshness(dataAsOf, ref);

  const accounts = raw.accounts.map((a) => {
    const since = a.lastOrderAt ? ageDays(a.lastOrderAt, ref) : null;
    return {
      ...a,
      daysSinceLastOrder: since,
      overdue: Boolean(
        a.medianGapDays && since !== null && a.medianGapDays > 0 && since > a.medianGapDays * 1.5,
      ),
      openQuotes: a.openQuotes.map((q) => ({ ...q, ageDays: ageDays(q.createdAt, ref) })),
    };
  });

  return {
    ...raw,
    dataAsOf,
    freshness: f,
    accounts,
    exceptions: raw.exceptions.map((e) => ({ ...e, ageDays: ageDays(e.createdAt, ref) })),
    quotes: raw.quotes.map((q) => ({ ...q, ageDays: ageDays(q.createdAt, ref) })),
    orders: raw.orders.map((o) => ({ ...o, ageDays: ageDays(o.createdAt, ref) })),
  };
}

/** Build-time only: the route list. Ages are irrelevant here. */
export function accountKeys(): string[] {
  return raw.accounts.map((a) => a.key);
}

export function getAccount(s: Snapshot, key: string): Account | undefined {
  return s.accounts.find((a) => a.key === key);
}

/** Accounts a customer-scope user could sign in as. Keystone itself is not one. */
export function customerAccounts(s: Snapshot): Account[] {
  return s.accounts.filter((a) => a.orderCount > 0);
}





export const MONTH_LABEL: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export function monthLabel(m: string): string {
  return MONTH_LABEL[m.slice(5, 7)] ?? m;
}

/* ------------------------------------------------------------------
   "The approval gate has never fired."

   The first version tested whether the limit exceeded the account's
   ANNUAL SPEND. That was a proxy, and it broke the moment an account
   out-spent its own limit over a year — the finding silently vanished
   even though it was still true.

   The real signal is simpler and does not decay: no order has ever
   reached the limit, and the limit sits far above a typical order.
   The multiple comes from the governance function's own target, so
   a customer can tune what "far above" means.
   ------------------------------------------------------------------ */
export function gateNeverFired(
  a: Account,
  ratioThreshold: number,
): { fired: false; ratio: number } | null {
  if (a.buyerLimit === null || a.aovCents <= 0 || a.orderCount === 0) return null;
  if (a.overLimitCount > 0) return null;
  const ratio = Math.round((a.buyerLimit * 100) / a.aovCents);
  if (ratio < ratioThreshold) return null;
  return { fired: false, ratio };
}
