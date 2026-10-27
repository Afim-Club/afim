import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::affinity.affinity', { only: ['find', 'findOne'] });
