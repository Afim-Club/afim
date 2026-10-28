// Marketing-site content from Strapi (home, plans, free pages, SEO). Fetched on each request,
// cached in memory for a minute (memo.ts).
// A missing type (an older CMS) or an empty single type returns null, so pages fall back to defaults.
import { marked } from 'marked';
import { memo } from './memo';

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
export type LaunchPage = {
  badge?: string; title: string; text?: string; items: Item[]; consentText?: string; doneTitle?: string; doneText?: string; seo: Seo;
};
export type Plan = {
  name: string; slug: string; description?: string; priceMonthlyBrl: number; priceYearlyBrl: number; priceMonthlySats?: number | null;
  features?: string[] | null; highlights?: string[] | null; featured?: boolean; active?: boolean; sortOrder?: number;
};
export type Page = { title: string; slug: string; body?: string; seo: Seo };
export type HelpArticle = { title: string; slug: string; summary?: string; body?: string; sortOrder?: number; topic?: { slug: string } | null; seo: Seo };
export type HelpTopic = { name: string; slug: string; description?: string; articles: HelpArticle[] };
export type BlogTag = { name: string; slug: string };
export type BlogPost = { title: string; slug: string; date: string; author?: string; excerpt?: string; body?: string; cover?: Media; tags: BlogTag[]; seo: Seo };
export type SiteSetting = { siteName?: string; defaultDescription?: string; ogImage?: Media; footerText?: string };
export type ModuleSeo = { module: string; titleTemplate?: string; defaultDescription?: string; ogImage?: Media };

const get = <T>(path: string) => memo(path, () => load<T>(path));

async function load<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}/api/${path}`);
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Strapi ${path} responded ${res.status}`);
  return (await res.json()).data as T;
}

const SEO = 'populate[seo][populate]=*';

// Every page's layout asks for them.
export const getSiteSetting = () => get<SiteSetting>('site-setting?populate=*');
export const getModuleSeo = async (module: string) =>
  ((await get<ModuleSeo[]>('module-seos?populate=*')) ?? []).find((m) => m.module === module) ?? null;

export const getHomePage = () => get<HomePage>(`home-page?populate[sections][populate]=*&${SEO}`);
export const getPricingPage = () => get<PricingPage>(`pricing-page?populate[featureLabels]=true&populate[faq]=true&${SEO}`);
export const getLaunchPage = () => get<LaunchPage>(`launch-page?populate[items]=true&${SEO}`);
export const getPlans = async () =>
  ((await get<Plan[]>('plans?sort=sortOrder&pagination[pageSize]=100')) ?? []).filter((p) => p.active !== false);
export const getPages = async () => (await get<Page[]>(`pages?${SEO}&pagination[pageSize]=100`)) ?? [];

/** Help center: topics in order, each with its published articles in order. Topics without articles are left out. */
export const getHelp = () => memo('help', loadHelp);
const loadHelp = async (): Promise<HelpTopic[]> => {
  const topics = (await get<Omit<HelpTopic, 'articles'>[]>('help-topics?sort=sortOrder&pagination[pageSize]=100')) ?? [];
  const articles =
    (await get<HelpArticle[]>(`help-articles?sort=sortOrder&populate[topic][fields][0]=slug&${SEO}&pagination[pageSize]=100`)) ?? [];
  return topics
    .map((t) => ({ ...t, articles: articles.filter((a) => a.topic?.slug === t.slug) }))
    .filter((t) => t.articles.length);
};
export const helpUrl = (topic: { slug: string }, article?: { slug: string }) =>
  `/ajuda/${topic.slug}${article ? `/${article.slug}` : ''}`;

/** Blog: published posts, newest first. */
export const getBlogPosts = async () =>
  (await get<BlogPost[]>(`blog-posts?sort=date:desc&populate[tags]=true&populate[cover]=true&${SEO}&pagination[pageSize]=100`)) ?? [];
export const blogDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Absolute URL for a Strapi upload (local uploads come back as /uploads/...). */
export const mediaUrl = (m: Media | undefined) =>
  !m?.url ? undefined : m.url.startsWith('http') ? m.url : `${import.meta.env.PUBLIC_STRAPI_URL ?? BASE}${m.url}`;

/** Strapi rich text (Markdown) to HTML. The content is written by admins only. */
export const markdown = (s?: string | null) => (s ? (marked.parse(s, { async: false }) as string) : '');

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
