// Browser-side affinity filter shared by every listing (cards, search results, map).
// Logged-in members: always their own affinities, read through the authenticated /api/members/me call
// and kept only in memory (LGPD sensitive data: never in a URL, the static HTML or localStorage).
// Anonymous visitors: the affinities they pick, kept in this browser's localStorage.
// Afim always intersects: a profile must have every chosen affinity. A profile has a single political position,
// so the chosen spectrums count as one requirement (any of them), combined with AND with the rest.
import { getMember, mayHaveSession, restoreSession } from './auth';

/** Returns true when a profile with these affinity slugs and type should be shown. */
export type Test = (slugs: string[], type: string) => boolean;
export type Mode = { kind: 'member'; count: number } | { kind: 'visitor'; selected: string[] };

// Same rule as /api/members/me/matches: which profile types each preference finds.
const TYPES = { findPeople: ['professional'], findCompanies: ['company', 'ngo'], findShops: ['shop'] } as const;
const PICKED_KEY = 'afim.affinityFilter';
export const POSITION_GROUP = 'Política';

// Each requirement maps the affinity slugs that satisfy it to the profile types they find (null = any type).
type Requirement = Map<string, readonly string[] | null>;

function toTest(rule: Requirement[]): Test | null {
  const reqs = rule.filter((r) => r.size);
  if (!reqs.length) return null;
  return (slugs, type) => reqs.every((r) => slugs.some((s) => r.has(s) && (r.get(s) === null || r.get(s)!.includes(type))));
}

/** One requirement per affinity, plus one shared by every political spectrum. */
function rule(items: { slug: string; spectrum: boolean; types: readonly string[] | null }[]): Requirement[] {
  const spectrums: Requirement = new Map();
  const reqs: Requirement[] = [spectrums];
  for (const i of items) (i.spectrum ? spectrums : reqs[reqs.push(new Map()) - 1]).set(i.slug, i.types);
  return reqs;
}

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

/** Visitor choice, any profile type. An empty list shows everything. */
export function pick(picked: { slug: string; spectrum: boolean }[]) {
  try { picked.length ? localStorage.setItem(PICKED_KEY, JSON.stringify(picked.map((p) => p.slug))) : localStorage.removeItem(PICKED_KEY); } catch {}
  set(toTest(rule(picked.map((p) => ({ ...p, types: null })))));
}

/** Decides the mode for this page: the member's affinities when signed in, otherwise the visitor's choice. */
export async function start(): Promise<Mode> {
  if (mayHaveSession() && (await restoreSession().catch(() => false))) {
    const member = await getMember().catch(() => null);
    // Rows with a stance are answers on political issues: they never match profiles by themselves.
    const items = [];
    for (const p of member?.affinities ?? []) {
      if (p.stance) continue;
      const types = (Object.keys(TYPES) as (keyof typeof TYPES)[]).filter((k) => p[k]).flatMap((k) => TYPES[k]);
      if (types.length) items.push({ slug: p.affinity.slug as string, spectrum: p.affinity.group === POSITION_GROUP, types });
    }
    set(toTest(rule(items)));
    return { kind: 'member', count: items.length };
  }
  // The filter component applies the saved choice, since it knows which affinities are spectrums.
  return { kind: 'visitor', selected: readPicked() };
}
