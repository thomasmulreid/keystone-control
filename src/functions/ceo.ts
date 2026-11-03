import { FunctionDef } from "./types";
import { target } from "./policy";

// The cleanest view in the product. If everything is on it, nothing is.
export const CEO: FunctionDef = {
  id: "ceo",
  label: "Performance",
  role: "CEO",
  scope: "merchant",
  question: "Where does the business stand, and what would change it?",

  principles: [
    "Three numbers, not twelve. If everything is on the page, nothing is.",
    "Concentration sits beside revenue. A good month on one account is a different fact from a good month.",
    "No target is better than a stale target — say 'not set' rather than print a flattering percentage.",
    "Never show a trend the data cannot support. A partial month is drawn as partial.",
  ],

  display: {
    density: "headline",
    tiles: 3,
    queueMax: 3,
    queueCompact: true,
    tableRows: 4,
    breakdownRows: 5,
  },

  targets: [
    {
      key: "monthly_revenue",
      label: "Monthly revenue target",
      unit: "currency",
      direction: "higher-is-better",
      value: null,
      rationale:
        "Set by the business. Deliberately unset by default — a target carried over from a smaller book reads as a meaningless percentage.",
      owner: "CEO / Finance",
    },
    {
      key: "max_account_concentration_pct",
      label: "Largest account, share of revenue",
      unit: "percent",
      direction: "lower-is-better",
      value: target("max_account_concentration_pct", 20),
      rationale:
        "Above roughly a fifth, losing one account stops being a bad quarter and becomes a different company.",
      owner: "CEO",
    },
  ],

  reads: ["commerce.orders", "commerce.accounts"],
  actions: [],
};
