# Afim design system

[Português](README.pt-BR.md)

Tailwind v4 theme, Astro components and brand assets shared by `web/` and `partners/`. Modeled on the SiteTune design system, but native to Astro: components render to static HTML with no client-side JavaScript, and nothing is published to a registry (the sites use it as a local `file:` dependency).

```bash
cd design-system && npm install
npm run dev     # component catalog at http://localhost:4321
npm run build   # static catalog in dist/
```

## What's in here

| Path | |
| --- | --- |
| `src/theme.css` | **Single source of truth** for tokens: `primary` (green, `600` = `#2f7d5b`) and `neutral` ramps, semantic colors, font, radius, base styles |
| `src/components/` | Astro components: `Logo`, `SiteHeader`, `SiteFooter`, `Container`, `Button`, `Badge`, `Card`, `FormField`, `Input`, `Select`, `Textarea`, `Alert`, `EmptyState` |
| `src/pages/index.astro` | The catalog: every token and component, in light and dark |
| `assets/brand/` | `afim-mark.svg` (symbol) and `favicon.svg` (adapts to dark mode) |

The symbol is two circles and the ground they share: affinity.

## Tokens

Components use **semantic colors**, which switch with the OS color scheme (`prefers-color-scheme`), so they need no `dark:` variants:

| Class suffix | Role |
| --- | --- |
| `page`, `surface` | Page background, card/panel background |
| `fg`, `muted` | Body text, secondary text |
| `line` | Borders |
| `brand`, `brand-hover`, `brand-soft`, `on-brand` | Actions and links, hover, tinted background, text on brand |
| `success`, `warning`, `danger` | Status |

Use them as `bg-surface`, `text-muted`, `border-line`, `bg-brand text-on-brand`, ... The raw ramps (`bg-primary-600`, `text-neutral-500`) are there for the rare case a semantic color does not fit. Prefer token classes over hex or arbitrary values.

Fonts are the system stack, so pages make no third-party font requests.

## Using it in a site

```bash
npm install file:../design-system tailwindcss @tailwindcss/vite
```

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ vite: { plugins: [tailwindcss()] } });
```

```css
/* src/styles/global.css, imported by the layout */
@import "tailwindcss";
@import "@afim/design-system/theme.css";
@source "../../../design-system/src"; /* Tailwind skips node_modules */
```

```astro
---
import Button from '@afim/design-system/components/Button.astro';
---
<Button href="/cadastro">Cadastre seu negócio</Button>
```

`Alert` takes its tone from `data-tone`, so a script can switch it: `el.dataset.tone = 'danger'`.

## Docker

The site Dockerfiles use the site folder as build context and get this folder as a named context, copied to `../design-system` before `npm ci`:

```bash
docker build --build-context design-system=design-system web
```

Components must not import packages at runtime (type-only imports are fine): in the image the design system has no `node_modules` of its own, and the site's `astro` and `tailwindcss` do the work.
