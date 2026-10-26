import { Navigate, Route, Routes } from 'react-router';

import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { WebhookEditDialog } from '@/features/webhooks/WebhookEditDialog';
import { WebhooksPage } from '@/features/webhooks/WebhooksPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/webhooks"
        element={
          <RequireAuth>
            <WebhooksPage />
          </RequireAuth>
        }
      >
        <Route path=":id/edit" element={<WebhookEditDialog />} />
      </Route>
      <Route path="*" element={<Navigate to="/webhooks" replace />} />
    </Routes>
  );
}
