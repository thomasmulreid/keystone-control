/* ==================================================================
   THE LIVE COMMERCE CLIENT

   This is the seam that turns the panel from a snapshot into a live
   dashboard. Nothing here needs MCP: MCP is how an agent reaches the
   data in a conversation, and it is session- and OAuth-oriented. An
   app refreshing itself at 3am wants the ordinary HTTP API with its
   own client credentials.

   Two tiers, because the panel does not have one freshness
   requirement:

     HOT   exceptions, quotes, approvals — about 7% of the order book,
           a filtered query, cheap enough to read per request.

     COLD  price model, contract leakage, cadence baselines, monthly
           revenue — these need EVERY line ever written, because
           "the lowest price this account has ever paid" cannot be
           computed from a page of results. Recomputed on a schedule.

   Reading the whole book per page view would be ~7 paginated calls
   and tens of megabytes for figures that barely move. That is the
   only reason this is not simply live everywhere.
   ================================================================== */

export interface CommerceCredentials {
  projectKey: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiUrl: string;
}

/**
 * Credentials come from the environment, never from the browser and
 * never from an MCP session. Absent is a normal state, not an error:
 * the panel runs happily on its committed snapshot.
 */
export function credentials(): CommerceCredentials | null {
  const projectKey = process.env.CTP_PROJECT_KEY;
  const clientId = process.env.CTP_CLIENT_ID;
  const clientSecret = process.env.CTP_CLIENT_SECRET;
  if (!projectKey || !clientId || !clientSecret) return null;
  return {
    projectKey,
    clientId,
    clientSecret,
    authUrl: process.env.CTP_AUTH_URL ?? "https://auth.us-central1.gcp.commercetools.com",
    apiUrl: process.env.CTP_API_URL ?? "https://api.us-central1.gcp.commercetools.com",
  };
}

export function isLive(): boolean {
  return credentials() !== null;
}

/** OAuth client-credentials grant. Cached for the life of the instance. */
let tokenCache: { token: string; expires: number } | null = null;

export async function accessToken(): Promise<string> {
  const c = credentials();
  if (!c) throw new Error("No commerce credentials configured.");
  if (tokenCache && Date.now() < tokenCache.expires - 30_000) return tokenCache.token;

  const res = await fetch(`${c.authUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=view_orders:${c.projectKey} view_business_units:${c.projectKey} view_quotes:${c.projectKey} view_products:${c.projectKey}`,
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** One page of a resource. The caller paginates; nothing here hides cost. */
export async function query<T>(
  resource: string,
  params: Record<string, string | number> = {},
): Promise<{ results: T[]; total: number }> {
  const c = credentials();
  if (!c) throw new Error("No commerce credentials configured.");
  const token = await accessToken();
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${c.apiUrl}/${c.projectKey}/${resource}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    // The hot path is allowed to be a little stale; this is the knob.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`${resource} failed: ${res.status}`);
  const json = (await res.json()) as { results: T[]; total: number };
  return { results: json.results ?? [], total: json.total ?? 0 };
}

/**
 * HOT PATH — the slice worth reading live.
 *
 * Orders that have stopped: not Complete, not Cancelled. About 7% of
 * the book, so this is one small query rather than seven large ones.
 */
export async function liveStoppedOrders() {
  return query<Record<string, unknown>>("orders", {
    where: 'orderState != "Complete" and orderState != "Cancelled"',
    limit: 500,
    sort: "createdAt desc",
  });
}

export async function liveOpenQuotes() {
  return query<Record<string, unknown>>("quote-requests", {
    where: 'quoteRequestState = "Submitted"',
    limit: 100,
    sort: "createdAt desc",
  });
}
