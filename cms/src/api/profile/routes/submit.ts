export default {
  routes: [
    { method: 'POST', path: '/profiles/submit', handler: 'profile.submit', config: { auth: false } },
  ],
};
