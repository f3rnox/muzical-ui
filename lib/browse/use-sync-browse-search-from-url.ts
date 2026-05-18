"use client";

import { useEffect, useMemo } from "react";
import readBrowseSearchQueryParam from "@/lib/browse/read-browse-search-query-param";

type SearchParamsLike = {
  get: (name: string) => string | null;
};

/**
 * When `?q=` is present, fill the browse search input and trigger its change handler.
 */
export default function useSyncBrowseSearchFromUrl(
  searchParams: SearchParamsLike,
  onQueryChange: (value: string) => void,
): void {
  const urlQuery = useMemo(
    () => readBrowseSearchQueryParam(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!urlQuery) return;
    const frameId = window.requestAnimationFrame(() => {
      onQueryChange(urlQuery);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [urlQuery, onQueryChange]);
}
