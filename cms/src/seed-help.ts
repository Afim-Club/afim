import type { Core } from '@strapi/strapi';

// Starter help center (/ajuda), created only while there are no help topics, so admin edits are kept.
// Lightning payments in the directory are not live yet: articles say so ("em breve").

type Article = { title: string; slug: string; summary: string; body: string };
type Topic = { name: string; slug: string; description: string; articles: Article[] };

const TAX_NOTE =
  '> Isso não é isenção de imposto: a venda continua tributável. Converse com o seu contador sobre como declarar o que você recebe em Bitcoin.';

const TOPICS: Topic[] = [
  {
    name: 'Primeiros passos', slug: 'primeiros-passos', description: 'O que é o Afim e como começar.',
    articles: [
      {
        title: 'O que é o Afim', slug: 'o-que-e-o-afim',
        summary: 'Um diretório aberto para encontrar pessoas, negócios e ONGs com os mesmos valores que você.',
        body: 'Está afim de encontrar quem compartilha os seus valores? O Afim é um diretório aberto de profissionais, empresas, comércios e ONGs.\n\nVocê marca as suas afinidades e o diretório mostra só os perfis que combinam com elas. Dá para buscar por categoria, por cidade ou no mapa.\n\nO Afim é software livre (AGPL-3.0) e segue a LGPD. Veja [os nossos valores](/valores).',
      },
      {
        title: 'Criar conta e escolher afinidades', slug: 'criar-conta-e-escolher-afinidades',
        summary: 'Crie a sua conta e marque as afinidades que vão filtrar o diretório para você.',
        body: '1. Entre em [Minha conta](/entrar) e crie a sua conta com e-mail e senha ou com um login social.\n2. Aceite o termo de consentimento: afinidades são dados sensíveis pela LGPD, por isso só são guardadas com o seu aceite.\n3. Marque as afinidades que importam para você. Se quiser, responda às pautas políticas para o Afim calcular a sua posição.\n4. Pronto: as listagens do diretório passam a mostrar só os perfis que têm todas as afinidades que você marcou.',
      },
      {
        title: 'Quem vê as minhas afinidades', slug: 'quem-ve-as-minhas-afinidades',
        summary: 'Ninguém. Suas afinidades só filtram o que você vê.',
        body: 'Ninguém além de você. As suas afinidades nunca aparecem no site, em perfis ou em links. Elas servem só para filtrar os perfis que você vê.\n\nOs negócios declaram as afinidades deles publicamente no perfil, e é assim que o filtro funciona. Mesmo assim, a posição política de um perfil nunca é exibida: ela só entra no filtro.\n\nVocê pode desmarcar o consentimento a qualquer momento em [Minha conta](/conta), e as suas afinidades são apagadas.',
      },
    ],
  },
  {
    name: 'Pagamentos com Lightning', slug: 'lightning', description: 'Pagar com Bitcoin pela rede Lightning e ganhar desconto nos negócios afins.',
    articles: [
      {
        title: 'Como usar uma carteira Lightning', slug: 'como-usar-carteira',
        summary: 'Lightning é um jeito rápido e barato de pagar com Bitcoin, como um Pix. Leva uns cinco minutos para começar.',
        body: 'Lightning é um jeito rápido e barato de pagar com Bitcoin, parecido com um Pix. No Afim, negócios do plano Pro vão dar desconto para quem paga assim (em breve). Leva uns cinco minutos para começar.\n\n> O Afim nunca guarda o seu dinheiro. O pagamento sai da sua carteira e vai direto para a carteira do negócio.\n\n## 1. Instale uma carteira\n\nBaixe no celular uma carteira com suporte a Lightning. Anote as palavras de recuperação num papel e guarde em lugar seguro: elas são a única forma de recuperar o dinheiro se você perder o celular.\n\n## 2. Coloque saldo\n\nCompre um pouco de Bitcoin na própria carteira ou numa corretora e envie para ela. Comece com um valor pequeno, o suficiente para uma compra.\n\n## 3. Pague no negócio afim\n\nNo perfil ou no caixa, toque em "Pagar com Lightning". O Afim mostra o valor já com desconto e um QR code. Abra a carteira, leia o código e confirme.\n\n## 4. Pronto\n\nO pagamento cai na hora para o negócio. Se faltar saldo, pague o resto em dinheiro ou Pix: o desconto vale para a parte paga em Lightning.',
      },
      {
        title: 'Pagar parte em Lightning e parte em Pix', slug: 'pagar-parte-em-lightning',
        summary: 'Faltou saldo? Pague uma parte em Lightning e o resto como preferir.',
        body: 'Você não precisa pagar tudo em Lightning. Se o saldo da carteira não cobrir a compra, pague uma parte em Lightning e o resto em dinheiro, Pix ou cartão.\n\nO desconto vale só para a parte paga em Lightning. Exemplo: numa compra de R$ 100 com 10% de desconto em Lightning, se você pagar R$ 50 em Lightning, o desconto é de R$ 5.',
      },
      {
        title: 'Split payment: por que Lightning', slug: 'split-payment',
        summary: 'Com a reforma tributária, Pix e cartão já chegam com o imposto descontado. Entenda a diferença.',
        body: `Com a reforma tributária, pagamentos por Pix, cartão e boleto passam pelo split payment: o imposto é separado na hora e o vendedor recebe só o valor líquido.\n\nA venda em si não dá prejuízo, mas o vendedor paga o imposto venda a venda, mesmo que o mês feche no prejuízo depois de pagar todas as despesas.\n\nEm Lightning o vendedor recebe o valor inteiro na hora e paga os impostos pelo caminho normal, com o próprio contador. Por isso os negócios afins podem dar desconto para quem paga assim.\n\n${TAX_NOTE}`,
      },
      {
        title: 'Ter o meu próprio nó', slug: 'ter-o-meu-proprio-no',
        summary: 'Não quer depender de carteiras de terceiros? Um integrador monta um nó Bitcoin e Lightning só seu.',
        body: 'Carteiras de celular são o jeito mais fácil de começar. Se você ou o seu negócio não quer depender de terceiros, pode ter o seu próprio nó Bitcoin e Lightning.\n\nOs parceiros integradores do Afim montam e mantêm esses nós para você. Encontre um na categoria [Integradores Bitcoin](/explorar/categorias/integradores-bitcoin).',
      },
    ],
  },
  {
    name: 'Para negócios', slug: 'negocios', description: 'Cadastrar e divulgar o seu negócio.',
    articles: [
      {
        title: 'Cadastrar meu negócio', slug: 'cadastrar-meu-negocio',
        summary: 'Cadastre a sua empresa, comércio ou ONG de graça.',
        body: '1. Crie a sua conta em [Minha conta](/entrar).\n2. Em [Meus perfis](/conta/perfis), cadastre a sua empresa, comércio ou ONG com as afinidades que o negócio declara.\n3. O perfil passa por moderação antes de aparecer no diretório. Cada edição volta para a moderação.\n\nNo plano Grátis o seu negócio já aparece no diretório. Veja o que o [plano Pro](/planos) acrescenta.',
      },
    ],
  },
  {
    name: 'Conta e privacidade', slug: 'conta-e-privacidade', description: 'Seus dados, seus direitos.',
    articles: [
      {
        title: 'Apagar minha conta', slug: 'apagar-minha-conta',
        summary: 'Apague a sua conta e todos os seus dados quando quiser.',
        body: 'Em [Minha conta](/conta), use o botão de apagar a conta. Apagamos a sua conta, as suas afinidades, os perfis que você cadastrou e as suas sessões. Não dá para desfazer.',
      },
      {
        title: 'Meus dados e a LGPD', slug: 'meus-dados-e-a-lgpd',
        summary: 'O que guardamos e como você controla os seus dados.',
        body: 'O Afim guarda só o que você declarou e trata as afinidades como dados sensíveis (LGPD, art. 11): só com o seu consentimento, sem exibir para ninguém, e apagadas quando você desmarca o aceite.\n\nVeja a [política de privacidade](/privacidade).',
      },
    ],
  },
];

export async function seedHelp(strapi: Core.Strapi) {
  // Category used by the "own node" article; integrators are normal profiles in it.
  const categories = strapi.documents('api::category.category');
  if (!(await categories.findFirst({ filters: { slug: 'integradores-bitcoin' } }))) {
    await categories.create({ data: { name: 'Integradores Bitcoin', slug: 'integradores-bitcoin' } as any });
  }

  const topics = strapi.documents('api::help-topic.help-topic');
  if ((await topics.count({})) > 0) return;
  const articles = strapi.documents('api::help-article.help-article');
  for (const [i, t] of TOPICS.entries()) {
    const topic = await topics.create({ data: { name: t.name, slug: t.slug, description: t.description, sortOrder: i } as any });
    for (const [j, a] of t.articles.entries()) {
      await articles.create({ data: { ...a, sortOrder: j, topic: topic.documentId } as any, status: 'published' } as any);
    }
  }
  strapi.log.info('Seeded the help center');
}
