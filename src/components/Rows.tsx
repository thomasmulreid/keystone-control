"use client";

import { Children, ReactNode, useState } from "react";

/* ------------------------------------------------------------------
   Capped table rows.

   The first build let tables grow with the data. That was fine at 12
   accounts and became a styled CSV at 58 — 8,500 words on one page,
   which is not something a person reads, it is something they scroll
   past.

   Nothing is deleted here. The first N rows are the answer; the rest
   are one click away for whoever actually wants them.
   ------------------------------------------------------------------ */

export function Rows({
  cap = 5,
  label = "rows",
  children,
}: {
  cap?: number;
  /** Plural noun for the reveal: "all 58 accounts". */
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rows = Children.toArray(children);
  const hidden = rows.length - cap;

  if (hidden <= 0) return <>{rows}</>;

  return (
    <>
      {open ? rows : rows.slice(0, cap)}
      <tr>
        <td colSpan={99} className="border-t border-line bg-sunk/60 px-3 py-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[12px] font-medium text-accent underline decoration-transparent underline-offset-2 transition hover:decoration-current"
          >
            {open ? `Show fewer` : `Show all ${rows.length} ${label}`}
            <span aria-hidden className="ml-1 text-faint">
              {open ? "↑" : `+${hidden}`}
            </span>
          </button>
        </td>
      </tr>
    </>
  );
}
