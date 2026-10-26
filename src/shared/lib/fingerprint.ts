const STORAGE_KEY = 'ss_fingerprint';
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

function generateFingerprint(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getFingerprint(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && FINGERPRINT_PATTERN.test(stored)) {
    return stored;
  }

  const fingerprint = generateFingerprint();
  localStorage.setItem(STORAGE_KEY, fingerprint);
  return fingerprint;
}
