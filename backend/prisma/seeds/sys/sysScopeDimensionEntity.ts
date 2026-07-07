import { Prisma } from '@prisma/client';

import { scopeDimensionEntities } from '../../../apps/base-system/src/api/iam/rest/scope-metadata.registry';
import { prisma } from '../helper';

export const initScopeDimensionEntity = async () => {
  const data: Prisma.ScopeDimensionEntityCreateManyInput[] = scopeDimensionEntities.map(item => ({
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    builtIn: true,
    status: 'ENABLED',
    createdBy: '-1',
    updatedBy: '-1'
  }));

  return prisma.scopeDimensionEntity.createMany({ data, skipDuplicates: true });
};
