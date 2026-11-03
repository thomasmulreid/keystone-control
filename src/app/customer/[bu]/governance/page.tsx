import { Rows } from "@/components/Rows";
import { notFound } from "next/navigation";
import { Shell, customerNav } from "@/components/Shell";
import { ACCOUNT_GOVERNANCE } from "@/functions";
import { governanceMode } from "@/lib/governance";
import { Tile, SectionHeader, Pill, Table, Td, Bar, Empty } from "@/components/ui";
import { WorkQueue } from "@/components/WorkQueue";
import {getAccount, liveSnapshot, accountKeys } from "@/lib/snapshot";
import { customerQueue } from "@/lib/queue";
import { buildPreviews, suggestedLimit } from "@/lib/previews";
import { usd, usdCompact, num, pct } from "@/lib/format";

const ROLE_NOTE: Record<string, string> = {
  "super-admin": "Full control, including other people's permissions.",
  admin: "Manages users, limits and addresses.",
  "buyer-admin": "Places orders and manages other buyers.",
  approver: "Signs off orders above a buyer's limit.",
  buyer: "Places orders within their limit.",
};

// Rendered per request, not prerendered. GOVERNANCE_MODE decides whether
// action controls appear at all, and changing it does not invalidate Next's
// build cache — so a cached page could offer a control the deployment has
// since forbidden. Correctness beats caching on this one.
export const dynamic = "force-dynamic";

export default async function Governance({ params }: { params: Promise<{ bu: string }> }) {
  const snapshot = liveSnapshot();
  const { bu } = await params;
  const a = getAccount(snapshot, bu);
  if (!a) notFound();

  const items = customerQueue(a, snapshot).filter((i) =>
    ["own-limit", "own-concentration", "divisions"].includes(i.id),
  );
  const previews = buildPreviews(snapshot, items, "customer", ACCOUNT_GOVERNANCE.id);

  const limitDead = a.buyerLimit !== null && a.buyerLimit * 100 > a.revenueCents;
  const approvers = a.associates.filter((x) => x.role === "approver" || x.role.includes("admin"));
  const proposed = suggestedLimit(a.aovCents);

  return (
    <Shell
      scope="customer"
      accountKey={a.key}
      accountName={a.name}
      view="governance"
      nav={customerNav(a.key)}
      title="Governance"
      lede="Who can spend what, who signs it off, and whether any of it is actually working. Most B2B accounts discover the answer to the last one during an audit."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Per-order limit"
          value={a.buyerLimit !== null ? usd(a.buyerLimit * 100) : "Not set"}
          tone={limitDead ? "warn" : "neutral"}
          hint={a.limitExceededBehavior === "pending" ? "orders above it go to an approver" : "no behaviour set"}
          definition={snapshot.definitions.overLimit}
          foot={limitDead ? "Higher than your entire year of spend, so it can never trigger." : undefined}
        />
        <Tile
          label="People on the account"
          value={num(a.associates.length)}
          hint={`${approvers.length} can approve`}
        />
        <Tile
          label="Orders actually placed by"
          value={num(a.buyerCount)}
          tone={a.effectivelySingleBuyer ? "neg" : "neutral"}
          hint={`top buyer places ${pct(a.topBuyerSharePct)} of spend`}
          definition={snapshot.definitions.buyerConcentration}
        />
        <Tile
          label="Orders that hit the limit"
          value={num(a.overLimitCount)}
          hint={a.overLimitCount === 0 ? "none, all year" : "went to an approver"}
          foot={a.overLimitCount === 0 && limitDead ? "Not because spending is modest — because the limit is unreachable." : undefined}
        />
      </div>

      {limitDead && (
        <section className="mt-6 card overflow-hidden">
          <div className="border-b border-line bg-warn-soft px-4 py-3">
            <h2 className="text-[14px] font-semibold text-warn">Your approval gate has never fired</h2>
            <p className="mt-1 max-w-[80ch] text-[12.5px] leading-[1.6] text-warn">
              The limit is set to {usd(a.buyerLimit! * 100)}. You have spent {usd(a.revenueCents)} in total
              this year across {a.orderCount} orders, and your largest single order was well under the limit.
              Nothing has ever needed a second signature, so in practice there is no control — only the
              appearance of one.
            </p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <Stat label="Current limit" value={usd(a.buyerLimit! * 100)} muted />
            <Stat label="Your average order" value={usd(a.aovCents)} />
            <Stat label="A limit that would work" value={usd(proposed * 100)} accent />
          </div>
          {/* No bar here on purpose: the average order is about 1% of the limit,
              and a bar at that ratio shows two marks on top of each other while
              the legend implies they are spread out. The ratio in words is the
              honest encoding. */}
          <div className="px-4 pb-4">
            <p className="text-[12.5px] leading-[1.6] text-muted">
              Your limit is{" "}
              <strong className="font-semibold text-ink tnum">
                {Math.round((a.buyerLimit! * 100) / a.aovCents)}×
              </strong>{" "}
              your average order. A buyer would have to place{" "}
              <strong className="font-semibold text-ink tnum">
                {Math.round((a.buyerLimit! * 100) / a.aovCents)}
              </strong>{" "}
              typical orders at once before anyone was asked to sign for it.
            </p>
          </div>
        </section>
      )}

      <section className="mt-6">
        <SectionHeader
          title="Who is on the account"
          sub="Roles come from commercetools associate assignments. The spend column is what each person has actually ordered, which is usually the more interesting number."
        />
        <Table head={["Person", "Role", "What that allows", "Spend", "Share"]}>
          <Rows cap={ACCOUNT_GOVERNANCE.display.tableRows} label="people">
          {a.associates.map((as) => {
            const buyer = a.buyers.find((b) => b.email.includes(as.id.slice(0, 4)));
            return (
              <tr key={as.id} className="border-b border-line last:border-0">
                <Td align="left">
                  <span className="font-mono text-[11.5px] text-muted">{as.id.slice(0, 8)}…</span>
                </Td>
                <Td align="left"><Pill tone={as.role.includes("admin") ? "accent" : "neutral"}>{as.role}</Pill></Td>
                <Td align="left" muted><span className="text-[12px]">{ROLE_NOTE[as.role] ?? "—"}</span></Td>
                <Td muted>{buyer ? usd(buyer.revenueCents) : "—"}</Td>
                <Td muted>—</Td>
              </tr>
            );
          })}
          </Rows>
        </Table>

        <div className="mt-4">
          <SectionHeader title="Who actually orders" sub="By email address on the orders themselves." />
          <ul className="card divide-y divide-[var(--border)]">
            {a.buyers.map((b) => (
              <li key={b.email} className="p-3.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium truncate">{b.email}</span>
                  <span className="tnum shrink-0 text-[13px]">
                    {usd(b.revenueCents)}
                    <span className="text-faint"> · {pct((b.revenueCents / a.revenueCents) * 100)}</span>
                  </span>
                </div>
                <Bar
                  pct={(b.revenueCents / a.revenueCents) * 100}
                  tone={b.revenueCents / a.revenueCents > 0.9 ? "neg" : "accent"}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Divisions"
          sub="Sites, depots and crews under this account. Each can hold its own limit and ship-to address."
        />
        {a.divisions.length ? (
          <Table head={["Division", "Limit", "Orders placed", "Status"]}>
            {a.divisions.map((d) => {
              const orders = snapshot.orders.filter((o) => o.businessUnit === d.key);
              return (
                <tr key={d.key} className="border-b border-line last:border-0">
                  <Td align="left">
                    <span className="font-medium">{d.name}</span>
                    <div className="font-mono text-[11px] text-faint">{d.key}</div>
                  </Td>
                  <Td muted>{d.buyerLimit !== null ? usdCompact(d.buyerLimit * 100) : "inherits parent"}</Td>
                  <Td muted>{orders.length}</Td>
                  <Td>
                    {orders.length === 0
                      ? <Pill tone="warn">configured, unused</Pill>
                      : <Pill tone="pos">active</Pill>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Empty title="No divisions set up">
            Everything is ordered against the parent account. That is fine for a single site — once you have
            more than one, divisions are how spend gets attributed back to the place that spent it.
          </Empty>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader
          title="What needs you"
          sub="Changes you can make yourself. Keystone sees the same fields and the same audit trail."
        />
        <WorkQueue
          mode={governanceMode()}
          items={items}
          previews={previews}
          scope="customer"
          accountKey={a.key}
          emptyTitle="Your governance is sound"
          emptyBody="Limits are set at a level that can actually fire, more than one person can order, and your divisions are doing something."
        />
      </section>
    </Shell>
  );
}

function Stat({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{label}</div>
      <div className={`tnum mt-0.5 text-[20px] font-semibold ${accent ? "text-accent" : muted ? "text-muted line-through" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return accountKeys().map((bu) => ({ bu }));
}
