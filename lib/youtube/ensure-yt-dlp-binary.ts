import { createWriteStream } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import YTDlpWrap from "@/lib/youtube/yt-dlp-wrap";

export type YtDlpCommand = {
  command: string;
  prefixArgs: string[];
};

let commandPromise: Promise<YtDlpCommand> | null = null;

function cacheDirectory(): string {
  if (process.env.MUZICAL_YT_DLP_DIR) return process.env.MUZICAL_YT_DLP_DIR;
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, "Muzical UI");
  }
  if (process.env.XDG_CACHE_HOME) return join(process.env.XDG_CACHE_HOME, "muzical-ui");
  return join(homedir(), ".cache", "muzical-ui");
}

function binaryFilename(): string {
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

function zipappFilename(): string {
  return process.platform === "win32" ? "yt-dlp.pyz" : "yt-dlp";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandWorks(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: "ignore",
    });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

async function downloadLatestZipapp(filePath: string): Promise<void> {
  const response = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "MuzicalUI/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not check yt-dlp releases (${response.status}).`);
  }
  const body = (await response.json()) as {
    assets?: { name?: string; browser_download_url?: string }[];
  };
  const asset = body.assets?.find((item) => item.name === "yt-dlp");
  const url = asset?.browser_download_url;
  if (!url) throw new Error("Could not find the yt-dlp Python zipapp release asset.");

  const download = await fetch(url, {
    headers: { "User-Agent": "MuzicalUI/1.0" },
    cache: "no-store",
  });
  if (!download.ok || !download.body) {
    throw new Error(`Could not download yt-dlp (${download.status}).`);
  }
  await pipeline(
    Readable.fromWeb(download.body as unknown as NodeReadableStream<Uint8Array>),
    createWriteStream(filePath),
  );
}

async function findPythonCommand(zipPath: string): Promise<YtDlpCommand | null> {
  const candidates: YtDlpCommand[] =
    process.platform === "win32"
      ? [
          { command: "py", prefixArgs: ["-3", zipPath] },
          { command: "python", prefixArgs: [zipPath] },
        ]
      : [
          { command: "python3", prefixArgs: [zipPath] },
          { command: "python", prefixArgs: [zipPath] },
        ];

  for (const candidate of candidates) {
    if (await commandWorks(candidate.command, [...candidate.prefixArgs, "--version"])) {
      return candidate;
    }
  }
  return null;
}

async function ensureCommand(): Promise<YtDlpCommand> {
  if (process.env.MUZICAL_YT_DLP_PATH?.trim()) {
    return { command: process.env.MUZICAL_YT_DLP_PATH.trim(), prefixArgs: [] };
  }

  const dir = cacheDirectory();
  const binaryPath = join(dir, binaryFilename());
  await mkdir(dir, { recursive: true });

  if (!(await pathExists(binaryPath))) {
    await YTDlpWrap.downloadFromGithub(binaryPath, undefined, platform());
  }
  if (await commandWorks(binaryPath, ["--version"])) {
    return { command: binaryPath, prefixArgs: [] };
  }

  const zipPath = join(dir, zipappFilename());
  if (!(await pathExists(zipPath))) {
    await downloadLatestZipapp(zipPath);
  }
  const pythonCommand = await findPythonCommand(zipPath);
  if (pythonCommand) return pythonCommand;

  throw new Error("Could not run yt-dlp. Install yt-dlp or Python 3, then retry.");
}

/**
 * Resolve a usable yt-dlp command, downloading it once into the user cache if needed.
 */
export default function ensureYtDlpCommand(): Promise<YtDlpCommand> {
  commandPromise ??= ensureCommand().catch((error: unknown) => {
    commandPromise = null;
    throw error;
  });
  return commandPromise;
}
