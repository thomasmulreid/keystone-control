/* ==================================================================
   SOURCES

   A MACH stack is several systems, each with its own MCP. A function
   declares what it needs by id — "commerce.orders", "cms.content",
   "search.queries" — and this registry says whether that id is
   actually connected in this deployment.

   The point is honesty. Before this existed, a function could declare
   it read search data and the page would simply render without it,
   which looks identical to "there is no search problem". Now an
   unconnected source produces a visible, explained empty state:
   "Search is not connected — point an MCP at it to light this up."

   That turns the MACH extensibility story from a claim into something
   a customer can see the shape of on day one.
   ================================================================== */

export type SourceSystem = "commerce" | "cms" | "search" | "inventory" | "pim";

export type SourceStatus =
  /** Connected and present in the current snapshot. */
  | "connected"
  /**
   * The MCP is live and the data is reachable — the panel has not ingested
   * it yet. This is a deliberately separate state from "unimplemented":
   * one is a day of work against a live connection, the other is a question
   * of whether the system can reach it at all. Collapsing them understates
   * what a stack already supports.
   */
  | "available"
  /** Known adapter, but no credentials or no data in this deployment. */
  | "not-connected"
  /** No adapter and no live connection. */
  | "unimplemented";

export interface SourceDef {
  /** Dotted id used in FunctionDef.reads — e.g. "commerce.orders". */
  id: string;
  system: SourceSystem;
  label: string;
  /** What this source contributes, in words a customer would use. */
  provides: string;
  /** Which MCP server supplies it, when one does. */
  mcp: string | null;
  status: SourceStatus;
  /** Shown when the source is missing, so the gap explains itself. */
  whenMissing: string;
}
