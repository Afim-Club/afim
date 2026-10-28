// Blog RSS 2.0 feed: /blog/rss.xml, every published post, newest first.
import type { APIRoute } from 'astro';
import { getBlogPosts } from '../../lib/content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://afim.club');
  const items = (await getBlogPosts()).map((p) => {
    const link = new URL(`/blog/${p.slug}`, base).href;
    return `<item><title>${esc(p.title)}</title><link>${link}</link><guid>${link}</guid><pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}${p.tags.map((t) => `<category>${esc(t.name)}</category>`).join('')}</item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog do Afim</title><link>${new URL('/blog', base).href}</link><description>Novidades do Afim, Bitcoin Lightning e economia entre afins.</description><language>pt-BR</language>${items.join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
