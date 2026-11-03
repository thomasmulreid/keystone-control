import { Rows } from "@/components/Rows";
import { notFound } from "next/navigation";
import { Shell, customerNav } from "@/components/Shell";
import { ACCOUNT_SPEND } from "@/functions";
import { governanceMode } from "@/lib/governance";
import { Tile, SectionHeader, Pill, Table, Td } from "@/components/ui";
import { RevenueTrend, CategoryBars } from "@/components/Charts";
import { WorkQueue } from "@/components/WorkQueue";
import {getAccount, liveSnapshot, accountKeys } from "@/lib/snapshot";
import { customerQueue } from "@/lib/queue";
import { buildPreviews } from "@/lib/previews";
import { usd, usdExact, usdCompact, num, pct, shortDate } from "@/lib/format";

// Rendered per request, not prerendered. GOVERNANCE_MODE decides whether
// action controls appear at all, and changing it does not invalidate Next's
// build cache — so a cached page could offer a control the deployment has
// since forbidden. Correctness beats caching on this one.
export const dynamic = "force-dynamic";

export default async function Spend({ params }: { params: Promise<{ bu: string }> }) {
  const snapshot = liveSnapshot();
  const { bu } = await params;
  const a = getAccount(snapshot, bu);
  if (!a) notFound();

  const items = customerQueue(a, snapshot);
  const previews = buildPreviews(snapshot, items, "customer", ACCOUNT_SPEND.id);

  // What the relationship is worth, stated the way a purchasing manager has to
  // justify it internally: money off list, as a rate, with the gap named.
  const listEquivalent = a.revenueCents + a.savingsCents;
  const savingsRate = (a.savingsCents / listEquivalent) * 100;

  return (
    <Shell
      scope="customer"
      accountKey={a.key}
      accountName={a.name}
      view="spend"
      nav={customerNav(a.key)}
      title="Spend"
      lede={`What you have bought from Keystone, what your agreed rates have been worth, and where they did not apply. ${snapshot.window.from} to ${snapshot.window.to}.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Spend in window"
          value={usd(a.revenueCents)}
          hint={`${num(a.orderCount)} orders, ${usd(a.aovCents)} average`}
        />
        <Tile
          label="Your rates saved"
          value={usd(a.savingsCents)}
          tone="pos"
          hint={`${pct(savingsRate)} off list across everything you bought`}
          definition={snapshot.definitions.contractSavings}
          foot="This is the number to take to your finance review."
        />
        <Tile
          label="Charged above your rate"
          value={usd(a.leakageCents)}
          tone={a.leakageCents > 0 ? "warn" : "neutral"}
          hint={a.leakageCents > 0 ? `on ${a.leakageLines.length} lines` : "nothing to chase"}
          definition={snapshot.definitions.contractLeakage}
          foot={a.leakageCents > 0 ? "Recoverable. The evidence is below, line by line." : undefined}
        />
        <Tile
          label="Range you buy"
          value={num(a.distinctSkus)}
          hint={`of ${snapshot.skus.length} products Keystone sells`}
          foot={`${a.linesPerOrder} lines on an average order`}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-4">
          <SectionHeader title="Your spend by month" sub="Total order value including tax and delivery." />
          <RevenueTrend monthly={a.monthly} height={190} partialMonth={snapshot.window.partialMonth} />
        </section>
        <section className="card p-4">
          <SectionHeader title="Where it goes" sub="Your spend by category." />
          <CategoryBars data={a.categories} />
        </section>
      </div>

      {a.leakageCents > 0 && (
        <section className="mt-7">
          <SectionHeader
            title="What your contract did not cover"
            sub="Lines billed above a rate you have already been given for the same product. Each row is a credit you can ask for, with the order number attached."
            right={<Pill tone="warn">{usd(a.leakageCents)} recoverable</Pill>}
          />
          <Table head={["Product", "Order", "Date", "Qty", "You paid", "Your rate", "Difference"]}>
            <Rows cap={ACCOUNT_SPEND.display.tableRows} label="lines">
            {a.leakageLines.slice(0, 10).map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                <Td align="left"><span className="font-medium">{l.name}</span></Td>
                <Td align="left" muted><span className="font-mono text-[12px]">{l.orderNumber}</span></Td>
                <Td muted>{shortDate(l.createdAt)}</Td>
                <Td muted>{num(l.qty)}</Td>
                <Td>{usdExact(l.paidCents)}</Td>
                <Td muted>{usdExact(l.contractCents)}</Td>
                <Td><span className="font-semibold text-warn">{usd(l.overpaidCents)}</span></Td>
              </tr>
            ))}
            </Rows>
            <tr className="bg-sunk">
              <Td align="left"><span className="text-[12px] font-medium">Total across {a.leakageLines.length} lines</span></Td>
              <Td /><Td /><Td /><Td /><Td />
              <Td><span className="font-semibold text-warn">{usd(a.leakageCents)}</span></Td>
            </tr>
          </Table>
          <p className="mt-2 max-w-[82ch] text-[12.5px] leading-[1.55] text-muted">
            Keystone sees exactly these lines on their side, flagged as a pricing error rather than as your
            complaint. That is the point of both panels reading the same data — the conversation starts from an
            agreed number instead of an argument about whose spreadsheet is right.
          </p>
        </section>
      )}

      <section className="mt-7">
        <SectionHeader
          title="What needs you"
          sub="The three worth your time. Some you can fix yourself; the rest you would otherwise only find out by chasing."
          right={<Pill tone="neutral">{items.length} open</Pill>}
        />
        <WorkQueue
          mode={governanceMode()}
          max={ACCOUNT_SPEND.display.queueMax}
          compact={ACCOUNT_SPEND.display.queueCompact}
          items={items}
          previews={previews}
          scope="customer"
          accountKey={a.key}
          emptyTitle="Nothing needs you"
          emptyBody="No orders stuck, no quotes waiting, nothing overcharged and your governance is sound."
        />
      </section>

      <section className="mt-7">
        <SectionHeader title="Recent orders" sub="Across every division on the account." />
        <Table head={["Order", "Placed", "PO", "Buyer", "State", "Value"]}>
          {snapshot.orders
            .filter((o) => o.businessUnit === a.key)
            .slice(-5).reverse()
            .map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                <Td align="left"><span className="font-mono text-[12px]">{o.orderNumber}</span></Td>
                <Td muted>{shortDate(o.createdAt)}</Td>
                <Td muted>{o.poNumber ?? "—"}</Td>
                <Td align="left" muted><span className="text-[12px]">{o.customerEmail ?? "—"}</span></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Pill tone={o.orderState === "Complete" ? "pos" : "neutral"}>{o.orderState}</Pill>
                    {o.origin === "RecurringOrder" && <Pill tone="info">recurring</Pill>}
                  </div>
                </Td>
                <Td><span className="font-medium">{usdCompact(o.totalCents)}</span></Td>
              </tr>
            ))}
        </Table>
      </section>
    </Shell>
  );
}

export function generateStaticParams() {
  return accountKeys().map((bu) => ({ bu }));
}
