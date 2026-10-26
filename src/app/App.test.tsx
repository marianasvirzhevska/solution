import { render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { mockControls } from '@/mocks/db';
import { server } from '@/mocks/node';

import { App } from './App';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  mockControls.reset();
});

afterAll(() => {
  server.close();
});

describe('App', () => {
  it('redirects an anonymous visitor to the login page', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});
