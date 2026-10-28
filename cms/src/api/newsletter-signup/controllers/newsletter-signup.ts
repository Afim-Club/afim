import { randomBytes } from 'node:crypto';
import { turnstileOk } from '../../../turnstile';

// Bump it together with the consent text of /avise-me (launch-page.consentText or the page default).
export const NEWSLETTER_CONSENT_VERSION = '2026-10-28';

const UID = 'api::newsletter-signup.newsletter-signup';
const ok = (ctx: any, status = 201) => {
  ctx.status = status;
  return { data: { received: true } };
};

export default ({ strapi }: { strapi: any }) => ({
  // Public sign-up. The answer is the same whether or not the e-mail was already on the list,
  // so the form can't be used to find out who signed up.
  async subscribe(ctx: any) {
    const body = (ctx.request.body ?? {}) as Record<string, any>;
    if (body.website) return ok(ctx); // honeypot
    if (!(await turnstileOk(body.captchaToken, ctx.ip))) return ctx.badRequest('CAPTCHA verification failed');

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 255) : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) return ctx.badRequest('a valid email is required');
    if (body.consent !== true) return ctx.badRequest('consent is required');

    const data = {
      name: typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '',
      forPeople: body.forPeople === true,
      forBusiness: body.forBusiness === true,
      consentAt: new Date().toISOString(),
      consentVersion: NEWSLETTER_CONSENT_VERSION,
    };
    const docs = strapi.documents(UID);
    const current = await docs.findFirst({ filters: { email } });
    if (current) await docs.update({ documentId: current.documentId, data });
    else await docs.create({ data: { ...data, email, unsubscribeToken: randomBytes(24).toString('base64url') } });
    return ok(ctx);
  },

  // Leaving the list erases the row (LGPD). The token goes in the link of every e-mail sent.
  async unsubscribe(ctx: any) {
    const token = (ctx.request.body as any)?.token;
    if (typeof token === 'string' && token.length >= 16) {
      const docs = strapi.documents(UID);
      const current = await docs.findFirst({ filters: { unsubscribeToken: token } });
      if (current) await docs.delete({ documentId: current.documentId });
    }
    return ok(ctx, 200);
  },
});
