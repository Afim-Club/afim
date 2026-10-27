// @ts-check
// Runs the component catalog (src/pages): `npm run dev`.
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({ vite: { plugins: [tailwindcss()] } });
