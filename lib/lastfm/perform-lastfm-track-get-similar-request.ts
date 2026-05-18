import type { LastfmSimilarTrack } from "@/types/lastfm-similar-track";
import isLastfmTrackNotFoundBody from "@/lib/lastfm/is-lastfm-track-not-found-body";
import lastfmErrorMessageFromBody from "@/lib/lastfm/lastfm-error-message-from-body";
import logLastfmRequestFailed from "@/lib/lastfm/log-lastfm-request-failed";
import parseLastfmTrackGetSimilarResponse from "@/lib/lastfm/parse-lastfm-track-get-similar-response";

const LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

export type PerformLastfmTrackGetSimilarRequestParams = {
  apiKey: string;
  artist?: string;
  track?: string;
  mbid?: string;
  limit: number;
};

export type PerformLastfmTrackGetSimilarRequestResult =
  | { ok: true; tracks: LastfmSimilarTrack[] }
  | { ok: false; notFound: boolean; message: string; body: unknown };

/**
 * Call Last.fm `track.getSimilar` once (mbid or artist + track).
 */
export default async function performLastfmTrackGetSimilarRequest(
  params: PerformLastfmTrackGetSimilarRequestParams,
): Promise<PerformLastfmTrackGetSimilarRequestResult> {
  const url = new URL(LASTFM_ENDPOINT);
  url.searchParams.set("method", "track.getSimilar");
  url.searchParams.set("api_key", params.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("autocorrect", "1");

  const mbid = params.mbid?.trim();
  const artist = params.artist?.trim() ?? "";
  const track = params.track?.trim() ?? "";

  if (mbid) {
    url.searchParams.set("mbid", mbid);
  } else if (artist && track) {
    url.searchParams.set("artist", artist);
    url.searchParams.set("track", track);
  } else {
    return {
      ok: false,
      notFound: false,
      message: "artist and track are required",
      body: {},
    };
  }

  let body: unknown = {};
  let bodyText = "";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Muzical/1.0 (https://github.com/f3rnox/muzical-ui)",
      },
      next: { revalidate: 0 },
    });
    bodyText = await response.text();
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = {};
    }

    if (!response.ok) {
      logLastfmRequestFailed({
        url,
        status: response.status,
        statusText: response.statusText,
        body,
        bodyText: bodyText.slice(0, 500) || undefined,
      });
      const notFound = isLastfmTrackNotFoundBody(body);
      return {
        ok: false,
        notFound,
        message: lastfmErrorMessageFromBody(body) ?? "Last.fm request failed",
        body,
      };
    }

    if (isLastfmTrackNotFoundBody(body)) {
      return {
        ok: false,
        notFound: true,
        message: lastfmErrorMessageFromBody(body) ?? "Track not found",
        body,
      };
    }

    const tracks = parseLastfmTrackGetSimilarResponse(body);
    return { ok: true, tracks };
  } catch (error: unknown) {
    logLastfmRequestFailed({ url, error });
    return {
      ok: false,
      notFound: false,
      message: "Last.fm request failed",
      body: {},
    };
  }
}
