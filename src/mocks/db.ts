import type { Webhook } from '@/shared/api/types';

export const SESSION_TTL_MS = 30_000;
export const FIXED_CSRF_TOKEN = 'mock-csrf-token';
const PENDING_TOKEN_TTL_MS = 60_000;

export const USER = {
  id: 'usr_1',
  email: 'demo@smartsender.io',
  password: 'Password123!',
  firstName: 'Demo',
  lastName: 'User',
} as const;

interface SessionState {
  issued: boolean;
  expiresAt: number | null;
}

interface PendingToken {
  fingerprint: string;
  expiresAt: number;
}

const CATEGORIES = ['Orders', 'Payments', 'Shipping', 'Inventory', 'Refunds'] as const;

function generateWebhooks(count: number): Webhook[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const category = CATEGORIES[index % CATEGORIES.length] ?? CATEGORIES[0];
    return {
      id: `wh_${n}`,
      name: `${category} webhook ${n}`,
      url: `https://example.com/hooks/${category.toLowerCase()}-${n}`,
      active: n % 4 !== 0,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(),
    };
  });
}

export const db = {
  session: { issued: false, expiresAt: null } as SessionState,
  pendingTokens: new Map<string, PendingToken>(),
  webhooks: generateWebhooks(28),
};

export function createPendingToken(fingerprint: string): string {
  const token = crypto.randomUUID();
  db.pendingTokens.set(token, { fingerprint, expiresAt: Date.now() + PENDING_TOKEN_TTL_MS });
  return token;
}

export function consumePendingToken(token: string, fingerprint: string): boolean {
  const pending = db.pendingTokens.get(token);
  db.pendingTokens.delete(token);
  if (!pending) return false;
  if (pending.fingerprint !== fingerprint) return false;
  if (Date.now() > pending.expiresAt) return false;
  return true;
}

export function issueSession(): void {
  db.session.issued = true;
  db.session.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function rotateSession(): boolean {
  if (!db.session.issued) return false;
  db.session.expiresAt = Date.now() + SESSION_TTL_MS;
  return true;
}

export function revokeSession(): void {
  db.session.issued = false;
  db.session.expiresAt = null;
}

export const mockControls = {
  counters: { rotate: 0 },
  expireSession(): void {
    db.session.expiresAt = Date.now() - 1;
  },
  reset(): void {
    db.session.issued = false;
    db.session.expiresAt = null;
    db.pendingTokens.clear();
    db.webhooks = generateWebhooks(28);
    mockControls.counters.rotate = 0;
  },
};
