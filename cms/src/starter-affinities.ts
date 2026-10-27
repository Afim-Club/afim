// Starter affinities by group ('' = no group), in display order. See seedAffinities in seed.ts.
// Two political levels: members answer "Pautas políticas" (agree, disagree or neutral) and their position in
// "Política" is derived from the answers (cms/src/api/member/political.ts). `lean` is where agreeing with an issue
// leans: -2 (left) to +2 (right). Positions must stay ordered from left to right (sortOrder 0..6).
// Political descriptions summarize what each position usually supports and rejects (Brazil/Western context).
export type StarterAffinity = { name: string; description?: string; lean?: number };

export const STARTER_AFFINITIES: Record<string, StarterAffinity[]> = {
  '': ['Sustentabilidade', 'Veganismo', 'Diversidade e inclusão', 'Comércio justo', 'Software livre', 'Bem-estar animal'].map((name) => ({ name })),
  Política: [
    {
      name: 'Extrema-esquerda',
      description:
        'Costuma apoiar: fim do capitalismo e transição para o socialismo/comunismo; expropriação dos grandes meios de produção; reforma agrária radical; estatização total da economia; anti-imperialismo. ' +
        'Costuma rejeitar: propriedade privada dos meios de produção; livre mercado; existência de bilionários; influência de potências globais capitalistas (como os EUA).',
    },
    {
      name: 'Esquerda',
      description:
        'Costuma apoiar: Estado de bem-estar social robusto; ampliação de direitos trabalhistas; taxação de grandes fortunas; cotas raciais e sociais; pautas progressistas (descriminalização do aborto e das drogas). ' +
        'Costuma rejeitar: privatizações de setores vitais; flexibilização de leis trabalhistas; austeridade fiscal rigorosa que afete programas sociais; porte civil de armas; redução da maioridade penal.',
    },
    {
      name: 'Centro-esquerda',
      description:
        'Costuma apoiar: economia mista (capitalismo com forte regulação estatal); redes de proteção social; fortalecimento de serviços públicos (saúde e educação); sustentabilidade ambiental; inclusão social gradual. ' +
        'Costuma rejeitar: neoliberalismo puro; ausência de regulação sobre o mercado; desigualdade extrema; revoluções armadas ou o fim do sistema capitalista.',
    },
    {
      name: 'Centro',
      description:
        'Costuma apoiar: pragmatismo político; equilíbrio entre o livre mercado e a assistência social do Estado; responsabilidade fiscal; reformas graduais; preservação da estabilidade das instituições democráticas. ' +
        'Costuma rejeitar: polarização política; extremismos ideológicos de qualquer lado; rupturas institucionais; políticas econômicas ou pautas morais radicais.',
    },
    {
      name: 'Centro-direita',
      description:
        'Costuma apoiar: redução do tamanho do Estado; livre iniciativa; privatizações; responsabilidade fiscal e controle de gastos públicos; ambiente favorável aos negócios; conservadorismo moderado nos costumes. ' +
        'Costuma rejeitar: alta carga tributária; intervencionismo do Estado na economia; inchaço da máquina pública; pautas identitárias ou movimentos sociais radicais.',
    },
    {
      name: 'Direita',
      description:
        'Costuma apoiar: conservadorismo moral e defesa da família tradicional; livre mercado; endurecimento penal (redução da maioridade, aumento de penas); porte civil de armas; meritocracia; proteção irrestrita da propriedade privada. ' +
        'Costuma rejeitar: aborto; legalização das drogas; movimentos de invasão de terras (como o MST); políticas de cotas; discussões de gênero nas escolas; interferência do Estado na vida privada e na economia.',
    },
    {
      name: 'Extrema-direita',
      description:
        'Costuma apoiar: nacionalismo fervoroso; tradicionalismo radical; políticas severas de anti-imigração; valorização da ordem, do militarismo e da hierarquia; ceticismo em relação a instituições globais. ' +
        'Costuma rejeitar: globalismo; multiculturalismo; progressismo moral; decisões de órgãos internacionais (ONU, OMS); direitos humanos aplicados ao sistema prisional; comunismo e movimentos sociais progressistas.',
    },
  ],
  'Pautas políticas': [
    { name: 'Socialismo ou comunismo', lean: -2 },
    { name: 'Livre mercado', lean: 2 },
    { name: 'Estatização da economia', lean: -2 },
    { name: 'Privatizações', lean: 2 },
    { name: 'Regulação estatal do mercado', lean: -1 },
    { name: 'Redução do tamanho do Estado', lean: 2 },
    { name: 'Austeridade fiscal', lean: 1 },
    { name: 'Taxação de grandes fortunas', lean: -2 },
    { name: 'Estado de bem-estar social', lean: -1 },
    { name: 'Ampliação de direitos trabalhistas', lean: -1 },
    { name: 'Reforma agrária', lean: -2 },
    { name: 'Movimentos sociais de luta pela terra (como o MST)', lean: -2 },
    { name: 'Cotas raciais e sociais', lean: -1 },
    { name: 'Descriminalização do aborto', lean: -1 },
    { name: 'Legalização das drogas', lean: -1 },
    { name: 'Porte civil de armas', lean: 2 },
    { name: 'Redução da maioridade penal', lean: 2 },
    { name: 'Aumento de penas', lean: 1 },
    { name: 'Família tradicional e conservadorismo nos costumes', lean: 2 },
    { name: 'Discussões de gênero nas escolas', lean: -1 },
    { name: 'Proteção ambiental', lean: -1 },
    { name: 'Restrição à imigração', lean: 2 },
    { name: 'Nacionalismo', lean: 2 },
    { name: 'Instituições internacionais (ONU, OMS)', lean: -1 },
  ],
};
