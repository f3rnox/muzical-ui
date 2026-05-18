export type LogLastfmRequestFailedParams = {
  url: URL;
  status?: number;
  statusText?: string;
  body?: unknown;
  bodyText?: string;
  error?: unknown;
};

/**
 * Log a failed Last.fm API request (api_key redacted from the URL).
 */
export default function logLastfmRequestFailed(
  params: LogLastfmRequestFailedParams,
): void {
  const logUrl = new URL(params.url);
  logUrl.searchParams.delete("api_key");

  console.error("[Last.fm] request failed", {
    method: logUrl.searchParams.get("method") ?? undefined,
    artist: logUrl.searchParams.get("artist") ?? undefined,
    track: logUrl.searchParams.get("track") ?? undefined,
    mbid: logUrl.searchParams.get("mbid") ?? undefined,
    url: logUrl.toString(),
    status: params.status,
    statusText: params.statusText,
    body: params.body,
    bodyText: params.bodyText,
    error: params.error,
  });
}
