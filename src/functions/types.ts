/* ==================================================================
   THE FUNCTION CONTRACT

   A "function" is a job in the business — CEO, CRO, Marketing,
   Operations — and this file is the whole contract for what one is.

   Every function declares four things, and nothing else in the app
   decides them:

     principles   why this view looks the way it does
     display      how dense it is, what it leads with
     targets      what good looks like (defaults; real values live in
                  the database so a customer edits them, not the code)
     capability   what it reads, and what it may change

   The split that matters: THE CODE HOLDS THE SHAPE, THE DATABASE
   HOLDS THE VALUES. A customer clones the repo to get the shape and
   fills in their own targets without touching a file. That is the
   difference between a demo and something a CRO uses on a Tuesday.
   ================================================================== */

/** Merchant-side (running the business) or customer-side (running your account). */
export type FunctionScope = "merchant" | "customer";

/**
 * How much a view shows. Density follows the job, not a template.
 * A CEO wants three things and a number. Operations wants the queue.
 */
export interface DisplaySpec {
  /** headline = scan in 10 seconds · working = a surface you sit in all day */
  density: "headline" | "balanced" | "working";
  /** Hero metrics across the top. Three forces a choice; six is a dashboard nobody reads. */
  tiles: number;
  /** Queue items shown before "show more". */
  queueMax: number;
  /** Clamp the reasoning to two lines and drop the next-step prose. */
  queueCompact: boolean;
  /** Default rows before a table offers "show all". 0 = no tables on this view. */
  tableRows: number;
  /** Categories, brands and similar breakdowns. */
  breakdownRows: number;
}

/**
 * A target is the enrichment point — the thing a customer sets so the
 * panel can say "behind" instead of just reporting a number.
 *
 * `value` here is only the DEFAULT. The live value is read from the
 * database per tenant. A null default means "we will not invent one":
 * the panel says no target is set rather than printing a flattering
 * percentage against a number nobody agreed to.
 */
export interface TargetDef {
  key: string;
  label: string;
  /** How the number is read, so the UI can format and compare correctly. */
  unit: "currency" | "percent" | "days" | "count";
  /** Is a higher number better, or a lower one? Decides the colour of the arrow. */
  direction: "higher-is-better" | "lower-is-better";
  /** Default. null means unset — never guessed. */
  value: number | null;
  /** Why this target exists and who should own the number. */
  rationale: string;
  owner: string;
}

export interface FunctionDef {
  id: string;
  /** What the tab says. */
  label: string;
  /** Whose job this is. */
  role: string;
  scope: FunctionScope;
  /** One line: what this person opens the panel to find out. */
  question: string;

  /** DESIGN PRINCIPLES — the reasoning, kept next to the thing it governs. */
  principles: string[];

  /** DISPLAY PRINCIPLE — how much, how dense, what leads. */
  display: DisplaySpec;

  /** TARGETS & GOALS — defaults only; live values come from the database. */
  targets: TargetDef[];

  /**
   * Which sources this function needs. Source ids resolve to MCP
   * adapters (commerce, cms, search, …), so adding a CMS to a MACH
   * stack is a line here, not a rewrite.
   */
  reads: string[];

  /**
   * Mutations this function may propose, by id from the action
   * allowlist. Empty means read-only for this role regardless of the
   * deployment's governance mode.
   */
  actions: string[];
}
