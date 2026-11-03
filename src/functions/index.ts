import { FunctionDef } from "./types";

/* ==================================================================
   THE FOUR FUNCTIONS

   Edit these to fit a customer. Everything downstream — density,
   which targets appear, what the role may act on — follows from here,
   so retuning a deployment is a config change rather than a build.
   ================================================================== */

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
      value: 20,
      rationale:
        "Above roughly a fifth, losing one account stops being a bad quarter and becomes a different company.",
      owner: "CEO",
    },
  ],

  reads: ["commerce.orders", "commerce.accounts"],
  actions: [],
};

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
      value: 1.5,
      rationale:
        "Multiple of the account's own median gap between orders. Measured per account because a weekly buyer and a quarterly buyer are not comparable.",
      owner: "CRO",
    },
    {
      key: "buyer_concentration_pct",
      label: "Concentration risk when one buyer places over",
      unit: "percent",
      direction: "lower-is-better",
      value: 90,
      rationale:
        "Three buyers where one places 97% is a single-buyer account wearing a disguise. Counted by value, not headcount.",
      owner: "CRO",
    },
    {
      key: "contract_review_days",
      label: "Flag contracts expiring within",
      unit: "days",
      direction: "higher-is-better",
      value: 90,
      rationale: "Renewals are the highest-value thing a commercial team forgets.",
      owner: "CRO",
    },
  ],

  reads: ["commerce.orders", "commerce.accounts", "commerce.quotes"],
  actions: ["set-buyer-limit"],
};

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

export const FUNCTIONS: FunctionDef[] = [CEO, CRO, MARKETING, OPERATIONS];

export function getFunction(id: string): FunctionDef | undefined {
  return FUNCTIONS.find((f) => f.id === id);
}

/** Every target across every function, for the settings screen and the seed. */
export function allTargets() {
  return FUNCTIONS.flatMap((f) =>
    f.targets.map((t) => ({ ...t, functionId: f.id, functionLabel: f.label, role: f.role })),
  );
}

export * from "./types";
