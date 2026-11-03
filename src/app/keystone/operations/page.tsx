import { Shell, KEYSTONE_NAV } from "@/components/Shell";
import { OPERATIONS } from "@/functions";
import { governanceMode } from "@/lib/governance";
import { Tile, SectionHeader, Pill, Table, Td } from "@/components/ui";
import { Rows } from "@/components/Rows";
import { WorkQueue } from "@/components/WorkQueue";
import { liveSnapshot } from "@/lib/snapshot";
import { keystoneQueue } from "@/lib/queue";
import { buildPreviews } from "@/lib/previews";
import { usd, usdCompact, days, num, shortDate } from "@/lib/format";

/* Reason order is severity order, and it is also the order you work them. */
const REASON_ORDER = [
  "payment-failed", "balance-due", "payment-pending",
  "awaiting-release", "ship-pending", "ready-not-shipped",
];

// Rendered per request, not prerendered. GOVERNANCE_MODE decides whether
// action controls appear at all, and changing it does not invalidate Next's
// build cache — so a cached page could offer a control the deployment has
// since forbidden. Correctness beats caching on this one.
export const dynamic = "force-dynamic";

export default function Operations() {
  const snapshot = liveSnapshot();
  const ex = snapshot.exceptions;
  const items = keystoneQueue(snapshot).filter((i) =>
    ["release-queue", "ar-queue", "dispatch-queue", "quote-queue"].includes(i.id) || i.id.startsWith("quote-"),
  );
  const previews = buildPreviews(snapshot, items, "keystone", OPERATIONS.id);

  const groups = REASON_ORDER
    .map((r) => ({ reason: r, rows: ex.filter((e) => e.reason === r) }))
    .filter((g) => g.rows.length);

  const oldest = Math.max(...ex.map((e) => e.ageDays));
  const openQuotes = snapshot.quotes.filter((q) => q.state === "Submitted");

  return (
    <Shell
      scope="keystone"
      view="operations"
      nav={KEYSTONE_NAV}
      title="Operations"
      lede="Everything that has stopped moving, grouped by what is actually wrong with it. Reason is the grouping rather than status, because the fix is different for each one and a status-only list is something nobody can act on."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Orders stopped"
          value={num(ex.length)}
          tone="neg"
          hint={`${usd(ex.reduce((s, e) => s + e.totalCents, 0))} of value`}
        />
        <Tile label="Oldest" value={days(oldest)} tone="warn" hint="since the order was placed" />
        <Tile
          label="Quotes waiting"
          value={num(openQuotes.length)}
          hint={openQuotes.length ? `${usd(openQuotes.reduce((s, q) => s + q.totalCents, 0))} unpriced` : "nothing unpriced"}
        />
        <Tile
          label="Accounts affected"
          value={num(new Set(ex.map((e) => e.businessUnit)).size)}
          hint="each one is a customer who may be about to call"
        />
      </div>

      <section className="mt-6">
        <SectionHeader
          title="Today's work"
          sub="Ranked by value against age. Where this panel is allowed to make the change, the button shows you the exact payload first."
        />
        <WorkQueue
          mode={governanceMode()}
          items={items}
          previews={previews}
          scope="keystone"
          accountKey={null}
          emptyTitle="The desk is clear"
          emptyBody="No order is stuck and no quote is waiting. This page fills itself the moment something stops."
        />
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Exception desk"
          sub="The full list. Sorted inside each group by value against age — not by date, because the oldest order is rarely the one that matters most."
        />
        <div className="flex flex-col gap-5">
          {groups.map(({ reason, rows }) => {
            const value = rows.reduce((s, r) => s + r.totalCents, 0);
            return (
              <div key={reason}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h3 className="text-[13.5px] font-semibold">{rows[0].reasonLabel}</h3>
                  <Pill tone="neutral">{rows.length} orders</Pill>
                  <Pill tone="neutral">{usd(value)}</Pill>
                  <p className="basis-full text-[12.5px] leading-[1.5] text-muted max-w-[80ch]">
                    {rows[0].guidance}
                  </p>
                </div>
                <Table head={["Order", "Account", "Buyer", "PO", "Placed", "Age", "Value"]}>
                  <Rows cap={OPERATIONS.display.tableRows} label="orders">
                  {rows.slice(0, 10).map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                      <Td align="left">
                        <span className="font-mono text-[12px]">{e.orderNumber}</span>
                        <div className="mt-0.5 flex gap-1">
                          <Pill tone="neutral">{e.orderState}</Pill>
                          {e.paymentState && <Pill tone={e.paymentState === "Paid" ? "pos" : "warn"}>{e.paymentState}</Pill>}
                          {e.shipmentState && <Pill tone="neutral">{e.shipmentState}</Pill>}
                        </div>
                      </Td>
                      <Td align="left" muted>{e.accountName}</Td>
                      <Td align="left" muted>
                        <span className="text-[12px]">{e.customerEmail ?? "—"}</span>
                      </Td>
                      <Td muted>{e.poNumber ?? "—"}</Td>
                      <Td muted>{shortDate(e.createdAt)}</Td>
                      <Td>
                        <span className={e.ageDays > 7 ? "text-neg font-medium" : e.ageDays > 3 ? "text-warn" : ""}>
                          {e.ageDays}d
                        </span>
                      </Td>
                      <Td><span className="font-medium">{usdCompact(e.totalCents)}</span></Td>
                    </tr>
                  ))}
                  </Rows>
                </Table>
                {rows.length > 10 && (
                  <p className="mt-1.5 text-[12px] text-faint">
                    {rows.length - 10} further orders in this group, worth{" "}
                    {usd(rows.slice(10).reduce((acc, r) => acc + r.totalCents, 0))}. Work the top of the
                    list first — it is sorted by value against age.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="What this panel will and will not change"
          sub="Worth being explicit about, because an ops tool that writes to everything is not one you can hand to a new starter."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              <span aria-hidden className="h-2 w-2 rounded-full bg-pos" />
              It can change these
            </h3>
            <ul className="flex flex-col gap-2 text-[12.5px] leading-[1.5] text-muted">
              <li>
                <span className="font-medium text-ink">Order state</span> — confirming an order that was
                created but never released. <code className="font-mono text-[11.5px]">changeOrderState</code>
              </li>
              <li>
                <span className="font-medium text-ink">Spend limits</span> — the buyerLimit on a business
                unit. <code className="font-mono text-[11.5px]">setCustomField</code>
              </li>
              <li>
                <span className="font-medium text-ink">Quote request state</span> — accepting a request so a
                pricer can work it. <code className="font-mono text-[11.5px]">changeQuoteRequestState</code>
              </li>
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              <span aria-hidden className="h-2 w-2 rounded-full bg-neg" />
              It will not touch these
            </h3>
            <ul className="flex flex-col gap-2 text-[12.5px] leading-[1.5] text-muted">
              <li>
                <span className="font-medium text-ink">Payment state.</span> Marking an order paid when the
                money has not arrived hides a real debt behind a green tick. It goes to AR.
              </li>
              <li>
                <span className="font-medium text-ink">Prices and the catalogue.</span> Merchant Center is the
                system of record. This panel decides; it does not author.
              </li>
              <li>
                <span className="font-medium text-ink">Anything taking more than three fields.</span> That is a
                form, and forms belong in Merchant Center. This panel deep-links out.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Shell>
  );
}
