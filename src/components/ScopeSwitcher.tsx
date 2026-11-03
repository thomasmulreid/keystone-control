"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

/* ------------------------------------------------------------------
   The scope switcher.

   This is the most important control in the product, because every
   number below it changes meaning depending on which side you are on.
   So it is: always in the same place, always visible, and it changes
   the accent colour of the entire page. You should be able to tell
   which panel you are on from six feet away, with the text unreadable.
   ------------------------------------------------------------------ */

export interface AccountOption {
  key: string;
  name: string;
  revenueCents: number;
}

export function ScopeSwitcher({
  scope,
  accountKey,
  accounts,
  view,
}: {
  scope: "keystone" | "customer";
  accountKey?: string;
  accounts: AccountOption[];
  view: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Keep the equivalent view when a view exists on both sides; otherwise land
  // on the natural home for that panel.
  const customerHref = (key: string) => {
    const shared = ["governance"];
    const target = shared.includes(view) ? view : "spend";
    return `/customer/${key}/${target}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="tablist"
        aria-label="Whose control panel"
        className="inline-flex rounded-lg border border-line bg-surface p-0.5 shadow-[var(--shadow)]"
      >
        <Link
          role="tab"
          aria-selected={scope === "keystone"}
          href="/keystone/performance"
          className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
            scope === "keystone" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
          }`}
        >
          Keystone
        </Link>
        <Link
          role="tab"
          aria-selected={scope === "customer"}
          href={customerHref(accountKey ?? accounts[0]?.key ?? "company-a")}
          className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
            scope === "customer" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
          }`}
        >
          Customer
        </Link>
      </div>

      {scope === "customer" && (
        <label className="relative inline-flex items-center">
          <span className="sr-only">Which customer account</span>
          <select
            value={accountKey}
            onChange={(e) => router.push(customerHref(e.target.value))}
            className="appearance-none rounded-lg border border-line bg-surface py-1.5 pl-3 pr-8
                       text-[13px] font-medium text-ink shadow-[var(--shadow)]
                       hover:border-line-strong transition-colors cursor-pointer"
          >
            {accounts.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="pointer-events-none absolute right-2.5 h-3 w-3 text-faint"
          >
            <path
              d="M3 4.5 6 7.5 9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </label>
      )}

      <span className="hidden md:inline text-[12px] text-faint">
        {scope === "keystone" ? `all ${accounts.length} accounts` : "one business unit"}
      </span>
      <span className="sr-only" aria-live="polite">
        {scope === "keystone" ? "Keystone panel" : "Customer panel"} — {pathname}
      </span>
    </div>
  );
}
