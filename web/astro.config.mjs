// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Public URL, used for canonical links, Open Graph and the sitemap.
  site: process.env.SITE_URL ?? 'https://afim.club',
  // Private (account) and search result pages stay out of the sitemap; they are noindex too.
  integrations: [sitemap({ filter: (page) => !/^\/(conta|entrar|explorar\/busca)(\/|$)/.test(new URL(page).pathname) })],
  // Fixed dev port so the CMS CORS allow-list matches (web 4321, partners 4322).
  server: { port: 4321 },
  vite: { plugins: [tailwindcss()] },
});
