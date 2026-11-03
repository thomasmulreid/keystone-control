import Link from "next/link";
import { ReactNode } from "react";
import { liveSnapshot } from "@/lib/snapshot";
import { keystoneQueue, customerQueue } from "@/lib/queue";
import { usd, usdCompact, num } from "@/lib/format";

export const revalidate = 300;

/* ==================================================================
   The elevator pitch.

   Audience: the stakeholder about to be shown the demo. The subject is
   not the control panel — it is what made the control panel possible.
   The panel is the evidence, not the argument.

   Every figure is computed from the same snapshot the panels run on,
   because a page claiming AI can read your business should not be
   hand-typed.
   ================================================================== */

export default function Landing() {
  const s = liveSnapshot();
  const t = s.totals;
  const companyA = s.accounts.find((a) => a.key === "company-a");
  const all = [...keystoneQueue(s), ...(companyA ? customerQueue(companyA, s) : [])];

  const canAct = all.filter((i) => i.run).length;
  const routed = all.filter((i) => i.route).length;
  const judged = all.filter((i) => i.open && !i.run && !i.route).length;
  const leak = s.accounts
    .filter((a) => a.leakageCents > 0)
    .sort((a, b) => b.leakageCents - a.leakageCents)[0];

  return (
    <div data-scope="keystone" className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-5 py-3 sm:px-7">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[11px] font-bold text-accent-contrast"
          >
            K
          </span>
          <span className="text-[13.5px] font-semibold tracking-[-0.01em]">Keystone Control</span>
          <Link
            href="/keystone/performance"
            className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-muted transition hover:border-line-strong hover:text-ink"
          >
            Open the demo →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-5 sm:px-7">
        {/* ------------------------- hero ------------------------- */}
        <section className="py-16 sm:py-24">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">
            Orium · agentic commerce
          </p>
          <h1 className="max-w-[17ch] text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
            The people who understand the business can now build the tools for it.
          </h1>
          <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.6] text-muted">
            Behind this link is a working control panel over a live commercetools B2B business. It reads
            real orders, finds real money, and can make a defined set of real changes. No engineer wrote
            any of it.
          </p>

          <dl className="mt-12 grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-4">
            {[
              ["0", "engineers involved"],
              [usdCompact(t.revenueCents), "of live order data"],
              [String(t.activeAccounts), "trading accounts"],
              [String(canAct), "actions it may take"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="tnum text-[28px] font-semibold tracking-[-0.02em]">{v}</dt>
                <dd className="mt-0.5 text-[12.5px] leading-snug text-muted">{k}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------------- what changed ---------------------- */}
        <Section
          kicker="What changed"
          title="MCP lets the AI reach the actual systems"
          lede="Not a chatbot bolted onto a dashboard. A direct, permissioned connection to commercetools — so the AI can read the order book, work out what it means, build the screen that shows it, and send a change back."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              [
                "Before",
                "A commercial lead describes a view they need. It joins a backlog. Months later it arrives, slightly wrong, and the question has moved on.",
              ],
              [
                "Now",
                "They describe it in conversation. The AI queries the project, works out the metrics, builds it and deploys. Same afternoon.",
              ],
              [
                "What that means",
                "The constraint stops being engineering capacity and becomes knowing what to ask for — which is the thing commercial teams already have.",
              ],
            ].map(([k, v]) => (
              <div key={k} className="card p-5">
                <h3 className="text-[13px] font-semibold">{k}</h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-muted">{v}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------------- what you'll see ---------------------- */}
        <Section
          kicker="What you're about to see"
          title="One business, read from both sides"
          lede="Keystone sells industrial supply to trade accounts on negotiated rates. Its own team gets a panel across every account, split by who opens it. Each customer gets a panel over their own."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Door
              scope="keystone"
              eyebrow="Keystone's team"
              title="Run the business"
              body="A clean view for the CEO. A working desk for operations. Different density for different jobs."
              href="/keystone/performance"
              cta="Open Keystone's panel"
            />
            <Door
              scope="customer"
              eyebrow="One customer, signed in"
              title="Run your side of it"
              body="What you spent, what your rates were worth, who can spend what, and which orders have stopped."
              href="/customer/company-a/spend"
              cta="Open Company A's panel"
            />
          </div>

          <div className="card mt-3 p-5">
            <p className="text-[13.5px] leading-[1.6]">
              <strong className="font-semibold">
                It found {usd(leak?.leakageCents ?? 0)} that shouldn&rsquo;t have been charged
              </strong>{" "}
              — {leak?.leakageLines.length} lines where {leak?.name} paid more than the rate it had already
              been given for the same product. Keystone sees a pricing error. The customer sees a credit to
              ask for. Nobody had to go looking.
            </p>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-muted">
              It also found {usd(t.exceptionValueCents)} of revenue sitting still across{" "}
              {num(t.exceptionCount)} orders — already sold, going nowhere.
            </p>
          </div>
        </Section>

        {/* ---------------------- autonomy ---------------------- */}
        <Section
          kicker="The part that matters"
          title="It knows what it isn't allowed to touch"
          lede="Everything it surfaces resolves to one of three things. That distinction is the difference between a tool you can hand to a new starter and one you can't."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Tier
              tone="pos"
              level="Act"
              count={canAct}
              rule="It can make the change — once a person has seen the exact payload and approved it."
              detail="Release a held order, change a spend limit, accept a quote for pricing. Two steps, never one. Scoped credentials, audit trail, named undo."
            />
            <Tier
              tone="info"
              level="Hand over"
              count={routed}
              rule="It refuses, says why, and passes it to whoever owns it."
              detail="Most stopped revenue is unsettled payment. Marking an order paid when the money hasn't arrived hides a real debt behind a green tick. That goes to AR, not to an agent."
            />
            <Tier
              tone="neutral"
              level="Leave to a person"
              count={judged}
              rule="It supplies the evidence and gets out of the way."
              detail="Is this churn or a broken data feed? Credit the customer or fix the price list? Judgement calls, presented as judgement calls."
            />
          </div>
          <p className="mt-4 max-w-[78ch] text-[13px] leading-relaxed text-muted">
            Writes are switched off in this build — approving records the decision and the exact payload
            without sending it. That is also the posture we&rsquo;d recommend starting from in production:
            earn the autonomy one action at a time.
          </p>
        </Section>

        {/* ---------------------- cta ---------------------- */}
        <section className="border-t border-line py-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Have a look</h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-muted">
            Start with the CEO view, then switch scope in the header and read the same business from a
            customer&rsquo;s side.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/keystone/performance"
              className="rounded-lg bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-contrast transition hover:brightness-110"
            >
              Open the demo
            </Link>
            <Link
              href="/customer/company-a/governance"
              className="rounded-lg border border-line-strong px-5 py-2.5 text-[13.5px] font-medium transition hover:border-ink"
            >
              See what a customer sees
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1000px] px-5 py-7 sm:px-7">
          <p className="max-w-[88ch] text-[11.5px] leading-relaxed text-faint">
            Live data from the {s.project} commercetools project — {num(t.orderCount)} orders across{" "}
            {t.activeAccounts} accounts, trading dates {s.window.from} to {s.window.to}. Every figure here is
            computed from it; none is written by hand. Thresholds in the demo are placeholders, not Keystone
            policy, and Merchant Center stays the system of record for catalogue and pricing.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ pieces ------------------------------ */

function Section({
  kicker, title, lede, children,
}: { kicker: string; title: string; lede: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-14">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">{kicker}</p>
      <h2 className="max-w-[24ch] text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[30px]">
        {title}
      </h2>
      <p className="mb-8 mt-3 max-w-[70ch] text-[14.5px] leading-[1.6] text-muted">{lede}</p>
      {children}
    </section>
  );
}

function Door({
  scope, eyebrow, title, body, href, cta,
}: {
  scope: "keystone" | "customer";
  eyebrow: string; title: string; body: string; href: string; cta: string;
}) {
  return (
    <div data-scope={scope} className="card flex flex-col p-5">
      <span className="mb-2 inline-flex w-fit rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
        {eyebrow}
      </span>
      <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mb-4 mt-1.5 text-[13px] leading-[1.55] text-muted">{body}</p>
      <Link
        href={href}
        className="mt-auto inline-flex w-fit rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent transition hover:brightness-95"
      >
        {cta} →
      </Link>
    </div>
  );
}

function Tier({
  tone, level, count, rule, detail,
}: {
  tone: "pos" | "info" | "neutral";
  level: string; count: number; rule: string; detail: string;
}) {
  const dot = { pos: "bg-pos", info: "bg-info", neutral: "bg-line-strong" }[tone];
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{level}</h3>
        <span className="tnum ml-auto text-[12px] text-faint">{count} now</span>
      </div>
      <p className="mt-3 text-[13px] font-medium leading-[1.5]">{rule}</p>
      <p className="mt-2 text-[12.5px] leading-[1.55] text-muted">{detail}</p>
    </div>
  );
}
