import type { Track } from "@/types/track";

/**
 * Stand-in data until `GET /api/...` (or your route) returns real rows.
 */
export const MOCK_PLAYLIST: readonly Track[] = [
  {
    id: "1",
    title: "Northern Lights",
    artist: "Aurora Fields",
    album: "Polar Patterns",
    durationSec: 214,
    audioUrl: null,
  },
  {
    id: "2",
    title: "Basement Echo",
    artist: "Mono City",
    album: "Concrete Hymns",
    durationSec: 189,
    audioUrl: null,
  },
  {
    id: "3",
    title: "Paper Boats",
    artist: "June & Tide",
    album: "Harbor Demos",
    durationSec: 241,
    audioUrl: null,
  },
  {
    id: "4",
    title: "Static Bloom",
    artist: "Velvet Wire",
    album: "Lo-Fi Bloom",
    durationSec: 198,
    audioUrl: null,
  },
  {
    id: "5",
    title: "Slow Commute",
    artist: "Transit Choir",
    album: "Rush Hour B-Sides",
    durationSec: 267,
    audioUrl: null,
  },
];
