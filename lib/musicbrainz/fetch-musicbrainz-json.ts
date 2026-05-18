const MUSICBRAINZ_USER_AGENT =
  "MuzicalUI/1.0 (https://github.com/f3rnox/muzical-ui)";

/**
 * GET a MusicBrainz JSON API URL.
 */
export async function fetchMusicBrainzJson<T>(
  url: URL,
  signal?: AbortSignal,
): Promise<T> {
  const urlString = url.toString();
  let response: Response;
  try {
    response = await fetch(urlString, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": MUSICBRAINZ_USER_AGENT,
      },
      signal,
    });
  } catch (error: unknown) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError")
    ) {
      throw error;
    }
    console.error("[MusicBrainz] request failed", { url: urlString, error });
    throw error;
  }

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    const message = `MusicBrainz request failed (${response.status})`;
    console.error("[MusicBrainz] request failed", {
      url: urlString,
      status: response.status,
      statusText: response.statusText,
      body: bodySnippet || undefined,
    });
    throw new Error(message);
  }

  return (await response.json()) as T;
}
