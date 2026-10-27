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
| `design-system/` | Shared CSS design tokens and base components used by `web/` and `partners/` | - |

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

Detailed setup instructions will be added as each component is created.

## Privacy and data

Profiles are built from information **declared by the users themselves** (opt-in). Personal data is handled according to the Brazilian General Data Protection Law (LGPD).

## License

[GNU AGPL-3.0](LICENSE). If you run a modified version of this software as a network service, you must offer its source code to the users of that service.
