import { FunctionDef } from "./types";
import { target } from "./policy";

// Ranked by what is at risk, not by what is large.
export const CRO: FunctionDef = {
  id: "cro",
  label: "Accounts",
  role: "CRO",
  scope: "merchant",
  question: "Which accounts need a conversation, and about what?",

  principles: [
    "Rank by what is at risk, not by what is large.",
    "Cadence and concentration sit beside revenue, because that is how an account is actually lost — quietly, and never in the revenue column first.",
    "An account name is a door into that customer's own panel. Same data, their side.",
    "Never surface a churn alert the panel cannot stand behind. Check the feed before the customer.",
  ],

  display: {
    density: "balanced",
    tiles: 4,
    queueMax: 5,
    queueCompact: false,
    tableRows: 8,
    breakdownRows: 6,
  },

  targets: [
    {
      key: "quiet_account_multiplier",
      label: "Quiet when days since last order exceed",
      unit: "count",
      direction: "lower-is-better",
      value: target("quiet_account_multiplier", 1.5),
      rationale:
        "Multiple of the account's own median gap between orders. Measured per account because a weekly buyer and a quarterly buyer are not comparable.",
      owner: "CRO",
    },
    {
      key: "buyer_concentration_pct",
      label: "Concentration risk when one buyer places over",
      unit: "percent",
      direction: "lower-is-better",
      value: target("buyer_concentration_pct", 90),
      rationale:
        "Three buyers where one places 97% is a single-buyer account wearing a disguise. Counted by value, not headcount.",
      owner: "CRO",
    },
    {
      key: "contract_review_days",
      label: "Flag contracts expiring within",
      unit: "days",
      direction: "higher-is-better",
      value: target("contract_review_days", 90),
      rationale: "Renewals are the highest-value thing a commercial team forgets.",
      owner: "CRO",
    },
  ],

  reads: ["commerce.orders", "commerce.accounts", "commerce.quotes"],
  actions: ["set-buyer-limit"],
};
