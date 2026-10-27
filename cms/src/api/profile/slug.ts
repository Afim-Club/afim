// A URL slug from a name, with a time-based suffix so profiles with the same name never clash.
export const uniqueSlug = (name: string) =>
  `${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
