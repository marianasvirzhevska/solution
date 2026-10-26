import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router';

import { ApiError, isValidationError } from '@/shared/api/errors';

import { useUpdateWebhook, useWebhook } from './queries';
import { webhookFormSchema, type WebhookFormValues } from './schemas';

function isWebhookFormField(field: string): field is keyof WebhookFormValues {
  return field === 'name' || field === 'url';
}

export function WebhookEditDialog() {
  const { id } = useParams<{ id: string }>();
  const webhookId = id ?? '';
  const navigate = useNavigate();
  const location = useLocation();

  const { data: webhook, error, isLoading } = useWebhook(webhookId);
  const updateWebhook = useUpdateWebhook(webhookId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({ resolver: zodResolver(webhookFormSchema) });

  useEffect(() => {
    if (webhook) reset({ name: webhook.name, url: webhook.url });
  }, [webhook, reset]);

  const close = () => {
    // Replace, not push: opening the dialog already pushed a history entry,
    // so closing should undo that rather than stack another one.
    void navigate(`/webhooks${location.search}`, { replace: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateWebhook.mutateAsync(values);
      close();
    } catch (submitError) {
      if (isValidationError(submitError)) {
        for (const [field, messages] of Object.entries(submitError.payload)) {
          const message = messages[0] ?? 'Invalid value.';
          if (isWebhookFormField(field)) {
            setError(field, { type: 'server', message });
          } else {
            setError('root.serverError', { type: 'server', message });
          }
        }
        return;
      }
      setError('root.serverError', {
        type: 'server',
        message: submitError instanceof Error ? submitError.message : 'Something went wrong.',
      });
    }
  });

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-webhook-title"
    >
      <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-webhook-title" className="text-lg font-semibold">
            Edit webhook
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-800"
          >
            ✕
          </button>
        </div>

        {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}

        {error && notFound && <p className="text-sm text-red-600">Webhook not found.</p>}

        {error && !notFound && (
          <p className="text-sm text-red-600">Couldn&apos;t load this webhook. {error.message}</p>
        )}

        {!isLoading && !error && (
          <form
            onSubmit={(event) => void onSubmit(event)}
            className="flex flex-col gap-3"
            noValidate
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="webhook-name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="webhook-name"
                className="rounded border border-neutral-300 px-3 py-2"
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="webhook-url" className="text-sm font-medium">
                URL
              </label>
              <input
                id="webhook-url"
                className="rounded border border-neutral-300 px-3 py-2"
                {...register('url')}
              />
              {errors.url && <p className="text-sm text-red-600">{errors.url.message}</p>}
            </div>
            {errors.root?.serverError && (
              <p className="text-sm text-red-600">{errors.root.serverError.message}</p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
