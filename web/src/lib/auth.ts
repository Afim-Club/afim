// Browser-side session for members. The refresh token lives in an httpOnly cookie set by Strapi
// (users-permissions `jwtManagement: 'refresh'`), so no token is stored in localStorage: each page
// asks Strapi for a short-lived access token with that cookie.
export const API = import.meta.env.PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

let jwt: string | null = null;

async function call(path: string, init: RequestInit = {}) {
  return fetch(`${API}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...init.headers },
  });
}

async function json(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body;
}

/** Returns true when the visitor has a session (and loads an access token). */
export async function restoreSession() {
  const res = await call('/auth/refresh', { method: 'POST', body: '{}' });
  jwt = res.ok ? (await res.json()).jwt : null;
  return !!jwt;
}

export async function login(identifier: string, password: string) {
  jwt = (await json(await call('/auth/local', { method: 'POST', body: JSON.stringify({ identifier, password }) }))).jwt;
}

// Strapi's register response does not set the refresh cookie, so sign in right after.
export async function register(email: string, password: string) {
  await json(await call('/auth/local/register', { method: 'POST', body: JSON.stringify({ username: email, email, password }) }));
  await login(email, password);
}

/** Finishes a social login: Strapi keeps the provider tokens in its session cookie after the redirect. */
export async function finishProviderLogin(provider: string) {
  jwt = (await json(await call(`/auth/${provider}/callback`))).jwt;
}

export async function logout() {
  await call('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
  jwt = null;
}

export const getUser = async () => json(await call('/users/me'));
export const getMember = async () => (await json(await call('/members/me'))).data;
export const saveMember = async (data: unknown) => (await json(await call('/members/me', { method: 'PUT', body: JSON.stringify({ data }) }))).data;
export async function deleteAccount() {
  const res = await call('/members/me', { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  jwt = null;
}
export const getMatches = async () => (await json(await call('/members/me/matches'))).data;
export const getAffinities = async () => (await json(await call('/affinities?sort[0]=group&sort[1]=sortOrder&sort[2]=name&pagination[pageSize]=100'))).data;

// Invites: /entrar?convite=CODE keeps the code in this browser until the new account reaches /conta.
const INVITE_KEY = 'afim.invite';
export function keepInvite(code: string) {
  try { localStorage.setItem(INVITE_KEY, code); } catch {}
}
/** Records who invited this account, when a code is pending. The CMS ignores it for older accounts. */
export async function acceptPendingInvite() {
  let code: string | null = null;
  try { code = localStorage.getItem(INVITE_KEY); localStorage.removeItem(INVITE_KEY); } catch {}
  if (code) await call('/members/me/invite', { method: 'POST', body: JSON.stringify({ code }) }).catch(() => {});
}
export const getInvite = async () => (await json(await call('/members/me/invite'))).data as { code: string; accepted: number };

// Companies, shops and NGOs registered by the member. New and edited ones go to moderation.
export const getMyProfiles = async () => (await json(await call('/members/me/profiles'))).data;
export const saveMyProfile = async (data: unknown, documentId?: string) =>
  (await json(await call(documentId ? `/members/me/profiles/${documentId}` : '/members/me/profiles', {
    method: documentId ? 'PUT' : 'POST', body: JSON.stringify({ data }),
  }))).data;
export async function deleteMyProfile(documentId: string) {
  const res = await call(`/members/me/profiles/${documentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
