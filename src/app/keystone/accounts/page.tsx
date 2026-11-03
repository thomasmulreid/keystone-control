import Link from "next/link";
import { Shell, KEYSTONE_NAV } from "@/components/Shell";
import { Tile, SectionHeader, Pill, Table, Td, Definition } from "@/components/ui";
import { Rows } from "@/components/Rows";
import { Sparkline } from "@/components/Charts";
import { liveSnapshot } from "@/lib/snapshot";
import { usd, usdCompact, pct, days, num } from "@/lib/format";

export const revalidate = 300;

export default function Accounts() {
  const snapshot = liveSnapshot();
  const accts = snapshot.accounts;
  const quiet = accts.filter((a) => a.overdue);
  const onOne = accts.filter((a) => a.effectivelySingleBuyer && a.revenueCents > 0);
  const toothless = accts.filter(
    (a) => a.buyerLimit !== null && a.revenueCents > 0 && a.buyerLimit * 100 > a.revenueCents,
  );

  return (
    <Shell
      scope="keystone"
      view="accounts"
      nav={KEYSTONE_NAV}
      title="Accounts"
      lede="Every trading account, ranked by what it is worth and sorted so the problems float. The right-hand columns are the ones that predict next quarter; the revenue column only describes last one."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Trading accounts" value={num(accts.length)} hint={`${usd(snapshot.totals.revenueCents)} between them`} />
        <Tile
          label="Gone quiet"
          value={num(quiet.length)}
          tone="warn"
          hint={`${usd(quiet.reduce((s, a) => s + a.revenueCents, 0))} of revenue`}
          definition={snapshot.definitions.reorderCadence}
        />
        <Tile
          label="Resting on one buyer"
          value={num(onOne.length)}
          tone="neg"
          hint={`${usd(onOne.reduce((s, a) => s + a.revenueCents, 0))} of revenue`}
          definition={snapshot.definitions.buyerConcentration}
        />
        <Tile
          label="Limits that cannot trigger"
          value={num(toothless.length)}
          tone="warn"
          hint="per-order limit above annual spend"
          definition={snapshot.definitions.overLimit}
        />
      </div>

      <section className="mt-6">
        <SectionHeader
          title="The book"
          sub="Cadence, concentration and governance sit beside revenue because that is how an account actually gets lost — quietly, and never in the revenue column first."
          right={
            <Definition>
              <strong>Rhythm</strong> is the median gap between order days and how long it has been since the last one.
              <br />
              <strong>Depends on</strong> is how much of the account&rsquo;s spend goes through its single biggest buyer.
            </Definition>
          }
        />
        <Table head={["Account", "Revenue", "Trend", "Rhythm", "Depends on", "Flags"]}>
          <Rows cap={8} label="accounts">
          {accts.slice(0, 14).map((a) => {
            const spark = Object.entries(a.monthly).sort(([x], [y]) => x.localeCompare(y)).map(([, v]) => v);
            return (
              <tr key={a.key} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                <Td align="left">
                  <Link
                    href={`/customer/${a.key}/spend`}
                    className="font-medium hover:text-accent transition-colors"
                    title={`Open ${a.name}'s own control panel`}
                  >
                    {a.name}
                  </Link>
                  <div className="text-[11.5px] text-faint">
                    {[a.city, a.state].filter(Boolean).join(", ") || a.store}
                  </div>
                </Td>
                <Td>
                  <span className="font-medium">{usdCompact(a.revenueCents)}</span>
                  <div className="text-[11px] text-faint">{pct((a.revenueCents / snapshot.totals.revenueCents) * 100)} of book</div>
                </Td>
                <Td><div className="flex justify-end"><Sparkline values={spark} /></div></Td>
                <Td>
                  <span className={a.overdue ? "text-warn font-medium" : "text-muted"}>
                    {a.medianGapDays !== null ? `every ${a.medianGapDays}d` : "—"}
                  </span>
                  <div className="text-[11px] text-faint">quiet {days(a.daysSinceLastOrder)}</div>
                </Td>
                <Td>
                  <span className={a.effectivelySingleBuyer ? "text-neg font-medium" : "text-muted"}>
                    {pct(a.topBuyerSharePct)}
                  </span>
                  <div className="text-[11px] text-faint">
                    {a.buyerCount} {a.buyerCount === 1 ? "buyer" : "buyers"}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap justify-end gap-1">
                    {a.leakageCents > 0 && <Pill tone="warn">leak {usdCompact(a.leakageCents)}</Pill>}
                    {a.openQuotes.length > 0 && <Pill tone="info">quote open</Pill>}
                    {a.recurringOrders > 0 && <Pill tone="pos">{a.recurringOrders} recurring</Pill>}
                    {a.overdue && <Pill tone="warn">quiet</Pill>}
                    {a.effectivelySingleBuyer && <Pill tone="neg">one buyer</Pill>}
                  </div>
                </Td>
              </tr>
            );
          })}
          </Rows>
        </Table>
        {accts.length > 14 && (
          <p className="mt-1.5 text-[12px] text-faint">
            {accts.length - 14} smaller accounts not listed, {usd(accts.slice(14).reduce((acc, a) => acc + a.revenueCents, 0))} between them.
          </p>
        )}
        <p className="mt-2 text-[12px] text-faint">
          Account names link through to that customer&rsquo;s own control panel — the same data, read from their side.
        </p>
      </section>

    </Shell>
  );
}
