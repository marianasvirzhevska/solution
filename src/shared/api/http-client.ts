import { getFingerprint } from '@/shared/lib/fingerprint';

import { ensureCsrf, invalidateCsrf } from './csrf';
import { ApiError } from './errors';
import { rotateOnce } from './session-refresh';
import type { ApiErrorBody } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  /** Whether a 401 on this request should trigger the rotate-and-retry flow. @default true */
  auth?: boolean;
  signal?: AbortSignal;
}

interface RetryState {
  csrfRetried: boolean;
  authRetried: boolean;
}

let onSessionExpired: (() => void) | null = null;

/** Registered once by the app shell; the client never imports React or the router. */
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export function request<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  return performRequest<T>(path, options, { csrfRetried: false, authRetried: false });
}

async function performRequest<T = void>(
  path: string,
  options: RequestOptions,
  retryState: RetryState,
): Promise<T> {
  const { method = 'GET', body, headers, auth = true, signal } = options;

  const csrfToken = await ensureCsrf();

  const requestHeaders = new Headers(headers);
  requestHeaders.set('X-Requested-With', 'XMLHttpRequest');
  if (method !== 'GET') {
    requestHeaders.set('X-CSRF-TOKEN', csrfToken);
  }
  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (res.status === 419 && !retryState.csrfRetried) {
    invalidateCsrf();
    return performRequest<T>(path, options, { ...retryState, csrfRetried: true });
  }

  if (res.status === 401 && auth) {
    if (retryState.authRetried) {
      onSessionExpired?.();
      throw new ApiError(401, 'AuthenticationException', 'Your session has expired.');
    }

    const rotated = await rotateOnce(rotateSession);
    if (!rotated) {
      onSessionExpired?.();
      throw new ApiError(401, 'AuthenticationException', 'Your session has expired.');
    }
    return performRequest<T>(path, options, { ...retryState, authRetried: true });
  }

  if (!res.ok) {
    const errorBody = (await res.json()) as ApiErrorBody;
    throw ApiError.fromResponse(res.status, errorBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Never retries on 401 itself (`auth: false`), so a failed rotate can't
 * recursively trigger another rotate.
 */
async function rotateSession(): Promise<boolean> {
  try {
    await performRequest(
      '/auth/token/rotate',
      { method: 'POST', body: { fingerprint: getFingerprint() }, auth: false },
      { csrfRetried: false, authRetried: false },
    );
    return true;
  } catch {
    return false;
  }
}
