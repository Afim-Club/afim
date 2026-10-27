# Afim

> 🇧🇷 [Leia em português](README.pt-BR.md)

**Afim** ([afim.club](https://afim.club)) is an open source directory that connects people, businesses and shops that share similar values.

- People find job openings and discounts at selected partner businesses.
- Businesses hire people who share their values.
- Shops and suppliers do business with partners who share their values.

## Components

| Folder | Description | Planned address |
| --- | --- | --- |
| `web/` | Public site for users (Astro) | `afim.club` |
| `partners/` | Site for affiliates: businesses and shops (Astro) | `partners.afim.club` |
| `cms/` | Backoffice and API (Strapi) | `admin.afim.club` |
| `infra/` | Docker Swarm, Traefik and Jenkins configuration | - |

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

The ports are fixed because the CMS only accepts browser requests from `localhost:4321` and `localhost:4322` (`CORS_ORIGINS`). `web/` reads the CMS at request time in dev, so it needs Strapi running. Stop the database with `docker compose stop`; `docker compose down -v` also deletes its data.

## Privacy and data

Profiles are built from information **declared by the users themselves** (opt-in). Personal data is handled according to the Brazilian General Data Protection Law (LGPD).

## License

[GNU AGPL-3.0](LICENSE). If you run a modified version of this software as a network service, you must offer its source code to the users of that service.
