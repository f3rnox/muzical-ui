/**
 * Read `?q=` from the home URL for a browse tab deep link.
 */
export default function readBrowseSearchQueryParam(searchParams: {
  get: (name: string) => string | null;
}): string | null {
  const q = searchParams.get("q")?.trim();
  return q || null;
}
