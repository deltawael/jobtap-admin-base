import { Prisma } from '@prisma/client';

import { capabilityScopeTargets } from '../../../apps/base-system/src/api/iam/rest/scope-metadata.registry';
import { prisma } from '../helper';

export const initCapabilityScopeTarget = async () => {
  const capabilities = await prisma.capability.findMany({
    where: { code: { in: capabilityScopeTargets.map(item => item.capabilityCode) } },
    select: { id: true, code: true }
  });
  const capabilityMap = new Map(capabilities.map(item => [item.code, item.id] as const));

  const data: Prisma.CapabilityScopeTargetCreateManyInput[] = capabilityScopeTargets
    .map(item => {
      const capabilityId = capabilityMap.get(item.capabilityCode);
      if (!capabilityId) return null;
      return {
        capabilityId,
        resourceEntityCode: item.resourceEntityCode,
        dimensionEntityCode: item.dimensionEntityCode ?? null,
        supportsSelf: item.supportsSelf ?? false,
        createdBy: '-1',
        updatedBy: '-1'
      } satisfies Prisma.CapabilityScopeTargetCreateManyInput;
    })
    .filter(Boolean) as Prisma.CapabilityScopeTargetCreateManyInput[];

  return prisma.capabilityScopeTarget.createMany({ data, skipDuplicates: true });
};
