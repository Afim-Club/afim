# Afim design system

[Português](README.pt-BR.md)

Plain CSS shared by `web/` and `partners/`. No build step, no dependencies, no external fonts (system font stack, so no third-party requests).

| File | Content |
| --- | --- |
| `tokens.css` | Design tokens as CSS custom properties (`--afim-*`): colors, typography, spacing, radius, layout. Dark mode via `prefers-color-scheme`. |
| `base.css` | Element defaults and the components below. |
| `afim.css` | Entry point that imports both. |

## Usage

Each site imports the entry point once, in its layout:

```astro
---
import '../../../design-system/afim.css';
---
```

Docker builds use the site folder as context, so the folder is passed as a named build context:

```bash
docker build --build-context design-system=design-system web
```

## Components (CSS classes)

| Class | Use |
| --- | --- |
| `.container` | Centered page column (`--afim-container` sets the width) |
| `.site-header`, `.brand`, `.site-footer` | Page shell |
| `.btn`, `.btn-secondary` | Buttons and button-like links (`<button>` is styled by default) |
| `.form`, `.field` | Form grid and label + input pair (inputs are styled by default) |
| `.cards`, `.card` | Responsive card grid and card |
| `.tag` | Pill label (also works on links) |
| `.alert`, `.alert-success`, `.alert-error` | Status messages (hidden while empty) |
| `.muted` | Secondary text |

## Changing the brand

Edit the tokens in `tokens.css` (light values in `:root`, dark values in the media query). The primary color is `#2f7d5b` (green). Keep text/background contrast at WCAG AA (4.5:1) or better.
