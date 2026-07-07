import { Prisma } from '@prisma/client';

import {
  scopeResourceResolvers,
  scopeSubjectResolvers
} from '../../../apps/base-system/src/api/iam/rest/scope-metadata.registry';
import { prisma } from '../helper';

export const initScopeResolvers = async () => {
  const subjectData: Prisma.ScopeSubjectResolverCreateManyInput[] = scopeSubjectResolvers.map(item => ({
    resolverCode: item.resolverCode,
    subjectEntityCode: item.subjectEntityCode,
    dimensionEntityCode: item.dimensionEntityCode,
    description: item.description ?? null,
    builtIn: true,
    status: 'ENABLED',
    createdBy: '-1',
    updatedBy: '-1'
  }));

  const resourceData: Prisma.ScopeResourceResolverCreateManyInput[] = scopeResourceResolvers.map(item => ({
    resolverCode: item.resolverCode,
    resourceEntityCode: item.resourceEntityCode,
    dimensionEntityCode: item.dimensionEntityCode,
    description: item.description ?? null,
    builtIn: true,
    status: 'ENABLED',
    createdBy: '-1',
    updatedBy: '-1'
  }));

  await prisma.scopeSubjectResolver.createMany({ data: subjectData, skipDuplicates: true });
  return prisma.scopeResourceResolver.createMany({ data: resourceData, skipDuplicates: true });
};
