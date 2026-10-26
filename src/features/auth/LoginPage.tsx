import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { isValidationError } from '@/shared/api/errors';

import { useAuth } from './auth-context';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type LoginFormField = keyof LoginFormValues;

function isLoginField(field: string): field is LoginFormField {
  return field === 'email' || field === 'password';
}

export function LoginPage() {
  const { logIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await logIn(values.email, values.password);
      const from = searchParams.get('from');
      void navigate(from?.startsWith('/') ? from : '/webhooks', { replace: true });
    } catch (error) {
      if (isValidationError(error)) {
        for (const [field, messages] of Object.entries(error.payload)) {
          const message = messages[0] ?? 'Invalid value.';
          if (isLoginField(field)) {
            setError(field, { type: 'server', message });
          } else {
            setError('root.serverError', { type: 'server', message });
          }
        }
        return;
      }
      setError('root.serverError', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className="rounded border border-neutral-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="rounded border border-neutral-300 px-3 py-2"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        {errors.root?.serverError && (
          <p className="text-sm text-red-600">{errors.root.serverError.message}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
