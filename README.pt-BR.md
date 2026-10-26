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

As instruções detalhadas serão adicionadas conforme cada componente for criado.

## Privacidade e dados

Os perfis são construídos a partir de informações **declaradas pelos próprios usuários** (opt-in). Os dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD).

## Licença

[GNU AGPL-3.0](LICENSE). Se você executar uma versão modificada deste software como serviço de rede, deve oferecer o código-fonte aos usuários desse serviço.
