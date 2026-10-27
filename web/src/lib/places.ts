// Browse-by-place directory: groups active profiles by state (UF) and city.
// City is free text in the CMS, so cities are grouped by a slug of their name
// (accents, case and extra spaces ignored) and shown with the most used spelling.
import { getCategories, getProfiles, type Category, type Profile } from './strapi';

export const STATES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type City = { slug: string; name: string; profiles: Profile[] };
export type State = { uf: string; slug: string; name: string; cities: City[]; profiles: Profile[] };

export const stateUrl = (s: { slug: string }) => `/${s.slug}`;
export const cityUrl = (s: { slug: string }, c: { slug: string }) => `/${s.slug}/${c.slug}`;

let cache: Promise<{ states: State[]; categories: Category[] }> | undefined;

/** Every state with at least one profile, sorted by name; built once per build. */
export function getDirectory() {
  return (cache ??= build());
}

async function build() {
  const [profiles, categories] = await Promise.all([getProfiles(), getCategories()]);
  const byUf = new Map<string, Map<string, { spellings: Map<string, number>; profiles: Profile[] }>>();
  const stateProfiles = new Map<string, Profile[]>();
  for (const p of profiles) {
    const uf = p.location?.state?.trim().toUpperCase() ?? '';
    if (!STATES[uf]) continue;
    if (!stateProfiles.has(uf)) { stateProfiles.set(uf, []); byUf.set(uf, new Map()); }
    stateProfiles.get(uf)!.push(p);
    const name = p.location?.city?.trim().replace(/\s+/g, ' ') ?? '';
    const slug = slugify(name);
    if (!slug) continue;
    const cities = byUf.get(uf)!;
    if (!cities.has(slug)) cities.set(slug, { spellings: new Map(), profiles: [] });
    const city = cities.get(slug)!;
    city.spellings.set(name, (city.spellings.get(name) ?? 0) + 1);
    city.profiles.push(p);
  }
  const states: State[] = [...byUf].map(([uf, cities]) => ({
    uf,
    slug: uf.toLowerCase(),
    name: STATES[uf],
    profiles: stateProfiles.get(uf)!,
    cities: [...cities]
      .map(([slug, c]) => ({ slug, name: [...c.spellings].sort((a, b) => b[1] - a[1])[0][0], profiles: c.profiles }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }));
  states.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { states, categories };
}

/** Profiles in a category or in any of its subcategories, as on /categorias/<slug>. */
export function inCategory(profiles: Profile[], category: Category) {
  const slugs = new Set([category.slug, ...(category.children ?? []).map((c) => c.slug)]);
  return profiles.filter((p) => p.categories?.some((c) => slugs.has(c.slug)));
}

/** Categories with at least one of these profiles, with their counts. */
export function categoryCounts(profiles: Profile[], categories: Category[]) {
  return categories
    .map((category) => ({ category, count: inCategory(profiles, category).length }))
    .filter((c) => c.count > 0);
}

/** Link to the profile's city page (or state page), or undefined when its UF is unknown. */
export function placeHref(p: Profile) {
  const uf = p.location?.state?.trim().toUpperCase() ?? '';
  if (!STATES[uf]) return undefined;
  const city = slugify(p.location?.city ?? '');
  return city ? `/${uf.toLowerCase()}/${city}` : `/${uf.toLowerCase()}`;
}
