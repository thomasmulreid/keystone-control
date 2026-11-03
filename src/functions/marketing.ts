import { FunctionDef } from "./types";

// Price spread is the number merchandising never gets shown.
export const MARKETING: FunctionDef = {
  id: "marketing",
  label: "Catalogue",
  role: "Marketing",
  scope: "merchant",
  question: "What is selling, to how many accounts, and at how many prices?",

  principles: [
    "Price spread is the number merchandising never gets shown, and it is where margin goes.",
    "Strong revenue in very few accounts is a range problem, not a demand ceiling — the cheapest growth available.",
    "The panel cannot tell deliberate tiering from a pricing mistake. Show it; let a person decide.",
    "Surface the oddity rather than bucketing it into 'Other'.",
  ],

  display: {
    density: "balanced",
    tiles: 4,
    queueMax: 5,
    queueCompact: false,
    tableRows: 6,
    breakdownRows: 7,
  },

  targets: [
    {
      key: "max_price_spread_pct",
      label: "Investigate price spread above",
      unit: "percent",
      direction: "lower-is-better",
      value: 25,
      rationale:
        "Gap between the cheapest and dearest unit price for the same SKU. Tiering explains a two-price spread; it does not explain four.",
      owner: "Merchandising",
    },
    {
      key: "min_account_reach",
      label: "Range-gap when a product reaches fewer accounts than",
      unit: "count",
      direction: "higher-is-better",
      value: 3,
      rationale: "Products most of the book has never been shown.",
      owner: "Merchandising",
    },
  ],

  reads: ["commerce.orders", "commerce.products", "cms.content", "search.queries"],
  actions: [],
};
