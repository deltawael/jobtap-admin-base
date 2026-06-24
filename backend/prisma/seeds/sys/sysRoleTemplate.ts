import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initRoleTemplate = async () => {
  const data: Prisma.RoleTemplateCreateManyInput[] = [
    { id: 'rt-system-admin', code: 'system_admin', name: 'System Admin', actorType: 'system_admin', description: 'Platform administrator template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-tenant-admin', code: 'tenant_admin', name: 'Tenant Admin', actorType: 'tenant_admin', description: 'Tenant administrator template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-boss', code: 'boss', name: 'Boss', actorType: 'tenant_user', description: 'Business owner template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-manager', code: 'manager', name: 'Manager', actorType: 'tenant_user', description: 'General manager template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-staff', code: 'staff', name: 'Staff', actorType: 'tenant_user', description: 'Default staff template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-readonly', code: 'readonly', name: 'Readonly', actorType: 'tenant_user', description: 'Readonly tenant template', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.roleTemplate.createMany({ data, skipDuplicates: true });
};