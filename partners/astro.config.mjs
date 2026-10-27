// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Fixed dev port so the CMS CORS allow-list matches (web 4321, partners 4322).
  server: { port: 4322 },
});
