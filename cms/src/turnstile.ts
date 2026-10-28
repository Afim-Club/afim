// Optional Cloudflare Turnstile CAPTCHA for public forms, enforced only when TURNSTILE_SECRET is set.
export async function turnstileOk(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: typeof token === 'string' ? token : '', remoteip: ip }),
  }).then((r) => r.json() as Promise<{ success: boolean }>).catch(() => ({ success: false }));
  return verify.success;
}
