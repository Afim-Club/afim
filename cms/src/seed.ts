import type { Core } from '@strapi/strapi';
import { STARTER_AFFINITIES } from './starter-affinities';

const CATEGORIES: Record<string, string[]> = {
  Tecnologia: ['Desenvolvimento', 'Design'],
  Alimentação: ['Restaurantes', 'Padarias'],
  Saúde: ['Clínicas', 'Terapias'],
  Serviços: ['Advocacia', 'Contabilidade', 'Construção', 'Imóveis', 'Segurança'],
  Comércio: ['Moda', 'Mercados', 'Autopeças', 'Agronegócio'],
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Each starter group is created only while it has no affinities, so edits and deletions made in the
// admin are kept. Starter descriptions also fill affinities whose description is still empty.
export async function seedAffinities(strapi: Core.Strapi) {
  const docs = strapi.documents('api::affinity.affinity');
  for (const [group, items] of Object.entries(STARTER_AFFINITIES)) {
    const filters = group ? { group: { $eq: group } } : { group: { $null: true } };
    if ((await docs.count({ filters } as any)) === 0) {
      for (const [i, { name, description, lean }] of items.entries()) {
        await docs.create({
          data: { name, description, lean, slug: slugify(group ? `${group} ${name}` : name), group: group || null, sortOrder: i } as any,
        });
      }
      strapi.log.info(`Seeded starter affinities${group ? ` (${group})` : ''}`);
      continue;
    }
    for (const { name, description } of items) {
      if (!description) continue;
      const found = await docs.findFirst({ filters: { slug: slugify(group ? `${group} ${name}` : name), description: { $null: true } } as any });
      if (found) await docs.update({ documentId: found.documentId, data: { description } as any });
    }
  }
}

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

  const affinities: Record<string, string> = Object.fromEntries(
    (await strapi.documents('api::affinity.affinity').findMany({ fields: ['name'] })).map((a) => [a.name, a.documentId]),
  );

  const profiles = [
    { profileType: 'professional', name: 'Ana Souza', description: 'Desenvolvedora full stack.', status: 'active',
      categories: ['Desenvolvimento'], affinities: ['Software livre', 'Diversidade e inclusão'], location: { city: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
      mediaLinks: [{ platform: 'GitHub', url: 'https://github.com/example' }],
      extra: [{ __component: 'extra.professional', seniority: 'senior', openToWork: true }] },
    { profileType: 'shop', name: 'Padaria Pão Afim', description: 'Pães artesanais e café.', status: 'active',
      categories: ['Padarias'], affinities: ['Veganismo', 'Comércio justo'], location: { city: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
      mediaLinks: [{ platform: 'Instagram', url: 'https://instagram.com/example' }],
      extra: [{ __component: 'extra.shop', openingHours: 'Seg-Sáb 6h-19h', offersDiscount: true, discountDetails: '10% para membros' }] },
    { profileType: 'company', name: 'Estúdio Alvo', description: 'Estúdio de design e tecnologia.', status: 'active',
      categories: ['Tecnologia', 'Design'], affinities: ['Software livre', 'Sustentabilidade'], location: { city: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
      mediaLinks: [], extra: [{ __component: 'extra.company', legalName: 'Alvo Ltda', employeeRange: '11-50', hiring: true }] },
    { profileType: 'ngo', name: 'Instituto Horizonte', description: 'Educação comunitária.', status: 'review',
      categories: ['Terapias'], affinities: ['Sustentabilidade'], location: { city: 'Recife', state: 'PE', lat: -8.0476, lng: -34.877 },
      mediaLinks: [], extra: [{ __component: 'extra.ngo', cause: 'Educação', acceptsVolunteers: true }] },
    { profileType: 'shop', name: 'Loja Bloqueada', description: 'Exemplo de perfil bloqueado.', status: 'blocked',
      categories: ['Restaurantes'], affinities: [], location: { city: 'Salvador', state: 'BA' }, mediaLinks: [], extra: [] },
    // Fictional profiles across the right of the political spectrum, so matching can be tried on that side too.
    ...([
      ['professional', 'Eduardo Vasconcelos', 'Contador.', 'Contabilidade', 'Centro-direita', [], 'Campinas', 'SP', -22.9099, -47.0626],
      ['company', 'AgroForte Insumos', 'Insumos agrícolas.', 'Agronegócio', 'Direita', ['Sustentabilidade'], 'Rio Verde', 'GO', -17.7923, -50.9192],
      ['shop', 'Churrascaria Fogo Alto', 'Churrascaria.', 'Restaurantes', 'Direita', [], 'Porto Alegre', 'RS', -30.0346, -51.2177],
      ['professional', 'Fernanda Albuquerque', 'Advogada empresarial.', 'Advocacia', 'Centro-direita', ['Diversidade e inclusão'], 'Florianópolis', 'SC', -27.5954, -48.548],
      ['shop', 'Armazém do Interior', 'Mercearia.', 'Mercados', 'Centro-direita', ['Comércio justo'], 'Ribeirão Preto', 'SP', -21.1704, -47.8103],
      ['company', 'Vigilância Sentinela', 'Segurança privada.', 'Segurança', 'Extrema-direita', [], 'Goiânia', 'GO', -16.6869, -49.2648],
      ['professional', 'Ricardo Bastos', 'Corretor de imóveis.', 'Imóveis', 'Direita', [], 'Joinville', 'SC', -26.3045, -48.8487],
      ['shop', 'Auto Center Estrada Real', 'Mecânica e autopeças.', 'Autopeças', 'Direita', [], 'Uberlândia', 'MG', -18.9186, -48.2772],
      ['professional', 'Juliana Prates', 'Personal trainer.', 'Terapias', 'Centro-direita', ['Bem-estar animal'], 'Londrina', 'PR', -23.3045, -51.1696],
      ['company', 'Construtora Pilar', 'Construção civil.', 'Construção', 'Centro-direita', [], 'Maringá', 'PR', -23.4205, -51.9333],
      ['shop', 'Boutique Elegance', 'Moda feminina.', 'Moda', 'Extrema-direita', [], 'Balneário Camboriú', 'SC', -26.9906, -48.6348],
    ] as const).map(([profileType, name, description, category, position, extra, city, state, lat, lng]) => ({
      profileType, name, description, status: 'active', categories: [category], affinities: [position, ...extra],
      location: { city, state, lat, lng }, mediaLinks: [], extra: [],
    })),
  ];

  for (const { categories, affinities: names, ...data } of profiles) {
    await strapi.documents('api::profile.profile').create({
      data: {
        ...data, slug: slugify(data.name),
        categories: categories.map((c) => cats[c]),
        affinities: names.map((a) => affinities[a]).filter(Boolean),
      } as any,
    });
  }
  strapi.log.info('Seeded sample categories and profiles');
}
