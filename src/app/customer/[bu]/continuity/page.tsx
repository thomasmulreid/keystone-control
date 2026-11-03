import { Rows } from "@/components/Rows";
import { notFound } from "next/navigation";
import { Shell, customerNav } from "@/components/Shell";
import { ACCOUNT_CONTINUITY } from "@/functions";
import { governanceMode } from "@/lib/governance";
import { Tile, SectionHeader, Pill, Table, Td, Empty } from "@/components/ui";
import {getAccount, liveSnapshot, accountKeys } from "@/lib/snapshot";
import { usd, usdCompact, num, days, shortDate } from "@/lib/format";

export const revalidate = 300;

export default async function Continuity({ params }: { params: Promise<{ bu: string }> }) {
  const snapshot = liveSnapshot();
  const { bu } = await params;
  const a = getAccount(snapshot, bu);
  if (!a) notFound();

  const mine = snapshot.orders.filter((o) => o.businessUnit === a.key);
  const recurring = mine.filter((o) => o.origin === "RecurringOrder");
  const stopped = snapshot.exceptions.filter((e) => e.businessUnit === a.key);
  const onRhythm = a.medianGapDays !== null && a.daysSinceLastOrder !== null
    && a.daysSinceLastOrder <= a.medianGapDays * 1.5;

  // Which products this account leans on. Continuity risk lives in the repeat
  // lines, not the one-offs.
  const myCats = Object.entries(a.categories).sort(([, x], [, y]) => y - x);

  return (
    <Shell
      scope="customer"
      accountKey={a.key}
      accountName={a.name}
      view="continuity"
      nav={customerNav(a.key)}
      title="Continuity"
      lede="Whether supply is keeping up with how you actually buy. Not a stock report — a check on your own rhythm, your repeat orders, and anything of yours that has stopped moving."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Your ordering rhythm"
          value={a.medianGapDays !== null ? `every ${a.medianGapDays}d` : "—"}
          hint={`last order ${days(a.daysSinceLastOrder)} ago`}
          tone={onRhythm ? "neutral" : "warn"}
          definition={snapshot.definitions.reorderCadence}
          foot={onRhythm ? "On rhythm." : "Longer than usual — worth checking nothing is blocked."}
        />
        <Tile
          label="Standing orders"
          value={num(recurring.length)}
          tone={recurring.length ? "pos" : "neutral"}
          hint={recurring.length ? `${usd(recurring.reduce((s, o) => s + o.totalCents, 0))} placed automatically` : "none set up"}
          foot={recurring.length ? "These keep running without anyone remembering to place them." : "Repeat lines still need someone to remember."}
        />
        <Tile
          label="Your orders not moving"
          value={num(stopped.length)}
          tone={stopped.length ? "neg" : "neutral"}
          hint={stopped.length ? `${usd(stopped.reduce((s, e) => s + e.totalCents, 0))} held` : "everything flowing"}
        />
        <Tile
          label="Products you depend on"
          value={num(a.distinctSkus)}
          hint={`across ${myCats.length} categories`}
        />
      </div>

      <section className="mt-6">
        <SectionHeader
          title="Your orders that have stopped"
          sub="Visible here without you having to ring anyone. Most of these sit with Keystone rather than with you — the value is in knowing before you need to ask."
        />
        {stopped.length ? (
          <Table head={["Order", "PO", "Placed", "Waiting", "What is holding it", "Value"]}>
            <Rows cap={ACCOUNT_CONTINUITY.display.tableRows} label="orders">
            {stopped.slice(0, 15).map((e) => (
              <tr key={e.id} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                <Td align="left"><span className="font-mono text-[12px]">{e.orderNumber}</span></Td>
                <Td muted>{e.poNumber ?? "—"}</Td>
                <Td muted>{shortDate(e.createdAt)}</Td>
                <Td>
                  <span className={e.ageDays > 7 ? "text-neg font-medium" : e.ageDays > 3 ? "text-warn" : ""}>
                    {e.ageDays}d
                  </span>
                </Td>
                <Td align="left">
                  <Pill tone="warn">{e.reasonLabel}</Pill>
                  <div className="mt-0.5 max-w-[46ch] text-[11.5px] leading-[1.45] text-faint">{e.guidance}</div>
                </Td>
                <Td><span className="font-medium">{usdCompact(e.totalCents)}</span></Td>
              </tr>
            ))}
            </Rows>
          </Table>
        ) : (
          <Empty title="Everything is moving">
            None of your orders are held on payment, approval or dispatch. If one stops, it appears here the
            same day rather than when somebody notices.
          </Empty>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Standing orders"
          sub="Orders placed automatically on a schedule rather than by a person."
        />
        {recurring.length ? (
          <Table head={["Order", "Placed", "Buyer", "State", "Value"]}>
            <Rows cap={ACCOUNT_CONTINUITY.display.tableRows} label="orders">
            {recurring.slice(-10).reverse().map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <Td align="left"><span className="font-mono text-[12px]">{o.orderNumber}</span></Td>
                <Td muted>{shortDate(o.createdAt)}</Td>
                <Td align="left" muted><span className="text-[12px]">{o.customerEmail ?? "—"}</span></Td>
                <Td><Pill tone={o.orderState === "Complete" ? "pos" : "neutral"}>{o.orderState}</Pill></Td>
                <Td><span className="font-medium">{usdCompact(o.totalCents)}</span></Td>
              </tr>
            ))}
            </Rows>
          </Table>
        ) : (
          <Empty title="No standing orders">
            Every order on this account is placed by hand. If any of your lines repeat on a predictable
            cycle, a standing order removes the chance of somebody forgetting during a holiday.
          </Empty>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader title="What you buy, by category" sub="Where a supply interruption would actually hurt." />
        <Table head={["Category", "Spend", "Share of your spend"]}>
          {myCats.map(([c, v]) => (
            <tr key={c} className="border-b border-line last:border-0">
              <Td align="left">{c}</Td>
              <Td><span className="font-medium">{usd(v)}</span></Td>
              <Td muted>{Math.round((v / a.revenueCents) * 100)}%</Td>
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
