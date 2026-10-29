import { memo } from './memo';

const BASE = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';

export type Category = {
  documentId: string;
  name: string;
  slug: string;
  parent?: Category | null;
  children?: Category[];
};

export type Profile = {
  documentId: string;
  profileType: 'professional' | 'company' | 'shop' | 'ngo';
  name: string;
  slug: string;
  description?: string;
  categories?: Category[];
  affinities?: { name: string; slug: string; group?: string | null }[];
  location?: { city?: string; state?: string; lat?: number; lng?: number } | null;
  mediaLinks?: { platform: string; url: string }[];
  extra?: ({ __component: string } & Record<string, unknown>)[];
};

export const TYPE_LABELS: Record<Profile['profileType'], string> = {
  professional: 'Profissional',
  company: 'Empresa',
  shop: 'Comércio',
  ngo: 'ONG',
};

// Strapi caps pageSize at 100, so walk every page. Cached for a minute (see memo.ts).
const fetchAll = <T>(path: string, query: string) => memo(`${path}?${query}`, () => loadAll<T>(path, query));

async function loadAll<T>(path: string, query: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}/api/${path}?${query}&pagination[page]=${page}&pagination[pageSize]=100`);
    if (!res.ok) throw new Error(`Strapi ${path} responded ${res.status}`);
    const json = await res.json();
    out.push(...json.data);
    if (page >= json.meta.pagination.pageCount) return out;
  }
}

const PROFILE_POPULATE = 'populate[categories]=true&populate[affinities]=true&populate[location]=true&populate[mediaLinks]=true&populate[extra][populate]=*';

export const getCategories = () =>
  fetchAll<Category>('categories', 'populate[parent]=true&populate[children]=true&sort=name');

export const getProfiles = (filters = '') =>
  fetchAll<Profile>('profiles', `${PROFILE_POPULATE}&sort=name${filters ? `&${filters}` : ''}`);

export const profilesBySlugs = (slugs: string[]) =>
  getProfiles(slugs.map((s, i) => `filters[categories][slug][$in][${i}]=${encodeURIComponent(s)}`).join('&'));

// Political affinities still filter listings but are never shown on a profile page.
export const isPolitical = (a: { group?: string | null }) => a.group === 'Política' || a.group === 'Pautas políticas';

export type Affinity = { name: string; slug: string; group?: string | null; lean?: number | null };

/** Affinities a profile can declare: political issues (with a `lean`) are only answered by members. */
export const getProfileAffinities = async () =>
  (await fetchAll<Affinity>('affinities', 'fields[0]=name&fields[1]=slug&fields[2]=group&fields[3]=lean&sort[0]=group&sort[1]=sortOrder&sort[2]=name'))
    .filter((a) => a.lean === null || a.lean === undefined);

// Per-type details (profile.extra): field labels and enum values in Portuguese, for the profile page and the /conta/perfis form.
export const EXTRA_FIELDS: Record<Profile['profileType'], { key: string; label: string; options?: Record<string, string>; kind?: 'boolean' | 'text' }[]> = {
  professional: [
    { key: 'seniority', label: 'Nível de experiência', options: { intern: 'Estágio', junior: 'Júnior', mid: 'Pleno', senior: 'Sênior', lead: 'Liderança' } },
    { key: 'openToWork', label: 'Aberto a oportunidades', kind: 'boolean' },
  ],
  company: [
    { key: 'legalName', label: 'Razão social' },
    { key: 'employeeRange', label: 'Funcionários', options: { '1-10': '1 a 10', '11-50': '11 a 50', '51-200': '51 a 200', '201-1000': '201 a 1000', '1000+': 'Mais de 1000' } },
    { key: 'hiring', label: 'Contratando', kind: 'boolean' },
  ],
  shop: [
    { key: 'openingHours', label: 'Horário de funcionamento', kind: 'text' },
    { key: 'offersDiscount', label: 'Oferece desconto', kind: 'boolean' },
    { key: 'discountDetails', label: 'Detalhes do desconto', kind: 'text' },
  ],
  ngo: [
    { key: 'cause', label: 'Causa' },
    { key: 'acceptsVolunteers', label: 'Aceita voluntários', kind: 'boolean' },
  ],
};
