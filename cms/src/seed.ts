import type { Core } from '@strapi/strapi';

const CATEGORIES: Record<string, string[]> = {
  Tecnologia: ['Desenvolvimento', 'Design'],
  Alimentação: ['Restaurantes', 'Padarias'],
  Saúde: ['Clínicas', 'Terapias'],
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function seed(strapi: Core.Strapi) {
  if ((await strapi.documents('api::profile.profile').count({})) > 0) return;

  const cats: Record<string, string> = {};
  for (const [parent, children] of Object.entries(CATEGORIES)) {
    const p = await strapi.documents('api::category.category').create({
      data: { name: parent, slug: slugify(parent) },
    });
    cats[parent] = p.documentId;
    for (const child of children) {
      const c = await strapi.documents('api::category.category').create({
        data: { name: child, slug: slugify(child), parent: p.documentId },
      });
      cats[child] = c.documentId;
    }
  }

  const profiles = [
    { profileType: 'professional', name: 'Ana Souza', description: 'Desenvolvedora full stack.', status: 'active',
      categories: ['Desenvolvimento'], location: { city: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
      mediaLinks: [{ platform: 'GitHub', url: 'https://github.com/example' }],
      extra: [{ __component: 'extra.professional', seniority: 'senior', openToWork: true }] },
    { profileType: 'shop', name: 'Padaria Pão Afim', description: 'Pães artesanais e café.', status: 'active',
      categories: ['Padarias'], location: { city: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
      mediaLinks: [{ platform: 'Instagram', url: 'https://instagram.com/example' }],
      extra: [{ __component: 'extra.shop', openingHours: 'Seg-Sáb 6h-19h', offersDiscount: true, discountDetails: '10% para membros' }] },
    { profileType: 'company', name: 'Estúdio Alvo', description: 'Estúdio de design e tecnologia.', status: 'active',
      categories: ['Tecnologia', 'Design'], location: { city: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
      mediaLinks: [], extra: [{ __component: 'extra.company', legalName: 'Alvo Ltda', employeeRange: '11-50', hiring: true }] },
    { profileType: 'ngo', name: 'Instituto Horizonte', description: 'Educação comunitária.', status: 'review',
      categories: ['Terapias'], location: { city: 'Recife', state: 'PE', lat: -8.0476, lng: -34.877 },
      mediaLinks: [], extra: [{ __component: 'extra.ngo', cause: 'Educação', acceptsVolunteers: true }] },
    { profileType: 'shop', name: 'Loja Bloqueada', description: 'Exemplo de perfil bloqueado.', status: 'blocked',
      categories: ['Restaurantes'], location: { city: 'Salvador', state: 'BA' }, mediaLinks: [], extra: [] },
  ];

  for (const { categories, ...data } of profiles) {
    await strapi.documents('api::profile.profile').create({
      data: { ...data, slug: slugify(data.name), categories: categories.map((c) => cats[c]) } as any,
    });
  }
  strapi.log.info('Seeded sample categories and profiles');
}
