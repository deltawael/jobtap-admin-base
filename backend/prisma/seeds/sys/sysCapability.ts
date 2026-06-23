import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapability = async () => {
  const data: Prisma.CapabilityCreateManyInput[] = [
    { id: 'cap-tenant-manage', code: 'tenant.manage', name: 'Manage Tenant', module: 'platform', kind: 'action', description: 'Manage tenants', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-role-template-manage', code: 'role_template.manage', name: 'Manage Role Templates', module: 'platform', kind: 'action', description: 'Manage role templates', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-capability-manage', code: 'capability.manage', name: 'Manage Capability Catalog', module: 'platform', kind: 'action', description: 'Manage capabilities', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-audit-view', code: 'platform.audit.view', name: 'View Platform Audit', module: 'platform', kind: 'view', description: 'View platform audit logs', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-manage', code: 'tenant.user.manage', name: 'Manage Tenant Users', module: 'tenant', kind: 'action', description: 'Manage tenant users', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-manage', code: 'tenant.role.manage', name: 'Manage Tenant Roles', module: 'tenant', kind: 'action', description: 'Manage tenant roles', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-scope-manage', code: 'tenant.scope.manage', name: 'Manage Scope Policies', module: 'tenant', kind: 'action', description: 'Manage scope policies', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-delegation-manage', code: 'tenant.delegation.manage', name: 'Manage Delegations', module: 'tenant', kind: 'action', description: 'Manage delegations', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-audit-view', code: 'tenant.audit.view', name: 'View Tenant Audit', module: 'tenant', kind: 'view', description: 'View tenant audit logs', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-dashboard-view', code: 'dashboard.view', name: 'View Dashboard', module: 'analytics', kind: 'view', description: 'View dashboard panels', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-region-view', code: 'region.data.view', name: 'View Region Data', module: 'analytics', kind: 'view', description: 'View region scoped data', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-self-view', code: 'self.data.view', name: 'View Self Data', module: 'staff', kind: 'view', description: 'View self scoped data', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-hr-view', code: 'hr.profile.view', name: 'View HR Profiles', module: 'hr', kind: 'view', description: 'View hr profiles', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-finance-view', code: 'finance.sensitive.view', name: 'View Sensitive Finance Panels', module: 'finance', kind: 'view', description: 'View finance sensitive panels', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-client-readonly-view', code: 'client.readonly.view', name: 'Readonly Client View', module: 'client', kind: 'view', description: 'View readonly client surfaces', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capability.createMany({ data, skipDuplicates: true });
};
