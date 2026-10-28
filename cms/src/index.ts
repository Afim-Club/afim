import type { Core } from '@strapi/strapi';
import { configureAuthProviders } from './auth-providers';
import { seed, seedAffinities } from './seed';
import { seedContent } from './seed-content';
import { seedHelp } from './seed-help';
import { seedBlog } from './seed-blog';

const PUBLIC_ACTIONS = [
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::profile.profile.submit',
  'api::category.category.find',
  'api::category.category.findOne',
  'api::affinity.affinity.find',
  'api::affinity.affinity.findOne',
  // Marketing site content (read at build time).
  'api::home-page.home-page.find',
  'api::pricing-page.pricing-page.find',
  'api::launch-page.launch-page.find',
  'api::site-setting.site-setting.find',
  'api::module-seo.module-seo.find',
  'api::page.page.find',
  'api::page.page.findOne',
  'api::plan.plan.find',
  'api::plan.plan.findOne',
  'api::help-topic.help-topic.find',
  'api::help-topic.help-topic.findOne',
  'api::help-article.help-article.find',
  'api::help-article.help-article.findOne',
  'api::blog-post.blog-post.find',
  'api::blog-post.blog-post.findOne',
  'api::blog-tag.blog-tag.find',
  'api::blog-tag.blog-tag.findOne',
];

// Signed-in members: the same reads, plus their own member data (see cms/src/api/member).
const AUTHENTICATED_ACTIONS = [
  ...PUBLIC_ACTIONS,
  'api::member.member.me',
  'api::member.member.updateMe',
  'api::member.member.deleteMe',
  'api::member.member.matches',
  'api::member.member.invite',
  'api::member.member.acceptInvite',
  'api::member.my-profile.find',
  'api::member.my-profile.create',
  'api::member.my-profile.update',
  'api::member.my-profile.delete',
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
    // Starter copy for the marketing site, created only when missing (edit it in the admin).
    await seedContent(strapi);
    await seedHelp(strapi);
    await seedBlog(strapi);
    if (process.env.SEED === 'true') await seed(strapi);
  },
};
