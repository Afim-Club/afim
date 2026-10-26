import { factories } from '@strapi/strapi';

// Public reads only ever see active profiles; review/blocked stay in the backoffice.
export default factories.createCoreController('api::profile.profile', ({ strapi }) => ({
  async find(ctx) {
    const filters = ctx.query.filters;
    ctx.query = {
      ...ctx.query,
      filters: filters ? { $and: [filters, { status: 'active' }] } : { status: 'active' },
    };
    return super.find(ctx);
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const found = await strapi.documents('api::profile.profile').findFirst({
      filters: { documentId: id, status: 'active' },
    });
    if (!found) return ctx.notFound();
    return super.findOne(ctx);
  },
}));
