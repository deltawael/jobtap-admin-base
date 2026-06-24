import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapability = async () => {
  const data: Prisma.CapabilityCreateManyInput[] = [
    { id: 'cap-platform-tenant-read', code: 'platform.tenant.read', name: 'Read Tenants', module: 'platform', kind: 'action', builtIn: true, description: 'View tenant list and details', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-tenant-manage', code: 'platform.tenant.manage', name: 'Manage Tenants', module: 'platform', kind: 'action', builtIn: true, description: 'Create and update tenants', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-role-template-read', code: 'platform.role_template.read', name: 'Read Role Templates', module: 'platform', kind: 'action', builtIn: true, description: 'View role template catalog', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-role-template-manage', code: 'platform.role_template.manage', name: 'Manage Role Templates', module: 'platform', kind: 'action', builtIn: true, description: 'Create and update role templates', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-capability-read', code: 'platform.capability.read', name: 'Read Capability Catalog', module: 'platform', kind: 'action', builtIn: true, description: 'View capability catalog', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-capability-manage', code: 'platform.capability.manage', name: 'Manage Capability Catalog', module: 'platform', kind: 'action', builtIn: true, description: 'Create and update capability catalog', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-resource-catalog-read', code: 'platform.resource_catalog.read', name: 'Read Resource Catalog', module: 'platform', kind: 'action', builtIn: true, description: 'View resource catalog', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-resource-catalog-manage', code: 'platform.resource_catalog.manage', name: 'Manage Resource Catalog', module: 'platform', kind: 'action', builtIn: true, description: 'Maintain menu and button metadata', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-platform-audit-read', code: 'platform.audit.read', name: 'Read Platform Audit', module: 'platform', kind: 'view', builtIn: true, description: 'View platform audit logs', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-read', code: 'tenant.user.read', name: 'Read Tenant Users', module: 'tenant', kind: 'action', builtIn: true, description: 'View tenant users', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-manage', code: 'tenant.user.manage', name: 'Manage Tenant Users', module: 'tenant', kind: 'action', builtIn: true, description: 'Create, update, and delete tenant users', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-auth-profile-read', code: 'tenant.user.auth_profile.read', name: 'Read User Auth Profiles', module: 'tenant', kind: 'action', builtIn: true, description: 'View user auth profiles', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-auth-profile-manage', code: 'tenant.user.auth_profile.manage', name: 'Manage User Auth Profiles', module: 'tenant', kind: 'action', builtIn: true, description: 'Update roles, scope overrides, staff bindings, and delegations', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-read', code: 'tenant.role.read', name: 'Read Tenant Roles', module: 'tenant', kind: 'action', builtIn: true, description: 'View tenant role list and details', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-manage', code: 'tenant.role.manage', name: 'Manage Tenant Roles', module: 'tenant', kind: 'action', builtIn: true, description: 'Create, update, and delete tenant roles', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-scope-manage', code: 'tenant.role.scope.manage', name: 'Manage Role Scope', module: 'tenant', kind: 'action', builtIn: true, description: 'Manage role scope policies', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-role-reference-read', code: 'tenant.role.reference.read', name: 'Read Role References', module: 'tenant', kind: 'action', builtIn: true, description: 'Read role options for cross-module references', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-staff-reference-read', code: 'tenant.staff.reference.read', name: 'Read Staff References', module: 'tenant', kind: 'action', builtIn: true, description: 'Read staff options for cross-module references', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-org-reference-read', code: 'tenant.org.reference.read', name: 'Read Org References', module: 'tenant', kind: 'action', builtIn: true, description: 'Read org tree references for cross-module references', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-delegation-manage', code: 'tenant.delegation.manage', name: 'Manage Delegations', module: 'tenant', kind: 'action', builtIn: true, description: 'Manage tenant delegations', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-audit-read', code: 'tenant.audit.read', name: 'Read Tenant Audit', module: 'tenant', kind: 'view', builtIn: true, description: 'View tenant audit logs', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-user-sensitive-view', code: 'tenant.user.sensitive_view', name: 'View User Sensitive Panels', module: 'tenant', kind: 'view', builtIn: true, description: 'View user sensitive blocks', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-dashboard-read', code: 'tenant.dashboard.read', name: 'Read Tenant Dashboard', module: 'tenant', kind: 'view', builtIn: true, description: 'View dashboard blocks', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-team-read', code: 'tenant.team.read', name: 'Read Team Data', module: 'tenant', kind: 'view', builtIn: true, description: 'View team-scoped business data', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-self-read', code: 'tenant.self.read', name: 'Read Self Data', module: 'tenant', kind: 'view', builtIn: true, description: 'View self-scoped business data', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-readonly-read', code: 'tenant.readonly.read', name: 'Readonly Module Access', module: 'tenant', kind: 'view', builtIn: true, description: 'Readonly access to granted modules', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' },
    { id: 'cap-tenant-business-sensitive-view', code: 'tenant.business.sensitive_view', name: 'View Sensitive Business Blocks', module: 'tenant', kind: 'view', builtIn: true, description: 'View business sensitive blocks', status: 'ENABLED', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capability.createMany({ data, skipDuplicates: true });
};