import { NextResponse } from "next/server";
import { isLive, liveStoppedOrders, liveOpenQuotes } from "@/lib/commerce";
import { liveSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------
   Refresh.

   Answers three different states honestly, because "refresh did
   nothing" with no explanation is worse than no button:

     live       credentials present -> re-read the hot slice now
     snapshot   no credentials -> say so, and say what it would take
     error      the read failed -> say which part, do not pretend

   The cold aggregates (leakage, price spread, cadence) are NOT
   recomputed here. They need the whole order book, and a person
   waiting on a button is the wrong place to do seven paginated
   calls. Those come from the scheduled job.
   ------------------------------------------------------------------ */

export async function POST() {
  const snap = liveSnapshot();

  if (!isLive()) {
    return NextResponse.json({
      status: "snapshot",
      dataAsOf: snap.dataAsOf,
      ageDays: snap.freshness.ageDays,
      message:
        "Running on the committed snapshot. To refresh from commercetools directly, add a " +
        "read-scoped API client (CTP_PROJECT_KEY, CTP_CLIENT_ID, CTP_CLIENT_SECRET) to this " +
        "deployment. No MCP involved — the app calls the HTTP API itself.",
      wouldRefresh: ["Stopped orders", "Open quote requests"],
      scheduledOnly: [
        "Contract leakage and price spread — need every line ever written",
        "Reorder cadence baselines — need full history per account",
        "Revenue by month — needs the whole book",
      ],
    });
  }

  try {
    const [orders, quotes] = await Promise.all([liveStoppedOrders(), liveOpenQuotes()]);
    return NextResponse.json({
      status: "live",
      refreshedAt: new Date().toISOString(),
      stoppedOrders: orders.total,
      openQuotes: quotes.total,
      message: `Read ${orders.total} stopped orders and ${quotes.total} open quote requests directly from commercetools.`,
      note: "Cold aggregates still come from the scheduled job; they need the full order book.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message: e instanceof Error ? e.message : "Refresh failed.",
        hint: "Check the API client's scopes and that CTP_API_URL matches the project's region.",
      },
      { status: 502 },
    );
  }
}

/** The button reads this on load so it can show freshness without a click. */
export async function GET() {
  const snap = liveSnapshot();
  return NextResponse.json({
    live: isLive(),
    dataAsOf: snap.dataAsOf,
    ageDays: snap.freshness.ageDays,
    label: snap.freshness.label,
  });
}
