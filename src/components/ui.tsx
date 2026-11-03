import { ReactNode } from "react";

/* ------------------------------------------------------------------
   Shared primitives.

   One rule runs through all of them: a number never appears without
   something that makes it mean anything — a comparison, a unit, or a
   definition one click away. A bare figure on a dashboard is decoration.
   ------------------------------------------------------------------ */

export function SectionHeader({
  title, sub, right,
}: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {sub && <p className="text-[13px] text-muted mt-0.5 max-w-[68ch]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** "How is this calculated?" — always available, never in the way. */
export function Definition({ children }: { children: ReactNode }) {
  return (
    <details className="group inline-block align-middle">
      <summary
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong
                   text-[10px] leading-none text-faint hover:text-ink hover:border-ink transition-colors"
        aria-label="How is this calculated?"
      >
        ?
      </summary>
      <div className="mt-2 rounded-md border border-line bg-sunk p-2.5 text-[12px] leading-[1.5] text-muted max-w-[52ch] animate-fade">
        {children}
      </div>
    </details>
  );
}

export function Tile({
  label, value, hint, tone = "neutral", definition, foot,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "pos" | "neg" | "warn" | "accent";
  definition?: ReactNode;
  foot?: ReactNode;
}) {
  const toneClass = {
    neutral: "text-ink",
    pos: "text-pos",
    neg: "text-neg",
    warn: "text-warn",
    accent: "text-accent",
  }[tone];
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{label}</span>
        {definition && <Definition>{definition}</Definition>}
      </div>
      <div className={`tnum text-[26px] font-semibold leading-tight tracking-[-0.02em] ${toneClass}`}>
        {value}
      </div>
      {hint && <div className="text-[12.5px] text-muted leading-snug">{hint}</div>}
      {foot && <div className="mt-1 pt-2 border-t border-line text-[12px] text-faint">{foot}</div>}
    </div>
  );
}

export function Pill({
  children, tone = "neutral", title,
}: {
  children: ReactNode;
  tone?: "neutral" | "pos" | "neg" | "warn" | "info" | "accent";
  title?: string;
}) {
  const t = {
    neutral: "bg-sunk text-muted border-line",
    pos: "bg-pos-soft text-pos border-transparent",
    neg: "bg-neg-soft text-neg border-transparent",
    warn: "bg-warn-soft text-warn border-transparent",
    info: "bg-info-soft text-info border-transparent",
    accent: "bg-accent-soft text-accent border-transparent",
  }[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium leading-none whitespace-nowrap ${t}`}
    >
      {children}
    </span>
  );
}

/** Horizontal proportion bar. Used wherever a share is easier to see than to read. */
export function Bar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "neg" | "warn" | "pos" }) {
  const bg = { accent: "bg-accent", neg: "bg-neg", warn: "bg-warn", pos: "bg-pos" }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-sunk overflow-hidden">
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.max(1, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** Empty states teach. They never just say "no data". */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {children && <p className="text-[13px] text-muted mt-1 max-w-[56ch] mx-auto leading-relaxed">{children}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-sunk">
              {head.map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-faint whitespace-nowrap ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Td({
  children = null, align = "right", className = "", muted = false,
}: { children?: ReactNode; align?: "left" | "right"; className?: string; muted?: boolean }) {
  return (
    <td
      className={`px-3 py-2.5 align-middle ${align === "left" ? "text-left" : "text-right tnum"} ${
        muted ? "text-muted" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}
