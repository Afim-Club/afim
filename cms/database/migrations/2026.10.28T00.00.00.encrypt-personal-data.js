'use strict';

const { createCipheriv, createHmac, hkdfSync, randomBytes } = require('node:crypto');

// Encrypts the personal data that was stored in plain text (see src/crypto.ts, whose format this code repeats):
// - member affinities: the rows of the old member.affinity-preference component become one encrypted JSON value in
//   members.affinity_data. Runs before the schema sync, which then drops the component tables.
// - newsletter_signups.email (with the new email_hash for duplicates) and profiles.contact_email.
// No-op on a fresh database. Already encrypted values ("v1:") are left alone.

const PREFIX = 'v1:';
const MAX_EMAIL = 150;

function keys() {
  let raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATA_ENCRYPTION_KEY is required (openssl rand -base64 32)');
    raw = Buffer.alloc(32, 7).toString('base64'); // the public development key of src/crypto.ts
  }
  const master = Buffer.from(raw, 'base64');
  if (master.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes in base64');
  const derive = (info) => Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), info, 32));
  return { enc: derive('afim-encrypt'), mac: derive('afim-hash') };
}

module.exports = {
  async up(knex) {
    const k = keys();
    const encrypt = (text) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', k.enc, iv);
      const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      return PREFIX + [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join(':');
    };
    const hash = (text) => createHmac('sha256', k.mac).update(text).digest('base64url');
    const has = (table, column) => knex.schema.hasColumn(table, column);

    // Member affinities.
    if ((await knex.schema.hasTable('members')) && (await knex.schema.hasTable('components_member_affinity_preferences'))) {
      if (!(await has('members', 'affinity_data'))) await knex.schema.alterTable('members', (t) => t.text('affinity_data', 'longtext'));
      const rows = await knex('members_cmps as mc')
        .join('components_member_affinity_preferences as p', 'p.id', 'mc.cmp_id')
        .join('components_member_affinity_preferences_affinity_lnk as l', 'l.affinity_preference_id', 'p.id')
        .join('affinities as a', 'a.id', 'l.affinity_id')
        .where({ 'mc.component_type': 'member.affinity-preference', 'mc.field': 'affinities' })
        .orderBy(['mc.entity_id', 'mc.order'])
        .select('mc.entity_id as member', 'a.document_id as affinity', 'p.stance', 'p.find_people', 'p.find_companies', 'p.find_shops');
      const byMember = new Map();
      for (const r of rows) {
        const list = byMember.get(r.member) || [];
        if (list.some((x) => x.affinity === r.affinity)) continue;
        list.push({ affinity: r.affinity, stance: r.stance || null, findPeople: !!r.find_people, findCompanies: !!r.find_companies, findShops: !!r.find_shops });
        byMember.set(r.member, list);
      }
      for (const [id, list] of byMember) {
        await knex('members').where({ id }).whereNull('affinity_data').update({ affinity_data: encrypt(JSON.stringify(list)) });
      }
      // Plain-text copies must not outlive the migration, even if the schema sync kept the tables.
      await knex('components_member_affinity_preferences_affinity_lnk').del();
      await knex('members_cmps').where({ component_type: 'member.affinity-preference' }).del();
      await knex('components_member_affinity_preferences').del();
    }

    // Launch list e-mails.
    if ((await knex.schema.hasTable('newsletter_signups')) && (await has('newsletter_signups', 'email'))) {
      if (!(await has('newsletter_signups', 'email_hash'))) await knex.schema.alterTable('newsletter_signups', (t) => t.string('email_hash'));
      for (const r of await knex('newsletter_signups').select('id', 'email')) {
        if (!r.email || r.email.startsWith(PREFIX) || r.email.length > MAX_EMAIL) continue;
        const email = r.email.trim().toLowerCase();
        await knex('newsletter_signups').where({ id: r.id }).update({ email: encrypt(email), email_hash: hash(email) });
      }
    }

    // Profile contact e-mails.
    if ((await knex.schema.hasTable('profiles')) && (await has('profiles', 'contact_email'))) {
      for (const r of await knex('profiles').select('id', 'contact_email').whereNotNull('contact_email')) {
        if (!r.contact_email || r.contact_email.startsWith(PREFIX) || r.contact_email.length > MAX_EMAIL) continue;
        await knex('profiles').where({ id: r.id }).update({ contact_email: encrypt(r.contact_email) });
      }
    }
  },
};
