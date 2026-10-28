# Afim

> 🇧🇷 [Leia em português](README.pt-BR.md)

**Afim** ([afim.club](https://afim.club)) is an open source directory that connects people, businesses and shops that share similar values.

- People find job openings and discounts at selected partner businesses.
- Businesses hire people who share their values.
- Shops and suppliers do business with partners who share their values.

The public site can be browsed by place, like a classic directory: `/estados` lists the states, then `/sp`, `/sp/campinas` and `/sp/campinas/servicos` list the active profiles by state, city and category, with counts and breadcrumbs.

## Components

| Folder | Description | Planned address |
| --- | --- | --- |
| `web/` | Public site for users (Astro) | `afim.club` |
| `partners/` | Site for affiliates: businesses and shops (Astro) | `partners.afim.club` |
| `cms/` | Backoffice and API (Strapi) | `admin.afim.club` |
| `infra/` | Docker Swarm, Traefik and Jenkins configuration | - |
| `design-system/` | Design system: Tailwind theme, Astro components and brand assets used by `web/` and `partners/` | - |

## Stack

- **Front-end:** Astro (SSG/SSR)
- **Back-end / admin:** Strapi CMS
- **Database:** MariaDB
- **Infrastructure:** Docker Swarm + Traefik (automatic TLS)
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

## Privacy and data

Profiles are built from information **declared by the users themselves** (opt-in). Personal data is handled according to the Brazilian General Data Protection Law (LGPD).

### Member accounts and affinities

People sign up on the public site (`/entrar`) with email and password or a social login (Google, Facebook, GitHub, LinkedIn), then complete their account at `/conta`:

- **Affinities** are shared values (e.g. veganism, sustainability) curated in the CMS. Businesses and shops declare theirs publicly on their profile.
- A member ticks their affinities. "Found for you" lists the active people, companies, NGOs and shops that share them, with the affinities in common.
- Political affinities have two levels: the member answers political issues (agree, disagree or neutral) and the CMS calculates their position, from far left to far right. The member also ticks the positions (any of the 7) whose profiles they want to find.
- Affinities can reveal beliefs, so they are treated as **sensitive personal data** (LGPD art. 11): they are stored only after explicit consent (date and terms version are recorded), are never public or listed by the API (only the member reads them, through `/api/members/me`), and unticking the consent erases them. Members can delete their account and all their data at any time.
- **Profiles owned by members**: at `/conta/perfis` a member registers their own professional profile (one) and the companies, shops and NGOs they represent (up to 10 in all), with the affinities each one declares publicly and an optional map position from the browser's location, rounded to about 1 km. They always go to moderation (`review`); editing one sends it back to review, a blocked one can only be deleted, and deleting the account deletes them too.
- **Affinity filter**: every listing on the public site (home, categories, states and cities, search and map) shows only profiles that have all of the signed-in member's affinities (intersection: Free software + Right shows only profiles with both). A profile has a single political position, so several chosen spectrums count as "any of them", combined with the rest. "Found for you" on the account page follows the same rule. Visitors without an account pick affinities in a filter above the list instead (kept in their browser). The pages stay static: the browser hides the profiles that don't match, using the affinities each profile declares publicly. A member's own affinities are read only through the authenticated `/api/members/me` call and kept in memory, never in a URL or the page HTML.
- **Invites**: each member has a personal link (`/entrar?convite=CODE`) to copy or send by WhatsApp, since there is no email provider yet. A new account that signs up through it records who invited it (once, within 24 hours of sign-up). The inviter sees only how many people joined, never who.

Social providers are enabled from the CMS environment (`AUTH_<PROVIDER>_CLIENT_ID` / `_CLIENT_SECRET`, see `.env.example`); register `https://admin.<domain>/api/connect/<provider>/callback` as the redirect URI at each provider.

## Roadmap

Plans, Lightning discounts between Afim profiles and the features that come with them are described in [docs/monetization.md](docs/monetization.md).

## License

[GNU AGPL-3.0](LICENSE). If you run a modified version of this software as a network service, you must offer its source code to the users of that service.
