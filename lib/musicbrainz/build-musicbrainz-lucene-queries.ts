import { escapeLuceneTerm } from "@/lib/musicbrainz/escape-lucene-term";

export type MusicBrainzSearchHints = {
  artist?: string;
  album?: string;
};

/**
 * Build prioritized Lucene queries for a free-text MusicBrainz search.
 */
export function buildMusicBrainzLuceneQueries(raw: string): {
  queries: string[];
  hints: MusicBrainzSearchHints;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { queries: [], hints: {} };

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const hints: MusicBrainzSearchHints = {};

  if (tokens.length >= 2) {
    const artist = escapeLuceneTerm(tokens[0]);
    const albumPhrase = escapeLuceneTerm(tokens.slice(1).join(" "));
    hints.artist = tokens[0];
    hints.album = tokens.slice(1).join(" ");

    const second = escapeLuceneTerm(tokens[1]);
    const queries = [
      `artist:${artist} AND release:${albumPhrase}`,
      `artist:${artist} AND release-group:${albumPhrase}`,
      `artist:${artist} AND releasegroup:${albumPhrase}`,
    ];
    if (tokens.length === 2) {
      queries.push(`artist:${second} AND release:${artist}`);
    }
    queries.push(`"${escapeLuceneTerm(trimmed)}"`, trimmed);

    return { hints, queries };
  }

  const single = escapeLuceneTerm(tokens[0]);
  return {
    hints: { artist: tokens[0] },
    queries: [`artist:${single}`, trimmed],
  };
}
