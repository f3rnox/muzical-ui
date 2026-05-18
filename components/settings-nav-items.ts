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
      "Scan folders, rescan on startup, and manage configured directories.",
  },
  {
    href: "/settings/youtube",
    label: "YouTube",
    description:
      "YouTube Data API key for resolving MusicBrainz tracks to embeddable videos.",
  },
  {
    href: "/settings/playback",
    label: "Playback",
    description: "Restore your queue and playhead between sessions.",
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
