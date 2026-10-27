// Browser-side affinity filter shared by every listing (cards, search results, map).
// Logged-in members: always their own affinities, read through the authenticated /api/members/me call
// and kept only in memory (LGPD sensitive data: never in a URL, the static HTML or localStorage).
// Anonymous visitors: the affinities they pick, kept in this browser's localStorage.
import { getMember, mayHaveSession, restoreSession } from './auth';

/** Returns true when a profile with these affinity slugs and type should be shown. */
export type Test = (slugs: string[], type: string) => boolean;
export type Mode = { kind: 'member'; count: number } | { kind: 'visitor'; selected: string[] };

// Same rule as /api/members/me/matches: which profile types each preference finds.
const TYPES = { findPeople: ['professional'], findCompanies: ['company', 'ngo'], findShops: ['shop'] } as const;
const PICKED_KEY = 'afim.affinityFilter';

let test: Test | null = null;
const listeners = new Set<(test: Test | null) => void>();

/** Calls `cb` now and on every change. `null` means "show everything". */
export function onFilter(cb: (test: Test | null) => void) {
  listeners.add(cb);
  cb(test);
}

function set(next: Test | null) {
  test = next;
  listeners.forEach((cb) => cb(test));
}

export const readPicked = (): string[] => {
  try { return JSON.parse(localStorage.getItem(PICKED_KEY) ?? '[]'); } catch { return []; }
};

/** Visitor choice. An empty list shows everything. */
export function pick(slugs: string[]) {
  try { slugs.length ? localStorage.setItem(PICKED_KEY, JSON.stringify(slugs)) : localStorage.removeItem(PICKED_KEY); } catch {}
  const wanted = new Set(slugs);
  set(wanted.size ? (profile) => profile.some((s) => wanted.has(s)) : null);
}

/** Decides the mode for this page: the member's affinities when signed in, otherwise the visitor's choice. */
export async function start(): Promise<Mode> {
  if (mayHaveSession() && (await restoreSession().catch(() => false))) {
    const member = await getMember().catch(() => null);
    // Rows with a stance are answers on political issues: they never match profiles by themselves.
    const types = new Map<string, string[]>();
    for (const p of member?.affinities ?? []) {
      if (p.stance) continue;
      const t = (Object.keys(TYPES) as (keyof typeof TYPES)[]).filter((k) => p[k]).flatMap((k) => TYPES[k]);
      if (t.length) types.set(p.affinity.slug, t);
    }
    set(types.size ? (profile, type) => profile.some((s) => types.get(s)?.includes(type)) : null);
    return { kind: 'member', count: types.size };
  }
  const selected = readPicked();
  pick(selected);
  return { kind: 'visitor', selected };
}
