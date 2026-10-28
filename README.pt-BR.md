# Afim

> 🇺🇸 [Read in English](README.md)

**Afim** ([afim.club](https://afim.club)) é um diretório open source que conecta pessoas, empresas e comércios que compartilham valores semelhantes.

- Pessoas encontram vagas de emprego e descontos em estabelecimentos parceiros selecionados.
- Empresas contratam pessoas que compartilham seus valores.
- Comércios e fornecedores fazem negócios com parceiros que compartilham seus valores.

O site público é dividido em módulos, cada um com seu prefixo de URL: a home de divulgação fica na raiz (`/`, `/planos`, `/avise-me` e páginas livres como `/sobre`, `/valores` e `/privacidade`), com textos, planos e SEO editados no Strapi, a central de ajuda fica em `/ajuda` (tópicos e artigos editados no Strapi, começando por como usar uma carteira Lightning), e o diretório fica em `/explorar`.

O diretório pode ser navegado por lugar, como um diretório clássico: todo o diretório fica em `/explorar` (as URLs antigas redirecionam com 301): `/explorar/estados` lista os estados, e `/explorar/sp`, `/explorar/sp/campinas` e `/explorar/sp/campinas/servicos` listam os perfis ativos por estado, cidade e categoria, com contagens e trilha de navegação.

## Componentes

| Pasta | Descrição | Endereço previsto |
| --- | --- | --- |
| `web/` | Site público dos usuários (Astro) | `afim.club` |
| `partners/` | Site dos afiliados: empresas e comércios (Astro) | `partners.afim.club` |
| `cms/` | Backoffice e API (Strapi) | `dash.afim.club` |
| `infra/` | Deploy: stack Dockge do CMS (`infra/dockge/`), além de Docker Swarm, Traefik e Jenkins | - |
| `design-system/` | Design system: tema Tailwind, componentes Astro e assets de marca usados por `web/` e `partners/` | - |

## Stack

- **Front-end:** Astro (SSG/SSR)
- **Back-end / admin:** Strapi CMS
- **Banco de dados:** MariaDB
- **Infraestrutura:** Cloudflare Workers (sites) + Docker no Dockge (CMS); Docker Swarm + Traefik como alternativa
- **CI/CD:** Jenkins, SonarQube e Trivy

## Primeiros passos

1. Copie o modelo de variáveis de ambiente e preencha os valores:
   ```bash
   cp .env.example .env
   ```
2. Nunca versione o `.env` nem qualquer segredo no repositório.

## Desenvolvimento local

Pré-requisitos: Docker (com Compose) e Node.js 20–26. O MariaDB roda no Docker; o CMS e os dois sites Astro rodam na máquina, com recarga automática.

```bash
docker compose up -d --wait                  # MariaDB na :3306
cp cms/.env.example cms/.env                 # valores só para dev, carrega dados de exemplo (SEED=true)
cd cms && npm install && npm run develop     # Strapi na :1337
```

Em outros terminais:

```bash
cd web && npm install && npm run dev         # site público na :4321
cd partners && npm install && npm run dev    # site de parceiros na :4322
```

| Endereço | O quê |
| --- | --- |
| http://localhost:1337/admin | Admin do Strapi (crie o primeiro usuário admin no primeiro acesso) |
| http://localhost:1337/api/profiles | API REST |
| http://localhost:4321 | Site público (`web/`) |
| http://localhost:4322 | Site de parceiros (`partners/`) |

Ou suba tudo de uma vez com `./dev.sh` (pare com `./dev.sh stop`; logs em `.tmp/`). Para acessar os servidores de dev por um túnel como o cloudflared, defina `DEV_WEB_HOST`, `DEV_PARTNERS_HOST` e `DEV_CMS_HOST` no `.env` da raiz (ex.: `dev.afim.club`): o script libera esses hostnames, aponta o navegador para `https://$DEV_CMS_HOST` e inclui os sites no CORS do CMS. Nesse modo os sites escutam em todas as interfaces.

> **Pare o CMS antes de trocar de branch** (`./dev.sh stop`). O `strapi develop` recarrega quando os arquivos mudam e, se um checkout remover tipos de conteúdo mesmo por instantes, o Strapi apaga as tabelas deles (com dados e relações).

As portas são fixas porque o CMS só aceita requisições do navegador vindas de `localhost:4321` e `localhost:4322` (`CORS_ORIGINS`). Em dev, o `web/` consulta o CMS a cada requisição, então o Strapi precisa estar rodando. Pare o banco com `docker compose stop`; `docker compose down -v` também apaga os dados.

## Deploy (Cloudflare Workers + Dockge)

O CMS roda como container Docker num host gerenciado pelo [Dockge](https://github.com/louislam/dockge); os dois sites Astro são estáticos e servidos pelo Cloudflare Workers (static assets, sem adapter nem código de servidor). O setup Swarm/Jenkins em `infra/stack.yml` continua como alternativa.

### CMS no Dockge

1. No Dockge, crie uma stack (ex.: `afim-cms`) e cole o [`infra/dockge/compose.yaml`](infra/dockge/compose.yaml).
2. Preencha o `.env` da stack a partir do [`infra/dockge/.env.example`](infra/dockge/.env.example). Gere cada segredo com `openssl rand -base64 32`.
3. Faça o deploy. A imagem `ghcr.io/afim-club/afim-cms` é publicada pelo GitHub Action `CMS image` a cada push na `main` que mexe em `cms/` (tags `latest` e o SHA do commit); **o Update do Dockge baixa a nova**. Defina `CMS_TAG` com um SHA para fixar uma versão ou voltar atrás. O pacote precisa ser público no GitHub (Package settings → Change visibility), ou rode `docker login ghcr.io` no host.
4. Exponha a porta `CMS_PORT` (1337) como `https://dash.afim.club` por um proxy reverso ou um Cloudflare Tunnel. O container confia em `X-Forwarded-*` (`PROXY=true`).

Os dados ficam em dois volumes nomeados: `mariadb-data` (banco) e `uploads` (mídias do painel). Faça backup dos dois.

### Sites no Cloudflare Workers

Cada site tem um `wrangler.jsonc` (`afim-web` e `afim-partners`) que publica `dist/` como static assets. Conecte o repositório em **Workers & Pages → Create → Import a repository** (Workers Builds), uma vez por site:

| Configuração | `web` | `partners` |
| --- | --- | --- |
| Root directory | `web` | `partners` |
| Build command | `npm run build` | `npm run build` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` |
| Variáveis de build | `STRAPI_URL`, `PUBLIC_STRAPI_URL`, `PUBLIC_AUTH_PROVIDERS`, `SITE_URL` (URLs canônicas e sitemap, padrão `https://afim.club`), `PUBLIC_TURNSTILE_SITE_KEY` (opcional, formulário do /avise-me) | `PUBLIC_STRAPI_URL`, `PUBLIC_TURNSTILE_SITE_KEY` |
| Domínio | `afim.club` | `partners.afim.club` |

ou publique de uma máquina com `npm run deploy` (precisa de `wrangler login` ou `CLOUDFLARE_API_TOKEN`, e das mesmas variáveis no shell).

- `STRAPI_URL` e `PUBLIC_STRAPI_URL` são o endereço público do CMS (`https://dash.afim.club`). O build do `web` busca nele os dados de todas as páginas, então **o CMS precisa estar no ar e acessível pela Cloudflare durante o build**.
- O `web` é estático: conteúdo novo ou alterado só aparece depois de um novo build. Crie um Deploy Hook (Worker → Settings → Builds → Deploy Hooks) e cadastre a URL como webhook no Strapi (Settings → Webhooks, eventos de Profile/Category/Affinity, e também Home page, Pricing page, Launch page, Help topic, Help article, Page, Plan, Site settings e Module SEO) para que cada alteração dispare um build.
- Use os domínios próprios, não `*.workers.dev`: o login de membros depende de o site e o CMS serem do mesmo site (`afim.club` e `dash.afim.club`). Inclua o endereço de cada site em `CORS_ORIGINS` e defina `WEB_URL` no CMS.
- O cache longo de `/_astro/*` vem de `public/_headers`.

## Privacidade e dados

Os perfis são construídos a partir de informações **declaradas pelos próprios usuários** (opt-in). Os dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD).

### Lista de e-mails do lançamento

O `/avise-me` recolhe os e-mails de quem quer saber quando os novos recursos chegarem. Guarda só o e-mail, um nome opcional, sobre o que a pessoa quer novidades e a data e a versão do seu consentimento explícito. A lista nunca pode ser lida pela API (só no admin), o formulário responde igual para e-mails novos e já cadastrados, e o link em cada e-mail (`/avise-me/sair`) apaga o cadastro.

### Contas de membros e afinidades

As pessoas criam a conta no site público (`/entrar`) com e-mail e senha ou login social (Google, Facebook, GitHub, LinkedIn) e completam o cadastro em `/conta`:

- **Afinidades** são valores em comum (ex.: veganismo, sustentabilidade), mantidos no CMS. Empresas e comércios declaram as suas publicamente no perfil.
- O membro marca suas afinidades. "Encontrados para você" lista as pessoas, empresas, ONGs e comércios ativos que as compartilham, com as afinidades em comum.
- Afinidades políticas têm dois níveis: o membro responde a pautas (concordo, discordo ou indiferente) e o CMS calcula sua posição, da extrema-esquerda à extrema-direita. O membro também marca as posições (qualquer uma das 7) cujos perfis quer encontrar.
- Afinidades podem revelar convicções, então são tratadas como **dados pessoais sensíveis** (LGPD art. 11): só são guardadas com consentimento explícito (data e versão dos termos ficam registradas), nunca são públicas nem listadas pela API (só o próprio membro as lê, via `/api/members/me`), e desmarcar o consentimento as apaga. O membro pode excluir a conta e todos os dados a qualquer momento.
- **Perfis dos membros**: em `/conta/perfis` o membro cadastra o próprio perfil profissional (um) e as empresas, comércios e ONGs que representa (até 10 no total), com as afinidades que cada um declara publicamente e uma posição opcional no mapa, obtida da localização do navegador e arredondada para cerca de 1 km. Todos passam por moderação (`review`); editar volta para revisão, um perfil bloqueado só pode ser excluído, e excluir a conta exclui os perfis também.
- **Filtro por afinidade**: todas as listagens do site público (início, categorias, estados e cidades, busca e mapa) mostram só os perfis que têm todas as afinidades do membro logado (interseção: Software livre + Direita mostra só os perfis com as duas). Um perfil tem uma única posição política, então vários espectros marcados valem como "qualquer um deles", combinados com o resto. "Encontrados para você" na conta segue a mesma regra. Quem não tem conta escolhe afinidades num filtro acima da lista (a escolha fica no navegador). As páginas continuam estáticas: o navegador esconde os perfis que não combinam, usando as afinidades que cada perfil declara publicamente. As afinidades do membro só são lidas pela chamada autenticada `/api/members/me` e ficam em memória, nunca numa URL ou no HTML da página. A página de um perfil lista as afinidades dele, menos as políticas ("Política" e "Pautas políticas"), que só servem para filtrar.
- **Convites**: cada membro tem um link pessoal (`/entrar?convite=CODIGO`) para copiar ou enviar pelo WhatsApp, já que ainda não há provedor de e-mail. Uma conta nova criada por ele registra quem convidou (uma vez, até 24 horas após o cadastro). Quem convidou vê só quantas pessoas entraram, nunca quem.

Os provedores sociais são ativados pelo ambiente do CMS (`AUTH_<PROVEDOR>_CLIENT_ID` / `_CLIENT_SECRET`, veja `.env.example`); cadastre `https://dash.<domínio>/api/connect/<provedor>/callback` como URI de redirecionamento em cada provedor.

## Roadmap

Planos, descontos Lightning entre perfis Afim e os recursos que vêm com eles estão descritos em [docs/monetization.pt-BR.md](docs/monetization.pt-BR.md).

## Licença

[GNU AGPL-3.0](LICENSE). Se você executar uma versão modificada deste software como serviço de rede, deve oferecer o código-fonte aos usuários desse serviço.
