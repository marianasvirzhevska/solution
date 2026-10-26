import { delay, http, HttpResponse } from 'msw';

import {
  consumePendingToken,
  createPendingToken,
  issueSession,
  mockControls,
  revokeSession,
  rotateSession,
  USER,
} from '../db';
import { errorResponse, randomDelay, requireCsrf } from '../utils';

interface LoginBody {
  email?: string;
  password?: string;
  fingerprint?: string;
}

interface IssueBody {
  device_session_token?: string;
  fingerprint?: string;
}

export const authHandlers = [
  http.post('/auth/login', async ({ request }) => {
    await delay(randomDelay());
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    if (!request.headers.get('X-Captcha-Token')) {
      return errorResponse('BadRequestException');
    }

    const body = (await request.json()) as LoginBody;

    if (body.email !== USER.email) {
      return errorResponse('ValidationException', {
        email: ['These credentials do not match our records.'],
      });
    }
    if (body.password !== USER.password) {
      return errorResponse('ValidationException', {
        password: ['These credentials do not match our records.'],
      });
    }

    const token = createPendingToken(body.fingerprint ?? '');
    return HttpResponse.json({ device_session_token: token });
  }),

  http.post('/auth/token/issue', async ({ request }) => {
    await delay(randomDelay());
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const body = (await request.json()) as IssueBody;
    const ok = body.device_session_token
      ? consumePendingToken(body.device_session_token, body.fingerprint ?? '')
      : false;

    if (!ok) {
      return errorResponse('ValidationException', {
        device_session_token: ['The token is invalid or has expired.'],
      });
    }

    issueSession();
    return new HttpResponse(null, { status: 200 });
  }),

  http.post('/auth/token/rotate', async ({ request }) => {
    await delay(randomDelay());
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    if (!rotateSession()) {
      return errorResponse('BadRequestException');
    }

    mockControls.counters.rotate += 1;
    return new HttpResponse(null, { status: 200 });
  }),

  http.post('/auth/token/revoke', async ({ request }) => {
    await delay(randomDelay());
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    revokeSession();
    return new HttpResponse(null, { status: 204 });
  }),
];
