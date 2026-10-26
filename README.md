# Smart Sender · Webhooks (test task)

A small app: login + session, a webhooks list, and an edit dialog — built against a hand-written MSW mock of the API contract in the task brief. Scope matches the brief: no monorepo, no backend, no heavy infrastructure. The interesting part is the HTTP/session layer; the UI is intentionally plain (the brief explicitly says design isn't graded).

## Quick start

Requires Node 20.19+ and pnpm 10 (`corepack enable` picks up the pinned version from `package.json`).

```bash
pnpm install
pnpm dev          # http://localhost:5173 — MSW mocks the API, no backend needed
pnpm test         # Vitest, runs once
pnpm typecheck    # tsc -b, strict mode
pnpm lint         # ESLint, typescript-eslint strict + type-checked
pnpm check        # typecheck + lint + format:check + test, all of the above
```

## Test credentials

- **Email:** `demo@smartsender.io`
- **Password:** `mock-pass-123!`

(Defined in [`src/mocks/db.ts`](src/mocks/db.ts).)

## Key decisions

**Custom `fetch` wrapper, not a library.** The retry/rotate/CSRF semantics in [`shared/api/http-client.ts`](src/shared/api/http-client.ts) are short and explicit enough that a library would add indirection without saving real code. The pipeline, per request:

1. `ensureCsrf()` — single-flight: the first caller triggers `GET /csrf`, everyone else awaits the same promise. Cached in a module variable for the life of the page.
2. `X-Requested-With: XMLHttpRequest` always; `X-CSRF-TOKEN` added for POST/PUT only.
3. **419** → invalidate the cached CSRF token, refetch, retry once.
4. **401** (on requests that opt into auth, i.e. not `/auth/login`/`/auth/token/*`) → `rotateOnce()`, a single-flight guard so concurrent 401s share exactly one `/auth/token/rotate` call, then retry the original request once. The rotate call itself is sent with `auth: false`, so a failed rotate can never trigger another rotate.
5. A second 401 on the retry, or a failed rotate, calls a registered `onSessionExpired` callback and throws.

This pipeline lives in one place (`request()`) and isn't specific to any one endpoint or HTTP method — every authenticated call goes through it, including the webhook edit form's `PUT`. So if the session expires while the edit dialog is open, clicking Save still rotates and retries transparently instead of failing; covered by a dedicated test (`rotates and retries a PUT too`) alongside the required parallel-401 case, since it's easy to special-case `GET` by accident and silently miss `POST`/`PUT`.

The client never imports React or the router — `onSessionExpired` is a plain callback registered once by `AuthProvider`. It just flips auth state to `anonymous` and clears the query cache; the actual redirect is left to `RequireAuth` reacting to that state change (see below), not fired imperatively from the callback.

**Token placement.** `device_session_token` lives only in a local variable inside the login mutation — never in state, storage, or the URL. `fingerprint` (32 hex chars, `crypto.getRandomValues`) is generated once and kept in `localStorage`, since it identifies the device, not the session. The session itself is opaque to the client — the mock holds it in memory, standing in for a real HttpOnly cookie.

**Layering:** UI → feature hooks (TanStack Query) → feature `api.ts` → `shared/api/http-client`. Nothing below the feature-hook layer imports React.

**`RequireAuth` owns the redirect, not `AuthProvider`.** Session expiry and explicit logout both just set auth status to `anonymous`. `RequireAuth` (wrapping every protected route) redirects to `/login?from=<current path>` whenever it renders with that status — one code path for both triggers, and it naturally captures whatever page the user was actually on, rather than threading `navigate`/`location` through the HTTP client's callback.

**URL is the single source of truth for list state** (`features/webhooks/use-list-params.ts`), parsed with zod (`page` coerced + clamped to ≥1, `search` defaulted to `''`) so a malformed URL never breaks the page. `setPage` pushes (back/forward walks through pages one at a time). `setSearch` debounces 300ms, then commits via **push** once settled, always resetting to page 1.

This is a deliberate simplification of "replace while typing, push on settle": I don't write to the URL on every keystroke at all — only the debounced, settled value gets committed. Writing on every keystroke would mean the list's query key changes on every keystroke too, firing a request per character. One push per settled search term still means Back steps cleanly through previous searches.

If a search narrows the results so the current `page` is now out of range, the page fetches the list anyway (consistent with the API), reads `paging.pages.last` from the response, and **replaces** (not pushes) the URL down to the last valid page — a silent correction, not a user-navigable action.

**Server validation → `setError`.** Both forms (login, webhook edit) mirror the server's shape with a client-side zod schema for fast feedback, but on a 422 the response is the actual source of truth: `isValidationError()` narrows the error, and each `payload` field is mapped with `setError(field, ...)`; anything that doesn't match a known field name lands on `root.serverError` instead of being silently dropped.

**Logout clears the cache.** `queryClient.clear()`, not `invalidateQueries` — logging out should leave nothing behind for the next session to accidentally see, not just mark it stale.

**Edit dialog is a nested route** (`/webhooks/:id/edit`, rendered through an `<Outlet/>` in `WebhooksPage`), so it's deep-linkable and overlays the list rather than replacing it. Closing it navigates with `replace: true`, not push — opening it already pushed one history entry, so closing undoes that instead of stacking a second one. (I confirmed this round-trips correctly: deep-linking to an edit URL while logged out redirects to `/login?from=...` and lands back on that exact URL after signing in.)

## Checking the session behavior by hand

The mock session lasts 30 seconds; `rotate` extends it by another 30. To see the rotate-and-retry path without waiting:

```js
// in the browser console, while on the app
const { mockControls } = await import('/src/mocks/db.ts');
mockControls.expireSession();
```

Then trigger any request (e.g. click "Next" on the list) and watch the Network tab: a 401, one `/auth/token/rotate` call, then the original request retried and succeeding.

## Known limitations / not done

- **No dirty-form guard** on the edit dialog — closing or navigating away discards unsaved changes silently.
- **No automated CI workflow** (lint/typecheck/test on push) — `pnpm check` runs the same steps locally.
- **No shadcn/ui components** — UI is plain Tailwind.
