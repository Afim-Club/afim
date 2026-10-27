// In-memory fixed-window limiter per client IP. State is per process: with N replicas the
// effective limit is N times higher. Needs PROXY=true behind Traefik so ctx.ip is the real client.
const hits = new Map<string, { count: number; resetAt: number }>();

export default (config: { max?: number; windowMs?: number }) => {
  const max = config.max ?? Number(process.env.SUBMIT_RATE_MAX ?? 5);
  const windowMs = config.windowMs ?? Number(process.env.SUBMIT_RATE_WINDOW_MS ?? 3_600_000);

  return async (ctx: any, next: () => Promise<void>) => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);

    const entry = hits.get(ctx.ip) ?? { count: 0, resetAt: now + windowMs };
    entry.count++;
    hits.set(ctx.ip, entry);

    if (entry.count > max) {
      ctx.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return ctx.tooManyRequests('Too many submissions, try again later');
    }
    return next();
  };
};
