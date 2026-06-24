import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initRoleTemplate = async () => {
  const data: Prisma.RoleTemplateCreateManyInput[] = [
    { id: 'rt-system-admin', code: 'system_admin', name: '平台管理员', actorType: 'system_admin', description: '平台侧管理模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-tenant-admin', code: 'tenant_admin', name: '租户管理员', actorType: 'tenant_admin', description: '租户侧管理模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-boss', code: 'boss', name: '负责人', actorType: 'tenant_user', description: '高层业务模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-manager', code: 'manager', name: '经理', actorType: 'tenant_user', description: '通用管理层模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-staff', code: 'staff', name: '员工', actorType: 'tenant_user', description: '默认员工模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' },
    { id: 'rt-readonly', code: 'readonly', name: '只读用户', actorType: 'tenant_user', description: '租户只读模板', status: 'ENABLED', builtIn: true, createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.roleTemplate.createMany({ data, skipDuplicates: true });
};
