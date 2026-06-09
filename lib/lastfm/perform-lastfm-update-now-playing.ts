import { buildLastfmPostBody } from "@/lib/lastfm/sign-lastfm-request";
import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
import logLastfmRequestFailed from "@/lib/lastfm/log-lastfm-request-failed";
import readStoredLastfmApiKey from "@/lib/lastfm/read-stored-lastfm-api-key";
import readStoredLastfmSharedSecret from "@/lib/lastfm/read-stored-lastfm-shared-secret";
import readStoredLastfmSessionKey from "@/lib/lastfm/read-stored-lastfm-session-key";

export type NowPlayingParams = {
  artist: string;
  track: string;
  album?: string;
  durationSec?: number;
  /** Optional musicbrainz track id */
  mbid?: string;
};

export type NowPlayingResult = { ok: true } | { ok: false; message: string };

const ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

/**
 * Send "now playing" notification to Last.fm (track.updateNowPlaying).
 * Uses stored credentials. Silently no-ops if not fully configured or scrobbling disabled.
 */
export default async function performLastfmUpdateNowPlaying(
  params: NowPlayingParams,
): Promise<NowPlayingResult> {
  const apiKey = readStoredLastfmApiKey();
  const secret = readStoredLastfmSharedSecret();
  const sk = readStoredLastfmSessionKey();

  if (!apiKey || !secret || !sk) return { ok: false, message: "Last.fm not fully configured for scrobbling" };

  const artist = params.artist?.trim();
  const track = params.track?.trim();
  if (!artist || !track) return { ok: false, message: "artist and track required" };

  const postParams: Record<string, string | number | undefined> = {
    artist,
    track,
    sk,
  };
  if (params.album) postParams.album = params.album.trim();
  if (params.durationSec && Number.isFinite(params.durationSec) && params.durationSec > 0) {
    postParams.duration = Math.floor(params.durationSec);
  }
  if (params.mbid) postParams.mbid = params.mbid.trim();

  const body = buildLastfmPostBody("track.updateNowPlaying", postParams, apiKey, secret);
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
      logLastfmRequestFailed({ url, status: res.status, statusText: res.statusText, body: json, bodyText: text.slice(0, 300) });
      return { ok: false, message: lastfmErrorMessageFromBody(json) ?? "Now playing update failed" };
    }
    // Last.fm returns { "nowplaying": { "ignoredMessage": {...}, "track":..., ... } } on success.
    // We treat any 200 as success for nowplaying (even if ignored e.g. track too short).
    return { ok: true };
  } catch (error) {
    logLastfmRequestFailed({ url, error });
    return { ok: false, message: "Network error sending now playing" };
  }
}
