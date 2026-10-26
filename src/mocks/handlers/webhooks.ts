import { delay, http, HttpResponse } from 'msw';

import type { Webhook, WebhookList } from '@/shared/api/types';

import { db } from '../db';
import { errorResponse, isHttpUrl, randomDelay, requireCsrf, requireSession } from '../utils';

interface UpdateWebhookBody {
  name?: string;
  url?: string;
}

interface WebhookRouteParams {
  id: string;
}

export const webhookHandlers = [
  http.get('/v1/webhooks', async ({ request }) => {
    await delay(randomDelay());
    const sessionError = requireSession();
    if (sessionError) return sessionError;

    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '10', 10) || 10;
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();

    const filtered = search
      ? db.webhooks.filter((webhook) => webhook.name.toLowerCase().includes(search))
      : db.webhooks;

    const total = filtered.length;
    const last = Math.max(1, Math.ceil(total / limit));
    const current = Math.min(page, last);
    const start = (current - 1) * limit;

    const body: WebhookList = {
      data: filtered.slice(start, start + limit),
      paging: {
        pages: { current, last },
        results: { total, limitation: limit },
      },
    };
    return HttpResponse.json(body);
  }),

  http.get<WebhookRouteParams>('/v1/webhooks/:id', async ({ params }) => {
    await delay(randomDelay());
    const sessionError = requireSession();
    if (sessionError) return sessionError;

    const webhook = db.webhooks.find((item) => item.id === params.id);
    if (!webhook) return errorResponse('NotFoundException');

    return HttpResponse.json(webhook);
  }),

  http.put<WebhookRouteParams>('/v1/webhooks/:id', async ({ request, params }) => {
    await delay(randomDelay());
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession();
    if (sessionError) return sessionError;

    const index = db.webhooks.findIndex((item) => item.id === params.id);
    if (index === -1) return errorResponse('NotFoundException');

    const body = (await request.json()) as UpdateWebhookBody;

    const name = body.name?.trim();
    if (!name) {
      return errorResponse('ValidationException', { name: ['The name field is required.'] });
    }

    const webhookUrl = body.url;
    if (!webhookUrl || !isHttpUrl(webhookUrl)) {
      return errorResponse('ValidationException', { url: ['The url must be a valid URL.'] });
    }

    const current = db.webhooks[index];
    if (!current) return errorResponse('NotFoundException');

    const updated: Webhook = { ...current, name, url: webhookUrl };
    db.webhooks[index] = updated;

    return HttpResponse.json(updated);
  }),
];
