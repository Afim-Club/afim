import { factories } from '@strapi/strapi';

// The public list of affinity options. Populate is dropped so `profiles` can't expose profiles under review.
export default factories.createCoreController('api::affinity.affinity', () => ({
  async find(ctx) {
    delete ctx.query.populate;
    return super.find(ctx);
  },
  async findOne(ctx) {
    delete ctx.query.populate;
    return super.findOne(ctx);
  },
}));
