# Design system do Afim

[English](README.md)

CSS puro compartilhado por `web/` e `partners/`. Sem etapa de build, sem dependências e sem fontes externas (fonte do sistema, então nenhuma requisição a terceiros).

| Arquivo | Conteúdo |
| --- | --- |
| `tokens.css` | Tokens de design como CSS custom properties (`--afim-*`): cores, tipografia, espaçamento, bordas, layout. Modo escuro via `prefers-color-scheme`. |
| `base.css` | Estilos padrão dos elementos e os componentes abaixo. |
| `afim.css` | Ponto de entrada que importa os dois. |

## Uso

Cada site importa o ponto de entrada uma vez, no layout:

```astro
---
import '../../../design-system/afim.css';
---
```

O build Docker usa a pasta do site como contexto, então a pasta é passada como build context nomeado:

```bash
docker build --build-context design-system=design-system web
```

## Componentes (classes CSS)

| Classe | Uso |
| --- | --- |
| `.container` | Coluna central da página (`--afim-container` define a largura) |
| `.site-header`, `.brand`, `.site-footer` | Estrutura da página |
| `.btn`, `.btn-secondary` | Botões e links com cara de botão (`<button>` já vem estilizado) |
| `.form`, `.field` | Grade de formulário e par rótulo + campo (inputs já vêm estilizados) |
| `.cards`, `.card` | Grade responsiva de cards e card |
| `.tag` | Etiqueta arredondada (funciona também em links) |
| `.alert`, `.alert-success`, `.alert-error` | Mensagens de status (ocultas enquanto vazias) |
| `.muted` | Texto secundário |

## Mudando a marca

Edite os tokens em `tokens.css` (valores claros em `:root`, escuros na media query). A cor primária é `#2f7d5b` (verde). Mantenha o contraste texto/fundo no nível WCAG AA (4.5:1) ou melhor.
