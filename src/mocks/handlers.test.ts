import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { mockControls } from './db';
import { server } from './node';

const BASE_URL = location.origin;
const EMAIL = 'demo@smartsender.io';
const PASSWORD = 'Password123!';
const FINGERPRINT = 'a'.repeat(32);

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  mockControls.reset();
});

afterAll(() => {
  server.close();
});

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/csrf`);
  const token = res.headers.get('X-CSRF-TOKEN');
  if (!token) throw new Error('missing csrf token');
  return token;
}

async function login(): Promise<{ csrfToken: string; deviceSessionToken: string }> {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
      'X-Captcha-Token': 'dev-captcha',
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, fingerprint: FINGERPRINT }),
  });
  const body = (await res.json()) as { device_session_token: string };
  return { csrfToken, deviceSessionToken: body.device_session_token };
}

async function establishSession(): Promise<string> {
  const { csrfToken, deviceSessionToken } = await login();
  await fetch(`${BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
    body: JSON.stringify({ device_session_token: deviceSessionToken, fingerprint: FINGERPRINT }),
  });
  return csrfToken;
}

describe('CSRF', () => {
  it('issues a token on GET /csrf', async () => {
    const res = await fetch(`${BASE_URL}/csrf`);
    expect(res.status).toBe(204);
    expect(res.headers.get('X-CSRF-TOKEN')).toBeTruthy();
  });

  it('rejects POST requests without a valid CSRF token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Captcha-Token': 'dev-captcha' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, fingerprint: FINGERPRINT }),
    });
    expect(res.status).toBe(419);
  });
});

describe('login', () => {
  it('rejects a wrong password with a field-level 422', async () => {
    const csrfToken = await fetchCsrfToken();
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Captcha-Token': 'dev-captcha',
      },
      body: JSON.stringify({ email: EMAIL, password: 'wrong', fingerprint: FINGERPRINT }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { payload?: Record<string, string[]> } };
    expect(body.error.payload?.password).toBeDefined();
  });

  it('issues a device_session_token on valid credentials', async () => {
    const { deviceSessionToken } = await login();
    expect(deviceSessionToken).toBeTruthy();
  });
});

describe('session', () => {
  it('starts a session and allows protected requests', async () => {
    await establishSession();
    const res = await fetch(`${BASE_URL}/v1/me`);
    expect(res.status).toBe(200);
  });

  it('returns 401 for protected requests before login', async () => {
    const res = await fetch(`${BASE_URL}/v1/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 once the session expires, then succeeds after rotate', async () => {
    const csrfToken = await establishSession();
    mockControls.expireSession();

    const expired = await fetch(`${BASE_URL}/v1/me`);
    expect(expired.status).toBe(401);

    const rotateRes = await fetch(`${BASE_URL}/auth/token/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ fingerprint: FINGERPRINT }),
    });
    expect(rotateRes.status).toBe(200);

    const retried = await fetch(`${BASE_URL}/v1/me`);
    expect(retried.status).toBe(200);
  });

  it('rejects rotate before a session has been issued', async () => {
    const csrfToken = await fetchCsrfToken();
    const res = await fetch(`${BASE_URL}/auth/token/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ fingerprint: FINGERPRINT }),
    });
    expect(res.status).toBe(400);
  });

  it('ends the session on revoke', async () => {
    const csrfToken = await establishSession();
    const revokeRes = await fetch(`${BASE_URL}/auth/token/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ fingerprint: FINGERPRINT }),
    });
    expect(revokeRes.status).toBe(204);

    const res = await fetch(`${BASE_URL}/v1/me`);
    expect(res.status).toBe(401);
  });
});

describe('webhooks', () => {
  it('paginates and searches by name (case-insensitive)', async () => {
    await establishSession();

    const page1 = await fetch(`${BASE_URL}/v1/webhooks?page=1&limit=10`);
    const page1Body = (await page1.json()) as {
      data: { name: string }[];
      paging: {
        pages: { current: number; last: number };
        results: { total: number; limitation: number };
      };
    };
    expect(page1Body.data).toHaveLength(10);
    expect(page1Body.paging.results.total).toBe(28);
    expect(page1Body.paging.pages.last).toBe(3);

    const searched = await fetch(`${BASE_URL}/v1/webhooks?page=1&limit=10&search=orders`);
    const searchedBody = (await searched.json()) as { data: { name: string }[] };
    expect(searchedBody.data.length).toBeGreaterThan(0);
    expect(
      searchedBody.data.every((webhook) => webhook.name.toLowerCase().includes('orders')),
    ).toBe(true);
  });

  it('returns 404 for a missing webhook', async () => {
    await establishSession();
    const res = await fetch(`${BASE_URL}/v1/webhooks/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it('updates a webhook and returns 422 for an invalid URL', async () => {
    const csrfToken = await establishSession();

    const ok = await fetch(`${BASE_URL}/v1/webhooks/wh_1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ name: 'Renamed hook', url: 'https://example.com/new' }),
    });
    expect(ok.status).toBe(200);

    const invalid = await fetch(`${BASE_URL}/v1/webhooks/wh_1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ name: 'Renamed hook', url: 'not-a-url' }),
    });
    expect(invalid.status).toBe(422);
    const body = (await invalid.json()) as { error: { payload?: Record<string, string[]> } };
    expect(body.error.payload?.url).toBeDefined();
  });
});
