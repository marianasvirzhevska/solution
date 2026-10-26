import { useEffect } from 'react';
import { Link, Outlet } from 'react-router';

import { useAuth } from '@/features/auth/auth-context';
import { useLogout } from '@/features/auth/use-logout';

import { useWebhooks } from './queries';
import { useListParams } from './use-list-params';

const SKELETON_ROWS = 5;

export function WebhooksPage() {
  const { me } = useAuth();
  const logOut = useLogout();
  const { page, search, searchInput, setPage, replacePage, setSearch } = useListParams();
  const { data, error, isLoading, isFetching, refetch } = useWebhooks({ page, search });

  const paging = data?.paging;

  useEffect(() => {
    if (paging && page > paging.pages.last) {
      replacePage(paging.pages.last);
    }
  }, [paging, page, replacePage]);

  const editSearch = new URLSearchParams({
    page: String(page),
    ...(search ? { search } : {}),
  }).toString();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Webhooks</h1>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          {me && <span>{me.email}</span>}
          <button
            type="button"
            onClick={() => void logOut()}
            className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
          >
            Log out
          </button>
        </div>
      </header>

      <input
        type="search"
        value={searchInput}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
        placeholder="Search by name…"
        aria-label="Search webhooks by name"
        className="mb-4 w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
      />

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p>Couldn&apos;t load webhooks. {error.message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 rounded border border-red-300 px-3 py-1 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!error && isLoading && (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-2">Name</th>
              <th className="py-2">URL</th>
              <th className="py-2">Active</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={index} className="border-b border-neutral-100">
                <td className="py-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                </td>
                <td className="py-3">
                  <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
                </td>
                <td className="py-3">
                  <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
                </td>
                <td className="py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!error && !isLoading && data?.data.length === 0 && (
        <p className="py-8 text-center text-neutral-500">
          {search ? `No webhooks match "${search}".` : 'No webhooks yet.'}
        </p>
      )}

      {!error && !isLoading && data && data.data.length > 0 && (
        <>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2">Name</th>
                <th className="py-2">URL</th>
                <th className="py-2">Active</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {data.data.map((webhook) => (
                <tr key={webhook.id} className="border-b border-neutral-100">
                  <td className="py-3">{webhook.name}</td>
                  <td className="max-w-xs truncate py-3" title={webhook.url}>
                    {webhook.url}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        webhook.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      to={`/webhooks/${webhook.id}/edit?${editSearch}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
            <span>
              Page {paging?.pages.current} of {paging?.pages.last} · {paging?.results.total} results
              {isFetching && <span className="ml-2 text-neutral-400">Updating…</span>}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={(paging?.pages.current ?? 1) <= 1}
                onClick={() => {
                  setPage(page - 1);
                }}
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={(paging?.pages.current ?? 1) >= (paging?.pages.last ?? 1)}
                onClick={() => {
                  setPage(page + 1);
                }}
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <Outlet />
    </main>
  );
}
