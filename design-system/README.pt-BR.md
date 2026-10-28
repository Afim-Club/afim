# Design system do Afim

[English](README.md)

Tema Tailwind v4, componentes Astro e assets de marca usados pelo `web/`. Segue o modelo do design system do SiteTune, mas nativo em Astro: os componentes viram HTML estático sem JavaScript no cliente, e nada é publicado em registry (os sites usam como dependência local `file:`).

```bash
cd design-system && npm install
npm run dev     # catálogo de componentes em http://localhost:4321
npm run build   # catálogo estático em dist/
```

## O que tem aqui

| Caminho | |
| --- | --- |
| `src/theme.css` | **Fonte única** dos tokens: escalas `primary` (verde, `600` = `#2f7d5b`) e `neutral`, cores semânticas, fonte, raio, estilos base |
| `src/components/` | Componentes Astro: `Logo`, `SiteHeader`, `SiteFooter`, `Container`, `Button`, `Badge`, `Card`, `FormField`, `Input`, `Select`, `Textarea`, `Alert`, `EmptyState` |
| `src/pages/index.astro` | O catálogo: todos os tokens e componentes, no claro e no escuro |
| `assets/brand/` | `afim-mark.svg` (símbolo) e `favicon.svg` (se adapta ao modo escuro) |

O símbolo são dois círculos e o espaço que eles compartilham: afinidade.

## Tokens

Os componentes usam **cores semânticas**, que mudam com o tema do sistema operacional (`prefers-color-scheme`), então não precisam de variantes `dark:`:

| Sufixo da classe | Papel |
| --- | --- |
| `page`, `surface` | Fundo da página, fundo de card/painel |
| `fg`, `muted` | Texto, texto secundário |
| `line` | Bordas |
| `brand`, `brand-hover`, `brand-soft`, `on-brand` | Ações e links, hover, fundo tingido, texto sobre a marca |
| `success`, `warning`, `danger` | Status |

Use como `bg-surface`, `text-muted`, `border-line`, `bg-brand text-on-brand`, ... As escalas brutas (`bg-primary-600`, `text-neutral-500`) existem para o caso raro em que nenhuma cor semântica serve. Prefira classes de token a hex ou valores arbitrários.

A fonte é a do sistema, então as páginas não fazem requisições de fonte a terceiros.

## Usando num site

```bash
npm install file:../design-system tailwindcss @tailwindcss/vite
```

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ vite: { plugins: [tailwindcss()] } });
```

```css
/* src/styles/global.css, importado pelo layout */
@import "tailwindcss";
@import "@afim/design-system/theme.css";
@source "../../../design-system/src"; /* o Tailwind ignora node_modules */
```

```astro
---
import Button from '@afim/design-system/components/Button.astro';
---
<Button href="/cadastro">Cadastre seu negócio</Button>
```

O `Alert` pega o tom de `data-tone`, então um script pode trocá-lo: `el.dataset.tone = 'danger'`.

## Docker

Os Dockerfiles dos sites usam a pasta do site como build context e recebem esta pasta como context nomeado, copiada para `../design-system` antes do `npm ci`:

```bash
docker build --build-context design-system=design-system web
```

Os componentes não podem importar pacotes em tempo de execução (imports só de tipo podem): na imagem o design system não tem `node_modules` próprio, e quem faz o trabalho são o `astro` e o `tailwindcss` do site.
