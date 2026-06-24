import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initCapabilityViewBinding = async () => {
  const data: Prisma.CapabilityViewBindingCreateManyInput[] = [
    { id: 'view-user-sensitive', capabilityId: 'cap-tenant-user-sensitive-view', resourceType: 'user', viewKey: 'sensitive-panels', createdBy: '-1', updatedBy: '-1' },
    { id: 'view-business-sensitive', capabilityId: 'cap-tenant-business-sensitive-view', resourceType: 'analytics', viewKey: 'business-sensitive-blocks', createdBy: '-1', updatedBy: '-1' },
    { id: 'view-platform-audit', capabilityId: 'cap-platform-audit-read', resourceType: 'audit', viewKey: 'platform-audit-table', createdBy: '-1', updatedBy: '-1' },
    { id: 'view-tenant-audit', capabilityId: 'cap-tenant-audit-read', resourceType: 'audit', viewKey: 'tenant-audit-table', createdBy: '-1', updatedBy: '-1' }
  ];

  return prisma.capabilityViewBinding.createMany({ data, skipDuplicates: true });
};