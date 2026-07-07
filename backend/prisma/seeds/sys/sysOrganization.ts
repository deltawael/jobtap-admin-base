import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysOrganization = async () => {
  const data: Prisma.SysOrganizationCreateManyInput[] = [
    {
      id: 'org-tenant-a-hq',
      code: 'tenant_a_hq',
      name: 'Tenant A Headquarters',
      description: 'Seed organization for tenant A',
      tenantId: 'tenant-a',
      pid: '0',
      status: 'ENABLED',
      createdBy: '-1',
      updatedBy: '-1'
    },
    {
      id: 'org-tenant-a-sales',
      code: 'tenant_a_sales',
      name: 'Tenant A Sales',
      description: 'Seed sales organization for tenant A',
      tenantId: 'tenant-a',
      pid: 'org-tenant-a-hq',
      status: 'ENABLED',
      createdBy: '-1',
      updatedBy: '-1'
    },
    {
      id: 'org-tenant-b-hq',
      code: 'tenant_b_hq',
      name: 'Tenant B Headquarters',
      description: 'Seed organization for tenant B',
      tenantId: 'tenant-b',
      pid: '0',
      status: 'ENABLED',
      createdBy: '-1',
      updatedBy: '-1'
    },
    {
      id: 'org-tenant-b-support',
      code: 'tenant_b_support',
      name: 'Tenant B Support',
      description: 'Seed support organization for tenant B',
      tenantId: 'tenant-b',
      pid: 'org-tenant-b-hq',
      status: 'ENABLED',
      createdBy: '-1',
      updatedBy: '-1'
    }
  ];

  return prisma.sysOrganization.createMany({ data, skipDuplicates: true });
};
