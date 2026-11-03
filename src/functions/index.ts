import { FunctionDef } from "./types";
import { CEO } from "./ceo";
import { CRO } from "./cro";
import { MARKETING } from "./marketing";
import { OPERATIONS } from "./operations";

/* ==================================================================
   THE FUNCTION REGISTRY

   One file per function, so customising a deployment means opening
   the file named after the job. This file only assembles them.
   ================================================================== */

export { CEO, CRO, MARKETING, OPERATIONS };

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
