import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSysUserRole = async () => {
  const data: Prisma.SysUserRoleCreateManyInput[] = [
    { userId: 'user-system-admin', roleId: 'role-system-admin' },
    { userId: 'user-tenant-admin-a', roleId: 'role-tenant-admin-a' },
    { userId: 'user-tenant-admin-b', roleId: 'role-tenant-admin-b' }
  ];

  return prisma.sysUserRole.createMany({ data, skipDuplicates: true });
};