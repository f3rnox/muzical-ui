import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import ensureYtDlpCommand from "@/lib/youtube/ensure-yt-dlp-binary";
import YTDlpWrap from "@/lib/youtube/yt-dlp-wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]+/g;
const AUDIO_FORMAT = "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio";

type YtDlpRequestedDownload = {
  ext?: string;
  filesize?: number;
  filesize_approx?: number;
};

type YtDlpInfo = {
  ext?: string;
  title?: string;
  requested_downloads?: YtDlpRequestedDownload[];
};

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeFilenameBase(value: string | null, fallback: string): string {
  const cleaned = (value ?? "")
    .replace(INVALID_FILENAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (cleaned || fallback).slice(0, 160);
}

function audioMimeType(ext: string): string {
  const normalized = ext.toLowerCase();
  if (normalized === "webm") return "audio/webm";
  if (normalized === "ogg" || normalized === "opus") return "audio/ogg";
  if (normalized === "mp3") return "audio/mpeg";
  if (normalized === "m4a" || normalized === "mp4") return "audio/mp4";
  return "application/octet-stream";
}

function contentDisposition(filename: string): string {
  const asciiFallback = filename
    .replace(/[^\x20-\x7e]+/g, "")
    .replace(/["\\]/g, "")
    .trim() || "audio.m4a";
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function readVideoInfo(
  ytDlp: InstanceType<typeof YTDlpWrap>,
  url: string,
  prefixArgs: readonly string[],
): Promise<YtDlpInfo> {
  const output = await ytDlp.execPromise(
    [
      ...prefixArgs,
      url,
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      "-f",
      AUDIO_FORMAT,
    ],
    { windowsHide: true },
  );
  return JSON.parse(output) as YtDlpInfo;
}

/**
 * Stream a YouTube video's best available audio format as a browser download.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const videoId = request.nextUrl.searchParams.get("videoId")?.trim() ?? "";
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    return jsonError("Invalid YouTube video id.", 400);
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const ytDlpCommand = await ensureYtDlpCommand();
    const ytDlp = new YTDlpWrap(ytDlpCommand.command);
    const info = await readVideoInfo(ytDlp, url, ytDlpCommand.prefixArgs);
    const download = info.requested_downloads?.[0];
    const ext = (download?.ext || info.ext || "m4a").replace(/[^a-zA-Z0-9]/g, "") || "m4a";
    const filenameBase = sanitizeFilenameBase(
      request.nextUrl.searchParams.get("name"),
      info.title || "youtube-audio",
    );
    const filename = `${filenameBase}.${ext}`;
    const abortController = new AbortController();
    const stream = ytDlp.execStream(
      [
        ...ytDlpCommand.prefixArgs,
        url,
        "-f",
        AUDIO_FORMAT,
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--quiet",
        "-o",
        "-",
      ],
      { windowsHide: true },
      abortController.signal,
    );

    request.signal.addEventListener("abort", () => {
      abortController.abort();
      stream.destroy();
    });

    const headers = new Headers({
      "Cache-Control": "no-store",
      "Content-Disposition": contentDisposition(filename),
      "Content-Type": audioMimeType(ext),
    });
    const size = download?.filesize ?? download?.filesize_approx;
    if (Number.isFinite(size) && size && size > 0) {
      headers.set("Content-Length", String(size));
    }

    return new Response(Readable.toWeb(stream) as BodyInit, { headers });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not download YouTube audio.";
    return jsonError(message, 502);
  }
}
