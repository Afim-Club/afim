import type { Core } from '@strapi/strapi';

// Social login providers built into users-permissions. Each one is enabled only when its
// AUTH_<NAME>_CLIENT_ID and AUTH_<NAME>_CLIENT_SECRET are set, so secrets live in the environment
// instead of the admin panel. After the provider login, Strapi redirects to WEB_URL/entrar/<name>.
export const AUTH_PROVIDERS = ['google', 'facebook', 'github', 'linkedin'] as const;

export async function configureAuthProviders(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const grant = ((await store.get({ key: 'grant' })) ?? {}) as Record<string, any>;
  const webUrl = (process.env.WEB_URL ?? 'http://localhost:4321').replace(/\/$/, '');
  for (const name of AUTH_PROVIDERS) {
    const prefix = `AUTH_${name.toUpperCase()}`;
    const key = process.env[`${prefix}_CLIENT_ID`];
    const secret = process.env[`${prefix}_CLIENT_SECRET`];
    grant[name] = key && secret
      ? { ...grant[name], enabled: true, key, secret, callback: `${webUrl}/entrar/${name}` }
      : { ...grant[name], enabled: false };
  }
  await store.set({ key: 'grant', value: grant });
}
