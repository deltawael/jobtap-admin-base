import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapability = async () => {
  const data: Prisma.CapabilityCreateManyInput[] = [
    { id: 'cap-platform-tenant-read', code: 'platform.tenant.read', name: '租户查看', module: 'platform', kind: 'action', builtIn: true, description: '查看租户列表和详情', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-tenant-manage', code: 'platform.tenant.manage', name: '租户管理', module: 'platform', kind: 'action', builtIn: true, description: '新增、编辑和停用租户', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-role-template-read', code: 'platform.role_template.read', name: '角色模板查看', module: 'platform', kind: 'action', builtIn: true, description: '查看角色模板目录', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-role-template-manage', code: 'platform.role_template.manage', name: '角色模板管理', module: 'platform', kind: 'action', builtIn: true, description: '新增和编辑角色模板', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-capability-read', code: 'platform.capability.read', name: '能力目录查看', module: 'platform', kind: 'action', builtIn: true, description: '查看能力目录', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-capability-manage', code: 'platform.capability.manage', name: '能力目录管理', module: 'platform', kind: 'action', builtIn: true, description: '新增和编辑能力目录', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-resource-catalog-read', code: 'platform.resource_catalog.read', name: '资源目录查看', module: 'platform', kind: 'action', builtIn: true, description: '查看资源目录', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-resource-catalog-manage', code: 'platform.resource_catalog.manage', name: '资源目录管理', module: 'platform', kind: 'action', builtIn: true, description: '维护菜单、按钮和页面资源元数据', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-audit-read', code: 'platform.audit.read', name: '平台审计查看', module: 'platform', kind: 'view', builtIn: true, description: '查看平台审计日志', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-read', code: 'tenant.user.read', name: '用户查看', module: 'tenant', kind: 'action', builtIn: true, description: '查看租户用户', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-manage', code: 'tenant.user.manage', name: '用户管理', module: 'tenant', kind: 'action', builtIn: true, description: '新增、编辑和删除租户用户', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-auth-profile-read', code: 'tenant.user.auth_profile.read', name: '授权档案查看', module: 'tenant', kind: 'action', builtIn: true, description: '查看用户授权档案', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-auth-profile-manage', code: 'tenant.user.auth_profile.manage', name: '授权档案管理', module: 'tenant', kind: 'action', builtIn: true, description: '维护角色、范围覆盖、员工绑定和委派配置', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-read', code: 'tenant.role.read', name: '角色查看', module: 'tenant', kind: 'action', builtIn: true, description: '查看租户角色列表和详情', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-manage', code: 'tenant.role.manage', name: '角色管理', module: 'tenant', kind: 'action', builtIn: true, description: '新增、编辑和删除租户角色', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-scope-manage', code: 'tenant.role.scope.manage', name: '角色范围管理', module: 'tenant', kind: 'action', builtIn: true, description: '维护角色范围策略', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-reference-read', code: 'tenant.role.reference.read', name: '角色引用查看', module: 'tenant', kind: 'action', builtIn: true, description: '供跨模块读取角色下拉和引用信息', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-staff-reference-read', code: 'tenant.staff.reference.read', name: '员工引用查看', module: 'tenant', kind: 'action', builtIn: true, description: '供跨模块读取员工下拉和引用信息', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-org-reference-read', code: 'tenant.org.reference.read', name: '组织引用查看', module: 'tenant', kind: 'action', builtIn: true, description: '供跨模块读取组织树和引用信息', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-delegation-manage', code: 'tenant.delegation.manage', name: '委派管理', module: 'tenant', kind: 'action', builtIn: true, description: '管理租户内委派授权', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-audit-read', code: 'tenant.audit.read', name: '租户审计查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看租户审计日志', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-sensitive-view', code: 'tenant.user.sensitive_view', name: '用户敏感视图查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看用户敏感信息块', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-dashboard-read', code: 'tenant.dashboard.read', name: '看板查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看租户业务看板', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-team-read', code: 'tenant.team.read', name: '团队数据查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看团队范围业务数据', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-self-read', code: 'tenant.self.read', name: '本人数据查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看本人范围业务数据', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-readonly-read', code: 'tenant.readonly.read', name: '只读模块访问', module: 'tenant', kind: 'view', builtIn: true, description: '查看已授权的只读模块', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-business-sensitive-view', code: 'tenant.business.sensitive_view', name: '业务敏感视图查看', module: 'tenant', kind: 'view', builtIn: true, description: '查看业务敏感信息块', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capability.createMany({ data, skipDuplicates: true });
};
