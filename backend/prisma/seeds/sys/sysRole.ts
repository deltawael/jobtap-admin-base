import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysRole = async () => {
  const data: Prisma.SysRoleCreateManyInput[] = [
    { id: 'role-system-admin', code: 'ROLE_SYSTEM_ADMIN', name: 'System Admin', tenantId: null, templateId: 'rt-system-admin', builtIn: true, description: 'Bootstrap system administrator role', pid: '0', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'role-tenant-admin-a', code: 'ROLE_TENANT_ADMIN_A', name: 'Tenant Admin A', tenantId: 'tenant-a', templateId: 'rt-tenant-admin', builtIn: true, description: 'Bootstrap tenant administrator role for tenant A', pid: '0', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'role-tenant-admin-b', code: 'ROLE_TENANT_ADMIN_B', name: 'Tenant Admin B', tenantId: 'tenant-b', templateId: 'rt-tenant-admin', builtIn: true, description: 'Bootstrap tenant administrator role for tenant B', pid: '0', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.sysRole.createMany({ data, skipDuplicates: true });
};