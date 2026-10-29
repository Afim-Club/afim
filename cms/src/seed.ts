import type { Core } from '@strapi/strapi';
import { STARTER_AFFINITIES } from './starter-affinities';
import { STARTER_CATEGORIES } from './starter-categories';

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

// Each starter parent is created with its subcategories only while its slug is missing, so edits and
// deletions of subcategories made in the admin are kept. Never renames or moves existing categories.
export async function seedCategories(strapi: Core.Strapi) {
  const docs = strapi.documents('api::category.category');
  for (const [parent, children] of Object.entries(STARTER_CATEGORIES)) {
    if (await docs.findFirst({ filters: { slug: slugify(parent) } } as any)) continue;
    const p = await docs.create({ data: { name: parent, slug: slugify(parent) } as any });
    for (const child of children) {
      if (await docs.findFirst({ filters: { slug: slugify(child) } } as any)) continue;
      await docs.create({ data: { name: child, slug: slugify(child), parent: p.documentId } as any });
    }
    strapi.log.info(`Seeded starter categories (${parent})`);
  }
}

export async function seed(strapi: Core.Strapi) {
  if ((await strapi.documents('api::profile.profile').count({})) > 0) return;

  const cats: Record<string, string> = Object.fromEntries(
    (await strapi.documents('api::category.category').findMany({ fields: ['name'] })).map((c) => [c.name, c.documentId]),
  );

  const affinities: Record<string, string> = Object.fromEntries(
    (await strapi.documents('api::affinity.affinity').findMany({ fields: ['name'] })).map((a) => [a.name, a.documentId]),
  );

  const profiles = [
    { profileType: 'professional', name: 'Ana Souza', description: 'Desenvolvedora full stack.', moderationStatus: 'active',
      categories: ['Desenvolvimento'], affinities: ['Software livre', 'Diversidade e inclusão'], location: { city: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
      mediaLinks: [{ platform: 'GitHub', url: 'https://github.com/example' }],
      extra: [{ __component: 'extra.professional', seniority: 'senior', openToWork: true }] },
    { profileType: 'shop', name: 'Padaria Pão Afim', description: 'Pães artesanais e café.', moderationStatus: 'active',
      categories: ['Padarias'], affinities: ['Veganismo', 'Comércio justo'], location: { city: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
      mediaLinks: [{ platform: 'Instagram', url: 'https://instagram.com/example' }],
      extra: [{ __component: 'extra.shop', openingHours: 'Seg-Sáb 6h-19h', offersDiscount: true, discountDetails: '10% para membros' }] },
    { profileType: 'company', name: 'Estúdio Alvo', description: 'Estúdio de design e tecnologia.', moderationStatus: 'active',
      categories: ['Tecnologia', 'Design'], affinities: ['Software livre', 'Sustentabilidade'], location: { city: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
      mediaLinks: [], extra: [{ __component: 'extra.company', legalName: 'Alvo Ltda', employeeRange: '11-50', hiring: true }] },
    { profileType: 'ngo', name: 'Instituto Horizonte', description: 'Educação comunitária.', moderationStatus: 'review',
      categories: ['Terapias'], affinities: ['Sustentabilidade'], location: { city: 'Recife', state: 'PE', lat: -8.0476, lng: -34.877 },
      mediaLinks: [], extra: [{ __component: 'extra.ngo', cause: 'Educação', acceptsVolunteers: true }] },
    { profileType: 'shop', name: 'Loja Bloqueada', description: 'Exemplo de perfil bloqueado.', moderationStatus: 'blocked',
      categories: ['Restaurantes'], affinities: [], location: { city: 'Salvador', state: 'BA' }, mediaLinks: [], extra: [] },
    // Fictional profiles across the political spectrum, so matching can be tried on both sides.
    // [type, name, description, category, political position, other affinities, city, state, lat, lng]
    ...([
      ['company', 'Rede Varejo Popular', 'Rede de varejo.', 'Varejo', 'Esquerda', [], 'Franca', 'SP', -20.5386, -47.4008],
      ['professional', 'Rafael Moura', 'Personal trainer (bodyhealth).', 'Fitness', 'Centro-esquerda', [], 'Recife', 'PE', -8.0476, -34.877],
      ['professional', 'Carla Mendes', 'Doces.', 'Doces', 'Esquerda', [], 'Salvador', 'BA', -12.9777, -38.5016],
      ['professional', 'Patrícia Alves', 'Psicóloga.', 'Psicologia', 'Centro-esquerda', [], 'Fortaleza', 'CE', -3.7319, -38.5267],
      ['professional', 'Bruna Costa', 'Professora de yoga.', 'Yoga', 'Esquerda', [], 'Rio de Janeiro', 'RJ', -22.9068, -43.1729],
      ['professional', 'Helena Duarte', 'Professora de dança.', 'Dança', 'Centro-esquerda', [], 'Belém', 'PA', -1.4558, -48.4902],
      ['professional', 'Renata Lopes', 'Psicóloga.', 'Psicologia', 'Esquerda', [], 'São Luís', 'MA', -2.5307, -44.3068],
      ['professional', 'Diego Martins', 'Personal trainer.', 'Fitness', 'Centro-esquerda', [], 'Natal', 'RN', -5.7945, -35.211],
      ['professional', 'Vanessa Prado', 'Terapias naturais.', 'Terapias', 'Esquerda', [], 'Niterói', 'RJ', -22.8832, -43.1034],
      ['professional', 'Camila Torres', 'Alongamento de cílios.', 'Estética', 'Centro-esquerda', [], 'João Pessoa', 'PB', -7.1195, -34.845],
      ['company', 'Rota Viva Turismo', 'Agência de turismo.', 'Turismo', 'Esquerda', [], 'Maceió', 'AL', -9.6658, -35.735],
      ['professional', 'Larissa Nunes', 'Influenciadora e maquiadora.', 'Maquiagem', 'Centro-esquerda', [], 'Teresina', 'PI', -5.0892, -42.8019],
      ['company', 'Buffet Sabor da Casa', 'Buffet para eventos.', 'Buffet', 'Esquerda', [], 'Aracaju', 'SE', -10.9472, -37.0731],
      ['company', 'Laboratório Vida', 'Laboratório de análises.', 'Laboratórios', 'Centro-esquerda', [], 'Juiz de Fora', 'MG', -21.7642, -43.3503],
      ['shop', 'Doceria Doce Lar', 'Doceria.', 'Doces', 'Esquerda', [], 'Santos', 'SP', -23.9608, -46.3336],
      ['shop', 'Auto Peças Central', 'Autopeças.', 'Autopeças', 'Centro-esquerda', [], 'Feira de Santana', 'BA', -12.2664, -38.9663],
      ['professional', 'Rosa Fernandes', 'Artesanatos.', 'Artesanato', 'Esquerda', [], 'Olinda', 'PE', -8.0089, -34.8553],
      ['shop', 'Restaurante Bom Prato', 'Restaurante.', 'Restaurantes', 'Centro-esquerda', [], 'Manaus', 'AM', -3.119, -60.0217],
      ['shop', 'Posto Lago Azul', 'Posto de combustível.', 'Postos de combustível', 'Esquerda', [], 'Palmas', 'TO', -10.2491, -48.3243],
      ['professional', 'Paulo Ribeiro', 'Marceneiro.', 'Marcenaria', 'Centro-esquerda', [], 'Pelotas', 'RS', -31.7654, -52.3376],
      ['shop', 'Mix Variedades', 'Comércio.', 'Varejo', 'Esquerda', [], 'Campina Grande', 'PB', -7.2307, -35.8817],
      ['professional', 'Jorge Santos', 'Venda de bolachas e roscas.', 'Padarias', 'Centro-esquerda', [], 'São Bernardo do Campo', 'SP', -23.6914, -46.5646],
      ['shop', 'Mercadinho Bairro Novo', 'Mercadinho de bairro.', 'Mercados', 'Esquerda', [], 'Contagem', 'MG', -19.9317, -44.0536],
      ['shop', 'Ateliê Moda Bela', 'Loja de moda.', 'Moda', 'Centro-esquerda', [], 'Vitória', 'ES', -20.3155, -40.3128],
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
      profileType, name, description, moderationStatus: 'active', categories: [category], affinities: [position, ...extra],
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
  strapi.log.info('Seeded sample profiles');
}
