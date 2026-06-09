import { buildLastfmGetUrl, buildLastfmPostBody } from "@/lib/lastfm/sign-lastfm-request";
import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
import logLastfmRequestFailed from "@/lib/lastfm/log-lastfm-request-failed";

const LASTFM_AUTH_URL = "https://www.last.fm/api/auth/";

export type LastfmTokenResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export type LastfmSessionResult =
  | { ok: true; sessionKey: string; username: string }
  | { ok: false; message: string };

/**
 * Step 1 of desktop auth: obtain a request token (requires api key + secret to sign).
 */
export async function getLastfmAuthToken(
  apiKey: string,
  apiSecret: string,
): Promise<LastfmTokenResult> {
  if (!apiKey || !apiSecret) {
    return { ok: false, message: "Last.fm API key and shared secret are required" };
  }
  const url = buildLastfmGetUrl("auth.getToken", {}, apiKey, apiSecret);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Muzical/1.0 (https://github.com/f3rnox/muzical-ui)" },
    });
    const text = await res.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {}
    if (!res.ok) {
      logLastfmRequestFailed({ url, status: res.status, statusText: res.statusText, body, bodyText: text.slice(0, 500) });
      return { ok: false, message: lastfmErrorMessageFromBody(body) ?? "Failed to get auth token" };
    }
    const token = (body as { token?: string })?.token?.trim();
    if (!token) {
      return { ok: false, message: lastfmErrorMessageFromBody(body) ?? "No token in response" };
    }
    return { ok: true, token };
  } catch (error) {
    logLastfmRequestFailed({ url, error });
    return { ok: false, message: "Network error obtaining Last.fm token" };
  }
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
 */
export async function getLastfmSession(
  apiKey: string,
  apiSecret: string,
  token: string,
): Promise<LastfmSessionResult> {
  if (!apiKey || !apiSecret || !token) {
    return { ok: false, message: "API key, secret and token required" };
  }
  const body = buildLastfmPostBody("auth.getSession", { token }, apiKey, apiSecret);

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  try {
    const res = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "User-Agent": "Muzical/1.0 (https://github.com/f3rnox/muzical-ui)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const text = await res.text();
    let bodyJson: unknown = {};
    try {
      bodyJson = text ? JSON.parse(text) : {};
    } catch {}

    if (!res.ok) {
      logLastfmRequestFailed({
        url,
        status: res.status,
        statusText: res.statusText,
        body: bodyJson,
        bodyText: text.slice(0, 500),
      });
      return { ok: false, message: lastfmErrorMessageFromBody(bodyJson) ?? "Failed to get session" };
    }

    const session = (bodyJson as { session?: { key?: string; name?: string } })?.session;
    const sk = session?.key?.trim();
    const name = session?.name?.trim();
    if (!sk || !name) {
      return { ok: false, message: lastfmErrorMessageFromBody(bodyJson) ?? "Invalid session response" };
    }
    return { ok: true, sessionKey: sk, username: name };
  } catch (error) {
    logLastfmRequestFailed({ url, error });
    return { ok: false, message: "Network error completing Last.fm authorization" };
  }
}
