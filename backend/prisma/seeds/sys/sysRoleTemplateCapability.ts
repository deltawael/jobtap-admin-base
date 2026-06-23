import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initRoleTemplateCapability = async () => {
  const data: Prisma.RoleTemplateCapabilityCreateManyInput[] = [
    { templateId: 'rt-system-admin', capabilityId: 'cap-tenant-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-role-template-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-capability-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-audit-view' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-user-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-role-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-scope-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-delegation-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-audit-view' },
    { templateId: 'rt-boss', capabilityId: 'cap-dashboard-view' },
    { templateId: 'rt-boss', capabilityId: 'cap-region-view' },
    { templateId: 'rt-supervisor', capabilityId: 'cap-dashboard-view' },
    { templateId: 'rt-region-manager', capabilityId: 'cap-region-view' },
    { templateId: 'rt-staff', capabilityId: 'cap-self-view' },
    { templateId: 'rt-hr', capabilityId: 'cap-hr-view' },
    { templateId: 'rt-finance', capabilityId: 'cap-finance-view' },
    { templateId: 'rt-readonly-client', capabilityId: 'cap-client-readonly-view' }
  ];

  return prisma.roleTemplateCapability.createMany({ data, skipDuplicates: true });
};
