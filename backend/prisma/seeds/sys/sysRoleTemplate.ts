import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initRoleTemplate = async () => {
  const data: Prisma.RoleTemplateCreateManyInput[] = [
    { id: 'rt-system-admin', code: 'system_admin', name: 'System Admin', actorType: 'system_admin', description: 'Platform administrator', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-tenant-admin', code: 'tenant_admin', name: 'Tenant Admin', actorType: 'tenant_admin', description: 'Tenant administrator', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-boss', code: 'boss', name: 'Boss', actorType: 'tenant_user', description: 'Tenant business owner', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-supervisor', code: 'supervisor', name: 'Supervisor', actorType: 'tenant_user', description: 'Supervisor role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-region-manager', code: 'region_manager', name: 'Region Manager', actorType: 'tenant_user', description: 'Region manager role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-staff', code: 'staff', name: 'Staff', actorType: 'tenant_user', description: 'Default staff role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-hr', code: 'hr', name: 'HR', actorType: 'tenant_user', description: 'Human resource role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-finance', code: 'finance', name: 'Finance', actorType: 'tenant_user', description: 'Finance role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-readonly-client', code: 'readonly_client', name: 'Readonly Client', actorType: 'tenant_user', description: 'Readonly client role', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.roleTemplate.createMany({ data, skipDuplicates: true });
};
