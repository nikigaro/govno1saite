const AUTHOR_ID_KEY = 'tredach-author-id';
const LAST_POST_KEY = 'tredach-last-post-at';
const POST_COOLDOWN_MS = 15_000;
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateAuthorId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

export function getAuthorId(): string {
  const stored = localStorage.getItem(AUTHOR_ID_KEY);
  if (stored) return stored;
  const id = generateAuthorId();
  localStorage.setItem(AUTHOR_ID_KEY, id);
  return id;
}

export function setAuthorId(id: string): void {
  localStorage.setItem(AUTHOR_ID_KEY, id);
}

export function resetAuthorId(): void {
  localStorage.removeItem(AUTHOR_ID_KEY);
}

export function getCooldownRemainingMs(): number {
  const lastPostAt = Number(localStorage.getItem(LAST_POST_KEY) ?? 0);
  return Math.max(0, lastPostAt + POST_COOLDOWN_MS - Date.now());
}

export function markPosted(): void {
  localStorage.setItem(LAST_POST_KEY, String(Date.now()));
}
