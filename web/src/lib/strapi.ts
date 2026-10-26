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

// Strapi caps pageSize at 100, so walk every page.
async function fetchAll<T>(path: string, query: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}/api/${path}?${query}&pagination[page]=${page}&pagination[pageSize]=100`);
    if (!res.ok) throw new Error(`Strapi ${path} responded ${res.status}`);
    const json = await res.json();
    out.push(...json.data);
    if (page >= json.meta.pagination.pageCount) return out;
  }
}

const PROFILE_POPULATE = 'populate[categories]=true&populate[location]=true&populate[mediaLinks]=true&populate[extra][populate]=*';

export const getCategories = () =>
  fetchAll<Category>('categories', 'populate[parent]=true&populate[children]=true&sort=name');

export const getProfiles = (filters = '') =>
  fetchAll<Profile>('profiles', `${PROFILE_POPULATE}&sort=name${filters ? `&${filters}` : ''}`);

export const profilesBySlugs = (slugs: string[]) =>
  getProfiles(slugs.map((s, i) => `filters[categories][slug][$in][${i}]=${encodeURIComponent(s)}`).join('&'));
