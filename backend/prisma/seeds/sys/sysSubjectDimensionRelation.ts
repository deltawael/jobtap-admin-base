import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initSubjectDimensionRelation = async () => {
  const data: Prisma.SubjectDimensionRelationCreateManyInput[] = [
    {
      id: 'sdr-staff-tenant-admin-a-org',
      tenantId: 'tenant-a',
      subjectEntityCode: 'staff',
      subjectId: 'staff-tenant-admin-a',
      dimensionEntityCode: 'organization',
      entityId: 'org-tenant-a-hq',
      createdBy: '-1',
      updatedBy: '-1'
    },
    {
      id: 'sdr-staff-tenant-admin-b-org',
      tenantId: 'tenant-b',
      subjectEntityCode: 'staff',
      subjectId: 'staff-tenant-admin-b',
      dimensionEntityCode: 'organization',
      entityId: 'org-tenant-b-hq',
      createdBy: '-1',
      updatedBy: '-1'
    }
  ];

  return prisma.subjectDimensionRelation.createMany({ data, skipDuplicates: true });
};
