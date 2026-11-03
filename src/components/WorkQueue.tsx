"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QueueItem, URGENCY_LABEL, Urgency } from "@/lib/queue";
import { Preview, MutationDef } from "@/lib/mutations";
import { usd } from "@/lib/format";
import { Pill } from "./ui";

/* ==================================================================
   WORK QUEUE + APPROVAL DRAWER

   The interaction the whole panel exists for:

     see it -> understand why -> see exactly what will change -> approve

   Deliberate choices:
   - The primary button says what it does ("Release order"), never "Run".
   - Approval is a two-step: open the drawer, then approve. No single
     click from a list view can change a customer's order.
   - The literal API payload is always shown. If an operator cannot see
     what they are authorising, they are not authorising anything.
   - Items the panel will NOT execute say so, and say why. That is a
     feature, not a missing button.
   ================================================================== */

export interface RunnablePreview {
  preview: Preview;
  def: MutationDef;
}

export function WorkQueue({
  items,
  previews,
  scope,
  accountKey,
  emptyTitle,
  emptyBody,
  max,
  compact,
}: {
  items: QueueItem[];
  previews: Record<string, RunnablePreview>;
  scope: "keystone" | "customer";
  accountKey: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  /** Show only the top N. A CEO wants the three that matter, not all nine. */
  max?: number;
  /** Headline density: title, one line of why, the number. No next-step prose. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  if (!items.length) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[14px] font-medium">{emptyTitle ?? "Nothing needs you right now"}</p>
        <p className="text-[13px] text-muted mt-1 max-w-[56ch] mx-auto leading-relaxed">
          {emptyBody ?? "Every queue is clear. This page will fill itself when something stops moving."}
        </p>
      </div>
    );
  }

  const bands: Urgency[] = ["now", "week", "watch"];
  const hiddenCount = max && !showAll ? Math.max(0, items.length - max) : 0;
  const shown = max && !showAll ? items.slice(0, max) : items;

  return (
    <>
      <div className="flex flex-col gap-5">
        {bands.map((band) => {
          const group = shown.filter((i) => i.urgency === band);
          if (!group.length) return null;
          return (
            <section key={band}>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    band === "now" ? "bg-neg" : band === "week" ? "bg-warn" : "bg-line-strong"
                  }`}
                />
                {URGENCY_LABEL[band]}
                <span className="font-normal normal-case tracking-normal text-faint">
                  · {group.length}
                </span>
              </h3>
              <div className="flex flex-col gap-2">
                {group.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    runnable={item.run ? previews[item.id] : undefined}
                    doneMsg={done[item.id]}
                    compact={compact}
                    onReview={() => setOpen(item.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-fit text-[12.5px] font-medium text-accent underline decoration-transparent underline-offset-2 transition hover:decoration-current"
          >
            Show {hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
          </button>
        )}
      </div>

      {open && previews[open] && (
        <Drawer
          runnable={previews[open]}
          scope={scope}
          accountKey={accountKey}
          onClose={() => setOpen(null)}
          onDone={(msg) => {
            setDone((d) => ({ ...d, [open]: msg }));
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

/* ---------------------------------- card --------------------------------- */

function Card({
  item, runnable, doneMsg, onReview, compact,
}: {
  item: QueueItem;
  runnable?: RunnablePreview;
  doneMsg?: string;
  onReview: () => void;
  compact?: boolean;
}) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-semibold leading-snug tracking-[-0.01em]">{item.title}</h4>
          <p
            className={`mt-1 max-w-[76ch] text-[13px] leading-[1.55] text-muted ${
              compact ? "line-clamp-2" : ""
            }`}
          >
            {item.why}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.impactCents !== null && (
              <Pill tone="neutral" title={item.impactLabel}>
                <span className="tnum font-semibold">{usd(item.impactCents)}</span>
                <span className="text-faint font-normal">{item.impactLabel}</span>
              </Pill>
            )}
            {item.confidence !== "high" && (
              <Pill tone="neutral" title="How sure the panel is about this one">
                {item.confidence} confidence
              </Pill>
            )}
            {item.route && <Pill tone="info">routes to {item.route.to}</Pill>}
            {runnable && <Pill tone="accent">{runnable.def.persona}</Pill>}
            <button
              onClick={() => setShowEvidence((v) => !v)}
              className="text-[12px] text-muted hover:text-ink underline underline-offset-2 decoration-line-strong"
              aria-expanded={showEvidence}
            >
              {showEvidence ? "Hide evidence" : `Evidence (${item.evidence.length})`}
            </button>
          </div>

          {showEvidence && (
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2 animate-fade">
              {item.evidence.map((e, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-line py-1">
                  <dt className="text-faint truncate">{e.label}</dt>
                  <dd className="tnum text-right">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {item.counterpart && !compact && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-accent-soft px-2.5 py-1.5 text-[12px] text-accent">
              <span aria-hidden className="mt-[1px]">⇄</span>
              <span>{item.counterpart}</span>
            </p>
          )}

          {item.route && !compact && (
            <p className="mt-2.5 rounded-md border border-line bg-sunk px-2.5 py-1.5 text-[12px] text-muted leading-relaxed">
              <strong className="font-medium text-ink">This panel will not change it. </strong>
              {item.route.because}
            </p>
          )}

          {item.open && !compact && (
            <p className="mt-2.5 text-[12.5px] text-muted leading-relaxed">
              <span className="font-medium text-ink">Next step: </span>
              {item.open.note}
            </p>
          )}

          {doneMsg && (
            <p className="mt-2.5 rounded-md bg-pos-soft px-2.5 py-1.5 text-[12px] text-pos">{doneMsg}</p>
          )}
        </div>

        {runnable && !doneMsg && (
          <button
            onClick={onReview}
            className="shrink-0 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-[13px]
                       font-medium text-accent hover:brightness-95 transition"
          >
            Review…
          </button>
        )}
      </div>
    </article>
  );
}

/* --------------------------------- drawer -------------------------------- */

function Drawer({
  runnable, scope, accountKey, onClose, onDone,
}: {
  runnable: RunnablePreview;
  scope: "keystone" | "customer";
  accountKey: string | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { preview, def } = runnable;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string; id: string; result: string }>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const needsSecond = preview.guardrails.some(
    (g) => g.status === "triggered" && g.label === "Second approver",
  );
  const [secondOk, setSecondOk] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId: def.id, preview, scope, accountKey }),
      });
      const json = await res.json();
      setResult({
        ok: json.record.result !== "failed" && json.record.result !== "blocked",
        message: json.record.message,
        id: json.record.id,
        result: json.record.result,
      });
    } catch {
      setResult({ ok: false, message: "The request did not reach the server.", id: "—", result: "failed" });
    } finally {
      setBusy(false);
    }
  }, [def.id, preview, scope, accountKey]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={preview.title}>
      <div className="absolute inset-0 bg-black/30 animate-fade" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative flex h-full w-full max-w-[560px] flex-col bg-surface shadow-[var(--shadow-lg)] animate-drawer"
      >
        {/* header */}
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Pill tone={def.risk === "low" ? "neutral" : "warn"}>{def.risk} risk</Pill>
              <Pill tone="neutral">{def.persona}</Pill>
              {!def.reversible && <Pill tone="neg">one-way</Pill>}
            </div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{preview.title}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-faint hover:text-ink hover:bg-sunk transition"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </header>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {result ? (
            <Result result={result} preview={preview} />
          ) : (
            <div className="flex flex-col gap-5">
              <Block label="What this does">
                <p className="text-[13.5px] leading-[1.6]">{preview.plainEnglish}</p>
              </Block>

              <Block label="Why now">
                <p className="text-[13.5px] leading-[1.6] text-muted">{preview.whyNow}</p>
                <dl className="mt-3 text-[12.5px]">
                  {preview.evidence.map((e, i) => (
                    <div key={i} className="flex justify-between gap-4 border-b border-line py-1.5">
                      <dt className="text-faint">{e.label}</dt>
                      <dd className="tnum text-right max-w-[60%]">{e.value}</dd>
                    </div>
                  ))}
                </dl>
              </Block>

              <Block label="What changes">
                <div className="rounded-lg border border-line overflow-hidden">
                  {preview.changes.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 text-[12.5px] border-b border-line last:border-0">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.05em] text-faint truncate">{c.field}</div>
                        <div className="tnum mt-0.5 line-through text-muted">{c.before}</div>
                      </div>
                      <span aria-hidden className="text-faint">→</span>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.05em] text-faint">after</div>
                        <div className="tnum mt-0.5 font-semibold text-accent">{c.after}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Block>

              <Block label="Checks">
                <ul className="flex flex-col gap-1.5">
                  {preview.guardrails.map((g, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-[1.5]">
                      <span
                        aria-hidden
                        className={`mt-[3px] inline-block h-2 w-2 shrink-0 rounded-full ${
                          g.status === "ok" ? "bg-pos" : g.status === "triggered" ? "bg-warn" : "bg-neg"
                        }`}
                      />
                      <span>
                        <span className="font-medium">{g.label}.</span>{" "}
                        <span className="text-muted">{g.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block label="Exactly what gets sent">
                <details className="rounded-lg border border-line bg-sunk">
                  <summary className="flex items-center justify-between px-3 py-2 text-[12.5px] text-muted hover:text-ink">
                    <span>
                      <code className="font-mono text-[12px] text-ink">{preview.apiCall.mcpTool}</code>
                      {" · "}
                      {preview.apiCall.method} {preview.apiCall.endpoint}
                    </span>
                    <span aria-hidden className="text-faint">▾</span>
                  </summary>
                  <pre className="overflow-x-auto border-t border-line px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] text-muted">
{JSON.stringify(preview.apiCall.body, null, 2)}
                  </pre>
                </details>
              </Block>

              <Block label="How to undo it">
                <p className="text-[12.5px] leading-[1.6] text-muted">{preview.reversal}</p>
              </Block>

              {needsSecond && (
                <label className="flex items-start gap-2.5 rounded-lg border border-warn bg-warn-soft px-3 py-2.5 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={secondOk}
                    onChange={(e) => setSecondOk(e.target.checked)}
                    className="mt-[3px] accent-[var(--warn)]"
                  />
                  <span className="text-warn">
                    I am the second approver for this value, and I have checked it with the account.
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <footer className="border-t border-line px-5 py-3.5">
          {result ? (
            <button
              onClick={() => onDone(result.ok ? `${preview.title} — approved and recorded (${result.id}).` : result.message)}
              className="w-full rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-bg hover:opacity-90 transition"
            >
              Done
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium text-muted hover:text-ink hover:border-line-strong transition"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={busy || (needsSecond && !secondOk)}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-contrast
                           hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {busy ? "Working…" : `Approve · ${def.verb}`}
              </button>
            </div>
          )}
          {!result && (
            <p className="mt-2 text-center text-[11.5px] text-faint">
              Writes are off in this build. Approving records the decision and the payload without sending it.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">{label}</h3>
      {children}
    </section>
  );
}

function Result({
  result, preview,
}: { result: { ok: boolean; message: string; id: string; result: string }; preview: Preview }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-lg px-4 py-3 ${
          result.result === "dry-run" ? "bg-info-soft" : result.ok ? "bg-pos-soft" : "bg-neg-soft"
        }`}
      >
        <p
          className={`text-[13px] font-semibold ${
            result.result === "dry-run" ? "text-info" : result.ok ? "text-pos" : "text-neg"
          }`}
        >
          {result.result === "dry-run"
            ? "Approved — recorded, not sent"
            : result.ok
              ? "Applied"
              : "Not applied"}
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-muted">{result.message}</p>
      </div>
      <div>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">Audit record</h3>
        <dl className="text-[12.5px]">
          {[
            ["Record", result.id],
            ["Operator", "demo.operator@orium.com"],
            ["Change", preview.changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join("; ")],
            ["Undo", preview.reversal],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5">
              <dt className="shrink-0 text-faint">{k}</dt>
              <dd className="text-right max-w-[70%]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
