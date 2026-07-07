import type { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'subjectDimensionRelation' | 'userStaffBinding'>;

export interface ScopeDimensionEntityDefinition {
  code: string;
  name: string;
  description?: string | null;
}

export interface ScopeSubjectResolverDefinition {
  resolverCode: string;
  subjectEntityCode: string;
  dimensionEntityCode: string;
  description?: string | null;
  resolve: (input: { prisma: PrismaLike; subjectId: string }) => Promise<string[]>;
}

export interface ScopeResourceResolverDefinition {
  resolverCode: string;
  resourceEntityCode: string;
  dimensionEntityCode: string;
  description?: string | null;
  resolve: (input: { resource: Record<string, any>; context: Record<string, any> }) => Promise<string[]>;
}

export interface CapabilityScopeTargetDefinition {
  capabilityCode: string;
  resourceEntityCode: string;
  dimensionEntityCode?: string | null;
  supportsSelf?: boolean;
}

export const scopeDimensionEntities: ScopeDimensionEntityDefinition[] = [
  {
    code: 'organization',
    name: '组织',
    description: '可作为范围维度的组织实体'
  }
];

async function resolveUserOrganizationIds(prisma: PrismaLike, userId: string) {
  const result = new Set<string>();
  const directRelations = await prisma.subjectDimensionRelation.findMany({
    where: { subjectEntityCode: 'user', subjectId: userId, dimensionEntityCode: 'organization' }
  });
  directRelations.forEach(item => result.add(item.entityId));

  const staffBinding = await prisma.userStaffBinding.findUnique({ where: { userId } });
  if (!staffBinding) return [...result];

  const staffRelations = await prisma.subjectDimensionRelation.findMany({
    where: {
      subjectEntityCode: 'staff',
      subjectId: staffBinding.staffId,
      dimensionEntityCode: 'organization'
    }
  });
  staffRelations.forEach(item => result.add(item.entityId));
  return [...result];
}

function normalizeDimensionIds(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function resolveOrganizationIdsFromContext(resource: Record<string, any>, context: Record<string, any>) {
  const source =
    context?.resolvedDimensionIds?.organization ??
    resource?.resolvedDimensionIds?.organization ??
    context?.organizationIds ??
    resource?.organizationIds ??
    context?.organizationId ??
    resource?.organizationId;

  return [...new Set(normalizeDimensionIds(source))];
}

export const scopeSubjectResolvers: ScopeSubjectResolverDefinition[] = [
  {
    resolverCode: 'user-staff-organization',
    subjectEntityCode: 'user',
    dimensionEntityCode: 'organization',
    description: 'user -> staff -> organization',
    resolve: async ({ prisma, subjectId }) => resolveUserOrganizationIds(prisma, subjectId)
  }
];

export const scopeResourceResolvers: ScopeResourceResolverDefinition[] = [
  {
    resolverCode: 'organization-scoped-context',
    resourceEntityCode: 'organization_scoped',
    dimensionEntityCode: 'organization',
    description: 'resource -> organization via context or resolvedDimensionIds',
    resolve: async ({ resource, context }) => resolveOrganizationIdsFromContext(resource, context)
  },
  {
    resolverCode: 'organization-direct',
    resourceEntityCode: 'organization',
    dimensionEntityCode: 'organization',
    description: 'organization resource by direct id',
    resolve: async ({ resource, context }) => resolveOrganizationIdsFromContext(resource, context)
  }
];

export const capabilityScopeTargets: CapabilityScopeTargetDefinition[] = [
  {
    capabilityCode: 'tenant.team.read',
    resourceEntityCode: 'organization_scoped',
    dimensionEntityCode: 'organization',
    supportsSelf: false
  },
  {
    capabilityCode: 'tenant.business.sensitive_view',
    resourceEntityCode: 'organization_scoped',
    dimensionEntityCode: 'organization',
    supportsSelf: false
  },
  {
    capabilityCode: 'tenant.self.read',
    resourceEntityCode: 'self_scoped',
    dimensionEntityCode: null,
    supportsSelf: true
  }
];

export const scopeDimensionEntityMap = new Map(scopeDimensionEntities.map(item => [item.code, item] as const));
export const scopeSubjectResolverMap = new Map(
  scopeSubjectResolvers.map(item => [`${item.subjectEntityCode}:${item.dimensionEntityCode}`, item] as const)
);
export const scopeResourceResolverMap = new Map(
  scopeResourceResolvers.map(item => [`${item.resourceEntityCode}:${item.dimensionEntityCode}`, item] as const)
);
