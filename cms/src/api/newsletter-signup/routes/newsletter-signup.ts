// Only these two public routes: the list itself is never readable through the API. Unsubscribe needs a
// 192-bit random token, so it has no rate limit (people may leave right after joining).
export default {
  routes: [
    { method: 'POST', path: '/newsletter/subscribe', handler: 'newsletter-signup.subscribe', config: { auth: false, middlewares: ['global::submit-rate-limit'] } },
    { method: 'POST', path: '/newsletter/unsubscribe', handler: 'newsletter-signup.unsubscribe', config: { auth: false } },
  ],
};
