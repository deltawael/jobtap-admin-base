import { prisma } from '../helper';

export const initCasbinRule = async () => {
  return prisma.casbinRule.createMany({ data: [], skipDuplicates: true });
};