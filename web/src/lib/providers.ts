// Social login buttons. The CMS enables a provider when its AUTH_<NAME>_CLIENT_ID/SECRET are set;
// list the same ones here, at build time, in PUBLIC_AUTH_PROVIDERS (e.g. "google,facebook").
export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

export const enabledProviders = (import.meta.env.PUBLIC_AUTH_PROVIDERS ?? '')
  .split(',')
  .map((p: string) => p.trim())
  .filter((p: string) => p in PROVIDER_LABELS);
