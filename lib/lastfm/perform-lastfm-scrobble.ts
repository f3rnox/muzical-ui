import { buildLastfmPostBody } from "@/lib/lastfm/sign-lastfm-request";
import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
import logLastfmRequestFailed from "@/lib/lastfm/log-lastfm-request-failed";
import readStoredLastfmApiKey from "@/lib/lastfm/read-stored-lastfm-api-key";
import readStoredLastfmSharedSecret from "@/lib/lastfm/read-stored-lastfm-shared-secret";
import readStoredLastfmSessionKey from "@/lib/lastfm/read-stored-lastfm-session-key";

export type ScrobbleParams = {
  artist: string;
  track: string;
  /** UNIX timestamp (seconds) when the track started playing */
  timestamp: number;
  album?: string;
  durationSec?: number;
  mbid?: string;
};

export type ScrobbleResult = { ok: true } | { ok: false; message: string; ignored?: boolean };

const ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

/**
 * Submit a scrobble (track.scrobble). 
 * Credentials read from storage. No-op if incomplete config.
 */
export default async function performLastfmScrobble(
  params: ScrobbleParams,
): Promise<ScrobbleResult> {
  const apiKey = readStoredLastfmApiKey();
  const secret = readStoredLastfmSharedSecret();
  const sk = readStoredLastfmSessionKey();

  if (!apiKey || !secret || !sk) return { ok: false, message: "Last.fm not fully configured for scrobbling" };

  const artist = params.artist?.trim();
  const track = params.track?.trim();
  const ts = Math.floor(params.timestamp);
  if (!artist || !track || !Number.isFinite(ts) || ts <= 0) {
    return { ok: false, message: "artist, track and valid timestamp required" };
  }

  // Use array form [0] even for single scrobble (more robust)
  const postParams: Record<string, string | number | undefined> = {
    "artist[0]": artist,
    "track[0]": track,
    "timestamp[0]": ts,
    sk,
  };
  if (params.album) postParams["album[0]"] = params.album.trim();
  if (params.durationSec && Number.isFinite(params.durationSec) && params.durationSec > 0) {
    postParams["duration[0]"] = Math.floor(params.durationSec);
  }
  if (params.mbid) postParams["mbid[0]"] = params.mbid.trim();

  const body = buildLastfmPostBody("track.scrobble", postParams, apiKey, secret);
  const url = new URL(ENDPOINT);

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
    let json: unknown = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    if (!res.ok) {
      logLastfmRequestFailed({ url, status: res.status, statusText: res.statusText, body: json, bodyText: text.slice(0, 400) });
      return { ok: false, message: lastfmErrorMessageFromBody(json) ?? "Scrobble failed" };
    }

    // Response shape: { scrobbles: { scrobble: { ignoredMessage: { code: "0" or other, ... } } } }
    const scrobbles = (json as { scrobbles?: { scrobble?: { ignoredMessage?: { code?: string | number } } } })?.scrobbles;
    const ignoredCode = scrobbles?.scrobble?.ignoredMessage?.code;
    const ignored = ignoredCode != null && String(ignoredCode) !== "0";
    if (ignored) {
      return { ok: true, ignored: true };
    }
    return { ok: true };
  } catch (error) {
    logLastfmRequestFailed({ url, error });
    return { ok: false, message: "Network error submitting scrobble" };
  }
}
