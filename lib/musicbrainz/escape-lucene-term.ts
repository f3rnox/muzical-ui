/**
 * Escape a user term for MusicBrainz Lucene query syntax.
 */
export function escapeLuceneTerm(term: string): string {
  return term.replace(/([+\-!(){}[\]^"~*?:\\/])/g, "\\$1");
}
