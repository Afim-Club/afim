// Only "me" routes: a member can read, change and erase their own data, and nobody else's.
// No find/findOne routes exist, so member data is never listed through the API.
export default {
  routes: [
    { method: 'GET', path: '/members/me', handler: 'member.me' },
    { method: 'PUT', path: '/members/me', handler: 'member.updateMe' },
    { method: 'DELETE', path: '/members/me', handler: 'member.deleteMe' },
    { method: 'GET', path: '/members/me/matches', handler: 'member.matches' },
    { method: 'GET', path: '/members/me/invite', handler: 'member.invite' },
    { method: 'POST', path: '/members/me/invite', handler: 'member.acceptInvite' },
    // Companies, shops and NGOs the member registered (see ../controllers/my-profile.ts).
    { method: 'GET', path: '/members/me/profiles', handler: 'my-profile.find' },
    { method: 'POST', path: '/members/me/profiles', handler: 'my-profile.create' },
    { method: 'PUT', path: '/members/me/profiles/:id', handler: 'my-profile.update' },
    { method: 'DELETE', path: '/members/me/profiles/:id', handler: 'my-profile.delete' },
  ],
};
