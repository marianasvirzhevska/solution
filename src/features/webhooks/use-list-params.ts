import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { listParamsSchema } from './schemas';

const SEARCH_DEBOUNCE_MS = 300;

export interface UseListParamsResult {
  page: number;
  search: string;
  /** Controlled value for the search input; updates immediately on every keystroke. */
  searchInput: string;
  /** Pushes a new page onto history, so back/forward walks through pages. */
  setPage: (page: number) => void;
  /** Silently corrects an out-of-range page (e.g. after a search narrows the results). */
  replacePage: (page: number) => void;
  /** Debounces the URL/query update; resets to page 1 once committed. */
  setSearch: (value: string) => void;
}

export function useListParams(): UseListParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, search } = listParamsSchema.parse({
    page: searchParams.get('page') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync the controlled input when the URL changes from outside typing
  // (back/forward navigation). Adjusting state during render, rather than in
  // an effect, avoids an extra post-commit render pass.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(nextPage));
        return next;
      });
    },
    [setSearchParams],
  );

  const replacePage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('page', String(nextPage));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set('search', value);
          } else {
            next.delete('search');
          }
          next.set('page', '1');
          return next;
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [setSearchParams],
  );

  return { page, search, searchInput, setPage, replacePage, setSearch };
}
