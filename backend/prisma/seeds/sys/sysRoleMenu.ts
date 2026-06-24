import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysRoleMenu = async () => {
  const data: Prisma.SysRoleMenuCreateManyInput[] = [
    { roleId: 'role-system-admin', menuId: 50, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 100, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 101, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 102, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 103, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 104, domain: 'built-in' },
    { roleId: 'role-system-admin', menuId: 105, domain: 'built-in' },
    { roleId: 'role-tenant-admin-a', menuId: 50, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-a', menuId: 200, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-a', menuId: 201, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-a', menuId: 202, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-a', menuId: 203, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-a', menuId: 204, domain: 'tenant_a' },
    { roleId: 'role-tenant-admin-b', menuId: 50, domain: 'tenant_b' },
    { roleId: 'role-tenant-admin-b', menuId: 200, domain: 'tenant_b' },
    { roleId: 'role-tenant-admin-b', menuId: 201, domain: 'tenant_b' },
    { roleId: 'role-tenant-admin-b', menuId: 202, domain: 'tenant_b' },
    { roleId: 'role-tenant-admin-b', menuId: 203, domain: 'tenant_b' },
    { roleId: 'role-tenant-admin-b', menuId: 204, domain: 'tenant_b' }
  ];

  return prisma.sysRoleMenu.createMany({ data, skipDuplicates: true });
};