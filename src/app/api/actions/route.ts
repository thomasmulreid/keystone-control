import { NextRequest, NextResponse } from "next/server";
import { MUTATIONS, Preview } from "@/lib/mutations";
import { governanceMode, writesEnabled } from "@/lib/governance";
import { record } from "@/lib/audit";

/* ------------------------------------------------------------------
   Execute an approved mutation.

   The gate order matters and is deliberate:

     1. Is the deployment even allowed to act?  -> observe mode refuses
     2. Is this a mutation we recognise?        -> unknown ids never run
     3. Did a guardrail block it?               -> blocked beats everything
     4. Is writing enabled?                     -> only in act mode
     5. Only then, send it.

   GOVERNANCE_MODE is the single switch: observe | propose | act. It
   defaults to propose, so a missing or misspelt value can never be the
   reason something wrote to a production project. Writes also require
   credentials scoped to exactly the mutation being run.
   ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    mutationId: string;
    preview: Preview;
    scope: "keystone" | "customer";
    accountKey: string | null;
    operator?: string;
  };

  // Gate 1: a read-only deployment refuses at the door. The UI hides the
  // controls too, but the server must never rely on the UI for this.
  if (governanceMode() === "observe") {
    return NextResponse.json(
      { error: "This deployment is in observe mode. No actions can be taken." },
      { status: 403 },
    );
  }

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

  if (!writesEnabled()) {
    const r = record({
      operator: body.operator ?? "demo.operator@orium.com",
      scope: body.scope,
      accountKey: body.accountKey,
      mutationId: def.id,
      title: body.preview.title,
      executed: false,
      result: "dry-run",
      message:
        "Approved and recorded. Nothing was sent because this deployment is in propose mode. " +
        "The payload above is exactly what would have been sent in act mode.",
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
