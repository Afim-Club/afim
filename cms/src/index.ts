import type { Core } from '@strapi/strapi';
import { configureAuthProviders } from './auth-providers';
import { seed, seedAffinities } from './seed';

const PUBLIC_ACTIONS = [
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::profile.profile.submit',
  'api::category.category.find',
  'api::category.category.findOne',
  'api::affinity.affinity.find',
  'api::affinity.affinity.findOne',
];

// Signed-in members: the same reads, plus their own member data (see cms/src/api/member).
const AUTHENTICATED_ACTIONS = [
  ...PUBLIC_ACTIONS,
  'api::member.member.me',
  'api::member.member.updateMe',
  'api::member.member.deleteMe',
  'api::member.member.matches',
];

async function grant(strapi: Core.Strapi, roleType: string, actions: string[]) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });
  if (!role) return;
  for (const action of actions) {
    const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: role.id } });
    if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grant(strapi, 'public', PUBLIC_ACTIONS);
    await grant(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
    await configureAuthProviders(strapi);
    // A starter list of affinities when there are none, so /conta always has options (edit them in the admin).
    await seedAffinities(strapi);
    if (process.env.SEED === 'true') await seed(strapi);
  },
};
