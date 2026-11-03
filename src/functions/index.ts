import { FunctionDef } from "./types";
import { CEO } from "./ceo";
import { CRO } from "./cro";
import { MARKETING } from "./marketing";
import { OPERATIONS } from "./operations";
import { ACCOUNT_SPEND } from "./customer/spend";
import { ACCOUNT_GOVERNANCE } from "./customer/governance";
import { ACCOUNT_CONTINUITY } from "./customer/continuity";
import { ACCOUNT_REQUESTS } from "./customer/requests";

/* ==================================================================
   THE FUNCTION REGISTRY

   One file per function, so customising a deployment means opening
   the file named after the job. This file only assembles them.
   ================================================================== */

export { CEO, CRO, MARKETING, OPERATIONS };
export { ACCOUNT_SPEND, ACCOUNT_GOVERNANCE, ACCOUNT_CONTINUITY, ACCOUNT_REQUESTS };

/** The merchant's own panel, split by who opens it. */
export const MERCHANT_FUNCTIONS: FunctionDef[] = [CEO, CRO, MARKETING, OPERATIONS];

/** What one customer sees of their own account. */
export const CUSTOMER_FUNCTIONS: FunctionDef[] = [
  ACCOUNT_SPEND, ACCOUNT_GOVERNANCE, ACCOUNT_CONTINUITY, ACCOUNT_REQUESTS,
];

export const FUNCTIONS: FunctionDef[] = [...MERCHANT_FUNCTIONS, ...CUSTOMER_FUNCTIONS];

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
