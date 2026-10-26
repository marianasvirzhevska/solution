import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
