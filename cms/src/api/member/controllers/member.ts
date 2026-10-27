import { randomBytes } from 'node:crypto';
import { factories } from '@strapi/strapi';
import { POSITION_GROUP, positionIndex, type Stance } from '../political';

// Bump when the consent text shown in web/src/pages/conta.astro changes.
export const CONSENT_VERSION = '2026-10-27';

// Which profile types each preference finds. NGOs count as organizations, with companies.
const TYPES = { findPeople: ['professional'], findCompanies: ['company', 'ngo'], findShops: ['shop'] } as const;

type Pref = { affinity: { documentId: string; name: string; slug: string; group: string | null; lean: number | null }; stance: Stance | null; findPeople: boolean; findCompanies: boolean; findShops: boolean };

// An invite only counts for accounts created this recently, so old members can't attach themselves to someone.
const INVITE_WINDOW_MS = 24 * 3_600_000;

const POPULATE = { affinities: { populate: { affinity: { fields: ['name', 'slug', 'group', 'lean', 'description'] } } } };

export default factories.createCoreController('api::member.member', ({ strapi }) => {
  const findMine = (userId: number) =>
    strapi.documents('api::member.member').findFirst({ filters: { user: { id: userId } }, populate: POPULATE as any });

  const positions = () =>
    strapi.documents('api::affinity.affinity').findMany({
      filters: { group: { $eq: POSITION_GROUP } } as any, fields: ['name', 'slug', 'description'] as any, sort: ['sortOrder:asc', 'name:asc'] as any,
    });

  const view = (m: any) => ({
    displayName: m?.displayName ?? '',
    city: m?.city ?? '',
    state: m?.state ?? '',
    affinityConsentAt: m?.affinityConsentAt ?? null,
    affinityConsentVersion: m?.affinityConsentVersion ?? null,
    affinities: ((m?.affinities ?? []) as any[])
      .filter((a: any) => a.affinity)
      .map((a: any) => ({
        affinity: {
          documentId: a.affinity.documentId, name: a.affinity.name, slug: a.affinity.slug,
          group: a.affinity.group ?? null, lean: a.affinity.lean ?? null, description: a.affinity.description ?? null,
        },
        stance: a.stance ?? null,
        findPeople: a.findPeople, findCompanies: a.findCompanies, findShops: a.findShops,
      })) as Pref[],
  });

  // The member's own political position, derived from their answers on political issues. It is not stored.
  const withPosition = async (m: any) => {
    const v = view(m);
    const answers = v.affinities
      .filter((p) => p.stance && p.affinity.lean !== null)
      .map((p) => ({ lean: p.affinity.lean as number, stance: p.stance as Stance }));
    const index = positionIndex(answers);
    const list = index === null ? [] : await positions();
    const pos = index === null ? null : (list[Math.min(index, list.length - 1)] as any);
    return { ...v, politicalPosition: pos ? { documentId: pos.documentId, name: pos.name, slug: pos.slug, description: pos.description ?? null } : null };
  };

  return {
    async me(ctx) {
      return { data: await withPosition(await findMine(ctx.state.user.id)) };
    },

    // Whitelisted fields only. Affinities (sensitive data under LGPD) are stored only with explicit consent;
    // sending consent=false withdraws it and erases the affinities. The member's own political position is derived
    // from their answers (see ../political.ts); rows for positions only say which spectrums they want to find.
    async updateMe(ctx) {
      const body = ((ctx.request.body as any)?.data ?? {}) as Record<string, any>;
      const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const wanted = Array.isArray(body.affinities) ? body.affinities.slice(0, 100) : [];
      const consent = body.consent === true;
      if (wanted.length && !consent) return ctx.badRequest('Consent is required to store affinities');

      const ids = [...new Set(wanted.map((a: any) => a?.affinity).filter((id: unknown) => typeof id === 'string'))] as string[];
      const known = ids.length
        ? await strapi.documents('api::affinity.affinity').findMany({ filters: { documentId: { $in: ids } }, fields: ['id', 'group', 'lean'] as any })
        : [];
      const byDoc = new Map(known.map((a: any) => [a.documentId, a]));
      const flags = (a: any) => ({ findPeople: a?.findPeople === true, findCompanies: a?.findCompanies === true, findShops: a?.findShops === true });
      const affinities: Record<string, any>[] = [];
      for (const id of ids) {
        const a = wanted.find((w: any) => w?.affinity === id);
        const k = byDoc.get(id) as any;
        if (!k) continue;
        if (k.group === POSITION_GROUP) {
          // Which kinds of profiles to find for this spectrum; a row with nothing to find is not kept.
          if (Object.values(flags(a)).some(Boolean)) affinities.push({ affinity: k.id, stance: null, ...flags(a) });
        } else if (k.lean === null || k.lean === undefined) {
          affinities.push({ affinity: k.id, stance: null, ...flags(a) });
        } else if (['agrees', 'disagrees', 'neutral'].includes(a.stance)) {
          affinities.push({ affinity: k.id, stance: a.stance, ...flags(null) });
        }
      }

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
      return { data: await withPosition(saved) };
    },

    // The member's personal invite code (created on first use) and how many people signed up with it.
    // Only the count is returned: members are never shown to each other.
    async invite(ctx) {
      const userId = ctx.state.user.id;
      const docs = strapi.documents('api::member.member');
      let me = await docs.findFirst({ filters: { user: { id: userId } } as any, fields: ['inviteCode'] as any });
      if (!me) me = await docs.create({ data: { user: userId } as any, fields: ['inviteCode'] as any });
      let code = (me as any).inviteCode as string | null;
      if (!code) {
        code = randomBytes(6).toString('base64url');
        await docs.update({ documentId: me.documentId, data: { inviteCode: code } as any });
      }
      const accepted = await docs.count({ filters: { invitedBy: { documentId: me.documentId } } as any });
      return { data: { code, accepted } };
    },

    // Records who invited a new account. Only once, only for recent accounts, and never yourself.
    async acceptInvite(ctx) {
      const userId = ctx.state.user.id;
      const code = (ctx.request.body as any)?.code;
      if (typeof code !== 'string' || !code) return ctx.badRequest('code is required');
      const docs = strapi.documents('api::member.member');
      const inviter = await docs.findFirst({ filters: { inviteCode: code } as any, populate: { user: { fields: ['id'] } } as any });
      if (!inviter) return ctx.notFound('Invite not found');
      if ((inviter as any).user?.id === userId) return ctx.badRequest('You cannot accept your own invite');
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: userId }, select: ['createdAt'] });
      if (Date.now() - new Date(user.createdAt).getTime() > INVITE_WINDOW_MS) return ctx.badRequest('Invites are only for new accounts');
      let me = await docs.findFirst({ filters: { user: { id: userId } } as any, populate: { invitedBy: { fields: ['id'] } } as any });
      if (!me) me = await docs.create({ data: { user: userId } as any });
      if (!(me as any).invitedBy) await docs.update({ documentId: me.documentId, data: { invitedBy: inviter.documentId } as any });
      return { data: { accepted: true } };
    },

    // LGPD right to erasure: removes the member data, the profiles they registered, the login and every session.
    async deleteMe(ctx) {
      const userId = ctx.state.user.id;
      const current = await findMine(userId);
      if (current) await strapi.documents('api::member.member').delete({ documentId: current.documentId });
      const owned = await strapi.documents('api::profile.profile').findMany({ filters: { owner: { id: userId } } as any, fields: ['id'] as any });
      for (const p of owned) await strapi.documents('api::profile.profile').delete({ documentId: p.documentId });
      await strapi.sessionManager('users-permissions').invalidateRefreshToken(String(userId));
      await strapi.db.query('plugin::users-permissions.user').delete({ where: { id: userId } });
      ctx.status = 204;
    },

    // Active profiles that have every affinity the member chose (intersection), each for the profile types chosen
    // for it. A profile has a single political position, so the chosen spectrums count as one requirement: any of them.
    // Answers on political issues don't match profiles by themselves.
    // Done server side so the affinities never travel in a public, logged URL.
    // Each profile comes with `matchedAffinities`: the member's affinities it has.
    async matches(ctx) {
      const prefs = view(await findMine(ctx.state.user.id)).affinities.filter((p) => p.stance === null);
      const typesOf = (p: Pref) => (Object.keys(TYPES) as (keyof typeof TYPES)[]).filter((k) => p[k]).flatMap((k) => TYPES[k]) as string[];
      // Each requirement: affinity documentId -> profile types it finds.
      const spectrums = new Map<string, string[]>();
      const reqs: Map<string, string[]>[] = [];
      for (const p of prefs) {
        const types = typesOf(p);
        if (!types.length) continue;
        if (p.affinity.group === POSITION_GROUP) spectrums.set(p.affinity.documentId, types);
        else reqs.push(new Map([[p.affinity.documentId, types]]));
      }
      if (spectrums.size) reqs.push(spectrums);
      if (!reqs.length) return { data: [] };
      // Candidates have at least one of the affinities; the intersection is applied below.
      const candidates = await strapi.documents('api::profile.profile').findMany({
        filters: { $and: [{ moderationStatus: 'active' }, { affinities: { documentId: { $in: prefs.map((p) => p.affinity.documentId) } } }] } as any,
        fields: ['name', 'slug', 'profileType', 'description'],
        populate: { affinities: { fields: ['name', 'slug'] }, location: true } as any,
        sort: 'name',
      });
      const fits = (p: any, req: Map<string, string[]>) => (p.affinities ?? []).some((a: any) => req.get(a.documentId)?.includes(p.profileType));
      return {
        data: candidates
          .filter((p: any) => reqs.every((req) => fits(p, req)))
          .slice(0, 100)
          .map((p: any) => ({
            ...p,
            matchedAffinities: (p.affinities ?? []).filter((a: any) => reqs.some((req) => req.get(a.documentId)?.includes(p.profileType))),
          })),
      };
    },
  };
});
