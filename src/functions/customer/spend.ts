import { FunctionDef } from "../types";

// Read by someone who has to justify the relationship internally.
export const ACCOUNT_SPEND: FunctionDef = {
  id: "account-spend",
  label: "Spend",
  role: "Finance / Procurement",
  scope: "customer",
  question: "What did we spend, and what did our negotiated rates actually get us?",

  principles: [
    "Lead with what the contract was worth. That is the number taken to a finance review.",
    "Where a rate did not apply, show the line, the order number and the difference — a credit you can ask for, not a complaint you have to build.",
    "The supplier sees the same lines flagged as their pricing error. The conversation starts from an agreed number.",
    "Clean density. This is read by someone with twenty minutes, not a working queue.",
  ],

  display: {
    density: "headline",
    tiles: 4,
    queueMax: 3,
    queueCompact: true,
    tableRows: 5,
    breakdownRows: 6,
  },

  targets: [
    {
      key: "min_contract_savings_pct",
      label: "Expected saving against list",
      unit: "percent",
      direction: "higher-is-better",
      value: null,
      rationale:
        "What the agreement was negotiated to deliver. Unset by default — only the customer knows what they signed.",
      owner: "Procurement",
    },
  ],

  reads: ["commerce.orders", "commerce.prices"],
  actions: [],
};
