// Short in-memory cache for CMS reads. Pages are rendered on demand in a Cloudflare Worker,
// and one Worker instance serves many requests, so pages share Strapi responses for a minute
// instead of asking the CMS on every visit. A failed load is not kept.
const TTL_MS = 60_000;
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: Date.now(), value });
  value.catch(() => store.delete(key));
  return value;
}
