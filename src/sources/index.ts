import { SourceDef } from "./types";
import { FUNCTIONS } from "@/functions";
import snapshotJson from "../../data/snapshot.json";

/* ==================================================================
   THE SOURCE REGISTRY

   Add a system to a MACH stack by adding an entry here and naming it
   in a function's `reads`. Nothing else changes.

   `status` is derived where it can be: a commerce source counts as
   connected when the snapshot actually carries that data, so this
   cannot drift into claiming a connection that is not there.
   ================================================================== */

const snap = snapshotJson as unknown as {
  orders?: unknown[];
  accounts?: unknown[];
  quotes?: unknown[];
  skus?: unknown[];
};

const has = (v: unknown[] | undefined) => Array.isArray(v) && v.length > 0;

export const SOURCES: SourceDef[] = [
  {
    id: "commerce.orders",
    system: "commerce",
    label: "Orders",
    provides: "Order history, states, line items and trading dates.",
    mcp: "commercetools",
    status: has(snap.orders) ? "connected" : "not-connected",
    whenMissing: "Revenue, exceptions and cadence all derive from orders. Nothing works without this one.",
  },
  {
    id: "commerce.accounts",
    system: "commerce",
    label: "Business units",
    provides: "Accounts, divisions, associates and spend limits.",
    mcp: "commercetools",
    status: has(snap.accounts) ? "connected" : "not-connected",
    whenMissing: "Without business units there are no accounts to group by, and governance has nothing to govern.",
  },
  {
    id: "commerce.quotes",
    system: "commerce",
    label: "Quote requests",
    provides: "Quote requests and their states.",
    mcp: "commercetools",
    status: has(snap.quotes) ? "connected" : "not-connected",
    whenMissing: "The quote desk is empty. Orders above a spend limit will still appear, but their quote stage will not.",
  },
  {
    id: "commerce.products",
    system: "commerce",
    label: "Products",
    provides: "SKUs, brands and the prices each account actually paid.",
    mcp: "commercetools",
    status: has(snap.skus) ? "connected" : "not-connected",
    whenMissing: "Price-spread and range-breadth analysis need product-level data.",
  },
  {
    id: "commerce.prices",
    system: "commerce",
    label: "Price lists",
    provides: "Contracted rates per account, rather than rates inferred from what was paid.",
    mcp: "commercetools",
    status: "unimplemented",
    whenMissing:
      "Leakage is currently inferred — an account is compared only against rates it has already been given. With real price lists it could also catch contracts that were never applied at all.",
  },
  {
    id: "commerce.inventory",
    system: "inventory",
    label: "Inventory",
    provides: "Stock positions and lead times.",
    mcp: "commercetools",
    status: "unimplemented",
    whenMissing: "Continuity shows ordering rhythm but cannot yet warn about supply against it.",
  },
  {
    id: "cms.content",
    system: "cms",
    label: "Content",
    provides: "Page completeness, personalisation and journey coverage.",
    mcp: "contentstack",
    status: "available",
    whenMissing:
      "The Contentstack MCP is connected and this storefront's stack is readable — 22 content types, " +
      "including the page and component types behind every journey step. The panel has not ingested it yet, " +
      "so merchandising can see what sells but not whether the content supporting it exists.",
  },
  {
    id: "search.queries",
    system: "search",
    label: "Search queries",
    provides: "Zero-result searches, especially manufacturer part numbers.",
    mcp: "algolia",
    status: "available",
    whenMissing:
      "The Algolia MCP is connected and exposes top searches and the filters that return nothing. " +
      "Zero-result searches are the merchandising backlog that writes itself — until the panel ingests them, " +
      "range gaps only surface once someone has already failed to buy.",
  },
];

export function getSource(id: string): SourceDef | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function isConnected(id: string): boolean {
  return getSource(id)?.status === "connected";
}

/** Sources a function declares that are not actually available. */
export function missingFor(functionId: string): SourceDef[] {
  const fn = FUNCTIONS.find((f) => f.id === functionId);
  if (!fn) return [];
  return fn.reads
    .map((id) => getSource(id))
    .filter((s): s is SourceDef => !!s && s.status !== "connected");
}

/**
 * Every id named in a `reads` that has no entry here. A function
 * declaring a source nobody implemented is a typo waiting to be a
 * support ticket, so the sources page surfaces it.
 */
export function unknownSourceIds(): string[] {
  const known = new Set(SOURCES.map((s) => s.id));
  return [...new Set(FUNCTIONS.flatMap((f) => f.reads))].filter((id) => !known.has(id));
}

export * from "./types";
