import type { Core } from '@strapi/strapi';

// Starter copy for the marketing site (home, plans, /avise-me, /sobre, /valores, /privacidade). Each item is created only when it does not
// exist yet (a deleted starter page comes back on the next boot: unpublish it instead), so edits made in the admin are kept. Prices are examples until the plans are confirmed.

const HOME = {
  heroTitle: 'Está afim de encontrar quem tem os mesmos valores que você?',
  heroText:
    'O Afim é um diretório aberto de profissionais, empresas, comércios e ONGs. Você marca suas afinidades e o diretório mostra só os seus afins.',
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

const LAUNCH = {
  badge: 'Em breve',
  title: 'Está afim de saber quando tudo estiver pronto?',
  text: 'O Afim está crescendo e o diretório já funciona. Deixe seu e-mail e avisamos quando estes recursos chegarem:',
  items: [
    { title: 'Descontos em Lightning', text: 'Pague em Bitcoin e economize nos negócios afins.' },
    { title: 'Cupons por afinidade', text: 'Ofertas só para quem compartilha seus valores.' },
    { title: 'Avaliações entre afins', text: 'Confiança depois de cada compra.' },
    { title: 'Perto de mim', text: 'O app no celular mostra afins ao seu redor.' },
    { title: 'Plano Pro para negócios', text: 'Painel, selo de verificado e campanhas.' },
  ],
  consentText: 'Aceito receber e-mails do Afim sobre o lançamento. Posso sair a qualquer momento pelo link em cada e-mail.',
  doneTitle: 'Pronto, você está na lista',
  doneText: 'Avisamos por e-mail quando os novos recursos chegarem. Enquanto isso, o diretório já está aberto.',
  seo: { metaTitle: 'Avise-me · Afim', metaDescription: 'Deixe seu e-mail e saiba quando os descontos em Lightning, os cupons por afinidade e o plano Pro do Afim chegarem.' },
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
  {
    title: 'Nossos valores', slug: 'valores',
    body: 'Está afim de encontrar pessoas e empresas com os mesmos valores que você? O Afim existe para aproximar afins. Estes são os valores que guiam o projeto.\n\n## Afinidade sem exposição\n\nSuas afinidades são suas. Elas filtram os perfis que você vê, mas nunca aparecem para ninguém. E a posição política de ninguém é exibida em perfil.\n\n## Cada um declara o que quer\n\nPerfis são feitos só com o que a própria pessoa ou o próprio negócio declarou. Nada de dados comprados, raspados da internet ou deduzidos do seu comportamento.\n\n## Respeito a todos os lados\n\nO Afim não escolhe lado. Do espectro político aos valores de cada um, todas as afinidades têm lugar, e cada pessoa decide com quem quer se encontrar.\n\n## Código aberto\n\nO Afim é software livre (AGPL-3.0). Qualquer pessoa pode ler o código, propor melhorias e conferir como os dados são tratados.\n\n## Sem rastreamento\n\nNão vendemos dados nem usamos rastreadores de publicidade. Você apaga a sua conta e tudo o que é seu quando quiser, como manda a LGPD.\n\n## Economia entre afins\n\nQueremos que o dinheiro circule entre quem compartilha valores: negócios locais, descontos para quem paga em Bitcoin Lightning, direto para quem vende, sem intermediários.',
    seo: { metaTitle: 'Nossos valores · Afim', metaDescription: 'Afinidade sem exposição, dados só declarados, respeito a todos os lados, código aberto e economia entre afins: os valores do Afim.' },
  },
  {
    title: 'Privacidade', slug: 'privacidade',
    body: 'Texto inicial: revise com um advogado antes de divulgar.\n\nO Afim segue a Lei Geral de Proteção de Dados (LGPD).\n\n## O que guardamos\n\n- **Conta**: e-mail e senha (cifrada) ou o login social que você escolher.\n- **Afinidades**: só com o seu consentimento, com a data e a versão do aceite. Elas nunca são exibidas e servem só para filtrar os perfis que você vê. Desmarcar o consentimento apaga todas.\n- **Perfis de negócios**: só o que o próprio negócio declarou. O e-mail de contato não é público.\n- **Lista do avise-me**: e-mail, nome (opcional), para quem quer novidades e a data do aceite.\n\n## O que não fazemos\n\nNão vendemos nem compartilhamos seus dados, e o site não usa rastreadores de publicidade.\n\n## Seus direitos\n\nVocê apaga a sua conta e todos os seus dados em Minha conta, a qualquer momento. Para sair da lista do avise-me, use o link em qualquer e-mail que enviarmos.',
  },
];

export async function seedContent(strapi: Core.Strapi) {
  const singles: [string, object][] = [['api::home-page.home-page', HOME], ['api::pricing-page.pricing-page', PRICING], ['api::launch-page.launch-page', LAUNCH]];
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
  for (const p of PAGES) {
    if (!(await pages.findFirst({ filters: { slug: p.slug }, status: 'draft' } as any))) await pages.create({ data: p as any, status: 'published' } as any);
  }
}
