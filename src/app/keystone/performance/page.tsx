import { Shell, KEYSTONE_NAV } from "@/components/Shell";
import { CEO } from "@/functions";
import { governanceMode } from "@/lib/governance";
import { Tile, SectionHeader, Pill, Table, Td, Bar } from "@/components/ui";
import { RevenueTrend, CategoryBars } from "@/components/Charts";
import { WorkQueue } from "@/components/WorkQueue";
import {monthLabel, liveSnapshot } from "@/lib/snapshot";
import { keystoneQueue } from "@/lib/queue";
import { buildPreviews } from "@/lib/previews";
import { usd, num, pct, signed } from "@/lib/format";

// Rendered per request, not prerendered. GOVERNANCE_MODE decides whether
// action controls appear at all, and changing it does not invalidate Next's
// build cache — so a cached page could offer a control the deployment has
// since forbidden. Correctness beats caching on this one.
export const dynamic = "force-dynamic";

export default function Performance() {
  const snapshot = liveSnapshot();
  const t = snapshot.totals;
  const items = keystoneQueue(snapshot);
  const previews = buildPreviews(snapshot, items, "keystone", CEO.id);

  // Last complete month vs the one before. The extractor already excluded the
  // partial current month, so this is a like-for-like comparison.
  const curM = snapshot.window.currentMonth;
  const prevM = snapshot.window.priorMonth;
  const curV = t.monthly[curM] ?? 0;
  const delta = curV - (t.monthly[prevM] ?? 0);

  const concentration = snapshot.accounts[0];
  const concPct = (concentration.revenueCents / t.revenueCents) * 100;
  // The threshold is the CEO's target, not a number chosen by whoever wrote this page.
  const concLimit = CEO.targets.find((x) => x.key === "max_account_concentration_pct")?.value ?? 20;
  const onOneBuyer = snapshot.accounts.filter((a) => a.effectivelySingleBuyer && a.revenueCents > 0);

  return (
    <Shell
      scope="keystone"
      view="performance"
      nav={KEYSTONE_NAV}
      title={CEO.label}
      lede={`Where the business stands, and the handful of things that would change it. ${snapshot.window.from} to ${snapshot.window.to}, across ${t.activeAccounts} trading accounts.`}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label={`${monthLabel(curM)} revenue`}
          value={usd(curV)}
          hint={
            <span className={delta >= 0 ? "text-pos" : "text-neg"}>
              {signed(delta)} on {monthLabel(prevM)}
            </span>
          }
          definition={snapshot.definitions.revenue}
          foot={`${monthLabel(snapshot.window.partialMonth ?? "")} still running, left out of the comparison. No target set.`}
        />
        <Tile
          label="Revenue year to date"
          value={usd(t.revenueCents)}
          hint={`${num(t.orderCount)} orders, ${usd(t.aovCents)} average`}
          foot={`${t.activeAccounts} accounts trading since ${snapshot.window.from}.`}
        />
        <Tile
          label="Stopped revenue"
          value={usd(t.exceptionValueCents)}
          tone="neg"
          hint={`${t.exceptionCount} orders not moving`}
          definition={snapshot.definitions.exceptionValue}
          foot="The fastest money in the building. It is already sold."
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-4">
          <SectionHeader
            title="Revenue by month"
            sub="Total order value by trading date, all accounts."
          />
          <RevenueTrend monthly={t.monthly} height={190} partialMonth={snapshot.window.partialMonth} />
          <p className="mt-3 text-[12px] leading-[1.55] text-faint">
            By trading date, not by when the record was written.
          </p>
        </section>

        <section className="card p-4">
          <SectionHeader title="Where the money comes from" sub="Top five categories." />
          <CategoryBars data={t.categories} limit={CEO.display.breakdownRows} />
        </section>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="What moved"
            sub={`${monthLabel(prevM)} to ${monthLabel(curM)}, by account. Largest swings first, in either direction.`}
          />
          <Table head={["Account", "Change", `${monthLabel(curM)}`, "Share of book"]}>
            {snapshot.whatMoved.slice(0, CEO.display.tableRows).map((r) => {
              const acct = snapshot.accounts.find((a) => a.key === r.key);
              return (
                <tr key={r.key} className="border-b border-line last:border-0">
                  <Td align="left">{r.name}</Td>
                  <Td>
                    <span className={r.deltaCents >= 0 ? "text-pos" : "text-neg"}>
                      {signed(r.deltaCents)}
                    </span>
                  </Td>
                  <Td muted>{usd(r.currentCents)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted">
                        {pct(((acct?.revenueCents ?? 0) / t.revenueCents) * 100)}
                      </span>
                      <div className="w-10">
                        <Bar
                          pct={((acct?.revenueCents ?? 0) / snapshot.accounts[0].revenueCents) * 100}
                          tone={(acct?.revenueCents ?? 0) / t.revenueCents > 0.2 ? "warn" : "accent"}
                        />
                      </div>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </section>

        <section>
          <SectionHeader title="What could hurt" sub="Structural exposure, not this month's noise." />
          <div className="card divide-y divide-[var(--border)]">
            <Risk
              label="Largest account"
              value={pct(concPct)}
              detail={`${concentration.name} is ${pct(concPct)} of revenue against a ${pct(concLimit)} ceiling. Losing it would not be a bad quarter, it would be a different company.`}
              tone={concPct > concLimit ? "neg" : "warn"}
            />
            <Risk
              label="Accounts on one buyer"
              value={`${onOneBuyer.length} of ${t.activeAccounts}`}
              detail={`${usd(onOneBuyer.reduce((s, a) => s + a.revenueCents, 0))} of revenue depends on a single named person at each of these accounts.`}
              tone="neg"
            />
            <Risk
              label="Accounts gone quiet"
              value={`${t.quietCluster.accounts} of ${t.quietCluster.ofAccounts}`}
              detail={
                t.quietCluster.clustered
                  ? `Treat this as a data question first. ${t.quietCluster.atCliff} of them stop within two weeks of ${t.quietCluster.cliffDate} — accounts do not all churn in the same fortnight, so check the order feed before the customers.`
                  : "Past 1.5× their own usual gap between orders. The B2B churn signal, and it never shows up in a conversion report."
              }
              tone={t.quietCluster.clustered ? "warn" : "warn"}
            />
          </div>
        </section>
      </div>

      <section className="mt-7">
        <SectionHeader
          title="What to do about it"
          sub="The three that matter most today. Each carries its evidence and, where the panel may act, the exact change it would make."
          right={<Pill tone="neutral">{items.length} open</Pill>}
        />
        <WorkQueue mode={governanceMode()} items={items} previews={previews} scope="keystone" accountKey={null} max={CEO.display.queueMax} compact={CEO.display.queueCompact} />
      </section>
    </Shell>
  );
}

function Risk({
  label, value, detail, tone,
}: { label: string; value: string; detail: string; tone: "neg" | "warn" }) {
  return (
    <div className="flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className={`mt-[6px] h-2 w-2 shrink-0 rounded-full ${tone === "neg" ? "bg-neg" : "bg-warn"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium">{label}</span>
          <span className="tnum text-[13px] font-semibold shrink-0">{value}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-[1.5] text-muted">{detail}</p>
      </div>
    </div>
  );
}
