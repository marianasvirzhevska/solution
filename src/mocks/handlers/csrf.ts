import { http, HttpResponse } from 'msw';

import { FIXED_CSRF_TOKEN } from '../db';

export const csrfHandlers = [
  http.get('/csrf', () => {
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-CSRF-TOKEN': FIXED_CSRF_TOKEN },
    });
  }),
];
