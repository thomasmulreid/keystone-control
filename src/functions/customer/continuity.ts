import { FunctionDef } from "../types";

// Operational. Allowed more detail than Spend.
export const ACCOUNT_CONTINUITY: FunctionDef = {
  id: "account-continuity",
  label: "Continuity",
  role: "Purchasing / Site ops",
  scope: "customer",
  question: "Is supply keeping up with how we actually buy?",

  principles: [
    "Measure against the account's own rhythm, not a generic benchmark.",
    "Show stopped orders without the customer having to ring anyone. Most sit with the supplier; the value is knowing before you need to ask.",
    "Standing orders remove the chance of somebody forgetting during a holiday — surface whether any exist.",
  ],

  display: {
    density: "balanced",
    tiles: 4,
    queueMax: 4,
    queueCompact: false,
    tableRows: 5,
    breakdownRows: 8,
  },

  targets: [
    {
      key: "reorder_drift_multiplier",
      label: "Flag drift when days since last order exceed",
      unit: "count",
      direction: "lower-is-better",
      value: 1.5,
      rationale: "Multiple of this account's own median gap between order days.",
      owner: "Purchasing",
    },
  ],

  reads: ["commerce.orders", "commerce.inventory"],
  actions: [],
};
