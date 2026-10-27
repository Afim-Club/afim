# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

`cms/` (Strapi 5, TypeScript), `web/` and `partners/` (Astro 7, static) and `infra/` (Swarm stack) are implemented. The product spec: a searchable directory of profiles with hierarchical categories, delivered trunk-based via Jenkins → Docker Swarm/Traefik. Code identifiers are in English; UI copy may be Portuguese.

## Commands (cms/)

```bash
docker compose up -d --wait               # MariaDB for local dev (repo root)
cp cms/.env.example cms/.env              # dev values (DATABASE_HOST=127.0.0.1, SEED=true); skip if cms/.env exists
cd cms && npm install
npm run develop                           # an older cms/.env may say DATABASE_HOST=mariadb: prefix DATABASE_HOST=127.0.0.1
npm run build                             # build admin panel
```

`./dev.sh` (repo root) starts MariaDB, the CMS and both sites in the background (logs and the CMS pid in `.tmp/`; `./dev.sh stop`). Optional `DEV_WEB_HOST`/`DEV_PARTNERS_HOST`/`DEV_CMS_HOST` in the root `.env` expose them through a tunnel: Astro `--host --allowed-hosts`, `PUBLIC_STRAPI_URL=https://$DEV_CMS_HOST`, and the hosts appended to `CORS_ORIGINS`. Astro 7 `astro dev` daemonizes when stdout is not a TTY; stop it with `astro dev stop`.

No lint or test setup exists yet.

## Commands (web/)

```bash
cd web && npm install
npm run dev     # needs the CMS running (cms/ on :1337); web on :4321, partners on :4322 (fixed in astro.config.mjs to match CORS_ORIGINS)
npm run build   # SSG: fetches every category/profile from Strapi at build time
```

`web/src/lib/strapi.ts` is the API client (pages through all results; `STRAPI_URL` for build-time fetches, `PUBLIC_STRAPI_URL` for the browser). Routes: `/`, `/categorias/[slug]` (includes subcategories' profiles), `/perfis/[slug]`, `/busca` (client-side search straight against the Strapi REST API). `/mapa` is a Leaflet map (OpenStreetMap tiles from `tile.openstreetmap.org`, so the browser contacts OSM) of every profile with `location.lat/lng`, embedded at build time, with a profile-type filter. Note: `lat`/`lng` are Strapi `decimal` fields, which MariaDB stores with 2 decimal places (about 1 km). The CMS must be reachable and seeded at build time, and new/changed content requires a rebuild. UI copy and URLs are in Portuguese. `astro check` is not set up (it prompts to install `@astrojs/check`).

## Design system

`design-system/` (package `@afim/design-system`, modeled on the SiteTune design system but native to Astro) is used by both sites as a `file:../design-system` dependency. `src/theme.css` is the single source of truth for tokens (Tailwind v4 `@theme`: `primary` green ramp with `600` = `#2f7d5b`, `neutral` ramp, and semantic colors `page/surface/fg/muted/line/brand/brand-soft/on-brand/success/warning/danger` that switch via `prefers-color-scheme`, so no `dark:` variants). `src/components/*.astro` holds the components (Logo, SiteHeader/SiteFooter, Container, Button, Badge, Card, FormField, Input/Select/Textarea, Alert, EmptyState); `npm run dev` there serves the catalog page. Sites load it through `src/styles/global.css` (`@import "tailwindcss"`, the theme, and `@source "../../../design-system/src"`). Use components and semantic classes instead of page-local CSS. System fonts only. Components must not import runtime packages (the Docker image has no `design-system/node_modules`, and `design-system/` has no tsconfig for the same reason). Docker builds pass the folder with `--build-context design-system=design-system`, copied to `../design-system` before `npm ci`.

## Partners site

`partners/` is a static Astro site (landing + `/cadastro` form) built like `web/` but with no build-time CMS dependency: the form POSTs from the browser to `POST /api/profiles/submit` (`PUBLIC_STRAPI_URL`). That public, unauthenticated route (`cms/src/api/profile`) accepts only company|shop|ngo, whitelists fields, always creates `status=review`, and stores `contactEmail` (a `private` field, never returned by the API). Anti-spam: (1) in-memory per-IP rate limit (`cms/src/middlewares/submit-rate-limit.ts`, `SUBMIT_RATE_MAX`/`SUBMIT_RATE_WINDOW_MS`, default 5/hour; per replica, and relies on `PROXY=true` for the real client IP); (2) a hidden `website` honeypot field that silently returns 201 without saving; (3) optional Cloudflare Turnstile, enforced only when `TURNSTILE_SECRET` is set (the form renders the widget when `PUBLIC_TURNSTILE_SITE_KEY` is set at build time). The form was tested end to end in headless Chromium against a local CMS (submit, honeypot, 429 rate limit, double-click guard, network-error message, Turnstile token reset after each submit with a mocked widget). The real Turnstile widget has not been loaded in a browser (challenges.cloudflare.com was unreachable from the test sandbox); the server check was tested with Cloudflare's published dummy secrets. The `partners` image is wired into `infra/stack.yml` and the Jenkinsfile (untested there).

## Infra and delivery

- `infra/stack.yml`: Swarm stack (Traefik v3 with Let's Encrypt, MariaDB pinned to a node labelled `db=true`, `cms` and `web` with 2 replicas and `start-first` rolling updates). Needs the external overlay network `proxy`; variables come from the environment (see `.env.example`).
- `cms/Dockerfile` (multi-stage, runs `strapi start`, verified healthy against MariaDB) and `web/Dockerfile` (Astro build → nginx). The web image renders from the live CMS at build time, so `STRAPI_URL` must be reachable during `docker build`; the web image therefore builds after the CMS is deployed.
- Root `Jenkinsfile`: Sonar → build → Trivy → push → `docker stack deploy`. Credential ids (`afim-registry-url`, `afim-env`) and the `sonarqube` server name are assumptions; the real Jenkins Shared Library is not wired yet. The web image was built (`docker build --network host --build-arg STRAPI_URL=http://localhost:1337 ...`) and served correctly against the local CMS; the stack and Jenkinsfile have not been run against a real Swarm/Jenkins.
- CMS config reads `PROXY`, `PUBLIC_URL` and `CORS_ORIGINS` for running behind Traefik.

## CMS data model

Content types in `cms/src/api/`: `profile` and `category` (draftAndPublish disabled; moderation is the `status` enum `active|review|blocked`, default `review`). Categories self-relate via `parent`/`children` and link many-to-many with profiles. `profileType` is `professional|company|shop|ngo`. Shared components (`cms/src/components/shared`: `location` with city/state/lat/lng, repeatable `media-link`) plus a single-item dynamic zone `extra` holding the per-type component from `cms/src/components/extra`. New per-type attributes go in those components, not in `profile`.

Public access: `cms/src/index.ts` bootstrap grants the public role `find`/`findOne` on both types (idempotent). `profile` controller forces `status=active` on `find` and 404s non-active on `findOne`, so review/blocked profiles are only visible in the admin. Filtering works through the REST API, e.g. `filters[location][state][$eq]=SP`, `filters[categories][slug][$eq]=...` (use `curl -g`).

Seed: `SEED=true` loads sample categories/profiles on boot, only when no profiles exist (`cms/src/seed.ts`).

`npm run start` serves the compiled `dist/`: run `npm run build` after editing `src/`, or use `develop`.

Not done yet: dedicated search endpoint (text search currently via `$containsi` filters).

## Planned architecture

Afim (afim.club) is an open source directory connecting people, businesses and shops with shared values. It is a monorepo of independently deployed components:

- `web/` — public site for users (Astro, SSG/SSR) → `afim.club`
- `partners/` — site for affiliates, i.e. businesses and shops (Astro) → `partners.afim.club`
- `cms/` — backoffice and API (Strapi, backed by MariaDB) → `admin.afim.club`
- `infra/` — Docker Swarm, Traefik (automatic TLS) and Jenkins configuration

Both Astro sites are expected to consume content/data from the Strapi API. CI/CD is Jenkins with SonarQube and Trivy.

## Configuration

- Root `.env.example` → `.env` (git-ignored) feeds docker compose. Strapi run on the host reads `cms/.env` (generated by create-strapi-app, git-ignored), which needs `DATABASE_CLIENT=mysql` plus the DB and secret values. Keep `.env.example` in sync with new variables.

## Conventions

- Documentation is bilingual: `README.md` (English) and `README.pt-BR.md` (Portuguese). Keep them in sync when editing either.
- Profiles are built only from user-declared (opt-in) data and personal data must comply with Brazil's LGPD — keep this in mind for any data model or tracking decisions.
- License is AGPL-3.0.
