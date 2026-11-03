import { NextRequest, NextResponse } from "next/server";
import { MUTATIONS, WRITE_ENABLED, Preview } from "@/lib/mutations";
import { record } from "@/lib/audit";

/* ------------------------------------------------------------------
   Execute an approved mutation.

   The gate order matters and is deliberate:

     1. Is this a mutation we recognise?   -> unknown ids are never run
     2. Did a guardrail block it?          -> blocked beats everything
     3. Is writing enabled at all?         -> default is NO
     4. Only then, send it.

   Step 3 means a demo cannot mutate a live project by accident. Writes
   require CT_WRITE_ENABLED=true AND credentials that are scoped to
   exactly the mutation being run — never an admin key.
   ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    mutationId: string;
    preview: Preview;
    scope: "keystone" | "customer";
    accountKey: string | null;
    operator?: string;
  };

  const def = MUTATIONS[body.mutationId];
  if (!def) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const blocked = body.preview.guardrails.find((g) => g.status === "blocked");
  if (blocked) {
    const r = record({
      operator: body.operator ?? "demo.operator@orium.com",
      scope: body.scope,
      accountKey: body.accountKey,
      mutationId: def.id,
      title: body.preview.title,
      executed: false,
      result: "blocked",
      message: blocked.detail,
      changes: body.preview.changes,
      apiCall: body.preview.apiCall,
      reversal: body.preview.reversal,
      impactCents: body.preview.impactCents ?? null,
    });
    return NextResponse.json({ record: r }, { status: 200 });
  }

  if (!WRITE_ENABLED) {
    const r = record({
      operator: body.operator ?? "demo.operator@orium.com",
      scope: body.scope,
      accountKey: body.accountKey,
      mutationId: def.id,
      title: body.preview.title,
      executed: false,
      result: "dry-run",
      message:
        "Approved and recorded. Nothing was sent to commercetools because writes are disabled " +
        "(CT_WRITE_ENABLED is not true). The payload above is exactly what would have been sent.",
      changes: body.preview.changes,
      apiCall: body.preview.apiCall,
      reversal: body.preview.reversal,
      impactCents: body.preview.impactCents ?? null,
    });
    return NextResponse.json({ record: r }, { status: 200 });
  }

  /* ----------------------------------------------------------------
     HARDENING: live execution goes here.

     const ct = ctClient({ scopes: def.requiredScopes });   // scoped, not admin
     const current = await ct.get(preview.apiCall.endpoint); // re-read for version
     const res = await ct.post(preview.apiCall.endpoint, {
       version: current.version,                             // never a stale version
       actions: preview.apiCall.body.actions,
     }, { headers: { "X-Idempotency-Key": idempotencyKey } });

     Three things that must be true here and are easy to get wrong:
       - re-read the version immediately before writing; the preview's
         version may be minutes old and commercetools will reject it
       - carry an idempotency key so a double-click cannot double-apply
       - on failure, record the failure. A silent catch is worse than
         the original problem.
     ---------------------------------------------------------------- */
  const r = record({
    operator: body.operator ?? "demo.operator@orium.com",
    scope: body.scope,
    accountKey: body.accountKey,
    mutationId: def.id,
    title: body.preview.title,
    executed: false,
    result: "failed",
    message:
      "Writes are enabled but no scoped commercetools client is configured in this build. " +
      "Wire ctClient() in src/app/api/actions/route.ts before turning this on.",
    changes: body.preview.changes,
    apiCall: body.preview.apiCall,
    reversal: body.preview.reversal,
    impactCents: body.preview.impactCents ?? null,
  });
  return NextResponse.json({ record: r }, { status: 200 });
}
