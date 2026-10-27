import type { Core } from '@strapi/strapi';
import { uniqueSlug } from '../../profile/slug';

// Companies, shops and NGOs a member registers and owns (profile.owner, a private field).
// They always go to moderation: new and edited profiles are saved with status=review.
const TYPES = ['company', 'shop', 'ngo'];
export const MAX_OWNED = 10;

const FIELDS = ['name', 'slug', 'profileType', 'description', 'status'];
const POPULATE = { location: true, affinities: { fields: ['name', 'slug', 'group'] } };

const view = (p: any) => ({
  documentId: p.documentId, name: p.name, slug: p.slug, profileType: p.profileType, description: p.description ?? '', status: p.status,
  city: p.location?.city ?? '', state: p.location?.state ?? '',
  affinities: (p.affinities ?? []).map((a: any) => ({ documentId: a.documentId, name: a.name, group: a.group ?? null })),
});

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const profiles = () => strapi.documents('api::profile.profile');
  const findOwned = (userId: number, documentId: string) =>
    profiles().findFirst({ filters: { documentId, owner: { id: userId } } as any, fields: FIELDS as any, populate: POPULATE as any });

  // Whitelisted fields. Affinities are the ones the business declares in public: plain affinities and political
  // spectrums, never the political issues (those only describe a member's own answers).
  async function input(ctx: any) {
    const body = ((ctx.request.body as any)?.data ?? {}) as Record<string, any>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const name = str(body.name, 255);
    const profileType = str(body.profileType, 20);
    if (!name || !TYPES.includes(profileType)) return null;
    const ids = (Array.isArray(body.affinities) ? body.affinities : []).filter((id: unknown) => typeof id === 'string').slice(0, 100);
    const affinities = ids.length
      ? await strapi.documents('api::affinity.affinity').findMany({ filters: { documentId: { $in: ids }, lean: { $null: true } } as any, fields: ['id'] as any })
      : [];
    return {
      name, profileType,
      description: str(body.description, 2000),
      city: str(body.city, 120),
      state: str(body.state, 2).toUpperCase(),
      affinities: affinities.map((a: any) => a.id),
    };
  }

  return {
    async find(ctx: any) {
      const list = await profiles().findMany({
        filters: { owner: { id: ctx.state.user.id } } as any, fields: FIELDS as any, populate: POPULATE as any, sort: 'name',
      });
      return { data: list.map(view) };
    },

    async create(ctx: any) {
      const userId = ctx.state.user.id;
      const data = await input(ctx);
      if (!data) return ctx.badRequest('name and profileType (company|shop|ngo) are required');
      const owned = await profiles().count({ filters: { owner: { id: userId } } as any });
      if (owned >= MAX_OWNED) return ctx.badRequest(`A member can register up to ${MAX_OWNED} profiles`);
      const { city, state, ...rest } = data;
      const created = await profiles().create({
        data: {
          ...rest, slug: uniqueSlug(data.name), status: 'review', owner: userId,
          // Moderators reach the owner through the login e-mail (private, never returned by the API).
          contactEmail: ctx.state.user.email, location: { city, state },
        } as any,
        fields: FIELDS as any, populate: POPULATE as any,
      });
      ctx.status = 201;
      return { data: view(created) };
    },

    // Any change sends the profile back to moderation. Blocked profiles can't be edited by their owner.
    async update(ctx: any) {
      const current = await findOwned(ctx.state.user.id, ctx.params.id);
      if (!current) return ctx.notFound();
      if ((current as any).status === 'blocked') return ctx.forbidden('This profile was blocked by moderation');
      const data = await input(ctx);
      if (!data) return ctx.badRequest('name and profileType (company|shop|ngo) are required');
      const { city, state, ...rest } = data;
      const loc = (current as any).location ?? {};
      // Keep the map coordinates set by moderation unless the place changed.
      const samePlace = loc.city === city && loc.state === state;
      const updated = await profiles().update({
        documentId: current.documentId,
        data: { ...rest, status: 'review', location: { city, state, ...(samePlace ? { lat: loc.lat, lng: loc.lng } : {}) } } as any,
        fields: FIELDS as any, populate: POPULATE as any,
      });
      return { data: view(updated) };
    },

    async delete(ctx: any) {
      const current = await findOwned(ctx.state.user.id, ctx.params.id);
      if (!current) return ctx.notFound();
      await profiles().delete({ documentId: current.documentId });
      ctx.status = 204;
    },
  };
};
