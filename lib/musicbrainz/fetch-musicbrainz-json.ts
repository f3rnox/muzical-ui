const MUSICBRAINZ_USER_AGENT =
  "MuzicalUI/1.0 (https://github.com/f3rnox/muzical-ui)";

/**
 * GET a MusicBrainz JSON API URL.
 */
export async function fetchMusicBrainzJson<T>(
  url: URL,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": MUSICBRAINZ_USER_AGENT,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
