import type { Core } from '@strapi/strapi';

// Starter blog post, created only while there are no posts, so admin edits are kept.
export async function seedBlog(strapi: Core.Strapi) {
  const posts = strapi.documents('api::blog-post.blog-post');
  if ((await posts.count({ status: 'draft' } as any)) > 0) return;
  const tags = strapi.documents('api::blog-tag.blog-tag');
  const tag = async (name: string, slug: string) =>
    (await tags.findFirst({ filters: { slug } })) ?? (await tags.create({ data: { name, slug } as any }));
  const news = await tag('Novidades', 'novidades');
  const lightning = await tag('Lightning', 'lightning');
  await posts.create({
    status: 'published',
    data: {
      title: 'Está afim de conhecer o Afim?',
      slug: 'conheca-o-afim',
      date: new Date().toISOString().slice(0, 10),
      author: 'Equipe Afim',
      excerpt: 'Um diretório aberto para encontrar pessoas, negócios e ONGs com os mesmos valores que você. Veja o que já funciona e o que vem por aí.',
      body: 'O Afim nasceu de uma pergunta simples: e se fosse fácil encontrar quem compartilha os seus valores?\n\n## O que já funciona\n\n- Um diretório de profissionais, empresas, comércios e ONGs, por categoria, cidade e mapa.\n- Afinidades que filtram o que você vê, sem nunca serem exibidas.\n- Cadastro gratuito para negócios.\n\n## O que vem por aí\n\nDescontos para quem paga em Bitcoin Lightning, cupons por afinidade e o plano Pro para negócios. Quer saber quando chegar? [Deixe seu e-mail](/avise-me).\n\nAprenda também [como usar uma carteira Lightning](/ajuda/lightning/como-usar-carteira).',
      tags: [news.documentId, lightning.documentId],
    } as any,
  } as any);
  strapi.log.info('Seeded the blog');
}
