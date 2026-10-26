import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
    },
  },
});
