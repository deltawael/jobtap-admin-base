import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysTenant = async () => {
  const data: Prisma.TenantCreateManyInput[] = [
    {
      id: 'tenant-built-in',
      code: 'built-in',
      name: 'Platform Built-in',
      description: 'Platform tenant context',
      status: 'ENABLED',
      createdBy: '-1',
      updatedBy: '-1'
    }
  ];

  return prisma.tenant.createMany({ data, skipDuplicates: true });
};
