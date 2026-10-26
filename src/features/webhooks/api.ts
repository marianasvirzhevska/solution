import { request } from '@/shared/api/http-client';
import type { Webhook, WebhookList } from '@/shared/api/types';

export interface ListWebhooksParams {
  page: number;
  limit: number;
  search: string;
}

export interface UpdateWebhookBody {
  name: string;
  url: string;
}

export const webhooksApi = {
  list({ page, limit, search }: ListWebhooksParams): Promise<WebhookList> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return request<WebhookList>(`/v1/webhooks?${params.toString()}`);
  },

  get(id: string): Promise<Webhook> {
    return request<Webhook>(`/v1/webhooks/${encodeURIComponent(id)}`);
  },

  update(id: string, body: UpdateWebhookBody): Promise<Webhook> {
    return request<Webhook>(`/v1/webhooks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    });
  },
};
