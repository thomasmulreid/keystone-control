import policy from "../../config/policy.json";

/* ------------------------------------------------------------------
   The same config/policy.json the Python extractor reads.

   A TargetDef's `value` comes from here rather than being typed into
   the function file, so the number the UI shows as a target is
   literally the number that produced the rows. They cannot drift.
   ------------------------------------------------------------------ */

const TARGETS = policy.targets as Record<string, number>;

/** A tunable by key, with the default used if the key is absent. */
export function target(key: string, fallback: number | null = null): number | null {
  return key in TARGETS ? TARGETS[key] : fallback;
}

export { policy };
