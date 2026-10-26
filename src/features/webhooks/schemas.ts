import { z } from 'zod';

export const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().catch(''),
});

export type ListParams = z.infer<typeof listParamsSchema>;

export const webhookFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  url: z
    .url('Enter a valid URL.')
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'URL must start with http:// or https://.',
    }),
});

export type WebhookFormValues = z.infer<typeof webhookFormSchema>;
