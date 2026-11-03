import { Preview } from "./mutations";

/* ------------------------------------------------------------------
   Audit trail.

   PROTOTYPE SEAM: in-memory, so it resets on a cold start. That is fine
   for a demo and wrong for production. In hardening this becomes an
   append-only table (or a commercetools custom object) with the
   operator's real identity from SSO. The shape below is already the
   shape you want to persist, so only the storage changes.

   Non-negotiable in both: every run records what was sent, what the
   value was before, and how to put it back.
   ------------------------------------------------------------------ */

export interface AuditRecord {
  id: string;
  at: string;
  operator: string;
  scope: "keystone" | "customer";
  accountKey: string | null;
  mutationId: string;
  title: string;
  /** false when CT_WRITE_ENABLED is not set: previewed and approved, not sent. */
  executed: boolean;
  result: "dry-run" | "applied" | "failed" | "blocked";
  message: string;
  changes: { field: string; before: string; after: string }[];
  apiCall: Preview["apiCall"];
  reversal: string;
  impactCents: number | null;
}

const trail: AuditRecord[] = [];

export function record(r: Omit<AuditRecord, "id" | "at">): AuditRecord {
  const full: AuditRecord = {
    ...r,
    id: `act_${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
  };
  trail.unshift(full);
  return full;
}

export function history(): AuditRecord[] {
  return trail;
}
