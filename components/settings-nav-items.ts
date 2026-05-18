export type SettingsNavItem = {
  href: string;
  label: string;
  description: string;
};

/** Routes shown in the settings sidebar. */
export const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  {
    href: "/settings",
    label: "Overview",
    description: "Summary and links to all settings sections.",
  },
  {
    href: "/settings/library",
    label: "Library",
    description:
      "Scan folders, favorites export, rescan on startup, and configured directories.",
  },
  {
    href: "/settings/youtube",
    label: "YouTube",
    description:
      "Data API key, queue video prefetch, and related YouTube options.",
  },
  {
    href: "/settings/lastfm",
    label: "Last.fm",
    description: "API key for related song discovery via track.getSimilar.",
  },
  {
    href: "/settings/playback",
    label: "Playback",
    description:
      "Queue restore, repeat, shuffle, speed, volume, seek steps, and auto-advance.",
  },
  {
    href: "/settings/browse",
    label: "Browse",
    description:
      "Default Library, MusicBrainz, or YouTube tab when Muzical opens.",
  },
  {
    href: "/settings/display",
    label: "Display",
    description: "List density and other visual preferences in the player.",
  },
] as const;

/** Subsections linked from the settings overview landing page. */
export const SETTINGS_SECTION_ITEMS: readonly SettingsNavItem[] =
  SETTINGS_NAV_ITEMS.filter((item) => item.href !== "/settings");
