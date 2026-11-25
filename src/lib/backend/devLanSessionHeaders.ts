const SESSION_KEY = 'olw:dev-lan:session-user:v1';

export interface DevLanSessionUser {
  userId: string;
  email?: string;
  displayLabel?: string;
}

/** Dev LAN identity from sessionStorage (same key as `devLanBackend`). */
export function getDevLanSessionUser(): DevLanSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DevLanSessionUser;
  } catch {
    return null;
  }
}

export function devLanRequestHeaders(extra?: HeadersInit): Record<string, string> {
  const uid = getDevLanSessionUser()?.userId ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (uid) headers['x-dev-user-id'] = uid;
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) headers[k] = v;
    } else {
      Object.assign(headers, extra);
    }
  }
  return headers;
}