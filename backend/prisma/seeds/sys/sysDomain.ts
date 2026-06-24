import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysDomain = async () => {
  const data: Prisma.SysDomainCreateInput[] = [
    { id: 'domain-built-in', code: 'built-in', name: 'Platform Built-in', description: 'Compatibility domain for platform accounts', status: 'ENABLED', createdBy: '-1', updatedAt: null, updatedBy: null },
    { id: 'domain-tenant-a', code: 'tenant_a', name: 'Tenant A', description: 'Compatibility domain for tenant A', status: 'ENABLED', createdBy: '-1', updatedAt: null, updatedBy: null },
    { id: 'domain-tenant-b', code: 'tenant_b', name: 'Tenant B', description: 'Compatibility domain for tenant B', status: 'ENABLED', createdBy: '-1', updatedAt: null, updatedBy: null }
  ];

  return prisma.sysDomain.createMany({ data, skipDuplicates: true });
};