import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapabilityUiBinding = async () => {
  const data: Prisma.CapabilityUiBindingCreateManyInput[] = [
    { id: 'ui-platform-tenant-read', capabilityId: 'cap-platform-tenant-read', resourceType: 'menu', resourceCode: 'platform_tenant', menuId: 101, routeName: 'platform_tenant', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-tenant-manage', capabilityId: 'cap-platform-tenant-manage', resourceType: 'menu', resourceCode: 'platform_tenant', menuId: 101, routeName: 'platform_tenant', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-role-template-read', capabilityId: 'cap-platform-role-template-read', resourceType: 'menu', resourceCode: 'platform_role-template', menuId: 102, routeName: 'platform_role-template', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-role-template-manage', capabilityId: 'cap-platform-role-template-manage', resourceType: 'menu', resourceCode: 'platform_role-template', menuId: 102, routeName: 'platform_role-template', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-capability-read', capabilityId: 'cap-platform-capability-read', resourceType: 'menu', resourceCode: 'platform_capability', menuId: 103, routeName: 'platform_capability', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-capability-manage', capabilityId: 'cap-platform-capability-manage', resourceType: 'menu', resourceCode: 'platform_capability', menuId: 103, routeName: 'platform_capability', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-resource-catalog-read', capabilityId: 'cap-platform-resource-catalog-read', resourceType: 'menu', resourceCode: 'platform_resource-catalog', menuId: 104, routeName: 'platform_resource-catalog', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-resource-catalog-manage', capabilityId: 'cap-platform-resource-catalog-manage', resourceType: 'menu', resourceCode: 'platform_resource-catalog', menuId: 104, routeName: 'platform_resource-catalog', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-platform-audit-read', capabilityId: 'cap-platform-audit-read', resourceType: 'menu', resourceCode: 'platform_audit', menuId: 105, routeName: 'platform_audit', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-user-read', capabilityId: 'cap-tenant-user-read', resourceType: 'menu', resourceCode: 'tenant_user', menuId: 201, routeName: 'tenant_user', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-user-manage', capabilityId: 'cap-tenant-user-manage', resourceType: 'menu', resourceCode: 'tenant_user', menuId: 201, routeName: 'tenant_user', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-user-password-manage', capabilityId: 'cap-tenant-user-password-manage', resourceType: 'button', resourceCode: 'tenant_user', menuId: 201, routeName: 'tenant_user', buttonCode: 'change-password', createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-role-read', capabilityId: 'cap-tenant-role-read', resourceType: 'menu', resourceCode: 'tenant_role', menuId: 202, routeName: 'tenant_role', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-role-manage', capabilityId: 'cap-tenant-role-manage', resourceType: 'menu', resourceCode: 'tenant_role', menuId: 202, routeName: 'tenant_role', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-role-scope-manage', capabilityId: 'cap-tenant-role-scope-manage', resourceType: 'menu', resourceCode: 'tenant_role', menuId: 202, routeName: 'tenant_role', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-user-auth-read', capabilityId: 'cap-tenant-user-auth-profile-read', resourceType: 'menu', resourceCode: 'tenant_user-auth-profile', menuId: 203, routeName: 'tenant_user-auth-profile', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-user-auth-manage', capabilityId: 'cap-tenant-user-auth-profile-manage', resourceType: 'menu', resourceCode: 'tenant_user-auth-profile', menuId: 203, routeName: 'tenant_user-auth-profile', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-delegation-manage', capabilityId: 'cap-tenant-delegation-manage', resourceType: 'menu', resourceCode: 'tenant_user-auth-profile', menuId: 203, routeName: 'tenant_user-auth-profile', buttonCode: null, createdBy: '-1', updatedBy: '-1' },
    { id: 'ui-tenant-audit-read', capabilityId: 'cap-tenant-audit-read', resourceType: 'menu', resourceCode: 'tenant_audit', menuId: 204, routeName: 'tenant_audit', buttonCode: null, createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capabilityUiBinding.createMany({ data, skipDuplicates: true });
};
