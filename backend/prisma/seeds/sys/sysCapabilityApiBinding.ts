import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapabilityApiBinding = async () => {
  const data: Prisma.CapabilityApiBindingCreateManyInput[] = [
    { id: 'binding-role-template-list-read', capabilityId: 'cap-platform-role-template-read', resource: 'role-templates', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/role-templates', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-template-list-manage', capabilityId: 'cap-platform-role-template-manage', resource: 'role-templates', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/role-templates', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-template-create', capabilityId: 'cap-platform-role-template-manage', resource: 'role-templates', action: 'create', bindingMode: 'ALL_OF', method: 'POST', path: '/role-templates', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-template-update', capabilityId: 'cap-platform-role-template-manage', resource: 'role-templates', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/role-templates/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-capability-list-read', capabilityId: 'cap-platform-capability-read', resource: 'capabilities', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/capabilities', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-capability-list-manage', capabilityId: 'cap-platform-capability-manage', resource: 'capabilities', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/capabilities', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-capability-create', capabilityId: 'cap-platform-capability-manage', resource: 'capabilities', action: 'create', bindingMode: 'ALL_OF', method: 'POST', path: '/capabilities', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-capability-update', capabilityId: 'cap-platform-capability-manage', resource: 'capabilities', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/capabilities/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-list-read', capabilityId: 'cap-tenant-role-read', resource: 'roles', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/roles', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-list-manage', capabilityId: 'cap-tenant-role-manage', resource: 'roles', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/roles', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-list-reference', capabilityId: 'cap-tenant-role-reference-read', resource: 'roles', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/roles', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-create', capabilityId: 'cap-tenant-role-manage', resource: 'roles', action: 'create', bindingMode: 'ALL_OF', method: 'POST', path: '/roles', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-update', capabilityId: 'cap-tenant-role-manage', resource: 'roles', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/roles/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-role-delete', capabilityId: 'cap-tenant-role-manage', resource: 'roles', action: 'delete', bindingMode: 'ALL_OF', method: 'DELETE', path: '/roles/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-list-read', capabilityId: 'cap-tenant-user-read', resource: 'users', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/user', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-list-manage', capabilityId: 'cap-tenant-user-manage', resource: 'users', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/user', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-create', capabilityId: 'cap-tenant-user-manage', resource: 'users', action: 'create', bindingMode: 'ALL_OF', method: 'POST', path: '/user', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-update', capabilityId: 'cap-tenant-user-manage', resource: 'users', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/user', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-delete', capabilityId: 'cap-tenant-user-manage', resource: 'users', action: 'delete', bindingMode: 'ALL_OF', method: 'DELETE', path: '/user/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-auth-read', capabilityId: 'cap-tenant-user-auth-profile-read', resource: 'user-auth-profile', action: 'read', bindingMode: 'ANY_OF', method: 'GET', path: '/users/:id/auth-profile', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-user-auth-manage', capabilityId: 'cap-tenant-user-auth-profile-manage', resource: 'user-auth-profile', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/users/:id/auth-profile', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-delegation-list', capabilityId: 'cap-tenant-delegation-manage', resource: 'delegations', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/delegations', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-delegation-create', capabilityId: 'cap-tenant-delegation-manage', resource: 'delegations', action: 'create', bindingMode: 'ALL_OF', method: 'POST', path: '/delegations', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-delegation-update', capabilityId: 'cap-tenant-delegation-manage', resource: 'delegations', action: 'update', bindingMode: 'ALL_OF', method: 'PUT', path: '/delegations/:id', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-platform-audit-list', capabilityId: 'cap-platform-audit-read', resource: 'audit-logs', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/audit-logs', createdBy: '-1', updatedBy: '-1' },
    { id: 'binding-tenant-audit-list', capabilityId: 'cap-tenant-audit-read', resource: 'audit-logs', action: 'list', bindingMode: 'ANY_OF', method: 'GET', path: '/audit-logs', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capabilityApiBinding.createMany({ data, skipDuplicates: true });
};