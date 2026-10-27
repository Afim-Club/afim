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

`./dev.sh` (repo root) starts MariaDB, the CMS and both sites in the background (logs and the CMS pid in `.tmp/`; `./dev.sh stop`). Optional `DEV_WEB_HOST`/`DEV_PARTNERS_HOST`/`DEV_CMS_HOST` in the root `.env` expose them through a tunnel: Astro `--host --allowed-hosts`, `PUBLIC_STRAPI_URL=https://$DEV_CMS_HOST`, `WEB_URL=https://$DEV_WEB_HOST` (social login callback), and the hosts appended to `CORS_ORIGINS`. Astro 7 `astro dev` daemonizes when stdout is not a TTY; stop it with `astro dev stop`. Stop the CMS before switching branches: `strapi develop` reloads on file changes and drops the tables of content types missing from the checkout (this wiped affinities and their profile links once).

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

## Member accounts

Login uses Strapi users-permissions with `jwtManagement: 'refresh'` and httpOnly sessions: the refresh token is an httpOnly cookie on the CMS host and `web/src/lib/auth.ts` gets a short-lived access token from `POST /api/auth/refresh` (`credentials: 'include'`) on each page, so no token is kept in localStorage (works because afim.club and admin.afim.club are same-site; `CORS_ORIGINS` must list the site). Register does not set the cookie, so the client logs in right after. Social login: `cms/src/auth-providers.ts` enables google/facebook/github/linkedin from `AUTH_<NAME>_CLIENT_ID/SECRET` on every boot (env wins over the admin panel) with callback `WEB_URL/entrar/<name>`; Strapi keeps the provider tokens in its koa session and the static page `/entrar/[provider]` calls `GET /api/auth/<name>/callback` with credentials. `PUBLIC_AUTH_PROVIDERS` (web build time) lists the buttons. Email confirmation and password reset are off (no email provider yet). Only the email flow was tested end to end (register, consent, matches, reload, logout, wrong password, delete); the social flow was checked up to the Google redirect.

Data: `affinity` (public list with optional `group`, e.g. "Política", and `sortOrder`; each starter group in `seed.ts` is created on boot while that group is empty, populate disabled so it can't leak review profiles), `profile.affinities` (public, declared by the business), and `member` (1:1 with the user, repeatable `member.affinity-preference` with `findPeople/findCompanies/findShops`). Member affinities are LGPD sensitive data: `member` has only `/api/members/me` routes (GET, PUT, DELETE, `/matches`), granted to the authenticated role in bootstrap; PUT whitelists fields, refuses affinities without `consent: true`, records `affinityConsentAt` + `affinityConsentVersion` (`CONSENT_VERSION` in the member controller, bump it with the consent text in `web/src/pages/conta.astro`), and `consent: false` erases them. DELETE removes the member, the user and its sessions. Political affinities have two levels: members answer the issues in group "Pautas políticas" (affinities with a `lean` from -2 left to +2 right, `stance` agrees/disagrees/neutral on the preference) and the CMS derives their own position in group "Política" (7 positions ordered by `sortOrder`, left to right) in `cms/src/api/member/political.ts` (needs at least 5 answers; returned as `politicalPosition`, not stored). Preference rows on positions are the spectrums the member wants to find (rows with no flag are dropped). The /conta UI has one checkbox per affinity and per spectrum and always sends all three `find*` flags as true; the flags stay in the API for future use. `/matches` returns `matchedAffinities` per profile (only the affinities that made it match). Issue answers never match profiles; the spectrum rows do. Starter data lives in `cms/src/starter-affinities.ts`. Matching runs server side (people = professional, companies = company + ngo, shops = shop) so affinities never go in a public URL. Members are not visible to other members.

Owned profiles: `profile.owner` (private relation to the user). `cms/src/api/member/controllers/my-profile.ts` serves `/api/members/me/profiles` (GET, POST, PUT/DELETE `:id`) for professional (one per member) and company|shop|ngo, whitelists fields, sets `contactEmail` to the login e-mail, always saves `status=review` (edits too), takes optional `lat`/`lng` rounded to 2 decimals (PUT replaces them, so the page sends the current ones back; the page fills them from browser geolocation), refuses type changes and edits of blocked profiles, caps 10 per member, and only accepts affinities without `lean` (no political issues). Web page `/conta/perfis`. Deleting the account deletes the owned profiles. Invites: `member.inviteCode` (created on `GET /api/members/me/invite`, which also returns the accepted count) and `member.invitedBy` (private, set once by `POST /api/members/me/invite {code}`, only for accounts under 24 h old, not yourself). `/entrar?convite=CODE` keeps the code in localStorage and `/conta` sends it after any login. Tested end to end against a local CMS on SQLite (better-sqlite3 installed with `--no-save`) and headless Chromium.

## Infra and delivery

- `infra/stack.yml`: Swarm stack (Traefik v3 with Let's Encrypt, MariaDB pinned to a node labelled `db=true`, `cms` and `web` with 2 replicas and `start-first` rolling updates). Needs the external overlay network `proxy`; variables come from the environment (see `.env.example`).
- `cms/Dockerfile` (multi-stage, runs `strapi start`, verified healthy against MariaDB) and `web/Dockerfile` (Astro build → nginx). The web image renders from the live CMS at build time, so `STRAPI_URL` must be reachable during `docker build`; the web image therefore builds after the CMS is deployed.
- Root `Jenkinsfile`: Sonar → build → Trivy → push → `docker stack deploy`. Credential ids (`afim-registry-url`, `afim-env`) and the `sonarqube` server name are assumptions; the real Jenkins Shared Library is not wired yet. The web image was built (`docker build --network host --build-arg STRAPI_URL=http://localhost:1337 ...`) and served correctly against the local CMS; the stack and Jenkinsfile have not been run against a real Swarm/Jenkins.
- CMS config reads `PROXY`, `PUBLIC_URL` and `CORS_ORIGINS` for running behind Traefik.

## CMS data model

Content types in `cms/src/api/`: `profile` and `category` (draftAndPublish disabled; moderation is the `status` enum `active|review|blocked`, default `review`). Categories self-relate via `parent`/`children` and link many-to-many with profiles. `profileType` is `professional|company|shop|ngo`. Shared components (`cms/src/components/shared`: `location` with city/state/lat/lng, repeatable `media-link`) plus a single-item dynamic zone `extra` holding the per-type component from `cms/src/components/extra`. New per-type attributes go in those components, not in `profile`.

Public access: `cms/src/index.ts` bootstrap grants the public role `find`/`findOne` on both types (idempotent). `profile` controller forces `status=active` on `find` and 404s non-active on `findOne`, so review/blocked profiles are only visible in the admin. Filtering works through the REST API, e.g. `filters[location][state][$eq]=SP`, `filters[categories][slug][$eq]=...` (use `curl -g`).

Seed: `SEED=true` loads sample categories/profiles on boot, only when no profiles exist (`cms/src/seed.ts`). Starter affinities (general values and the "Política" spectrum) are created on every boot, per group, while that group is empty, regardless of `SEED`.

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
