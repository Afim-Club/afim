import type { Core } from '@strapi/strapi';

// Starter copy for the marketing site (home, plans, about). Each item is created only when it does not
// exist yet, so edits made in the admin are kept. Prices are examples until the plans are confirmed.

const HOME = {
  heroTitle: 'Encontre quem compartilha seus valores',
  heroText:
    'O Afim é um diretório aberto de profissionais, empresas, comércios e ONGs. Você marca suas afinidades e o diretório mostra só quem combina com você.',
  heroNote: 'Suas afinidades nunca são exibidas. Elas servem só para filtrar os perfis que você vê.',
  searchPlaceholder: 'Busque por nome, serviço ou cidade',
  sections: [
    {
      __component: 'marketing.steps',
      title: 'Como funciona',
      items: [
        { title: 'Escolha suas afinidades', text: 'Valores, causas e, se quiser, posições políticas. Elas não aparecem para ninguém: só filtram a sua busca.' },
        { title: 'Encontre afins perto de você', text: 'Busque por categoria, cidade ou no mapa. Os resultados já vêm filtrados pelas suas afinidades, sem expor nenhuma delas.' },
        { title: 'Pague em Lightning e economize', text: 'Negócios do plano Pro dão desconto para quem paga em Bitcoin Lightning, direto para eles.' },
      ],
    },
    { __component: 'marketing.directory-showcase', title: 'Explore o diretório', linkLabel: 'Ver todas as categorias' },
    {
      __component: 'marketing.feature-grid',
      title: 'Tem um negócio? Seja encontrado por quem pensa como você',
      text: 'Cadastre sua empresa, comércio ou ONG de graça. Com o plano Pro, você atrai clientes com ofertas para quem paga em Lightning e campanhas para quem tem as mesmas afinidades.',
      note: 'Com o split payment da reforma tributária, a venda por Pix ou cartão já chega com o imposto descontado. Em Lightning você recebe o valor inteiro na hora e acerta os impostos com o seu contador.',
      ctaLabel: 'Cadastrar meu negócio',
      ctaHref: '/conta/perfis',
      secondaryLabel: 'Ver planos',
      secondaryHref: '/planos',
      items: [
        { title: 'Ofertas em Lightning', text: 'Desconto para quem paga em Bitcoin, direto na sua carteira.' },
        { title: 'Campanhas por afinidade', text: 'Cupons que chegam só a quem tem certas afinidades, sem você saber quem é.' },
        { title: 'Painel do anunciante', text: 'Visitas, cliques e pagamentos com desconto.' },
        { title: 'Selo de verificado', text: 'Documento conferido, mais confiança.' },
      ],
    },
    {
      __component: 'marketing.cta-band',
      title: 'Aberto, sem rastreamento, do jeito certo',
      text: 'Código aberto (AGPL). Perfis só com dados que você declarou. As suas afinidades nunca são exibidas, e a posição política de ninguém aparece em perfil: elas servem só para filtrar a busca. E você apaga tudo quando quiser, como manda a LGPD.',
      ctaLabel: 'Criar minha conta',
      ctaHref: '/entrar',
      secondaryLabel: 'Sobre o Afim',
      secondaryHref: '/sobre',
      dark: true,
    },
  ],
  seo: { metaTitle: 'Afim · Encontre quem compartilha seus valores', metaDescription: 'Diretório aberto de profissionais, empresas, comércios e ONGs com valores em comum. Suas afinidades filtram a busca e nunca são exibidas.' },
};

const PRICING = {
  title: 'Planos para negócios',
  intro: 'Para pessoas, o Afim é sempre grátis. Negócios aparecem no diretório de graça e podem assinar o Pro para atrair clientes afins.',
  lightningDiscountPercent: 10,
  featureLabels: [
    { key: 'lightningOffers', label: 'Ofertas para quem paga em Lightning' },
    { key: 'affinityCampaigns', label: 'Campanhas e cupons por afinidade' },
    { key: 'dashboard', label: 'Painel com visitas, cliques e pagamentos' },
    { key: 'verifiedBadge', label: 'Selo de verificado' },
    { key: 'reviewReplies', label: 'Responder avaliações' },
    { key: 'featuredListing', label: 'Destaque nas listagens' },
    { key: 'cityFeatured', label: 'Pode comprar "Destaque na sua cidade"' },
  ],
  faq: [
    { question: 'O Afim fica com o meu dinheiro?', answer: 'Não. Os pagamentos em Lightning vão direto para a sua carteira (Lightning Address). O Afim só calcula o desconto e gera a fatura.' },
    { question: 'Por que incentivar Lightning em vez de Pix?', answer: 'Com o split payment da reforma tributária, o imposto de cada venda por Pix ou cartão é retido na hora e você recebe só o líquido, mesmo que o mês feche no prejuízo depois das despesas. Em Lightning você recebe o valor inteiro e paga os impostos pelo caminho normal. Não é isenção: a venda continua tributável.' },
    { question: 'Posso pagar a assinatura em Lightning?', answer: 'Sim. A assinatura aceita cartão pelo Stripe ou Bitcoin Lightning.' },
    { question: 'O que acontece se eu cancelar?', answer: 'Seu perfil continua no diretório no plano Grátis. Ofertas, campanhas e o selo saem do ar.' },
  ],
  seo: { metaTitle: 'Planos para negócios · Afim', metaDescription: 'O Afim é grátis para pessoas e negócios. O plano Pro traz ofertas em Lightning, campanhas por afinidade, painel e selo de verificado.' },
};

const PLANS = [
  {
    name: 'Grátis', slug: 'free', description: 'Para estar no diretório e ser encontrado.', priceMonthlyBrl: 0, priceYearlyBrl: 0,
    features: [], sortOrder: 0, featured: false, active: true,
    highlights: ['Perfil no diretório, nas categorias, cidades e mapa', 'Afinidades do negócio no perfil (a posição política não é exibida, só filtra)', 'Aparece para quem tem as mesmas afinidades', 'Link de convite para trazer clientes'],
  },
  {
    name: 'Pro', slug: 'pro', description: 'Para atrair clientes afins e medir o retorno.', priceMonthlyBrl: 29, priceYearlyBrl: 290,
    features: ['lightningOffers', 'affinityCampaigns', 'dashboard', 'verifiedBadge', 'reviewReplies', 'featuredListing', 'cityFeatured'],
    sortOrder: 1, featured: true, active: true,
    highlights: ['Ofertas para quem paga em Lightning, direto na sua carteira', 'Campanhas e cupons por afinidade', 'Painel com visitas, cliques e pagamentos com desconto', 'Selo de verificado (documento conferido)', 'Destaque nas listagens da sua categoria e cidade', 'Responder avaliações de clientes'],
  },
];

const PAGES = [
  {
    title: 'Sobre o Afim', slug: 'sobre',
    body: 'O Afim é um diretório aberto que conecta pessoas, negócios e comércios com valores em comum.\n\n## Como funciona\n\nCada pessoa marca as afinidades que importam para ela, e o diretório mostra só os perfis que combinam. As afinidades de quem busca nunca aparecem para ninguém.\n\n## Código aberto\n\nO Afim é software livre (AGPL-3.0). Qualquer pessoa pode ler o código, sugerir melhorias e verificar como os dados são tratados.',
  },
];

export async function seedContent(strapi: Core.Strapi) {
  const singles: [string, object][] = [['api::home-page.home-page', HOME], ['api::pricing-page.pricing-page', PRICING]];
  for (const [uid, data] of singles) {
    const docs = strapi.documents(uid as any);
    if (!(await docs.findFirst({ status: 'draft' } as any))) {
      await docs.create({ data: data as any, status: 'published' } as any);
      strapi.log.info(`Seeded ${uid}`);
    }
  }
  const settings = strapi.documents('api::site-setting.site-setting');
  if (!(await settings.findFirst({}))) {
    await settings.create({ data: { siteName: 'Afim', defaultDescription: 'Diretório open source de pessoas, negócios e comércios com valores em comum.', footerText: 'Afim — diretório open source de pessoas, negócios e comércios com valores em comum.' } as any });
  }
  const plans = strapi.documents('api::plan.plan');
  if ((await plans.count({})) === 0) for (const p of PLANS) await plans.create({ data: p as any });
  const pages = strapi.documents('api::page.page');
  if ((await pages.count({ status: 'draft' } as any)) === 0) for (const p of PAGES) await pages.create({ data: p as any, status: 'published' } as any);
}
