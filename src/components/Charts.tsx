"use client";

import { useState, useId } from "react";
import { usd, usdCompact } from "@/lib/format";
import { monthLabel } from "@/lib/snapshot";

/* ==================================================================
   Charts.

   One hue throughout — the scope accent. There is no categorical
   palette here because nothing in this panel is a comparison of
   identities; everything is a magnitude over time or across buckets,
   and length already encodes that. One hue keeps both themes legible
   and sidesteps a colour-blindness problem rather than solving it.

   Status colours (neg / warn / pos) are reserved for state and are
   never used as a series colour.

   Every chart has a hover layer and a table underneath it for screen
   readers, because a figure nobody can read is not a figure.
   ================================================================== */

const PAD = { t: 14, r: 14, b: 22, l: 44 };

export function RevenueTrend({
  monthly,
  targetCents,
  height = 180,
  partialMonth,
}: {
  monthly: Record<string, number>;
  targetCents?: number;
  height?: number;
  /** A month still in progress. Drawn dashed and faded so a part-month is
      never mistaken for a collapse — the commonest lie a revenue chart tells. */
  partialMonth?: string | null;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);

  const entries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
  const w = 640;
  const h = height;
  const innerW = w - PAD.l - PAD.r;
  const innerH = h - PAD.t - PAD.b;

  const max = Math.max(...entries.map(([, v]) => v), targetCents ?? 0) * 1.12 || 1;
  const x = (i: number) => PAD.l + (entries.length === 1 ? innerW / 2 : (i / (entries.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;

  // Split the series at the partial month: solid up to the last complete
  // month, dashed from there.
  const partialIdx = partialMonth ? entries.findIndex(([m]) => m === partialMonth) : -1;
  const solidEnd = partialIdx > 0 ? partialIdx : entries.length - 1;

  const pathFor = (from: number, to: number) =>
    entries
      .slice(from, to + 1)
      .map(([, v], k) => `${k === 0 ? "M" : "L"}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  const solid = pathFor(0, solidEnd);
  const dashed = partialIdx > 0 ? pathFor(solidEnd, partialIdx) : null;
  const area = `${solid} L${x(solidEnd).toFixed(1)},${PAD.t + innerH} L${x(0).toFixed(1)},${PAD.t + innerH} Z`;

  const ticks = [0, 0.5, 1].map((f) => f * max);
  const last = solidEnd;
  // Roughly one label per 50px of axis.
  const labelEvery = Math.max(1, Math.ceil(entries.length / (innerW / 50)));

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Revenue by month from ${entries[0]?.[0]} to ${entries[last]?.[0]}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* recessive grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" className="tnum"
                  fill="var(--text-faint)" fontSize="10">
              {usdCompact(t)}
            </text>
          </g>
        ))}

        {/* target is an annotation, not a second series */}
        {targetCents !== undefined && targetCents <= max && (
          <g>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(targetCents)} y2={y(targetCents)}
                  stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={w - PAD.r} y={y(targetCents) - 5} textAnchor="end"
                  fill="var(--text-faint)" fontSize="10">
              target {usdCompact(targetCents)}
            </text>
          </g>
        )}

        <path d={area} fill={`url(#g${id})`} />
        <path d={solid} fill="none" stroke="var(--accent)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
        {dashed && (
          <path d={dashed} fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.35"
                strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* markers: only the last point is labelled — never a number on every point */}
        {entries.map(([m, v], i) => (
          <g key={m}>
            {(hover === i || i === last) && (
              <circle cx={x(i)} cy={y(v)} r="4" fill="var(--accent)"
                      stroke="var(--surface)" strokeWidth="2" />
            )}
            <rect
              x={x(i) - innerW / Math.max(entries.length, 1) / 2}
              y={PAD.t}
              width={innerW / Math.max(entries.length, 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH}
                  stroke="var(--border-strong)" strokeWidth="1" />
            <g transform={`translate(${Math.min(Math.max(x(hover), PAD.l + 46), w - PAD.r - 46)}, ${PAD.t + 10})`}>
              <rect x="-46" y="-14" width="92" height="30" rx="6"
                    fill="var(--surface)" stroke="var(--border-strong)" />
              <text textAnchor="middle" y="-2" fontSize="10" fill="var(--text-faint)">
                {monthLabel(entries[hover][0])}
              </text>
              <text textAnchor="middle" y="10" fontSize="11.5" fontWeight="600"
                    fill="var(--text)" className="tnum">
                {usdCompact(entries[hover][1])}
              </text>
            </g>
          </g>
        )}

        {/* x labels — the partial month is marked, not silently plotted.
            With a long window, label every Nth month so they never collide. */}
        {entries.map(([m], i) => (
          labelEvery > 1 && i % labelEvery !== 0 && i !== entries.length - 1 ? null :
          <text key={m} x={x(i)} y={h - 6} textAnchor="middle" fontSize="10"
                fill={hover === i ? "var(--text)" : "var(--text-faint)"}
                opacity={i === partialIdx ? 0.55 : 1}>
            {monthLabel(m)}{i === partialIdx ? " ·" : ""}
          </text>
        ))}
      </svg>

      <figcaption className="sr-only">
        <table>
          <tbody>
            {entries.map(([m, v]) => (
              <tr key={m}><th scope="row">{m}</th><td>{usd(v)}</td></tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- */

export function CategoryBars({
  data, max, limit = 7,
}: { data: Record<string, number>; max?: number; limit?: number }) {
  const rows = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, limit);
  const top = max ?? Math.max(...rows.map(([, v]) => v), 1);
  const total = Object.values(data).reduce((s, v) => s + v, 0);

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(([name, v]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-[12.5px] truncate">{name}</span>
            <span className="tnum text-[12.5px] text-muted shrink-0">
              {usd(v)}
              <span className="text-faint"> · {Math.round((v / total) * 100)}%</span>
            </span>
          </div>
          {/* 4px rounded data-end, anchored to the baseline */}
          <div className="h-2 w-full rounded-full bg-sunk overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(1.5, (v / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- */

export function Sparkline({
  values, width = 92, height = 24,
}: { values: number[]; width?: number; height?: number }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * width);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-[92px] h-6" aria-hidden>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2" fill="var(--accent)" />
    </svg>
  );
}
