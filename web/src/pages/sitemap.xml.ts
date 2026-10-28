// Sitemap, built on request from the CMS (pages are rendered on demand, so @astrojs/sitemap can't list them).
// Private and search pages (/conta, /entrar, /explorar/busca, /avise-me/sair) are noindex and left out.
import type { APIRoute } from 'astro';
import { getBlogPosts, getHelp, getPages, helpUrl } from '../lib/content';
import { cityUrl, getDirectory, inCategory, stateUrl } from '../lib/places';
import { getProfiles } from '../lib/strapi';

const STATIC = ['/', '/planos', '/avise-me', '/parceiros', '/parceiros/cadastro', '/ajuda', '/blog', '/explorar', '/explorar/estados', '/explorar/mapa'];

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://afim.club');
  const [pages, help, posts, profiles, { states, categories }] = await Promise.all([
    getPages(), getHelp(), getBlogPosts(), getProfiles(), getDirectory(),
  ]);
  const paths = [
    ...STATIC,
    ...pages.filter((p) => !p.seo?.noindex).map((p) => `/${p.slug}`),
    ...help.flatMap((t) => [helpUrl(t), ...t.articles.map((a) => helpUrl(t, a))]),
    ...posts.map((p) => `/blog/${p.slug}`),
    ...new Set(posts.flatMap((p) => p.tags.map((t) => `/blog/tag/${t.slug}`))),
    ...categories.map((c) => `/explorar/categorias/${c.slug}`),
    ...profiles.map((p) => `/explorar/perfis/${p.slug}`),
    ...states.flatMap((s) => [
      stateUrl(s),
      ...s.cities.flatMap((c) => [
        cityUrl(s, c),
        ...categories.filter((cat) => inCategory(c.profiles, cat).length).map((cat) => `${cityUrl(s, c)}/${cat.slug}`),
      ]),
    ]),
  ];
  const urls = paths.map((p) => `<url><loc>${new URL(p, base).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
