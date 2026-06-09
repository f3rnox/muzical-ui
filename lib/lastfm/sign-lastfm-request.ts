import md5 from "@/lib/lastfm/md5";

export type LastfmSignedParams = Record<string, string | number | undefined>;

const LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

/**
 * Build a signed Last.fm API call URL (for GET) or body params (for POST).
 * Adds api_sig and format=json. Excludes undefined values.
 * apiSecret is NOT included in the final params (only used for sig).
 */
export function buildLastfmSignedParams(
  params: LastfmSignedParams,
  apiKey: string,
  apiSecret: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  out.api_key = apiKey;
  if (!out.format) out.format = "json";

  // Sort keys, concatenate key+value (no separators), append secret, md5
  const keys = Object.keys(out).sort();
  let sigBase = "";
  for (const k of keys) {
    sigBase += k + out[k];
  }
  sigBase += apiSecret;
  out.api_sig = md5(sigBase);
  return out;
}

/**
 * Build a GET URL for a signed Last.fm method (useful for auth.getToken etc).
 */
export function buildLastfmGetUrl(
  method: string,
  params: LastfmSignedParams,
  apiKey: string,
  apiSecret: string,
): URL {
  const signed = buildLastfmSignedParams({ method, ...params }, apiKey, apiSecret);
  const url = new URL(LASTFM_ENDPOINT);
  for (const [k, v] of Object.entries(signed)) {
    url.searchParams.set(k, v);
  }
  return url;
}

/**
 * Build FormData or URLSearchParams payload for POST signed calls (track.scrobble etc).
 */
export function buildLastfmPostBody(
  method: string,
  params: LastfmSignedParams,
  apiKey: string,
  apiSecret: string,
): URLSearchParams {
  const signed = buildLastfmSignedParams({ method, ...params }, apiKey, apiSecret);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(signed)) {
    body.set(k, v);
  }
  return body;
}
