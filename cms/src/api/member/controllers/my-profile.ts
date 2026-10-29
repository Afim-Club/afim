import type { Core } from '@strapi/strapi';
import { uniqueSlug } from '../../profile/slug';
import { MAX_EMAIL, encrypt } from '../../../crypto';

// Profiles a member registers and owns (profile.owner, a private field): their own professional profile (one at most)
// and the companies, shops and NGOs they represent. They always go to moderation: new and edited profiles are saved
// with moderationStatus=review.
const TYPES = ['professional', 'company', 'shop', 'ngo'];
export const MAX_OWNED = 10;
const TYPE_ERROR = 'name and profileType (professional|company|shop|ngo) are required';

const FIELDS = ['name', 'slug', 'profileType', 'description', 'moderationStatus'];
const POPULATE = {
  location: true, mediaLinks: true, extra: true,
  affinities: { fields: ['name', 'slug', 'group'] }, categories: { fields: ['name', 'slug'] },
};
export const MAX_CATEGORIES = 3;
const MAX_LINKS = 10;

// Per-type details (the `extra` dynamic zone): only these fields, with these types, are accepted from members.
const EXTRA: Record<string, Record<string, 'string' | 'text' | 'boolean' | string[]>> = {
  professional: { seniority: ['intern', 'junior', 'mid', 'senior', 'lead'], openToWork: 'boolean' },
  company: { legalName: 'string', employeeRange: ['1-10', '11-50', '51-200', '201-1000', '1000+'], hiring: 'boolean' },
  shop: { openingHours: 'text', offersDiscount: 'boolean', discountDetails: 'text' },
  ngo: { cause: 'string', acceptsVolunteers: 'boolean' },
};

const view = (p: any) => ({
  documentId: p.documentId, name: p.name, slug: p.slug, profileType: p.profileType, description: p.description ?? '', status: p.moderationStatus,
  city: p.location?.city ?? '', state: p.location?.state ?? '',
  lat: p.location?.lat ?? null, lng: p.location?.lng ?? null,
  affinities: (p.affinities ?? []).map((a: any) => ({ documentId: a.documentId, name: a.name, group: a.group ?? null })),
  categories: (p.categories ?? []).map((c: any) => ({ documentId: c.documentId, name: c.name })),
  mediaLinks: (p.mediaLinks ?? []).map((l: any) => ({ platform: l.platform, url: l.url })),
  extra: (({ __component, id, ...fields }: any) => fields)(p.extra?.[0] ?? {}),
});

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Only http(s) links, so a profile page never renders a javascript: or data: URL.
function links(v: unknown) {
  return (Array.isArray(v) ? v : [])
    .map((l: any) => ({ platform: str(l?.platform, 50), url: str(l?.url, 255) }))
    .filter((l) => l.platform && /^https?:\/\/[^\s]+$/i.test(l.url))
    .slice(0, MAX_LINKS);
}

function extra(profileType: string, v: unknown) {
  const body = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { __component: `extra.${profileType}` };
  for (const [key, kind] of Object.entries(EXTRA[profileType])) {
    const value = body[key];
    if (kind === 'boolean') out[key] = value === true;
    else if (Array.isArray(kind)) out[key] = kind.includes(value as string) ? value : null;
    else out[key] = str(value, kind === 'text' ? 1000 : 255) || null;
  }
  return [out];
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const profiles = () => strapi.documents('api::profile.profile');
  const findOwned = (userId: number, documentId: string) =>
    profiles().findFirst({ filters: { documentId, owner: { id: userId } } as any, fields: FIELDS as any, populate: POPULATE as any });

  // Whitelisted fields. Affinities are the ones the business declares in public: plain affinities and political
  // spectrums, never the political issues (those only describe a member's own answers).
  async function input(ctx: any) {
    const body = ((ctx.request.body as any)?.data ?? {}) as Record<string, any>;
    const name = str(body.name, 255);
    const profileType = str(body.profileType, 20);
    if (!name || !TYPES.includes(profileType)) return null;
    const ids = (Array.isArray(body.affinities) ? body.affinities : []).filter((id: unknown) => typeof id === 'string').slice(0, 100);
    // Map position, rounded to 2 decimals (about 1 km) so a professional's exact address is never stored.
    const coord = (v: unknown, max: number) => (typeof v === 'number' && Math.abs(v) <= max ? Math.round(v * 100) / 100 : null);
    const lat = coord(body.lat, 90);
    const lng = coord(body.lng, 180);
    const affinities = ids.length
      ? await strapi.documents('api::affinity.affinity').findMany({ filters: { documentId: { $in: ids }, lean: { $null: true } } as any, fields: ['id'] as any })
      : [];
    // Existing categories only (members can't create them), at most MAX_CATEGORIES.
    const categoryIds = (Array.isArray(body.categories) ? body.categories : []).filter((id: unknown) => typeof id === 'string').slice(0, MAX_CATEGORIES);
    const categories = categoryIds.length
      ? await strapi.documents('api::category.category').findMany({ filters: { documentId: { $in: categoryIds } } as any, fields: ['id'] as any })
      : [];
    return {
      name, profileType,
      description: str(body.description, 2000),
      city: str(body.city, 120),
      state: str(body.state, 2).toUpperCase(),
      ...(lat !== null && lng !== null ? { lat, lng } : { lat: null, lng: null }),
      affinities: affinities.map((a: any) => a.id),
      categories: categories.map((c: any) => c.id),
      mediaLinks: links(body.mediaLinks),
      extra: extra(profileType, body.extra),
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
      if (!data) return ctx.badRequest(TYPE_ERROR);
      const owned = await profiles().findMany({ filters: { owner: { id: userId } } as any, fields: ['profileType'] as any });
      if (owned.length >= MAX_OWNED) return ctx.badRequest(`A member can register up to ${MAX_OWNED} profiles`);
      if (data.profileType === 'professional' && owned.some((p: any) => p.profileType === 'professional')) {
        return ctx.badRequest('A member can have only one professional profile');
      }
      const { city, state, lat, lng, ...rest } = data;
      const created = await profiles().create({
        data: {
          ...rest, slug: uniqueSlug(data.name), moderationStatus: 'review', owner: userId,
          // Moderators reach the owner through the login e-mail (private, never returned by the API, encrypted).
          contactEmail: encrypt(String(ctx.state.user.email).slice(0, MAX_EMAIL)), location: { city, state, lat, lng },
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
      if ((current as any).moderationStatus === 'blocked') return ctx.forbidden('This profile was blocked by moderation');
      const data = await input(ctx);
      if (!data) return ctx.badRequest(TYPE_ERROR);
      // The type is fixed after creation, so the one-professional-profile rule holds.
      if (data.profileType !== (current as any).profileType) return ctx.badRequest('profileType cannot be changed');
      const { city, state, lat, lng, ...rest } = data;
      // The page sends back the current position, so leaving lat/lng out removes the profile from the map.
      const updated = await profiles().update({
        documentId: current.documentId,
        data: { ...rest, moderationStatus: 'review', location: { city, state, lat, lng } } as any,
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
