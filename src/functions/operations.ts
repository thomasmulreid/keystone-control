import { FunctionDef } from "./types";

// A working surface. Allowed to be dense — someone sits in it all day.
export const OPERATIONS: FunctionDef = {
  id: "operations",
  label: "Operations",
  role: "Ops & CS",
  scope: "merchant",
  question: "What has stopped moving, and what is actually wrong with it?",

  principles: [
    "Group by reason, not status. The fix differs per reason; a status-only list is something nobody can act on.",
    "Sort by value against age. The oldest order is rarely the one that matters most.",
    "This is a working surface. It is allowed to be dense — someone sits in it all day.",
    "Say plainly what the panel will not touch. An ops tool that writes to everything is not one you hand to a new starter.",
  ],

  display: {
    density: "working",
    tiles: 4,
    queueMax: 8,
    queueCompact: false,
    tableRows: 5,
    breakdownRows: 8,
  },

  targets: [
    {
      key: "payment_pending_days",
      label: "Flag unsettled payment after",
      unit: "days",
      direction: "lower-is-better",
      value: 2,
      rationale: "Authorised but never captured. Usually a terms account awaiting credit review.",
      owner: "Finance / AR",
    },
    {
      key: "awaiting_release_days",
      label: "Flag unconfirmed orders after",
      unit: "days",
      direction: "lower-is-better",
      value: 1,
      rationale: "Created but never confirmed. Most of these sit above a buyer's spend limit.",
      owner: "Order operations",
    },
    {
      key: "ready_not_shipped_days",
      label: "Flag picked-but-not-dispatched after",
      unit: "days",
      direction: "lower-is-better",
      value: 5,
      rationale: "Usually a carrier booking gap rather than a stock problem.",
      owner: "Fulfilment",
    },
    {
      key: "quote_cold_days",
      label: "Quote goes cold after",
      unit: "days",
      direction: "lower-is-better",
      value: 3,
      rationale: "Quote requests older than a few days convert materially worse.",
      owner: "Commercial",
    },
    {
      key: "second_approver_over",
      label: "Second approver required above",
      unit: "currency",
      direction: "lower-is-better",
      value: 500000,
      rationale:
        "Order value above which one approval is not enough. Governance, not performance — set it with whoever owns delegated authority.",
      owner: "Finance",
    },
  ],

  reads: ["commerce.orders", "commerce.quotes", "commerce.accounts"],
  actions: ["release-held-order", "accept-quote-request", "set-buyer-limit"],
};
