import resolveYoutubeVideoId from "@/lib/youtube/resolve-youtube-video-id";
import type { Track } from "@/types/track";

type ResolveFileForTrack = (track: Track) => Promise<File | null>;

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]+/g;

function sanitizedFilenamePart(value: string, fallback: string): string {
  const trimmed = value
    .replace(INVALID_FILENAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (trimmed || fallback).slice(0, 160);
}

function trackDownloadBaseName(track: Track): string {
  const title = sanitizedFilenamePart(track.title, "Untitled");
  const artist = sanitizedFilenamePart(track.artist, "");
  return artist ? `${artist} - ${title}` : title;
}

function triggerDownload(url: string, filename?: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (filename) anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadFile(file: File, filename: string): void {
  const url = URL.createObjectURL(file);
  try {
    triggerDownload(url, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

/**
 * Download a track's local audio file or, for streamed tracks, its YouTube audio.
 */
export default async function downloadTrack(
  track: Track,
  resolveFileForTrack: ResolveFileForTrack,
): Promise<void> {
  if (track.library) {
    const file = await resolveFileForTrack(track);
    if (!file) {
      throw new Error("Could not read this file from the library.");
    }
    downloadFile(file, file.name || `${trackDownloadBaseName(track)}.mp3`);
    return;
  }

  if (track.audioUrl?.trim()) {
    triggerDownload(track.audioUrl, trackDownloadBaseName(track));
    return;
  }

  const videoId =
    track.youtubeVideoId?.trim() ||
    (track.youtubeQuery?.trim()
      ? await resolveYoutubeVideoId(track.youtubeQuery)
      : null);
  if (!videoId) {
    throw new Error("Could not find a YouTube video for this track.");
  }

  const url = new URL("/api/youtube/audio", window.location.origin);
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("name", trackDownloadBaseName(track));
  triggerDownload(url.toString(), trackDownloadBaseName(track));
}
