// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';

// https://astro.build/config
export default defineConfig({
  // Public URL, used for canonical links, Open Graph and the sitemap.
  site: process.env.SITE_URL ?? 'https://afim.club',
  // Every page is rendered on demand in a Cloudflare Worker, so CMS changes show up without a rebuild.
  output: 'server',
  // No Cloudflare Images or KV sessions: the site uses neither, so the Worker needs no extra bindings.
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  // Rendered pages are kept in the Cloudflare edge cache for a minute; after that the old copy is
  // still served (for up to a day) while a fresh one is rendered, so a CMS outage doesn't take the site down.
  cache: { provider: cacheCloudflare() },
  routeRules: {
    '/': { maxAge: 60, swr: 86400 },
    '/[...path]': { maxAge: 60, swr: 86400 },
  },
  // Fixed dev port so the CMS CORS allow-list matches (4321).
  server: { port: 4321 },
  vite: { plugins: [tailwindcss()] },
});
