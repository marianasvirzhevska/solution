import { delay, http, HttpResponse } from 'msw';

import type { Me } from '@/shared/api/types';

import { USER } from '../db';
import { randomDelay, requireSession } from '../utils';

export const meHandlers = [
  http.get('/v1/me', async () => {
    await delay(randomDelay());
    const sessionError = requireSession();
    if (sessionError) return sessionError;

    const me: Me = {
      id: USER.id,
      email: USER.email,
      first_name: USER.firstName,
      last_name: USER.lastName,
      name: `${USER.firstName} ${USER.lastName}`,
    };
    return HttpResponse.json(me);
  }),
];
