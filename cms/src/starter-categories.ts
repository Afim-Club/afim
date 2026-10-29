// Starter category tree (parent -> subcategories), created on boot by seedCategories in seed.ts.
// Broad on purpose, so the moderation routine (and the admin) rarely need to create categories.
// Names are UI copy (Portuguese); slugs come from the names and must stay unique across the tree.
export const STARTER_CATEGORIES: Record<string, string[]> = {
  Tecnologia: ['Desenvolvimento', 'Infraestrutura e DevOps', 'Segurança da informação', 'Dados e inteligência artificial', 'Suporte de TI', 'Design'],
  Alimentação: ['Restaurantes', 'Padarias', 'Doces', 'Buffet', 'Cafés', 'Bares', 'Produtos naturais'],
  Saúde: ['Clínicas', 'Medicina', 'Odontologia', 'Psicologia', 'Terapias', 'Nutrição', 'Fisioterapia', 'Laboratórios', 'Farmácias'],
  'Bem-estar': ['Yoga', 'Fitness', 'Dança', 'Meditação', 'Esportes'],
  Beleza: ['Estética', 'Maquiagem', 'Cabeleireiros', 'Barbearias'],
  Educação: ['Escolas', 'Cursos', 'Idiomas', 'Aulas particulares'],
  Serviços: ['Advocacia', 'Contabilidade', 'Consultoria', 'Marketing e comunicação', 'Tradução', 'Segurança', 'Limpeza'],
  'Casa e construção': ['Construção', 'Reformas', 'Arquitetura', 'Marcenaria', 'Elétrica e hidráulica', 'Jardinagem', 'Imóveis'],
  Comércio: ['Varejo', 'Moda', 'Mercados', 'Artesanato', 'Livrarias', 'Eletrônicos', 'Postos de combustível'],
  Automotivo: ['Oficinas', 'Autopeças', 'Transporte'],
  'Agro e meio ambiente': ['Agronegócio', 'Agricultura familiar', 'Reciclagem', 'Energia solar'],
  'Turismo e eventos': ['Turismo', 'Hospedagem', 'Eventos', 'Fotografia'],
  'Cultura e arte': ['Música', 'Artes visuais', 'Audiovisual', 'Editoras'],
  Pets: ['Pet shops', 'Veterinária', 'Adestramento'],
  Finanças: ['Seguros', 'Investimentos', 'Bitcoin'],
  'Terceiro setor': ['Associações', 'Projetos sociais', 'Proteção animal'],
};
