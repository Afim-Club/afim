// Marketing-site content from Strapi (home, plans, free pages, SEO). Every fetch runs at build time.
// A missing type (an older CMS) or an empty single type returns null, so pages fall back to defaults.
import { marked } from 'marked';

const BASE = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';

export type Media = { url: string; alternativeText?: string | null } | null;
export type Seo = { metaTitle?: string | null; metaDescription?: string | null; ogImage?: Media; noindex?: boolean | null } | null;
export type Item = { title: string; text?: string | null };
export type FaqItem = { question: string; answer: string };
export type Section =
  | { __component: 'marketing.steps'; title?: string; items: Item[] }
  | { __component: 'marketing.feature-grid'; title?: string; text?: string; note?: string; ctaLabel?: string; ctaHref?: string; secondaryLabel?: string; secondaryHref?: string; items: Item[] }
  | { __component: 'marketing.cta-band'; title: string; text?: string; ctaLabel?: string; ctaHref?: string; secondaryLabel?: string; secondaryHref?: string; dark?: boolean }
  | { __component: 'marketing.faq'; title?: string; items: FaqItem[] }
  | { __component: 'marketing.directory-showcase'; title?: string; linkLabel?: string };

export type HomePage = { heroTitle: string; heroText?: string; heroNote?: string; searchPlaceholder?: string; sections: Section[]; seo: Seo };
export type PricingPage = { title: string; intro?: string; lightningDiscountPercent?: number | null; featureLabels: { key: string; label: string }[]; faq: FaqItem[]; seo: Seo };
export type Plan = {
  name: string; slug: string; description?: string; priceMonthlyBrl: number; priceYearlyBrl: number; priceMonthlySats?: number | null;
  features?: string[] | null; highlights?: string[] | null; featured?: boolean; active?: boolean; sortOrder?: number;
};
export type Page = { title: string; slug: string; body?: string; seo: Seo };
export type SiteSetting = { siteName?: string; defaultDescription?: string; ogImage?: Media; footerText?: string };
export type ModuleSeo = { module: string; titleTemplate?: string; defaultDescription?: string; ogImage?: Media };

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}/api/${path}`);
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Strapi ${path} responded ${res.status}`);
  return (await res.json()).data as T;
}

const SEO = 'populate[seo][populate]=*';

// Fetched once per build: every page's layout asks for them.
let settings: Promise<SiteSetting | null> | undefined;
let modules: Promise<ModuleSeo[]> | undefined;
export const getSiteSetting = () => (settings ??= get<SiteSetting>('site-setting?populate=*'));
export const getModuleSeo = async (module: string) =>
  (await (modules ??= get<ModuleSeo[]>('module-seos?populate=*').then((m) => m ?? []))).find((m) => m.module === module) ?? null;

export const getHomePage = () => get<HomePage>(`home-page?populate[sections][populate]=*&${SEO}`);
export const getPricingPage = () => get<PricingPage>(`pricing-page?populate[featureLabels]=true&populate[faq]=true&${SEO}`);
export const getPlans = async () =>
  ((await get<Plan[]>('plans?sort=sortOrder&pagination[pageSize]=100')) ?? []).filter((p) => p.active !== false);
export const getPages = async () => (await get<Page[]>(`pages?${SEO}&pagination[pageSize]=100`)) ?? [];

/** Absolute URL for a Strapi upload (local uploads come back as /uploads/...). */
export const mediaUrl = (m: Media | undefined) =>
  !m?.url ? undefined : m.url.startsWith('http') ? m.url : `${import.meta.env.PUBLIC_STRAPI_URL ?? BASE}${m.url}`;

/** Strapi rich text (Markdown) to HTML. The content is written by admins only. */
export const markdown = (s?: string | null) => (s ? (marked.parse(s, { async: false }) as string) : '');

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
