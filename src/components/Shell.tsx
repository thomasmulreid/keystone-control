import Link from "next/link";
import { ReactNode } from "react";
import { liveSnapshot, customerAccounts } from "@/lib/snapshot";
import { ScopeSwitcher } from "./ScopeSwitcher";
import { longDate } from "@/lib/format";
import { governanceMode, MODE_COPY } from "@/lib/governance";
import { RefreshButton } from "./RefreshButton";

/* ------------------------------------------------------------------
   The chrome.

   Three rows, always in the same order:
     1. who you are looking at        (scope switcher — changes the accent)
     2. what you are looking at       (views for this panel)
     3. the work                      (page content)

   Row 1 never moves. Switching panels should feel like turning a card
   over, not like navigating to a different product.
   ------------------------------------------------------------------ */

export interface NavItem {
  href: string;
  label: string;
  /** Who opens this view first thing in the morning. */
  role: string;
}

export function Shell({
  scope,
  accountKey,
  accountName,
  view,
  nav,
  title,
  lede,
  children,
}: {
  scope: "keystone" | "customer";
  accountKey?: string;
  accountName?: string;
  view: string;
  nav: NavItem[];
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const snapshot = liveSnapshot();
  const accounts = customerAccounts(snapshot).map((a) => ({
    key: a.key, name: a.name, revenueCents: a.revenueCents,
  }));

  return (
    <div data-scope={scope} className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50
                   focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:shadow-[var(--shadow-lg)]"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[11px] font-bold text-accent-contrast"
            >
              K
            </span>
            <span className="text-[13.5px] font-semibold tracking-[-0.01em]">Keystone Control</span>
          </Link>

          <div className="h-5 w-px bg-line hidden sm:block" />

          <ScopeSwitcher scope={scope} accountKey={accountKey} accounts={accounts} view={view} />

          <div className="ml-auto flex items-center gap-2.5 text-[11.5px] text-faint">
            <span className="hidden lg:inline">{snapshot.project}</span>
            <RefreshButton label={`data ${snapshot.freshness.label}`} />
            <span
              className="rounded-full border border-line px-2 py-[3px]"
              title={MODE_COPY[governanceMode()].detail}
            >
              {MODE_COPY[governanceMode()].badge}
            </span>
          </div>
        </div>

        <nav aria-label={scope === "keystone" ? "Keystone views" : "Account views"}>
          <div className="mx-auto flex max-w-[1180px] gap-0.5 overflow-x-auto px-4 sm:px-6">
            {nav.map((n) => {
              const active = n.href.endsWith(`/${view}`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative whitespace-nowrap px-2.5 py-2 text-[13px] transition-colors ${
                    active ? "text-ink font-medium" : "text-muted hover:text-ink"
                  }`}
                >
                  {n.label}
                  <span className="ml-1.5 text-[11px] text-faint hidden md:inline">{n.role}</span>
                  <span
                    aria-hidden
                    className={`absolute inset-x-2 -bottom-px h-[2px] rounded-full ${
                      active ? "bg-accent" : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {snapshot.freshness.stale && (
        <div
          role="status"
          className={`border-b ${
            snapshot.freshness.veryStale
              ? "border-[var(--warn)] bg-warn-soft text-warn"
              : "border-line bg-sunk text-muted"
          }`}
        >
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2 text-[12.5px] sm:px-6">
            <strong className="font-semibold">
              Data to {longDate(snapshot.freshness.dataAsOf)} — {snapshot.freshness.label}.
            </strong>
            <span>
              {snapshot.freshness.veryStale
                ? "Ages below are measured against today, so the queues are describing a state that is " +
                  snapshot.freshness.ageDays +
                  " days old. Re-run the snapshot before working from them."
                : "Ages are measured against today, not against the snapshot."}
            </span>
          </div>
        </div>
      )}

      <main id="main" className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            {scope === "customer" && accountName && (
              <span className="rounded-md bg-accent-soft px-2 py-[3px] text-[11.5px] font-medium text-accent">
                {accountName}
              </span>
            )}
            <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h1>
          </div>
          <p className="mt-1 max-w-[76ch] text-[13.5px] leading-[1.6] text-muted">{lede}</p>
        </div>
        {children}
      </main>

      <footer className="mx-auto max-w-[1180px] px-4 pb-10 pt-4 sm:px-6">
        <p className="text-[11.5px] leading-relaxed text-faint max-w-[80ch]">
          Every figure is computed from the {snapshot.project} commercetools project —
          {" "}{snapshot.orders.length} orders, {snapshot.accounts.length} accounts and{" "}
          {snapshot.quotes.length} quote requests, trading dates {snapshot.window.from} to{" "}
          {snapshot.window.to}. Nothing is illustrative. Money figures are as at the snapshot;
          anything expressed in days is measured against the clock right now.
        </p>
      </footer>
    </div>
  );
}

export const KEYSTONE_NAV: NavItem[] = [
  { href: "/keystone/performance", label: "Performance", role: "CEO" },
  { href: "/keystone/accounts", label: "Accounts", role: "CRO" },
  { href: "/keystone/catalogue", label: "Catalogue", role: "Marketing" },
  { href: "/keystone/operations", label: "Operations", role: "Ops & CS" },
  { href: "/keystone/sources", label: "Sources", role: "Stack" },
];

export const customerNav = (key: string): NavItem[] => [
  { href: `/customer/${key}/spend`, label: "Spend", role: "" },
  { href: `/customer/${key}/governance`, label: "Governance", role: "" },
  { href: `/customer/${key}/continuity`, label: "Continuity", role: "" },
  { href: `/customer/${key}/requests`, label: "Requests", role: "" },
];
