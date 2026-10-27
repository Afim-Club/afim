import { factories } from '@strapi/strapi';

// Bump when the consent text shown in web/src/pages/conta.astro changes.
export const CONSENT_VERSION = '2026-10-27';

// Which profile types each preference finds. NGOs count as organizations, with companies.
const TYPES = { findPeople: ['professional'], findCompanies: ['company', 'ngo'], findShops: ['shop'] } as const;

type Pref = { affinity: { documentId: string; name: string; slug: string }; findPeople: boolean; findCompanies: boolean; findShops: boolean };

const POPULATE = { affinities: { populate: { affinity: { fields: ['name', 'slug'] } } } };

export default factories.createCoreController('api::member.member', ({ strapi }) => {
  const findMine = (userId: number) =>
    strapi.documents('api::member.member').findFirst({ filters: { user: { id: userId } }, populate: POPULATE as any });

  const view = (m: any) => ({
    displayName: m?.displayName ?? '',
    city: m?.city ?? '',
    state: m?.state ?? '',
    affinityConsentAt: m?.affinityConsentAt ?? null,
    affinityConsentVersion: m?.affinityConsentVersion ?? null,
    affinities: ((m?.affinities ?? []) as any[])
      .filter((a: any) => a.affinity)
      .map((a: any) => ({
        affinity: { documentId: a.affinity.documentId, name: a.affinity.name, slug: a.affinity.slug },
        findPeople: a.findPeople, findCompanies: a.findCompanies, findShops: a.findShops,
      })) as Pref[],
  });

  return {
    async me(ctx) {
      return { data: view(await findMine(ctx.state.user.id)) };
    },

    // Whitelisted fields only. Affinities (sensitive data under LGPD) are stored only with explicit consent;
    // sending consent=false withdraws it and erases the affinities.
    async updateMe(ctx) {
      const body = ((ctx.request.body as any)?.data ?? {}) as Record<string, any>;
      const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const wanted = Array.isArray(body.affinities) ? body.affinities.slice(0, 100) : [];
      const consent = body.consent === true;
      if (wanted.length && !consent) return ctx.badRequest('Consent is required to store affinities');

      const ids = [...new Set(wanted.map((a: any) => a?.affinity).filter((id: unknown) => typeof id === 'string'))] as string[];
      const known = ids.length
        ? await strapi.documents('api::affinity.affinity').findMany({ filters: { documentId: { $in: ids } }, fields: ['id'] })
        : [];
      const idByDoc = new Map(known.map((a: any) => [a.documentId, a.id]));
      const affinities = ids.filter((id) => idByDoc.has(id)).map((id) => {
        const a = wanted.find((w: any) => w?.affinity === id);
        return { affinity: idByDoc.get(id), findPeople: a.findPeople === true, findCompanies: a.findCompanies === true, findShops: a.findShops === true };
      });

      const current = await findMine(ctx.state.user.id);
      const data: Record<string, any> = {
        displayName: str(body.displayName, 120),
        city: str(body.city, 120),
        state: str(body.state, 2).toUpperCase(),
        affinities: consent ? affinities : [],
        // Keep the original consent date unless consent was withdrawn or its terms changed.
        affinityConsentAt: consent
          ? (current?.affinityConsentVersion === CONSENT_VERSION && current?.affinityConsentAt) || new Date().toISOString()
          : null,
        affinityConsentVersion: consent ? CONSENT_VERSION : null,
      };
      const saved = current
        ? await strapi.documents('api::member.member').update({ documentId: current.documentId, data: data as any, populate: POPULATE as any })
        : await strapi.documents('api::member.member').create({ data: { ...data, user: ctx.state.user.id } as any, populate: POPULATE as any });
      return { data: view(saved) };
    },

    // LGPD right to erasure: removes the member data, the login and every session.
    async deleteMe(ctx) {
      const userId = ctx.state.user.id;
      const current = await findMine(userId);
      if (current) await strapi.documents('api::member.member').delete({ documentId: current.documentId });
      await strapi.sessionManager('users-permissions').invalidateRefreshToken(String(userId));
      await strapi.db.query('plugin::users-permissions.user').delete({ where: { id: userId } });
      ctx.status = 204;
    },

    // Active profiles sharing the member's affinities, limited to the profile types they chose for each one.
    // Done server side so the affinities never travel in a public, logged URL.
    async matches(ctx) {
      const prefs = view(await findMine(ctx.state.user.id)).affinities;
      const $or = prefs
        .map((p) => ({
          affinities: { documentId: p.affinity.documentId },
          profileType: { $in: (Object.keys(TYPES) as (keyof typeof TYPES)[]).filter((k) => p[k]).flatMap((k) => TYPES[k]) },
        }))
        .filter((f) => f.profileType.$in.length);
      if (!$or.length) return { data: [] };
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: { $and: [{ status: 'active' }, { $or }] } as any,
        fields: ['name', 'slug', 'profileType', 'description'],
        populate: { affinities: { fields: ['name', 'slug'] }, location: true } as any,
        sort: 'name',
        limit: 100,
      });
      return { data: profiles };
    },
  };
});
