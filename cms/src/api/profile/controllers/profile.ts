import { factories } from '@strapi/strapi';
import { uniqueSlug } from '../slug';
import { turnstileOk } from '../../../turnstile';

// Public reads only ever see active profiles; review/blocked stay in the backoffice.
export default factories.createCoreController('api::profile.profile', ({ strapi }) => ({
  async find(ctx) {
    const filters = ctx.query.filters;
    ctx.query = {
      ...ctx.query,
      filters: filters ? { $and: [filters, { moderationStatus: 'active' }] } : { moderationStatus: 'active' },
    };
    return super.find(ctx);
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const found = await strapi.documents('api::profile.profile').findFirst({
      filters: { documentId: id, moderationStatus: 'active' },
    });
    if (!found) return ctx.notFound();
    return super.findOne(ctx);
  },

  // Public partner sign-up: always lands in moderation (moderationStatus=review) and only a whitelist of fields is accepted.
  async submit(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, any>;
    // Honeypot: real users never see this field. Pretend success so bots learn nothing.
    if (body.website) {
      ctx.status = 201;
      return { data: { received: true } };
    }

    if (!(await turnstileOk(body.captchaToken, ctx.ip))) return ctx.badRequest('CAPTCHA verification failed');

    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const name = str(body.name, 255);
    const contactEmail = str(body.contactEmail, 255);
    const profileType = str(body.profileType, 20);
    if (!name || !/^\S+@\S+\.\S+$/.test(contactEmail) || !['company', 'shop', 'ngo'].includes(profileType)) {
      return ctx.badRequest('name, a valid contactEmail and profileType (company|shop|ngo) are required');
    }
    const slug = uniqueSlug(name);
    await strapi.documents('api::profile.profile').create({
      data: {
        name, slug, contactEmail, profileType,
        description: str(body.description, 2000),
        moderationStatus: 'review',
        location: { city: str(body.city, 120), state: str(body.state, 2).toUpperCase() },
      } as any,
    });
    ctx.status = 201;
    return { data: { received: true } };
  },
}));
