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

  // Public partner sign-up: always lands in moderation (status=review) and only a whitelist of fields is accepted.
  async submit(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, any>;
    // Honeypot: real users never see this field. Pretend success so bots learn nothing.
    if (body.website) {
      ctx.status = 201;
      return { data: { received: true } };
    }

    // Optional Cloudflare Turnstile CAPTCHA, enforced only when TURNSTILE_SECRET is set.
    const secret = process.env.TURNSTILE_SECRET;
    if (secret) {
      const token = typeof body.captchaToken === 'string' ? body.captchaToken : '';
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret, response: token, remoteip: ctx.ip }),
      }).then((r) => r.json() as Promise<{ success: boolean }>).catch(() => ({ success: false }));
      if (!verify.success) return ctx.badRequest('CAPTCHA verification failed');
    }

    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const name = str(body.name, 255);
    const contactEmail = str(body.contactEmail, 255);
    const profileType = str(body.profileType, 20);
    if (!name || !/^\S+@\S+\.\S+$/.test(contactEmail) || !['company', 'shop', 'ngo'].includes(profileType)) {
      return ctx.badRequest('name, a valid contactEmail and profileType (company|shop|ngo) are required');
    }
    const slug = `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
    await strapi.documents('api::profile.profile').create({
      data: {
        name, slug, contactEmail, profileType,
        description: str(body.description, 2000),
        status: 'review',
        location: { city: str(body.city, 120), state: str(body.state, 2).toUpperCase() },
      } as any,
    });
    ctx.status = 201;
    return { data: { received: true } };
  },
}));
