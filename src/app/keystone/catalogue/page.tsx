import { Shell, KEYSTONE_NAV } from "@/components/Shell";
import { Tile, SectionHeader, Pill, Table, Td, Bar } from "@/components/ui";
import { Rows } from "@/components/Rows";
import { CategoryBars } from "@/components/Charts";
import { liveSnapshot } from "@/lib/snapshot";
import { usd, usdCompact, usdExact, num, pct, shortDate } from "@/lib/format";

export const revalidate = 300;

export default function Catalogue() {
  const snapshot = liveSnapshot();
  const { skus, brands, totals } = snapshot;
  const spread = [...skus].filter((s) => s.spreadPct > 0).sort((a, b) => b.spreadPct - a.spreadPct);
  const narrow = skus.filter((s) => s.accountCount <= 2 && s.revenueCents > 0);
  const totalBrand = Object.values(brands).reduce((s, v) => s + v, 0);

  return (
    <Shell
      scope="keystone"
      view="catalogue"
      nav={KEYSTONE_NAV}
      title="Catalogue"
      lede="What is selling, to how many accounts, and at how many different prices. The last of those is the one merchandising never gets shown, and it is where the margin goes."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Active SKUs" value={num(skus.length)} hint={`${usd(totals.revenueCents)} between them`} />
        <Tile
          label="Sold at more than one price"
          value={num(spread.length)}
          tone="warn"
          hint={`${pct((spread.length / skus.length) * 100)} of the range`}
          foot="Either a deliberate tier or a pricing mistake. The panel cannot tell which — a person has to look."
        />
        <Tile
          label="Widest spread"
          value={`${spread[0]?.spreadPct ?? 0}%`}
          tone="neg"
          hint={spread[0]?.name}
          foot={spread[0] ? `${usdExact(spread[0].lowestCents)} to ${usdExact(spread[0].listCents)} across ${spread[0].accountCount} accounts` : undefined}
        />
        <Tile
          label="Sold to two accounts or fewer"
          value={num(narrow.length)}
          hint="range breadth problem, not a demand problem"
          foot="Each is a product most of the book has never been shown."
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <SectionHeader title="Revenue by category" sub="Across the whole book." />
          <CategoryBars data={totals.categories} />
        </section>
        <section className="card p-4">
          <SectionHeader title="Revenue by brand" sub="Which supplier relationships are actually carrying the business." />
          <ul className="flex flex-col gap-2.5">
            {Object.entries(brands).map(([b, v]) => (
              <li key={b}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px]">{b}</span>
                  <span className="tnum text-[12.5px] text-muted">
                    {usd(v)}<span className="text-faint"> · {pct((v / totalBrand) * 100)}</span>
                  </span>
                </div>
                <Bar pct={(v / Math.max(...Object.values(brands))) * 100} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-7">
        <SectionHeader
          title="Same part, different price"
          sub="How many distinct unit prices each SKU has been sold at, and how far apart the cheapest and dearest are. Tiering explains a two-price spread. It does not explain four."
          right={<Pill tone="warn">{spread.length} SKUs</Pill>}
        />
        <Table head={["Product", "Prices", "Lowest", "Highest", "Spread", "Accounts", "Revenue"]}>
          <Rows cap={6} label="products">
          {spread.slice(0, 12).map((s) => (
            <tr key={s.sku} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
              <Td align="left">
                <span className="font-medium">{s.name}</span>
                <div className="text-[11.5px] text-faint">{s.brand} · {s.category}</div>
              </Td>
              <Td>
                <span className={s.priceCount > 2 ? "text-neg font-medium" : "text-muted"}>{s.priceCount}</span>
              </Td>
              <Td muted>{usdExact(s.lowestCents)}</Td>
              <Td muted>{usdExact(s.listCents)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <span className={s.spreadPct >= 40 ? "text-neg font-medium" : "text-warn"}>{s.spreadPct}%</span>
                  <div className="w-10"><Bar pct={s.spreadPct} tone={s.spreadPct >= 40 ? "neg" : "warn"} /></div>
                </div>
              </Td>
              <Td muted>{s.accountCount}</Td>
              <Td><span className="font-medium">{usdCompact(s.revenueCents)}</span></Td>
            </tr>
          ))}
          </Rows>
        </Table>
        <p className="mt-2 max-w-[82ch] text-[12.5px] leading-[1.55] text-muted">
          The top row is the one to look at first. {spread[0]?.name} has been sold at{" "}
          {spread[0]?.priceCount} different prices to {spread[0]?.accountCount} accounts, a{" "}
          {spread[0]?.spreadPct}% spread. Some of that is contract tiering working as designed. The rest is the{" "}
          {usd(totals.leakageCents)} of leakage on the Performance page, and the two are the same fact seen from different ends.
        </p>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Selling well, but barely anywhere"
          sub="Strong revenue concentrated in very few accounts. In B2B this is almost never a demand ceiling — it is a range-breadth problem, and it is the cheapest growth available."
        />
        <Table head={["Product", "Accounts", "Units", "Revenue", "Last sold"]}>
          <Rows cap={5} label="products">
          {narrow.slice(0, 10).map((s) => (
            <tr key={s.sku} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
              <Td align="left">
                <span className="font-medium">{s.name}</span>
                <div className="text-[11.5px] text-faint">{s.brand} · {s.category}</div>
              </Td>
              <Td>
                <Pill tone={s.accountCount === 1 ? "neg" : "warn"}>
                  {s.accountCount} of {snapshot.accounts.length}
                </Pill>
              </Td>
              <Td muted>{num(s.units)}</Td>
              <Td><span className="font-medium">{usdCompact(s.revenueCents)}</span></Td>
              <Td muted>{s.lastSold ? shortDate(s.lastSold) : "—"}</Td>
            </tr>
          ))}
          </Rows>
        </Table>
      </section>
    </Shell>
  );
}
