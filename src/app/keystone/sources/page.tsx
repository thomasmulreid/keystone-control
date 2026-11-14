import { Shell, KEYSTONE_NAV } from "@/components/Shell";
import { Tile, SectionHeader, Pill, Table, Td } from "@/components/ui";
import { SOURCES, unknownSourceIds } from "@/sources";
import { FUNCTIONS } from "@/functions";
import { num } from "@/lib/format";

export const revalidate = 300;

const TONE = {
  connected: "pos",
  available: "info",
  "not-connected": "warn",
  unimplemented: "neutral",
} as const;

const STATUS_LABEL = {
  connected: "connected",
  available: "MCP live, not ingested",
  "not-connected": "no data",
  unimplemented: "not built",
} as const;

export default function Sources() {
  const connected = SOURCES.filter((s) => s.status === "connected");
  const unknown = unknownSourceIds();

  return (
    <Shell
      scope="keystone"
      view="sources"
      nav={KEYSTONE_NAV}
      title="Sources"
      lede="Which systems this panel is reading, and which it is only declaring. Everything below is derived — a source counts as connected when the data is actually present, so this page cannot claim a connection that is not there."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label="Connected"
          value={num(connected.length)}
          tone="pos"
          hint={`of ${SOURCES.length} known sources`}
        />
        <Tile
          label="Reachable, not ingested"
          value={num(SOURCES.filter((s) => s.status === "available").length)}
          tone="neutral"
          hint="MCP is live — a day of work each, not a question of whether it can"
        />
        <Tile
          label="Unknown ids"
          value={num(unknown.length)}
          tone={unknown.length ? "neg" : "neutral"}
          hint={unknown.length ? unknown.join(", ") : "every declared id resolves"}
        />
      </div>

      <section className="mt-6">
        <SectionHeader
          title="Systems"
          sub="A function declares what it needs by id. Adding a system to the stack is an entry here plus a line in a function definition."
        />
        <Table head={["Source", "System", "MCP", "Used by", "Status"]}>
          {SOURCES.map((s) => {
            const users = FUNCTIONS.filter((f) => f.reads.includes(s.id));
            return (
              <tr key={s.id} className="border-b border-line last:border-0">
                <Td align="left">
                  <span className="font-medium">{s.label}</span>
                  <div className="font-mono text-[11px] text-faint">{s.id}</div>
                  <div className="mt-0.5 max-w-[52ch] text-[12px] leading-[1.45] text-muted">
                    {s.status === "connected" ? s.provides : s.whenMissing}
                  </div>
                </Td>
                <Td align="left" muted>{s.system}</Td>
                <Td align="left" muted>
                  {s.mcp ? <span className="font-mono text-[11.5px]">{s.mcp}</span> : "—"}
                </Td>
                <Td align="left" muted>
                  <span className="text-[12px]">{users.map((u) => u.role).join(", ") || "—"}</span>
                </Td>
                <Td><Pill tone={TONE[s.status]}>{STATUS_LABEL[s.status]}</Pill></Td>
              </tr>
            );
          })}
        </Table>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="What each function is waiting on"
          sub="Declared sources that are not yet available. These are the gaps a customer would close by pointing another MCP at this panel."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {FUNCTIONS.filter((f) => f.scope === "merchant").map((f) => {
            const missing = f.reads
              .map((id) => SOURCES.find((s) => s.id === id))
              .filter((s) => s && s.status !== "connected");
            return (
              <div key={f.id} className="card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13.5px] font-semibold">{f.label}</h3>
                  <span className="text-[11.5px] text-faint">{f.role}</span>
                </div>
                {missing.length === 0 ? (
                  <p className="mt-1.5 text-[12.5px] text-pos">
                    Everything this view needs is connected.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {missing.map((s) => (
                      <li key={s!.id} className="text-[12.5px] leading-[1.5]">
                        <span className="font-medium">{s!.label}</span>
                        <span className="text-faint"> · {s!.mcp ?? "no MCP"}</span>
                        <div className="text-muted">{s!.whenMissing}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}
