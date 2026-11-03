import { getFunction } from "@/functions";

/* ==================================================================
   GOVERNANCE

   One switch decides how much autonomy a deployment has. It is an
   environment variable rather than a setting in the UI, because the
   answer to "can this thing change my orders" should be a deployment
   decision with a paper trail, not a toggle someone can flip while
   demoing.

     observe   Phase 1. Read-only. No action controls render at all.
               This is where almost everyone should start.

     propose   The panel composes the change, shows the exact payload,
               records the approval — and sends nothing. Useful for
               weeks: you can measure how often the proposal was right
               before you let it through.

     act       Approved changes are sent, under a client scoped to the
               specific mutation.

   The ladder matters. "propose" is not a crippled "act"; it is the
   stage where an organisation earns the right to move on, with
   evidence instead of optimism.
   ================================================================== */

export type GovernanceMode = "observe" | "propose" | "act";

export function governanceMode(): GovernanceMode {
  const raw = (process.env.GOVERNANCE_MODE ?? "").toLowerCase();
  if (raw === "act") return "act";
  if (raw === "propose") return "propose";
  if (raw === "observe") return "observe";
  // Default to the safest posture. A missing or misspelt variable must
  // never be the reason something wrote to a production project.
  return "propose";
}

export const MODE_COPY: Record<GovernanceMode, { badge: string; detail: string }> = {
  observe: {
    badge: "read only",
    detail:
      "This deployment is in observe mode. The panel reads and recommends; no action controls are shown.",
  },
  propose: {
    badge: "writes off",
    detail:
      "Approving an action records the decision and the exact payload, and sends nothing to the connected systems.",
  },
  act: {
    badge: "live writes",
    detail:
      "Approved actions are sent under scoped credentials. Every one is recorded with a before/after and a reversal path.",
  },
};

/**
 * Whether a given function may even offer a given action.
 *
 * Two gates, both of which must pass: the deployment's mode, and the
 * function's own allowlist. A CEO view has no actions regardless of
 * mode — seniority is not a reason to hand someone the order book.
 */
export function canOffer(functionId: string, actionId: string): boolean {
  if (governanceMode() === "observe") return false;
  const fn = getFunction(functionId);
  if (!fn) return false;
  return fn.actions.includes(actionId);
}

/** True when approving actually sends. */
export function writesEnabled(): boolean {
  return governanceMode() === "act";
}
