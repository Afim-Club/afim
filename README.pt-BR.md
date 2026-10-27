# Afim

> 🇺🇸 [Read in English](README.md)

**Afim** ([afim.club](https://afim.club)) é um diretório open source que conecta pessoas, empresas e comércios que compartilham valores semelhantes.

- Pessoas encontram vagas de emprego e descontos em estabelecimentos parceiros selecionados.
- Empresas contratam pessoas que compartilham seus valores.
- Comércios e fornecedores fazem negócios com parceiros que compartilham seus valores.

## Componentes

| Pasta | Descrição | Endereço previsto |
| --- | --- | --- |
| `web/` | Site público dos usuários (Astro) | `afim.club` |
| `partners/` | Site dos afiliados: empresas e comércios (Astro) | `partners.afim.club` |
| `cms/` | Backoffice e API (Strapi) | `admin.afim.club` |
| `infra/` | Configuração de Docker Swarm, Traefik e Jenkins | - |
| `design-system/` | Design system: tema Tailwind, componentes Astro e assets de marca usados por `web/` e `partners/` | - |

## Stack

- **Front-end:** Astro (SSG/SSR)
- **Back-end / admin:** Strapi CMS
- **Banco de dados:** MariaDB
- **Infraestrutura:** Docker Swarm + Traefik (TLS automático)
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

As portas são fixas porque o CMS só aceita requisições do navegador vindas de `localhost:4321` e `localhost:4322` (`CORS_ORIGINS`). Em dev, o `web/` consulta o CMS a cada requisição, então o Strapi precisa estar rodando. Pare o banco com `docker compose stop`; `docker compose down -v` também apaga os dados.

## Privacidade e dados

Os perfis são construídos a partir de informações **declaradas pelos próprios usuários** (opt-in). Os dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD).

### Contas de membros e afinidades

As pessoas criam a conta no site público (`/entrar`) com e-mail e senha ou login social (Google, Facebook, GitHub, LinkedIn) e completam o cadastro em `/conta`:

- **Afinidades** são valores em comum (ex.: veganismo, sustentabilidade), mantidos no CMS. Empresas e comércios declaram as suas publicamente no perfil.
- O membro escolhe suas afinidades e, para cada uma, se quer encontrar pessoas, empresas (e ONGs) e comércios. "Encontrados para você" lista os perfis ativos que combinam.
- Afinidades políticas têm dois níveis: o membro responde a pautas (concordo, discordo ou indiferente) e o CMS calcula sua posição, da extrema-esquerda à extrema-direita, que depois combina como qualquer outra afinidade.
- Afinidades podem revelar convicções, então são tratadas como **dados pessoais sensíveis** (LGPD art. 11): só são guardadas com consentimento explícito (data e versão dos termos ficam registradas), nunca são públicas nem listadas pela API (só o próprio membro as lê, via `/api/members/me`), e desmarcar o consentimento as apaga. O membro pode excluir a conta e todos os dados a qualquer momento.

Os provedores sociais são ativados pelo ambiente do CMS (`AUTH_<PROVEDOR>_CLIENT_ID` / `_CLIENT_SECRET`, veja `.env.example`); cadastre `https://admin.<domínio>/api/connect/<provedor>/callback` como URI de redirecionamento em cada provedor.

## Licença

[GNU AGPL-3.0](LICENSE). Se você executar uma versão modificada deste software como serviço de rede, deve oferecer o código-fonte aos usuários desse serviço.
