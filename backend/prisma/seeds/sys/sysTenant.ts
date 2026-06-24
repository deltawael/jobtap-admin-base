import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysTenant = async () => {
  const data: Prisma.TenantCreateManyInput[] = [
    { id: 'tenant-a', code: 'tenant_a', name: 'Tenant A', description: 'Seed tenant A', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'tenant-b', code: 'tenant_b', name: 'Tenant B', description: 'Seed tenant B', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.tenant.createMany({ data, skipDuplicates: true });
};