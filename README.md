# Afim

> 🇧🇷 [Leia em português](README.pt-BR.md)

**Afim** ([afim.club](https://afim.club)) is an open source directory that connects people, businesses and shops that share similar values.

- People find job openings and discounts at selected partner businesses.
- Businesses hire people who share their values.
- Shops and suppliers do business with partners who share their values.

The public site is split in modules, each with its own URL prefix: the marketing home owns the root (`/`, `/planos`, `/avise-me`, and free pages such as `/sobre`, `/valores` and `/privacidade`), with its text, plans and SEO edited in Strapi, the blog lives under `/blog` (with tags and an RSS feed), the help center lives under `/ajuda` (topics and articles edited in Strapi, starting with how to use a Lightning wallet), and the directory lives under `/explorar`.

The directory can be browsed by place, like a classic directory: the whole directory lives under `/explorar` (old URLs redirect with 301): `/explorar/estados` lists the states, then `/explorar/sp`, `/explorar/sp/campinas` and `/explorar/sp/campinas/servicos` list the active profiles by state, city and category, with counts and breadcrumbs.

## Components

| Folder | Description | Planned address |
| --- | --- | --- |
| `web/` | Public site for users (Astro) | `afim.club` |
| `partners/` | Site for affiliates: businesses and shops (Astro) | `partners.afim.club` |
| `cms/` | Backoffice and API (Strapi) | `dash.afim.club` |
| `infra/` | Deploy: Dockge stack for the CMS (`infra/dockge/`), plus Docker Swarm, Traefik and Jenkins | - |
| `design-system/` | Design system: Tailwind theme, Astro components and brand assets used by `web/` and `partners/` | - |

## Stack

- **Front-end:** Astro (SSG/SSR)
- **Back-end / admin:** Strapi CMS
- **Database:** MySQL 8 / MariaDB
- **Infrastructure:** Cloudflare Workers (sites) + Docker on Dockge (CMS); Docker Swarm + Traefik as an alternative
- **CI/CD:** Jenkins, SonarQube and Trivy

## Getting started

1. Copy the environment template and fill in the values:
   ```bash
   cp .env.example .env
   ```
2. Never commit `.env` or any secret to the repository.

## Local development

Prerequisites: Docker (with Compose) and Node.js 20–26. MariaDB runs in Docker; the CMS and the two Astro sites run on the host with hot reload.

```bash
docker compose up -d --wait                  # MariaDB on :3306
cp cms/.env.example cms/.env                 # dev-only values, loads sample data (SEED=true)
cd cms && npm install && npm run develop     # Strapi on :1337
```

In other terminals:

```bash
cd web && npm install && npm run dev         # public site on :4321
cd partners && npm install && npm run dev    # partner site on :4322
```

| Address | What |
| --- | --- |
| http://localhost:1337/admin | Strapi admin (create the first admin user on first visit) |
| http://localhost:1337/api/profiles | REST API |
| http://localhost:4321 | Public site (`web/`) |
| http://localhost:4322 | Partner site (`partners/`) |

Or start everything at once with `./dev.sh` (stop with `./dev.sh stop`; logs in `.tmp/`). To reach the dev servers through a tunnel such as cloudflared, set `DEV_WEB_HOST`, `DEV_PARTNERS_HOST` and `DEV_CMS_HOST` in the root `.env` (e.g. `dev.afim.club`): the script then allows those hostnames, points the browser at `https://$DEV_CMS_HOST` and adds the sites to the CMS CORS list. The sites then listen on all interfaces.

> **Stop the CMS before switching branches** (`./dev.sh stop`). `strapi develop` reloads on file changes, and if a checkout briefly removes content types, Strapi drops their tables (data and relations included).

The ports are fixed because the CMS only accepts browser requests from `localhost:4321` and `localhost:4322` (`CORS_ORIGINS`). `web/` reads the CMS at request time in dev, so it needs Strapi running. Stop the database with `docker compose stop`; `docker compose down -v` also deletes its data.

## Deploy (Cloudflare Workers + Dockge)

The CMS runs as a Docker container on a host managed by [Dockge](https://github.com/louislam/dockge); the two Astro sites are static and served by Cloudflare Workers (static assets, no adapter or server code). The Swarm/Jenkins setup in `infra/stack.yml` remains as an alternative.

### CMS on Dockge

1. In Dockge, create a stack (e.g. `afim-cms`) and paste [`infra/dockge/compose.yaml`](infra/dockge/compose.yaml).
2. Fill the stack's `.env` from [`infra/dockge/.env.example`](infra/dockge/.env.example). Generate each secret with `openssl rand -base64 32`.
3. Deploy. The image `ghcr.io/afim-club/afim-cms` is published by the `CMS image` GitHub Action on every push to `main` that touches `cms/` (tags `latest` and the commit SHA); **Update in Dockge pulls the new one**. Set `CMS_TAG` to a commit SHA to pin or roll back. The package must be public on GitHub (Package settings → Change visibility), or run `docker login ghcr.io` on the host.
4. Expose port `CMS_PORT` (1337) as `https://dash.afim.club` through a reverse proxy or a Cloudflare Tunnel. The container trusts `X-Forwarded-*` (`PROXY=true`).

The stack has no database container: it uses an existing MySQL 8 or MariaDB (`DATABASE_HOST`, `DATABASE_SSL`, ...), such as a managed MySQL on the same private network. Create an empty database and a user for it; Strapi creates the tables and the starter content on first boot. Media from the admin panel lives in the `uploads` volume. Back up both.

### Sites on Cloudflare Workers

Each site has a `wrangler.jsonc` (`afim-web` and `afim-partners`) that uploads `dist/` as static assets. Either connect the repository in **Workers & Pages → Create → Import a repository** (Workers Builds), once per site:

| Setting | `web` | `partners` |
| --- | --- | --- |
| Root directory | `web` | `partners` |
| Build command | `npm run build` | `npm run build` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` |
| Build variables | `STRAPI_URL`, `PUBLIC_STRAPI_URL`, `PUBLIC_AUTH_PROVIDERS`, `SITE_URL` (canonical URLs and sitemap, default `https://afim.club`), `PUBLIC_TURNSTILE_SITE_KEY` (optional, /avise-me form) | `PUBLIC_STRAPI_URL`, `PUBLIC_TURNSTILE_SITE_KEY` |
| Custom domain | `afim.club` | `partners.afim.club` |

or deploy from a machine with `npm run deploy` (needs `wrangler login` or `CLOUDFLARE_API_TOKEN`, plus the same variables in the shell).

- `STRAPI_URL` and `PUBLIC_STRAPI_URL` are the public CMS address (`https://dash.afim.club`). The `web` build fetches every page's data from it, so **the CMS must be up and reachable from Cloudflare during the build**.
- `web` is static: new or changed content shows up only after a rebuild. Create a Deploy Hook (Worker → Settings → Builds → Deploy Hooks) and add its URL as a webhook in Strapi (Settings → Webhooks, events on Profile/Category/Affinity entries, plus Home page, Pricing page, Launch page, Help topic, Help article, Blog post, Blog tag, Page, Plan, Site settings and Module SEO) so each change triggers a rebuild.
- Use the custom domains, not `*.workers.dev`: member login relies on the site and the CMS being same-site (`afim.club` and `dash.afim.club`). Add each site's address to `CORS_ORIGINS` and set `WEB_URL` in the CMS.
- Long cache for `/_astro/*` comes from `public/_headers`.

## Managing content with AI (MCP)

Strapi's built-in [MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server) lets an AI client (Claude Code, Claude Desktop, Cursor...) list, create, edit and publish content in the CMS.

1. Set `MCP_ENABLED=true` in the CMS environment (Dockge stack `.env`) and redeploy. The endpoint is `https://dash.afim.club/mcp`.
2. In the admin panel, open **Settings → Admin tokens** and create a token with only the content it needs. Suggested: read, create, update and publish on Home page, Pricing page, Launch page, Page, Help topic, Help article, Blog post, Blog tag, Plan, Site settings and Module SEO. **Never** grant Member, Newsletter signup, User or Profile: they hold personal data (LGPD). The token can do only what its permissions allow, and never more than the admin who created it.
3. Connect the client. In this repository, `.mcp.json` already declares the server `strapi` for Claude Code; it reads the token from `STRAPI_MCP_TOKEN` (and optionally the URL from `STRAPI_MCP_URL`). For Claude Code on the web, add `STRAPI_MCP_TOKEN` to the cloud environment and allow `dash.afim.club` in its network access. Elsewhere: `claude mcp add strapi --transport http https://dash.afim.club/mcp -H "Authorization: Bearer <token>"`.

Content created through MCP follows the same rules as the admin panel (drafts until published). The static site still needs a rebuild to show it (the Strapi webhook triggers one).

## Privacy and data

Profiles are built from information **declared by the users themselves** (opt-in). Personal data is handled according to the Brazilian General Data Protection Law (LGPD).

### Launch e-mail list

`/avise-me` collects the e-mails of people who want to know when new features launch. It stores only the e-mail, an optional name, what they want news about and the date and version of their explicit consent. The list is never readable through the API (only in the admin), the form answers the same for new and known e-mails, and the link in each e-mail (`/avise-me/sair`) deletes the entry.

### Member accounts and affinities

People sign up on the public site (`/entrar`) with email and password or a social login (Google, Facebook, GitHub, LinkedIn), then complete their account at `/conta`:

- **Affinities** are shared values (e.g. veganism, sustainability) curated in the CMS. Businesses and shops declare theirs publicly on their profile.
- A member ticks their affinities. "Found for you" lists the active people, companies, NGOs and shops that share them, with the affinities in common.
- Political affinities have two levels: the member answers political issues (agree, disagree or neutral) and the CMS calculates their position, from far left to far right. The member also ticks the positions (any of the 7) whose profiles they want to find.
- Affinities can reveal beliefs, so they are treated as **sensitive personal data** (LGPD art. 11): they are stored only after explicit consent (date and terms version are recorded), are never public or listed by the API (only the member reads them, through `/api/members/me`), and unticking the consent erases them. Members can delete their account and all their data at any time.
- **Profiles owned by members**: at `/conta/perfis` a member registers their own professional profile (one) and the companies, shops and NGOs they represent (up to 10 in all), with the affinities each one declares publicly and an optional map position from the browser's location, rounded to about 1 km. They always go to moderation (`review`); editing one sends it back to review, a blocked one can only be deleted, and deleting the account deletes them too.
- **Affinity filter**: every listing on the public site (home, categories, states and cities, search and map) shows only profiles that have all of the signed-in member's affinities (intersection: Free software + Right shows only profiles with both). A profile has a single political position, so several chosen spectrums count as "any of them", combined with the rest. "Found for you" on the account page follows the same rule. Visitors without an account pick affinities in a filter above the list instead (kept in their browser). The pages stay static: the browser hides the profiles that don't match, using the affinities each profile declares publicly. A member's own affinities are read only through the authenticated `/api/members/me` call and kept in memory, never in a URL or the page HTML. A profile page lists the profile's affinities except political ones ("Política" and "Pautas políticas"), which only filter.
- **Invites**: each member has a personal link (`/entrar?convite=CODE`) to copy or send by WhatsApp, since there is no email provider yet. A new account that signs up through it records who invited it (once, within 24 hours of sign-up). The inviter sees only how many people joined, never who.

Social providers are enabled from the CMS environment (`AUTH_<PROVIDER>_CLIENT_ID` / `_CLIENT_SECRET`, see `.env.example`); register `https://dash.<domain>/api/connect/<provider>/callback` as the redirect URI at each provider.

## Roadmap

Plans, Lightning discounts between Afim profiles and the features that come with them are described in [docs/monetization.md](docs/monetization.md).

## License

[GNU AGPL-3.0](LICENSE). If you run a modified version of this software as a network service, you must offer its source code to the users of that service.
