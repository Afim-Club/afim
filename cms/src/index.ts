import type { Core } from '@strapi/strapi';
import { seed } from './seed';

const PUBLIC_ACTIONS = [
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::profile.profile.submit',
  'api::category.category.find',
  'api::category.category.findOne',
];

async function grantPublicRead(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!role) return;
  for (const action of PUBLIC_ACTIONS) {
    const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: role.id } });
    if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicRead(strapi);
    if (process.env.SEED === 'true') await seed(strapi);
  },
};
