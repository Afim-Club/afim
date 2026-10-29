import type { Core } from '@strapi/strapi';

// Strapi's built-in /_health answers 204 without touching the database, so a lost DB left the
// container "healthy" while every API call failed. Answer 503 when the database is unreachable.
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: any, next: () => Promise<void>) => {
    if (ctx.path === '/_health') {
      try {
        await strapi.db.connection.raw('select 1');
      } catch (err) {
        strapi.log.error(`Health check: database unreachable (${(err as Error).message})`);
        ctx.status = 503;
        return;
      }
    }
    return next();
  };
