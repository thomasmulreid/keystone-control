const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const USD2 = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** Money for display. Cents in, rounded dollars out — nobody reads cents in a tile. */
export const usd = (cents: number | null | undefined) => USD0.format((cents ?? 0) / 100);
/** Money where the cents matter: a single line, a credit, a price comparison. */
export const usdExact = (cents: number | null | undefined) => USD2.format((cents ?? 0) / 100);

/** Compact money for axis labels and dense tables. */
export function usdCompact(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return USD0.format(v);
}

export const num = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const pct = (n: number) => `${Math.round(n)}%`;

export function signed(cents: number): string {
  const s = usd(Math.abs(cents));
  return cents >= 0 ? `+${s}` : `−${s}`;
}

/** "9 days" / "1 day" / "today" — ages read as English, not as integers. */
export function days(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n <= 0) return "today";
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function timeStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
