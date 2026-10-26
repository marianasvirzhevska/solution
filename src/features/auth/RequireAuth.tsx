import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from './auth-context';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-500">Loading…</div>
    );
  }

  if (status === 'anonymous') {
    const from = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  return <>{children}</>;
}
