import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
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

export type ScrobbleResult =
  | { ok: true; ignored?: boolean }
  | { ok: false; message: string; ignored?: boolean };

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
  const callParams: Record<string, string | number | undefined> = {
    "artist[0]": artist,
    "track[0]": track,
    "timestamp[0]": ts,
    sk,
  };
  if (params.album) callParams["album[0]"] = params.album.trim();
  if (params.durationSec && Number.isFinite(params.durationSec) && params.durationSec > 0) {
    callParams["duration[0]"] = Math.floor(params.durationSec);
  }
  if (params.mbid) callParams["mbid[0]"] = params.mbid.trim();

  try {
    const res = await fetch("/api/lastfm/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "track.scrobble",
        params: callParams,
        apiKey,
        apiSecret: secret,
      }),
    });
    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, message: lastfmErrorMessageFromBody(json) ?? json?.error ?? "Scrobble failed" };
    }

    const scrobbles = json?.scrobbles;
    const ignoredCode = scrobbles?.scrobble?.ignoredMessage?.code;
    const ignored = ignoredCode != null && String(ignoredCode) !== "0";
    return { ok: true, ignored };
  } catch (error) {
    return { ok: false, message: "Network error submitting scrobble" };
  }
}
