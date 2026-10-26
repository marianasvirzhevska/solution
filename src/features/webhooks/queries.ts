import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { webhooksApi, type UpdateWebhookBody } from './api';

const PAGE_SIZE = 10;

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: { page: number; search: string }) => [...webhookKeys.lists(), params] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
};

export function useWebhooks(params: { page: number; search: string }) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: () => webhooksApi.list({ ...params, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => webhooksApi.get(id),
  });
}

export function useUpdateWebhook(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWebhookBody) => webhooksApi.update(id, body),
    onSuccess: (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook);
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}
