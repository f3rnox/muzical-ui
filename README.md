# Muzical UI

Local-first music player built with [Next.js](https://nextjs.org). Scan folders
on
your machine, build a library, queue tracks, and play audio in the browser. Browse
[MusicBrainz](https://musicbrainz.org) and [YouTube](https://youtube.com) to
discover and stream tracks when you do not have local files.

All library data and preferences stay on your device (IndexedDB and
`localStorage`). Optional API keys for YouTube and Last.fm are stored in the
browser only.

## Features

- **Local library** — Pick folders with the File System Access API, scan audio
  files, browse by artist/album/folder, favorites, and album art.
- **Playback queue** — Drag-friendly queue, repeat/shuffle, playback speed,
  volume, seek steps, and optional restore of the last queue on reload.
- **MusicBrainz** — Search releases and artists; play via embedded YouTube when
  no local file exists.
- **YouTube** — Search and add videos to the queue; optional Data API key for
  reliable video resolution.
- **Last.fm** — Optional API key for related-track suggestions in the empty-queue
  panel.
- **Layout** — On large screens: resizable library, queue, and player columns;
  stacks vertically on small screens.
- **Settings** — Library scan paths, playback, browse default tab, display density,
  accent color, and theme.

## Requirements

- Node.js **20+**
- A Chromium-based browser (or another browser with File System Access API
  support) for local folder scanning

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

| Script | Purpose |
| --- | --- |
| `pnpm build` | Production build (standalone output) |
| `pnpm start` | Run production server after build |
| `pnpm test` | Vitest unit tests |
| `pnpm lint` | Markdown + ESLint |
| `pnpm format` | Prettier |

## Production build

The app is configured with `output: "standalone"` for a self-contained server
bundle under `.next/standalone`.

```bash
pnpm build
pnpm start
```

Or run the packaged CLI after a build:

```bash
node bin/muzical-ui.js
# or, when installed globally:
muzical-ui --version
```

The `muzical-ui` bin starts the standalone Next server. Build first if
`.next/standalone/server.js` is missing.

## Optional API keys

Configure in **Settings** (stored in `localStorage` on this device only):

| Service | Used for |
| --- | --- |
| [YouTube Data API](https://console.cloud.google.com/apis/credentials) | Resolving MusicBrainz tracks to YouTube video IDs |
| [Last.fm API](https://www.last.fm/api/account/create) | Related tracks via `track.getSimilar` |

Without a YouTube key, Muzical falls back to in-player search when resolving
streams.

## Project layout

| Path | Role |
| --- | --- |
| `app/` | Next.js App Router pages and API routes |
| `components/` | UI (player, library browser, settings) |
| `lib/` | Domain helpers (library scan, playback, YouTube, MusicBrainz) |
| `types/` | Shared TypeScript types |
| `bin/muzical-ui.js` | CLI entry for standalone production server |

## License

[MIT](LICENSE.md) — see [CHANGELOG.md](CHANGELOG.md) for release history.
