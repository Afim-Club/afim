import type { Core } from '@strapi/strapi';

const config = ({ env }: { env: any }): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  // Public site searches the API from the browser: allow its origin(s).
  { name: 'strapi::cors', config: { origin: env.array('CORS_ORIGINS', ['http://localhost:4321', 'http://localhost:4322']) } },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
