import { FunctionDef } from "../types";

// The only customer view that may change anything.
export const ACCOUNT_GOVERNANCE: FunctionDef = {
  id: "account-governance",
  label: "Governance",
  role: "Account administrator",
  scope: "customer",
  question: "Who can spend what, who signs it off, and is any of it actually working?",

  principles: [
    "A limit higher than the account's annual spend is not a control, it is the appearance of one. Say so.",
    "Concentration is measured by value, not headcount. Three buyers where one places 97% is a single point of failure.",
    "This field is visible to both sides. Whoever changes it, the other party sees the new value and the audit entry.",
    "Half-configured hierarchy is worse than none — flag divisions that exist but carry no orders.",
  ],

  display: {
    density: "balanced",
    tiles: 4,
    queueMax: 4,
    queueCompact: false,
    tableRows: 5,
    breakdownRows: 6,
  },

  targets: [
    {
      key: "limit_to_average_order_ratio",
      label: "Review spend limit when it exceeds average order by",
      unit: "count",
      direction: "lower-is-better",
      value: 10,
      rationale:
        "A limit many multiples above a typical order can never trigger. Ten is a working default; set it with whoever owns delegated authority.",
      owner: "Account administrator",
    },
    {
      key: "min_buyers",
      label: "Minimum active buyers before continuity risk",
      unit: "count",
      direction: "higher-is-better",
      value: 2,
      rationale: "If one person is away, ordering stops. A second buyer removes the single point of failure.",
      owner: "Account administrator",
    },
  ],

  reads: ["commerce.accounts", "commerce.orders"],
  actions: ["set-buyer-limit"],
};
