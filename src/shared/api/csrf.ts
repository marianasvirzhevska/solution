const CSRF_HEADER = 'X-CSRF-TOKEN';

let csrfToken: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/csrf', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  const token = res.headers.get(CSRF_HEADER);
  if (!token) throw new Error('CSRF token missing from /csrf response');
  return token;
}

export function ensureCsrf(): Promise<string> {
  if (csrfToken) return Promise.resolve(csrfToken);

  inflight ??= fetchCsrfToken()
    .then((token) => {
      csrfToken = token;
      return token;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateCsrf(): void {
  csrfToken = null;
}
