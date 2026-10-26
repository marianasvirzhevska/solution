import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/api';
import { webhooksApi } from '@/features/webhooks/api';
import { registerSessionExpiredHandler } from '@/shared/api/http-client';
import { mockControls } from '@/mocks/db';
import { server } from '@/mocks/node';

const EMAIL = 'demo@smartsender.io';
const PASSWORD = 'mock-pass-123!';

let sessionExpiredCount = 0;
registerSessionExpiredHandler(() => {
  sessionExpiredCount += 1;
});

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  mockControls.reset();
  sessionExpiredCount = 0;
});

afterAll(() => {
  server.close();
});

async function logIn(): Promise<void> {
  const { device_session_token: token } = await authApi.login(EMAIL, PASSWORD);
  await authApi.issue(token);
}

describe('session rotate', () => {
  it('shares a single rotate across parallel 401s and retries each request once', async () => {
    await logIn();
    mockControls.expireSession();

    const [meA, meB] = await Promise.all([authApi.getMe(), authApi.getMe()]);

    expect(meA.email).toBe(EMAIL);
    expect(meB.email).toBe(EMAIL);
    expect(mockControls.counters.rotate).toBe(1);
  });

  it('rotates and retries a PUT too (e.g. saving the edit form after the session expired)', async () => {
    await logIn();
    mockControls.expireSession();

    const updated = await webhooksApi.update('wh_1', {
      name: 'Renamed after expiry',
      url: 'https://example.com/hooks/renamed',
    });

    expect(updated.name).toBe('Renamed after expiry');
    expect(mockControls.counters.rotate).toBe(1);
  });

  it('ends the local session when rotate itself fails', async () => {
    // No session was ever issued, so the mock's rotate returns 400.
    await expect(authApi.getMe()).rejects.toMatchObject({ status: 401 });
    expect(sessionExpiredCount).toBe(1);
  });

  it('ends the local session when the retried request gets a second 401', async () => {
    await logIn();
    mockControls.expireSession();
    // Make rotate itself succeed, but keep the session expired for the retry.
    server.use(http.post('/auth/token/rotate', () => new HttpResponse(null, { status: 200 })));

    await expect(authApi.getMe()).rejects.toMatchObject({ status: 401 });
    expect(sessionExpiredCount).toBe(1);
    expect(mockControls.counters.rotate).toBe(0);
  });

  it('refetches the CSRF token and retries once after a 419', async () => {
    server.use(
      http.post(
        '/auth/token/revoke',
        () =>
          HttpResponse.json(
            { error: { type: 'TokenMismatchException', message: 'Stale CSRF token.' } },
            { status: 419 },
          ),
        { once: true },
      ),
    );

    await expect(authApi.revoke()).resolves.toBeUndefined();
  });
});
