"use client";

import { useState } from "react";

/* ------------------------------------------------------------------
   Refresh.

   Shows how old the data is, and re-reads on click. Three outcomes,
   all stated: it refreshed, it is on a snapshot and why, or it
   failed and which part.

   The result panel is deliberately explicit about what a refresh
   does NOT cover. A button that silently refreshes a third of the
   page teaches people to distrust the other two thirds.
   ------------------------------------------------------------------ */

interface Result {
  status: "live" | "snapshot" | "error";
  message: string;
  stoppedOrders?: number;
  openQuotes?: number;
  wouldRefresh?: string[];
  scheduledOnly?: string[];
  note?: string;
  hint?: string;
}

export function RefreshButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function refresh() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      setResult((await res.json()) as Result);
    } catch {
      setResult({ status: "error", message: "The request did not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  const tone =
    result?.status === "live" ? "pos" : result?.status === "error" ? "neg" : "info";

  return (
    <div className="relative">
      <button
        onClick={refresh}
        disabled={busy}
        title="Re-read the live systems"
        className="flex items-center gap-1.5 rounded-full border border-line px-2 py-[3px]
                   text-[11.5px] text-faint transition hover:border-line-strong hover:text-ink
                   disabled:opacity-50"
      >
        <svg viewBox="0 0 12 12" aria-hidden className={`h-3 w-3 ${busy ? "animate-spin" : ""}`}>
          <path
            d="M10 6a4 4 0 1 1-1.2-2.8M10 1.5V4H7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? "reading…" : label}
      </button>

      {result && (
        <div
          role="status"
          className="absolute right-0 z-40 mt-2 w-[360px] rounded-lg border border-line bg-surface p-3.5 shadow-[var(--shadow-lg)] animate-fade"
        >
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-[12.5px] font-semibold ${
                tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-info"
              }`}
            >
              {result.status === "live"
                ? "Re-read from commercetools"
                : result.status === "snapshot"
                  ? "Running on the committed snapshot"
                  : "Could not refresh"}
            </p>
            <button
              onClick={() => setResult(null)}
              className="shrink-0 text-faint hover:text-ink"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="mt-1.5 text-[12px] leading-[1.55] text-muted">{result.message}</p>

          {result.wouldRefresh && (
            <div className="mt-2.5 border-t border-line pt-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-faint">
                A refresh would cover
              </p>
              <ul className="mt-1 text-[12px] text-muted">
                {result.wouldRefresh.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
          )}

          {result.scheduledOnly && (
            <div className="mt-2 border-t border-line pt-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-faint">
                Scheduled, not on demand
              </p>
              <ul className="mt-1 text-[12px] leading-[1.45] text-muted">
                {result.scheduledOnly.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
          )}

          {result.note && (
            <p className="mt-2 border-t border-line pt-2 text-[11.5px] leading-[1.45] text-faint">
              {result.note}
            </p>
          )}
          {result.hint && (
            <p className="mt-2 border-t border-line pt-2 text-[11.5px] leading-[1.45] text-faint">
              {result.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
