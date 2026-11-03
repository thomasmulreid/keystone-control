import { Rows } from "@/components/Rows";
import { notFound } from "next/navigation";
import { Shell, customerNav } from "@/components/Shell";
import { ACCOUNT_REQUESTS } from "@/functions";
import { Tile, SectionHeader, Pill, Table, Td, Empty } from "@/components/ui";
import {getAccount, liveSnapshot, accountKeys } from "@/lib/snapshot";
import { usd, usdCompact, num, days, shortDate } from "@/lib/format";

const STATE_TONE: Record<string, "pos" | "warn" | "neutral" | "neg"> = {
  Accepted: "pos",
  Submitted: "warn",
  Cancelled: "neutral",
  Rejected: "neg",
};

const STATE_MEANS: Record<string, string> = {
  Submitted: "With Keystone, waiting to be priced.",
  Accepted: "Priced and agreed — it can be turned into an order.",
  Cancelled: "Withdrawn. No longer live.",
  Rejected: "Keystone declined to quote this one.",
};

export const revalidate = 300;

export default async function Requests({ params }: { params: Promise<{ bu: string }> }) {
  const snapshot = liveSnapshot();
  const { bu } = await params;
  const a = getAccount(snapshot, bu);
  if (!a) notFound();

  const mine = snapshot.quotes.filter((q) => q.businessUnit === a.key);
  const open = mine.filter((q) => q.state === "Submitted");
  const accepted = mine.filter((q) => q.state === "Accepted");

  // How long Keystone actually takes, from this account's own history.
  const settled = mine.filter((q) => q.state !== "Submitted");

  return (
    <Shell
      scope="customer"
      accountKey={a.key}
      accountName={a.name}
      view="requests"
      nav={customerNav(a.key)}
      title="Requests"
      lede="Quotes you have asked Keystone for, what state each one is in, and how long they normally take. The point is not having to email anyone to find out."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Waiting on a price"
          value={num(open.length)}
          tone={open.length ? "warn" : "neutral"}
          hint={open.length ? `${usd(open.reduce((s, q) => s + q.totalCents, 0))} unpriced` : "nothing outstanding"}
          definition={snapshot.definitions.quoteAge}
        />
        <Tile
          label="Longest wait"
          value={open.length ? days(Math.max(...open.map((q) => q.ageDays))) : "—"}
          hint={open.length ? "since you submitted it" : "no open requests"}
          foot={open.length && Math.max(...open.map((q) => q.ageDays)) > 5 ? "Worth chasing your rep." : undefined}
        />
        <Tile label="Agreed this year" value={num(accepted.length)} tone="pos" hint={`${usd(accepted.reduce((s, q) => s + q.totalCents, 0))} quoted and agreed`} />
        <Tile label="Requests in total" value={num(mine.length)} hint={`${settled.length} settled, ${open.length} live`} />
      </div>

      <section className="mt-6">
        <SectionHeader
          title="Your requests"
          sub="Newest first. The state column is what Keystone has done with it, not what you asked for."
        />
        {mine.length ? (
          <Table head={["Submitted", "Requested by", "Lines", "Value", "Age", "State"]}>
            <Rows cap={ACCOUNT_REQUESTS.display.tableRows} label="requests">
            {mine.slice(0, 12).map((q) => (
              <tr key={q.id} className="border-b border-line last:border-0 hover:bg-sunk/60 transition-colors">
                <Td align="left">
                  <span className="font-medium">{shortDate(q.createdAt)}</span>
                  {q.comment && (
                    <div className="mt-0.5 max-w-[40ch] truncate text-[11.5px] text-faint" title={q.comment}>
                      “{q.comment}”
                    </div>
                  )}
                </Td>
                <Td align="left" muted><span className="text-[12px]">{q.customerEmail ?? "—"}</span></Td>
                <Td muted>{q.lineCount}</Td>
                <Td><span className="font-medium">{usdCompact(q.totalCents)}</span></Td>
                <Td>
                  <span className={q.state === "Submitted" && q.ageDays > 3 ? "text-warn font-medium" : "text-muted"}>
                    {q.ageDays}d
                  </span>
                </Td>
                <Td align="left">
                  <Pill tone={STATE_TONE[q.state] ?? "neutral"}>{q.state}</Pill>
                  <div className="mt-0.5 max-w-[34ch] text-[11.5px] leading-[1.4] text-faint">
                    {STATE_MEANS[q.state]}
                  </div>
                </Td>
              </tr>
            ))}
            </Rows>
          </Table>
        ) : (
          <Empty title="No quote requests yet">
            When an order goes above a buyer&rsquo;s spend limit it becomes a quote request automatically, and it
            will show up here with its age and who it is waiting on.
          </Empty>
        )}
      </section>

      {open.length > 0 && (
        <section className="mt-7 card p-4">
          <h2 className="text-[14px] font-semibold">What happens next</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {[
              ["You submitted it", `${shortDate(open[0].createdAt)} — ${open[0].lineCount} lines, ${usd(open[0].totalCents)}.`, true],
              ["Keystone accepts it for pricing", `This is the step it is waiting on now, ${days(open[0].ageDays)} in.`, false],
              ["A pricer puts rates against the lines", "You will see the state change here when they do.", false],
              ["You accept or ask for a renegotiation", "Accepting turns the quote into an order on your agreed terms.", false],
            ].map(([label, detail, done], i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                    done ? "bg-pos text-white" : i === 1 ? "bg-warn text-white" : "bg-sunk text-faint"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div>
                  <div className="text-[13px] font-medium">{label as string}</div>
                  <div className="text-[12.5px] leading-[1.5] text-muted">{detail as string}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-faint">
            On Keystone&rsquo;s side this same request sits at the top of their quote desk, with the same age
            against it. Neither side has to ask the other where it got to.
          </p>
        </section>
      )}
    </Shell>
  );
}

export function generateStaticParams() {
  return accountKeys().map((bu) => ({ bu }));
}
