import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

export const initRoleTemplateCapability = async () => {
  const data: Prisma.RoleTemplateCapabilityCreateManyInput[] = [
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-tenant-read' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-tenant-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-role-template-read' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-role-template-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-capability-read' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-capability-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-resource-catalog-read' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-resource-catalog-manage' },
    { templateId: 'rt-system-admin', capabilityId: 'cap-platform-audit-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-user-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-user-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-user-auth-profile-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-user-auth-profile-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-role-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-role-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-role-scope-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-role-reference-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-staff-reference-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-org-reference-read' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-delegation-manage' },
    { templateId: 'rt-tenant-admin', capabilityId: 'cap-tenant-audit-read' },
    { templateId: 'rt-boss', capabilityId: 'cap-tenant-dashboard-read' },
    { templateId: 'rt-boss', capabilityId: 'cap-tenant-team-read' },
    { templateId: 'rt-boss', capabilityId: 'cap-tenant-business-sensitive-view' },
    { templateId: 'rt-manager', capabilityId: 'cap-tenant-dashboard-read' },
    { templateId: 'rt-manager', capabilityId: 'cap-tenant-team-read' },
    { templateId: 'rt-staff', capabilityId: 'cap-tenant-self-read' },
    { templateId: 'rt-readonly', capabilityId: 'cap-tenant-readonly-read' }
  ];

  return prisma.roleTemplateCapability.createMany({ data, skipDuplicates: true });
};