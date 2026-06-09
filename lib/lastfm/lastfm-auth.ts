import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";

const LASTFM_AUTH_URL = "https://www.last.fm/api/auth/";

export type LastfmTokenResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export type LastfmSessionResult =
  | { ok: true; sessionKey: string; username: string }
  | { ok: false; message: string };

async function callSignedProxy(
  method: string,
  params: Record<string, string | number | undefined>,
  apiKey: string,
  apiSecret: string,
): Promise<{ ok: boolean; body: unknown; status?: number }> {
  try {
    const res = await fetch("/api/lastfm/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params, apiKey, apiSecret }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, body: json, status: res.status };
  } catch (e) {
    return { ok: false, body: { error: "proxy network error" } };
  }
}

/**
 * Step 1 of desktop auth: obtain a request token (requires api key + secret to sign).
 * Signature is computed on the server to guarantee correctness.
 */
export async function getLastfmAuthToken(
  apiKey: string,
  apiSecret: string,
): Promise<LastfmTokenResult> {
  if (!apiKey || !apiSecret) {
    return { ok: false, message: "Last.fm API key and shared secret are required" };
  }

  const { ok, body } = await callSignedProxy("auth.getToken", {}, apiKey, apiSecret);

  if (!ok) {
    const message = lastfmErrorMessageFromBody(body) ?? (body as any)?.error ?? "Failed to get auth token";
    return { ok: false, message };
  }

  const token = (body as { token?: string })?.token?.trim();
  if (!token) {
    return { ok: false, message: lastfmErrorMessageFromBody(body) ?? "No token in response" };
  }
  return { ok: true, token };
}

/**
 * Build the URL the user must visit to authorize the token.
 */
export function buildLastfmAuthUrl(apiKey: string, token: string): string {
  const u = new URL(LASTFM_AUTH_URL);
  u.searchParams.set("api_key", apiKey);
  u.searchParams.set("token", token);
  return u.toString();
}

/**
 * Step 2 (after user authorizes): exchange token for a session key.
 * Signature computed server-side via proxy.
 */
export async function getLastfmSession(
  apiKey: string,
  apiSecret: string,
  token: string,
): Promise<LastfmSessionResult> {
  if (!apiKey || !apiSecret || !token) {
    return { ok: false, message: "API key, secret and token required" };
  }

  const { ok, body } = await callSignedProxy("auth.getSession", { token }, apiKey, apiSecret);

  if (!ok) {
    const message = lastfmErrorMessageFromBody(body) ?? (body as any)?.error ?? "Failed to get session";
    return { ok: false, message };
  }

  const session = (body as { session?: { key?: string; name?: string } })?.session;
  const sk = session?.key?.trim();
  const name = session?.name?.trim();
  if (!sk || !name) {
    return { ok: false, message: lastfmErrorMessageFromBody(body) ?? "Invalid session response" };
  }
  return { ok: true, sessionKey: sk, username: name };
}
