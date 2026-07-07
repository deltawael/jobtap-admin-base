import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initUserStaffBinding = async () => {
  const data: Prisma.UserStaffBindingCreateManyInput[] = [
    {
      id: 'usb-tenant-admin-a',
      tenantId: 'tenant-a',
      userId: 'user-tenant-admin-a',
      staffId: 'staff-tenant-admin-a',
      createdBy: '-1',
      updatedBy: '-1'
    },
    {
      id: 'usb-tenant-admin-b',
      tenantId: 'tenant-b',
      userId: 'user-tenant-admin-b',
      staffId: 'staff-tenant-admin-b',
      createdBy: '-1',
      updatedBy: '-1'
    }
  ];

  return prisma.userStaffBinding.createMany({ data, skipDuplicates: true });
};
