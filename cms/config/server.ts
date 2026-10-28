import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Behind Traefik: trust X-Forwarded-* and build admin/API URLs from the public address.
  proxy: env.bool('PROXY', false),
  url: env('PUBLIC_URL', ''),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  // Built-in MCP server at /mcp for AI clients (content management). Off unless MCP_ENABLED=true;
  // every request needs an Admin token, and its permissions decide which content types it can touch.
  mcp: {
    enabled: env.bool('MCP_ENABLED', false),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
