'use strict';

// profile.status was renamed to profile.moderationStatus: Strapi 5 reserves `status` (draft|published), so the admin
// panel refused to save profiles with "Invalid status". Runs before the schema sync, so the values are copied into the
// new column before Strapi creates it empty. No-op on a fresh database.
module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('profiles'))) return;
    if (!(await knex.schema.hasColumn('profiles', 'status'))) return;
    if (!(await knex.schema.hasColumn('profiles', 'moderation_status'))) {
      await knex.schema.alterTable('profiles', (t) => t.string('moderation_status'));
    }
    await knex('profiles').update({ moderation_status: knex.ref('status') });
  },
};
