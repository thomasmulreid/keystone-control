/* ------------------------------------------------------------------
   Time.

   A control panel has two clocks and they are not the same:

     dataAsOf  the latest trading date we actually know about
     now       what time it is when someone looks at the page

   The first version collapsed them. Ages were computed once, when the
   snapshot was built, and baked into the JSON. That is correct for
   exactly as long as it takes to deploy. Twenty-five days later the
   same page still said a quote had been waiting 3 days when it had
   been waiting 28, and an operator working that queue would have been
   reading fiction with a straight face.

   So: the snapshot stores absolute dates only. Every age on screen is
   derived at render time against the real clock, and the gap between
   the two is shown rather than hidden.
   ------------------------------------------------------------------ */

const DAY = 86_400_000;

export function now(): Date {
  return new Date();
}

/** Whole days between an ISO timestamp and now. Never negative. */
export function ageDays(iso: string | null | undefined, ref: Date = now()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((ref.getTime() - t) / DAY));
}

export interface Freshness {
  /** Latest trading date in the data. */
  dataAsOf: string;
  /** How many days ago that was, as of right now. */
  ageDays: number;
  /** Older than a day's trading — the panel should say so. */
  stale: boolean;
  /** Old enough that the queues are describing a past state, not a live one. */
  veryStale: boolean;
  label: string;
}

export function freshness(dataAsOf: string, ref: Date = now()): Freshness {
  const age = ageDays(dataAsOf, ref);
  return {
    dataAsOf,
    ageDays: age,
    stale: age >= 2,
    veryStale: age >= 7,
    label:
      age <= 0 ? "today"
      : age === 1 ? "yesterday"
      : `${age} days ago`,
  };
}
