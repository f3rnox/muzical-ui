import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
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

/**
 * Send "now playing" notification to Last.fm (track.updateNowPlaying).
 * The actual signed request is performed via our server proxy (guarantees valid signature).
 */
export default async function performLastfmUpdateNowPlaying(
  params: NowPlayingParams,
): Promise<NowPlayingResult> {
  const apiKey = readStoredLastfmApiKey();
  const secret = readStoredLastfmSharedSecret();
  const sk = readStoredLastfmSessionKey();

  if (!apiKey || !secret || !sk) return { ok: false, message: "Last.fm not fully configured (missing api key, shared secret or session key)" };

  const artist = params.artist?.trim();
  const track = params.track?.trim();
  if (!artist || !track) return { ok: false, message: "artist and track required" };

  const callParams: Record<string, string | number | undefined> = {
    artist,
    track,
    sk,
  };
  if (params.album) callParams.album = params.album.trim();
  if (params.durationSec && Number.isFinite(params.durationSec) && params.durationSec > 0) {
    callParams.duration = Math.floor(params.durationSec);
  }
  if (params.mbid) callParams.mbid = params.mbid.trim();

  try {
    const res = await fetch("/api/lastfm/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "track.updateNowPlaying",
        params: callParams,
        apiKey,
        apiSecret: secret,
      }),
    });
    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log("[Last.fm] updateNowPlaying failed:", json?.error || json);
      return { ok: false, message: lastfmErrorMessageFromBody(json) ?? json?.error ?? "Now playing update failed" };
    }
    console.log("[Last.fm] updateNowPlaying sent successfully for", artist, "-", track);
    return { ok: true };
  } catch (error) {
    console.log("[Last.fm] updateNowPlaying network error:", error);
    return { ok: false, message: "Network error sending now playing" };
  }
}
