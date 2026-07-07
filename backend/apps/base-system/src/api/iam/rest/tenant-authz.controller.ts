import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ActorType,
  CapabilityBindingMode,
  CapabilityKind,
  DelegationStatus,
  Prisma,
  ScopeStrategyMode,
  Status
} from '@prisma/client';

import { ApiRes } from '@lib/infra/rest/res.response';
import { PrismaService } from '@lib/shared/prisma/prisma.service';
import { IAuthentication } from '@lib/typings/global';

import {
  scopeDimensionEntityMap,
  scopeResourceResolverMap,
  scopeSubjectResolverMap
} from './scope-metadata.registry';

interface PageQuery {
  current?: number | string;
  size?: number | string;
}

interface RolePayload {
  code: string;
  name: string;
  description?: string | null;
  status?: Status;
  tenantId?: string | null;
  templateId?: string | null;
  capabilityIds?: string[];
}

interface RoleScopeStrategyInput {
  id?: string;
  capabilityId: string;
  strategyMode: ScopeStrategyMode;
  dimensionEntityCode?: string | null;
}

interface TenantPayload {
  code?: string;
  name?: string;
  description?: string | null;
  status?: Status;
}

interface RoleTemplatePayload {
  code: string;
  name: string;
  actorType: ActorType;
  description?: string | null;
  status?: Status;
  capabilityIds?: string[];
}

interface CapabilityPayload {
  code: string;
  name: string;
  module: string;
  kind: CapabilityKind;
  description?: string | null;
  status?: Status;
}

interface ScopeAssignmentInput {
  capabilityId: string;
  dimensionEntityCode: string;
  entityIds: string[];
}

interface RelationBindingInput {
  dimensionEntityCode: string;
  entityIds: string[];
}

interface DelegationInput {
  id?: string;
  tenantId?: string;
  fromUserId: string;
  toUserId: string;
  capabilityId: string;
  dimensionEntityCode: string;
  entityId: string;
  status?: DelegationStatus;
  startAt: string;
  endAt: string;
}

interface AuthProfilePayload {
  roleIds?: string[];
  linkedStaffId?: string | null;
  relationBindings?: RelationBindingInput[];
  scopeAssignments?: ScopeAssignmentInput[];
  delegations?: DelegationInput[];
}

interface CanPayload {
  userId?: string;
  capability?: string;
  api?: {
    resource: string;
    action: string;
    method?: string;
    path?: string;
  };
  resource?: Record<string, any>;
  context?: Record<string, any> & {
    resourceEntityCode?: string;
    resolvedDimensionIds?: Record<string, string[]>;
  };
}

interface VisibleViewsPayload {
  userId?: string;
  resourceType: string;
  context?: Record<string, any>;
}

type HydratedCapability = Awaited<ReturnType<TenantAuthzController['hydrateCapabilities']>>[number];

@ApiTags('Tenant AuthZ - Target State')
@Controller()
export class TenantAuthzController {
  private static readonly ROLE_MANAGE_CAPABILITY = 'tenant.role.manage';
  private static readonly ROLE_SCOPE_MANAGE_CAPABILITY = 'tenant.role.scope.manage';
  private static readonly USER_AUTH_PROFILE_READ_CAPABILITY = 'tenant.user.auth_profile.read';
  private static readonly USER_AUTH_PROFILE_MANAGE_CAPABILITY = 'tenant.user.auth_profile.manage';
  private static readonly ORG_REFERENCE_READ_CAPABILITY = 'tenant.org.reference.read';
  private static readonly DELEGATION_MANAGE_CAPABILITY = 'tenant.delegation.manage';

  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants')
  async listTenants(@Request() req: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    if (this.isSystemAdmin(actor)) {
      return ApiRes.success(await this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } }));
    }
    const tenantId = await this.resolveActorTenantId(actor);
    if (!tenantId) return ApiRes.success([]);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return ApiRes.success(tenant ? [tenant] : []);
  }

  @Post('tenants')
  async createTenant(@Request() req: any, @Body() body: TenantPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const created = await this.prisma.tenant.create({
      data: {
        code: body.code ?? '',
        name: body.name ?? '',
        description: body.description ?? null,
        status: body.status ?? Status.ENABLED,
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'tenant.create', 'tenant', created.id, created);
    return ApiRes.success(created);
  }

  @Put('tenants/:id')
  async updateTenant(@Request() req: any, @Param('id') id: string, @Body() body: TenantPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant not found');
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'tenant.update', 'tenant', id, { before: existing, after: updated });
    return ApiRes.success(updated);
  }

  @Get('role-templates')
  async listRoleTemplates(@Query() query: any): Promise<ApiRes<any>> {
    const where: Prisma.RoleTemplateWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.actorType) where.actorType = query.actorType;
    if (query.code) where.code = { contains: query.code };
    if (query.name) where.name = { contains: query.name };
    const templates = await this.prisma.roleTemplate.findMany({
      where,
      orderBy: [{ builtIn: 'desc' }, { createdAt: 'asc' }]
    });
    const templateIds = templates.map(item => item.id);
    const mappings = templateIds.length
      ? await this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
      : [];
    const capabilityMap = this.groupByMany(mappings, item => item.templateId, item => item.capabilityId);
    return ApiRes.success(
      templates.map(item => ({
        ...item,
        capabilityIds: capabilityMap.get(item.id) ?? [],
        capabilityCount: (capabilityMap.get(item.id) ?? []).length
      }))
    );
  }

  @Post('role-templates')
  async createRoleTemplate(@Request() req: any, @Body() body: RoleTemplatePayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const created = await this.prisma.roleTemplate.create({
      data: {
        id: randomUUID(),
        code: body.code,
        name: body.name,
        actorType: body.actorType,
        description: body.description ?? null,
        status: body.status ?? Status.ENABLED,
        builtIn: false,
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
    await this.syncRoleTemplateCapabilities(created.id, body.capabilityIds ?? []);
    await this.writeAuditLog(actor, 'role-template.create', 'role-template', created.id, {
      ...created,
      capabilityIds: body.capabilityIds ?? []
    });
    return ApiRes.success(await this.hydrateRoleTemplate(created));
  }

  @Put('role-templates/:id')
  async updateRoleTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<RoleTemplatePayload>
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const existing = await this.prisma.roleTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role template not found');
    const updated = await this.prisma.roleTemplate.update({
      where: { id },
      data: {
        code: existing.builtIn ? existing.code : body.code ?? existing.code,
        name: body.name ?? existing.name,
        actorType: body.actorType ?? existing.actorType,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId
      }
    });
    if (body.capabilityIds) await this.syncRoleTemplateCapabilities(id, body.capabilityIds);
    await this.writeAuditLog(actor, 'role-template.update', 'role-template', id, {
      before: existing,
      after: updated,
      capabilityIds: body.capabilityIds
    });
    return ApiRes.success(await this.hydrateRoleTemplate(updated));
  }

  @Get('capabilities')
  async listCapabilities(@Query() query: any): Promise<ApiRes<any>> {
    const where: Prisma.CapabilityWhereInput = {};
    if (query.module) where.module = query.module;
    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;
    if (query.code) where.code = { contains: query.code };
    if (query.name) where.name = { contains: query.name };
    const capabilities = await this.prisma.capability.findMany({
      where,
      orderBy: [{ builtIn: 'desc' }, { module: 'asc' }, { kind: 'asc' }, { code: 'asc' }]
    });
    return ApiRes.success(await this.hydrateCapabilities(capabilities));
  }

  @Post('capabilities')
  async createCapability(@Request() req: any, @Body() body: CapabilityPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const created = await this.prisma.capability.create({
      data: {
        id: randomUUID(),
        code: body.code,
        name: body.name,
        module: body.module,
        kind: body.kind,
        builtIn: false,
        description: body.description ?? null,
        status: body.status ?? Status.ENABLED,
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'capability.create', 'capability', created.id, created);
    return ApiRes.success(await this.hydrateCapability(created));
  }

  @Put('capabilities/:id')
  async updateCapability(@Request() req: any, @Param('id') id: string, @Body() body: Partial<CapabilityPayload>): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const existing = await this.prisma.capability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Capability not found');
    const updated = await this.prisma.capability.update({
      where: { id },
      data: {
        code: existing.builtIn ? existing.code : body.code ?? existing.code,
        name: body.name ?? existing.name,
        module: body.module ?? existing.module,
        kind: body.kind ?? existing.kind,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'capability.update', 'capability', id, { before: existing, after: updated });
    return ApiRes.success(await this.hydrateCapability(updated));
  }

  @Get('roles')
  async listRoles(@Request() req: any, @Query() query: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const paging = this.parsePage(query);
    const where: Prisma.SysRoleWhereInput = {};
    const tenantWhere = await this.resolveRoleTenantWhere(actor, query.tenantScope, query.tenantId);
    if (tenantWhere !== undefined) where.tenantId = tenantWhere;
    if (query.code) where.code = { contains: query.code };
    if (query.name) where.name = { contains: query.name };
    if (query.status) where.status = query.status;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.sysRole.findMany({
        where,
        skip: (paging.current - 1) * paging.size,
        take: paging.size,
        orderBy: [{ builtIn: 'desc' }, { createdAt: 'desc' }]
      }),
      this.prisma.sysRole.count({ where })
    ]);
    return ApiRes.success({
      records: await this.hydrateRoles(records),
      total,
      current: paging.current,
      size: paging.size
    });
  }

  @Post('roles')
  async createRole(@Request() req: any, @Body() body: RolePayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.ROLE_MANAGE_CAPABILITY]);
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
    await this.ensureRoleTemplateMatchesTenant(tenantId, body.templateId ?? null);
    const capabilityIds = await this.resolveRoleCapabilityIds(body.templateId ?? null, body.capabilityIds ?? []);
    const created = await this.prisma.sysRole.create({
      data: {
        id: randomUUID(),
        code: body.code,
        name: body.name,
        tenantId,
        templateId: body.templateId ?? null,
        builtIn: false,
        description: body.description ?? null,
        pid: '0',
        status: body.status ?? Status.ENABLED,
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
    await this.syncRoleCapabilities(created.id, capabilityIds);
    await this.writeAuditLog(actor, 'role.create', 'role', created.id, { ...created, capabilityIds });
    return ApiRes.success(await this.hydrateRole(created));
  }

  @Put('roles/:id')
  async updateRole(@Request() req: any, @Param('id') id: string, @Body() body: Partial<RolePayload>): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.ROLE_MANAGE_CAPABILITY]);
    const existing = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    await this.assertRoleAccessible(actor, existing.tenantId);
    const tenantId =
      body.tenantId === undefined ? existing.tenantId : await this.resolveScopedTenantId(actor, body.tenantId);
    if (tenantId !== existing.tenantId) throw new BadRequestException('Role tenant cannot be changed');
    const templateId = body.templateId === undefined ? existing.templateId : body.templateId;
    await this.ensureRoleTemplateMatchesTenant(tenantId, templateId ?? null);
    const capabilityIds = body.capabilityIds
      ? await this.resolveRoleCapabilityIds(templateId ?? null, body.capabilityIds)
      : null;
    const updated = await this.prisma.sysRole.update({
      where: { id },
      data: {
        code: existing.builtIn ? existing.code : body.code ?? existing.code,
        name: body.name ?? existing.name,
        tenantId,
        templateId,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId
      }
    });
    if (capabilityIds) await this.syncRoleCapabilities(id, capabilityIds);
    await this.writeAuditLog(actor, 'role.update', 'role', id, {
      before: existing,
      after: updated,
      capabilityIds
    });
    return ApiRes.success(await this.hydrateRole(updated));
  }

  @Get('roles/:id/scope-strategies')
  async getRoleScopeStrategies(@Request() req: any, @Param('id') id: string): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.ROLE_SCOPE_MANAGE_CAPABILITY]);
    const role = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    await this.assertRoleAccessible(actor, role.tenantId);
    const strategies = await this.prisma.roleScopeStrategy.findMany({
      where: { roleId: id },
      orderBy: [{ capabilityId: 'asc' }, { createdAt: 'asc' }]
    });
    return ApiRes.success(await this.hydrateRoleScopeStrategies(strategies));
  }

  @Put('roles/:id/scope-strategies')
  async updateRoleScopeStrategies(
    @Request() req: any,
    @Param('id') id: string,
    @Body() strategies: RoleScopeStrategyInput[]
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.ROLE_SCOPE_MANAGE_CAPABILITY]);
    const role = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    await this.assertRoleAccessible(actor, role.tenantId);
    await this.syncRoleScopeStrategies(actor, role.tenantId, id, Array.isArray(strategies) ? strategies : []);
    const updated = await this.prisma.roleScopeStrategy.findMany({
      where: { roleId: id },
      orderBy: [{ capabilityId: 'asc' }, { createdAt: 'asc' }]
    });
    await this.writeAuditLog(actor, 'role.scope-strategy.update', 'role', id, updated);
    return ApiRes.success(await this.hydrateRoleScopeStrategies(updated));
  }

  @Delete('roles/:id')
  async deleteRole(@Request() req: any, @Param('id') id: string): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.ROLE_MANAGE_CAPABILITY]);
    const existing = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.builtIn) throw new BadRequestException('Built-in role cannot be deleted');
    await this.assertRoleAccessible(actor, existing.tenantId);
    await this.prisma.$transaction([
      this.prisma.roleCapability.deleteMany({ where: { roleId: id } }),
      this.prisma.roleScopeStrategy.deleteMany({ where: { roleId: id } }),
      this.prisma.sysUserRole.deleteMany({ where: { roleId: id } }),
      this.prisma.sysRole.delete({ where: { id } })
    ]);
    await this.writeAuditLog(actor, 'role.delete', 'role', id, existing);
    return ApiRes.ok();
  }

  @Get('users/:id/auth-profile')
  async getUserAuthProfile(@Request() req: any, @Param('id') userId: string): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [
      TenantAuthzController.USER_AUTH_PROFILE_READ_CAPABILITY,
      TenantAuthzController.USER_AUTH_PROFILE_MANAGE_CAPABILITY
    ]);
    return ApiRes.success(await this.buildAuthProfile(actor, userId));
  }

  @Put('users/:id/auth-profile')
  async updateUserAuthProfile(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() body: AuthProfilePayload
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.USER_AUTH_PROFILE_MANAGE_CAPABILITY]);
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);

    const nextRoleIds =
      body.roleIds ??
      (await this.prisma.sysUserRole.findMany({ where: { userId } })).map(item => item.roleId);

    if (body.roleIds) {
      await this.ensureRoleIdsTenant(user.tenantId, body.roleIds);
      await this.syncUserRoles(userId, body.roleIds);
    }
    if (body.linkedStaffId !== undefined) {
      await this.upsertStaffBinding(actor, userId, user.tenantId, body.linkedStaffId);
    }
    if (body.relationBindings) {
      await this.replaceDirectUserRelations(actor, user, body.relationBindings);
    }
    if (body.scopeAssignments) {
      await this.replaceUserScopeAssignments(actor, user, nextRoleIds, body.scopeAssignments);
    }
    if (body.delegations) {
      await this.replaceDelegationsForUser(actor, user, body.delegations);
    }

    const profile = await this.buildAuthProfile(actor, userId);
    await this.writeAuditLog(actor, 'user.auth-profile.update', 'user', userId, profile);
    return ApiRes.success(profile);
  }

  @Get('scope-dimensions/:dimensionEntityCode/records')
  async listScopeDimensionRecords(
    @Request() req: any,
    @Param('dimensionEntityCode') dimensionEntityCode: string
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [
      TenantAuthzController.ORG_REFERENCE_READ_CAPABILITY,
      TenantAuthzController.USER_AUTH_PROFILE_MANAGE_CAPABILITY,
      TenantAuthzController.ROLE_SCOPE_MANAGE_CAPABILITY
    ]);
    return ApiRes.success(await this.listDimensionRecords(actor, dimensionEntityCode));
  }

  @Get('delegations')
  async listDelegations(@Request() req: any, @Query() query: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [
      TenantAuthzController.DELEGATION_MANAGE_CAPABILITY,
      TenantAuthzController.USER_AUTH_PROFILE_MANAGE_CAPABILITY
    ]);
    const tenantId = await this.resolveScopedTenantId(actor, query.tenantId);
    const where: Prisma.DelegationWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.toUserId) where.toUserId = query.toUserId;
    if (query.fromUserId) where.fromUserId = query.fromUserId;
    if (query.capabilityId) where.capabilityId = query.capabilityId;
    if (query.status) where.status = query.status;
    return ApiRes.success(
      await this.prisma.delegation.findMany({
        where,
        orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }]
      })
    );
  }

  @Post('delegations')
  async createDelegation(@Request() req: any, @Body() body: DelegationInput): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.DELEGATION_MANAGE_CAPABILITY]);
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
    await this.ensureUsersShareTenant(tenantId, [body.fromUserId, body.toUserId]);
    await this.assertDelegationDimension(body.capabilityId, body.dimensionEntityCode);
    const created = await this.prisma.delegation.create({
      data: {
        id: randomUUID(),
        tenantId: tenantId ?? '',
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        capabilityId: body.capabilityId,
        scopeType: 'custom',
        scopeValue: body.entityId,
        dimensionEntityCode: body.dimensionEntityCode,
        entityId: body.entityId,
        status: body.status ?? DelegationStatus.active,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'delegation.create', 'delegation', created.id, created);
    return ApiRes.success(created);
  }

  @Put('delegations/:id')
  async updateDelegation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<DelegationInput>
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasAnyCapability(actor.userId, [TenantAuthzController.DELEGATION_MANAGE_CAPABILITY]);
    const existing = await this.prisma.delegation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Delegation not found');
    await this.assertRoleAccessible(actor, existing.tenantId);
    if (body.dimensionEntityCode || body.capabilityId) {
      await this.assertDelegationDimension(
        body.capabilityId ?? existing.capabilityId,
        body.dimensionEntityCode ?? existing.dimensionEntityCode ?? ''
      );
    }
    const updated = await this.prisma.delegation.update({
      where: { id },
      data: {
        capabilityId: body.capabilityId ?? existing.capabilityId,
        scopeType: 'custom',
        scopeValue: body.entityId === undefined ? existing.scopeValue : body.entityId,
        dimensionEntityCode:
          body.dimensionEntityCode === undefined ? existing.dimensionEntityCode : body.dimensionEntityCode,
        entityId: body.entityId === undefined ? existing.entityId : body.entityId,
        status: body.status ?? existing.status,
        startAt: body.startAt ? new Date(body.startAt) : existing.startAt,
        endAt: body.endAt ? new Date(body.endAt) : existing.endAt,
        updatedBy: actor.userId
      }
    });
    await this.writeAuditLog(actor, 'delegation.update', 'delegation', id, { before: existing, after: updated });
    return ApiRes.success(updated);
  }

  @Get('authz/routes')
  async routes(@Request() req: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const bundle = await this.resolveAuthorizationBundle(actor, actor.userId);
    const routes = await this.resolveCapabilityRoutes(bundle.capabilities);
    const home = routes.some((item: any) => item.name === 'home') ? 'home' : '';
    return ApiRes.success({ routes, home });
  }

  @Get('audit-logs')
  async listAuditLogs(@Request() req: any, @Query() query: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const paging = this.parsePage(query);
    const tenantId = await this.resolveScopedTenantId(actor, query.tenantId);
    const where: Prisma.AuditLogWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.action) where.action = { contains: query.action };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (paging.current - 1) * paging.size,
        take: paging.size,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.auditLog.count({ where })
    ]);
    return ApiRes.success({ records, total, current: paging.current, size: paging.size });
  }

  @Post('authz/can')
  async can(@Request() req: any, @Body() body: CanPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const subjectUserId = body.userId ?? actor.userId;
    const bundle = await this.resolveAuthorizationBundle(actor, subjectUserId);
    const context = body.context ?? {};
    if (body.capability) {
      return ApiRes.success(
        await this.evaluateCapabilityDecision(bundle, body.capability, body.resource ?? {}, context)
      );
    }
    if (body.api) {
      return ApiRes.success(await this.evaluateApiDecision(bundle, body.api, body.resource ?? {}, context));
    }
    throw new BadRequestException('capability or api is required');
  }

  @Post('authz/visible-views')
  async visibleViews(@Request() req: any, @Body() body: VisibleViewsPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const subjectUserId = body.userId ?? actor.userId;
    const bundle = await this.resolveAuthorizationBundle(actor, subjectUserId);
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, body.resourceType);
    return ApiRes.success({
      visibleViews,
      resolvedCapabilities: bundle.capabilities.map(item => item.code),
      decisionReason: 'resolved'
    });
  }

  private parsePage(query: PageQuery) {
    return {
      current: Math.max(Number(query.current) || 1, 1),
      size: Math.min(Math.max(Number(query.size) || 10, 1), 100)
    };
  }

  private isSystemAdmin(actor: IAuthentication) {
    return actor.actorType === 'system_admin';
  }

  private assertSystemAdmin(actor: IAuthentication) {
    if (!this.isSystemAdmin(actor)) throw new ForbiddenException('System admin only');
  }

  private async resolveActorTenantId(actor: IAuthentication): Promise<string | null> {
    return actor.tenantId ?? null;
  }

  private async resolveScopedTenantId(actor: IAuthentication, requestedTenantId?: string | null) {
    if (this.isSystemAdmin(actor)) return requestedTenantId ?? null;
    const actorTenantId = await this.resolveActorTenantId(actor);
    if (!actorTenantId) throw new ForbiddenException('Tenant context required');
    if (requestedTenantId && requestedTenantId !== actorTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
    return actorTenantId;
  }

  private async assertRoleAccessible(actor: IAuthentication, tenantId?: string | null) {
    const scopedTenantId = await this.resolveScopedTenantId(actor, tenantId ?? null);
    if (tenantId && scopedTenantId && tenantId !== scopedTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private async resolveRoleTenantWhere(actor: IAuthentication, tenantScope?: string, tenantId?: string | null) {
    if (!this.isSystemAdmin(actor)) {
      return await this.resolveScopedTenantId(actor, tenantId ?? null);
    }
    if (tenantScope === 'platform') return null;
    if (tenantScope === 'tenant') return tenantId ? tenantId : { not: null };
    if (tenantId !== undefined && tenantId !== null) return tenantId;
    return undefined;
  }

  private async hydrateRoleTemplates(records: any[]) {
    const templateIds = records.map(item => item.id);
    const mappings = templateIds.length
      ? await this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
      : [];
    const capabilityMap = this.groupByMany(mappings, item => item.templateId, item => item.capabilityId);
    return records.map(item => ({
      ...item,
      capabilityIds: capabilityMap.get(item.id) ?? [],
      capabilityCount: (capabilityMap.get(item.id) ?? []).length
    }));
  }

  private async hydrateRoleTemplate(record: any) {
    const [result] = await this.hydrateRoleTemplates([record]);
    return result;
  }

  private async hydrateCapabilities(records: any[]) {
    const capabilityIds = records.map(item => item.id);
    const [targets, dimensions] = await Promise.all([
      capabilityIds.length
        ? this.prisma.capabilityScopeTarget.findMany({
            where: { capabilityId: { in: capabilityIds } },
            orderBy: [{ resourceEntityCode: 'asc' }, { createdAt: 'asc' }]
          })
        : Promise.resolve([]),
      this.prisma.scopeDimensionEntity.findMany()
    ]);
    const targetMap = this.groupByManyObjects(targets, item => item.capabilityId);
    const dimensionMap = new Map(dimensions.map(item => [item.code, item.name] as const));
    return records.map(item => ({
      ...item,
      scopeTargets: (targetMap.get(item.id) ?? []).map(target => ({
        ...target,
        dimensionEntityName: target.dimensionEntityCode
          ? dimensionMap.get(target.dimensionEntityCode) ?? target.dimensionEntityCode
          : null
      }))
    }));
  }

  private async hydrateCapability(record: any) {
    const [result] = await this.hydrateCapabilities([record]);
    return result;
  }

  private async hydrateRoles(records: any[]) {
    const roleIds = records.map(item => item.id);
    const tenantIds = [...new Set(records.map(item => item.tenantId).filter(Boolean))] as string[];
    const templateIds = [...new Set(records.map(item => item.templateId).filter(Boolean))] as string[];
    const [roleCapabilities, roleStrategies, templates, tenants] = await Promise.all([
      roleIds.length
        ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } })
        : Promise.resolve([]),
      roleIds.length
        ? this.prisma.roleScopeStrategy.findMany({ where: { roleId: { in: roleIds } } })
        : Promise.resolve([]),
      templateIds.length
        ? this.prisma.roleTemplate.findMany({ where: { id: { in: templateIds } } })
        : Promise.resolve([]),
      tenantIds.length
        ? this.prisma.tenant.findMany({ where: { id: { in: tenantIds } } })
        : Promise.resolve([])
    ]);
    const capabilityMap = this.groupByMany(roleCapabilities, item => item.roleId, item => item.capabilityId);
    const strategyMap = this.groupByManyObjects(roleStrategies, item => item.roleId);
    const templateMap = new Map(templates.map(item => [item.id, item]));
    const tenantMap = new Map(tenants.map(item => [item.id, item]));
    return records.map(item => ({
      ...item,
      capabilityIds: capabilityMap.get(item.id) ?? [],
      capabilityCount: (capabilityMap.get(item.id) ?? []).length,
      scopeStrategyCount: (strategyMap.get(item.id) ?? []).length,
      templateCode: item.templateId ? templateMap.get(item.templateId)?.code ?? null : null,
      templateName: item.templateId ? templateMap.get(item.templateId)?.name ?? null : null,
      tenantName: item.tenantId ? tenantMap.get(item.tenantId)?.name ?? null : null
    }));
  }

  private async hydrateRole(record: any) {
    const [result] = await this.hydrateRoles([record]);
    return result;
  }

  private async hydrateRoleScopeStrategies(records: any[]) {
    const capabilityIds = [...new Set(records.map(item => item.capabilityId).filter(Boolean))];
    const dimensionCodes = [...new Set(records.map(item => item.dimensionEntityCode).filter(Boolean))];
    const [capabilities, dimensions] = await Promise.all([
      capabilityIds.length
        ? this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } })
        : Promise.resolve([]),
      dimensionCodes.length
        ? this.prisma.scopeDimensionEntity.findMany({ where: { code: { in: dimensionCodes as string[] } } })
        : Promise.resolve([])
    ]);
    const capabilityMap = new Map(capabilities.map(item => [item.id, item]));
    const dimensionMap = new Map(dimensions.map(item => [item.code, item]));
    return records.map(item => ({
      ...item,
      capabilityCode: capabilityMap.get(item.capabilityId)?.code ?? null,
      capabilityName: capabilityMap.get(item.capabilityId)?.name ?? null,
      dimensionEntityName: item.dimensionEntityCode
        ? dimensionMap.get(item.dimensionEntityCode)?.name ?? item.dimensionEntityCode
        : null
    }));
  }

  private async resolveRoleCapabilityIds(templateId: string | null, capabilityIds: string[]) {
    const set = new Set(capabilityIds.filter(Boolean));
    if (templateId) {
      const mappings = await this.prisma.roleTemplateCapability.findMany({ where: { templateId } });
      mappings.forEach(item => set.add(item.capabilityId));
    }
    return [...set];
  }

  private async ensureRoleTemplateMatchesTenant(tenantId: string | null, templateId: string | null) {
    if (!templateId) {
      if (!tenantId) throw new BadRequestException('Platform roles must use a system_admin template');
      return;
    }
    const template = await this.prisma.roleTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new BadRequestException('Role template not found');
    if (!tenantId && template.actorType !== ActorType.system_admin) {
      throw new BadRequestException('Platform roles must use a system_admin template');
    }
    if (tenantId && template.actorType === ActorType.system_admin) {
      throw new BadRequestException('Tenant roles cannot use a system_admin template');
    }
  }

  private async syncRoleTemplateCapabilities(templateId: string, capabilityIds: string[]) {
    await this.prisma.roleTemplateCapability.deleteMany({ where: { templateId } });
    if (!capabilityIds.length) return;
    await this.prisma.roleTemplateCapability.createMany({
      data: capabilityIds.map(capabilityId => ({ templateId, capabilityId })),
      skipDuplicates: true
    });
  }

  private async syncRoleCapabilities(roleId: string, capabilityIds: string[]) {
    await this.prisma.roleCapability.deleteMany({ where: { roleId } });
    if (!capabilityIds.length) return;
    await this.prisma.roleCapability.createMany({
      data: capabilityIds.map(capabilityId => ({ roleId, capabilityId })),
      skipDuplicates: true
    });
  }

  private async syncRoleScopeStrategies(
    actor: IAuthentication,
    tenantId: string | null,
    roleId: string,
    strategies: RoleScopeStrategyInput[]
  ) {
    const normalizedStrategies = strategies.filter(item => item?.capabilityId);
    const capabilityIds = [...new Set(normalizedStrategies.map(item => item.capabilityId))];
    const scopeTargets = capabilityIds.length
      ? await this.prisma.capabilityScopeTarget.findMany({ where: { capabilityId: { in: capabilityIds } } })
      : [];
    const scopeTargetMap = this.groupByManyObjects(scopeTargets, item => item.capabilityId);
    const seenCapabilityIds = new Set<string>();

    normalizedStrategies.forEach(item => {
      if (seenCapabilityIds.has(item.capabilityId)) {
        throw new BadRequestException('Each capability can only have one scope strategy');
      }
      seenCapabilityIds.add(item.capabilityId);
      const targets = scopeTargetMap.get(item.capabilityId) ?? [];
      if (!targets.length) {
        throw new BadRequestException('Capability is not configured as a scope target');
      }
      if (item.strategyMode === ScopeStrategyMode.self) {
        if (!targets.some(target => target.supportsSelf)) {
          throw new BadRequestException('Capability does not support self scope');
        }
        return;
      }
      if (item.strategyMode === ScopeStrategyMode.relation || item.strategyMode === ScopeStrategyMode.assignment) {
        if (!item.dimensionEntityCode) {
          throw new BadRequestException('dimensionEntityCode is required for relation or assignment scope');
        }
        if (!targets.some(target => target.dimensionEntityCode === item.dimensionEntityCode)) {
          throw new BadRequestException('Capability does not support the selected dimension entity');
        }
        return;
      }
      if (item.strategyMode === ScopeStrategyMode.all) return;
      throw new BadRequestException('Invalid scope strategy mode');
    });

    await this.prisma.roleScopeStrategy.deleteMany({ where: { roleId } });
    if (!normalizedStrategies.length) return;
    await this.prisma.roleScopeStrategy.createMany({
      data: normalizedStrategies.map(item => ({
        id: item.id ?? randomUUID(),
        tenantId,
        roleId,
        capabilityId: item.capabilityId,
        strategyMode: item.strategyMode,
        dimensionEntityCode: item.dimensionEntityCode ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId
      })),
      skipDuplicates: true
    });
  }

  private async ensureRoleIdsTenant(tenantId: string | null, roleIds: string[]) {
    if (!roleIds.length) return;
    const roles = await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) throw new BadRequestException('Role not found');
    if (roles.some(item => item.tenantId !== tenantId)) {
      throw new ForbiddenException('Role does not belong to the current tenant');
    }
  }

  private async syncUserRoles(userId: string, roleIds: string[]) {
    await this.prisma.sysUserRole.deleteMany({ where: { userId } });
    if (!roleIds.length) return;
    await this.prisma.sysUserRole.createMany({
      data: roleIds.map(roleId => ({ userId, roleId })),
      skipDuplicates: true
    });
  }

  private async replaceDirectUserRelations(actor: IAuthentication, user: any, relations: RelationBindingInput[]) {
    await this.prisma.subjectDimensionRelation.deleteMany({
      where: { subjectEntityCode: 'user', subjectId: user.id }
    });
    const normalized = relations.flatMap(item =>
      [...new Set((item.entityIds ?? []).map(entityId => entityId?.trim()).filter(Boolean))].map(entityId => ({
        dimensionEntityCode: item.dimensionEntityCode,
        entityId
      }))
    );
    if (!normalized.length) return;
    normalized.forEach(item => {
      if (!scopeDimensionEntityMap.has(item.dimensionEntityCode)) {
        throw new BadRequestException(`Unsupported dimension entity: ${item.dimensionEntityCode}`);
      }
    });
    await this.prisma.subjectDimensionRelation.createMany({
      data: normalized.map(item => ({
        id: randomUUID(),
        tenantId: user.tenantId,
        subjectEntityCode: 'user',
        subjectId: user.id,
        dimensionEntityCode: item.dimensionEntityCode,
        entityId: item.entityId,
        createdBy: actor.userId,
        updatedBy: actor.userId
      })),
      skipDuplicates: true
    });
  }

  private async replaceUserScopeAssignments(
    actor: IAuthentication,
    user: any,
    roleIds: string[],
    assignments: ScopeAssignmentInput[]
  ) {
    await this.prisma.userScopeAssignment.deleteMany({ where: { userId: user.id } });
    const availableStrategies = roleIds.length
      ? await this.prisma.roleScopeStrategy.findMany({
          where: { roleId: { in: roleIds }, strategyMode: ScopeStrategyMode.assignment }
        })
      : [];
    const allowedMap = new Map(
      availableStrategies.map(item => [`${item.capabilityId}:${item.dimensionEntityCode ?? ''}`, item] as const)
    );

    const normalized = assignments.flatMap(item =>
      [...new Set((item.entityIds ?? []).map(entityId => entityId?.trim()).filter(Boolean))].map(entityId => ({
        capabilityId: item.capabilityId,
        dimensionEntityCode: item.dimensionEntityCode,
        entityId
      }))
    );
    if (!normalized.length) return;
    normalized.forEach(item => {
      if (!allowedMap.has(`${item.capabilityId}:${item.dimensionEntityCode}`)) {
        throw new BadRequestException('Scope assignment is not enabled by the current role strategies');
      }
    });
    await this.prisma.userScopeAssignment.createMany({
      data: normalized.map(item => ({
        id: randomUUID(),
        tenantId: user.tenantId,
        userId: user.id,
        capabilityId: item.capabilityId,
        dimensionEntityCode: item.dimensionEntityCode,
        entityId: item.entityId,
        createdBy: actor.userId,
        updatedBy: actor.userId
      })),
      skipDuplicates: true
    });
  }

  private async upsertStaffBinding(actor: IAuthentication, userId: string, tenantId: string | null, linkedStaffId: string | null) {
    if (!tenantId) return;
    if (!linkedStaffId) {
      await this.prisma.userStaffBinding.deleteMany({ where: { userId } });
      return;
    }
    const existing = await this.prisma.userStaffBinding.findUnique({ where: { userId } });
    if (existing) {
      await this.prisma.userStaffBinding.update({
        where: { userId },
        data: { staffId: linkedStaffId, updatedBy: actor.userId }
      });
      return;
    }
    await this.prisma.userStaffBinding.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        staffId: linkedStaffId,
        createdBy: actor.userId,
        updatedBy: actor.userId
      }
    });
  }

  private async replaceDelegationsForUser(actor: IAuthentication, user: any, delegations: DelegationInput[]) {
    await this.prisma.delegation.deleteMany({ where: { toUserId: user.id } });
    if (!delegations.length || !user.tenantId) return;
    await this.ensureUsersShareTenant(user.tenantId, delegations.flatMap(item => [item.fromUserId, item.toUserId]));
    for (const item of delegations) {
      await this.assertDelegationDimension(item.capabilityId, item.dimensionEntityCode);
    }
    await this.prisma.delegation.createMany({
      data: delegations.map(item => ({
        id: item.id ?? randomUUID(),
        tenantId: user.tenantId,
        fromUserId: item.fromUserId,
        toUserId: item.toUserId,
        capabilityId: item.capabilityId,
        scopeType: 'custom',
        scopeValue: item.entityId,
        dimensionEntityCode: item.dimensionEntityCode,
        entityId: item.entityId,
        status: item.status ?? DelegationStatus.active,
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt),
        createdBy: actor.userId,
        updatedBy: actor.userId
      })),
      skipDuplicates: true
    });
  }

  private async buildAuthProfile(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);

    const bundle = await this.resolveAuthorizationBundle(actor, userId);
    const linkedStaff = await this.prisma.userStaffBinding.findUnique({ where: { userId } });
    const directRelations = await this.prisma.subjectDimensionRelation.findMany({
      where: { subjectEntityCode: 'user', subjectId: userId },
      orderBy: [{ dimensionEntityCode: 'asc' }, { entityId: 'asc' }]
    });

    return {
      userId,
      tenantId: user.tenantId,
      roleIds: bundle.roles.map(item => item.id),
      roles: bundle.roles,
      capabilities: bundle.capabilities,
      linkedStaffId: linkedStaff?.staffId ?? null,
      relationBindings: await this.hydrateRelationBindings(
        this.groupEntityRecords(directRelations, item => item.dimensionEntityCode)
      ),
      resolvedRelations: await this.resolveRelationSnapshot(userId),
      scopeAssignments: await this.hydrateScopeAssignments(bundle.userScopeAssignments),
      scopeCapabilities: await this.buildAssignmentOptions(bundle.roleStrategies, bundle.capabilities),
      delegations: await this.hydrateDelegations(bundle.delegations)
    };
  }

  private async resolveAuthorizationBundle(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);
    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoles.map(item => item.roleId);
    const roles = roleIds.length ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } }) : [];
    const templateIds = roles.map(item => item.templateId).filter(Boolean) as string[];
    const now = new Date();
    const [roleCapabilities, templateCapabilities, roleStrategies, userScopeAssignments, delegations] =
      await Promise.all([
        roleIds.length
          ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } })
          : Promise.resolve([]),
        templateIds.length
          ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
          : Promise.resolve([]),
        roleIds.length
          ? this.prisma.roleScopeStrategy.findMany({ where: { roleId: { in: roleIds } } })
          : Promise.resolve([]),
        this.prisma.userScopeAssignment.findMany({ where: { userId } }),
        this.prisma.delegation.findMany({
          where: {
            toUserId: userId,
            status: DelegationStatus.active,
            startAt: { lte: now },
            endAt: { gte: now }
          }
        })
      ]);

    const assignmentStrategyKeys = new Set(
      roleStrategies
        .filter(item => item.strategyMode === ScopeStrategyMode.assignment && item.dimensionEntityCode)
        .map(item => `${item.capabilityId}:${item.dimensionEntityCode}`)
    );
    const filteredAssignments = userScopeAssignments.filter(item =>
      assignmentStrategyKeys.has(`${item.capabilityId}:${item.dimensionEntityCode}`)
    );

    const capabilityIds = [
      ...new Set([
        ...roleCapabilities.map(item => item.capabilityId),
        ...templateCapabilities.map(item => item.capabilityId),
        ...delegations.map(item => item.capabilityId)
      ])
    ];

    const capabilityRecords = capabilityIds.length
      ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } })
      : [];
    const capabilities = await this.hydrateCapabilities(capabilityRecords);
    const capabilityTargetMap = new Map(
      capabilities.map(item => [item.id, item.scopeTargets ?? []] as const)
    );

    return {
      user,
      roles,
      capabilities,
      roleStrategies,
      userScopeAssignments: filteredAssignments,
      delegations,
      capabilityTargetMap,
      subjectDimensionCache: new Map<string, string[]>()
    };
  }

  private async buildAssignmentOptions(roleStrategies: any[], capabilities: HydratedCapability[]) {
    const strategyMap = new Map(
      roleStrategies
        .filter(item => item.strategyMode === ScopeStrategyMode.assignment && item.dimensionEntityCode)
        .map(item => [`${item.capabilityId}:${item.dimensionEntityCode}`, item] as const)
    );
    const capabilityMap = new Map(capabilities.map(item => [item.id, item] as const));
    return [...strategyMap.values()]
      .map(item => {
        const capability = capabilityMap.get(item.capabilityId);
        return capability
          ? {
              capabilityId: item.capabilityId,
              capabilityCode: capability.code,
              capabilityName: capability.name,
              dimensionEntityCode: item.dimensionEntityCode,
              dimensionEntityName: item.dimensionEntityCode
                ? scopeDimensionEntityMap.get(item.dimensionEntityCode)?.name ?? item.dimensionEntityCode
                : null
            }
          : null;
      })
      .filter(Boolean);
  }

  private async hydrateRelationBindings(grouped: Map<string, any[]>) {
    const result: any[] = [];
    for (const [dimensionEntityCode, records] of grouped.entries()) {
      result.push({
        dimensionEntityCode,
        dimensionEntityName: scopeDimensionEntityMap.get(dimensionEntityCode)?.name ?? dimensionEntityCode,
        entityIds: records.map(item => item.entityId)
      });
    }
    return result.sort((a, b) => a.dimensionEntityCode.localeCompare(b.dimensionEntityCode));
  }

  private async resolveRelationSnapshot(userId: string) {
    const snapshots: any[] = [];
    for (const dimensionEntityCode of scopeDimensionEntityMap.keys()) {
      const entityIds = await this.resolveSubjectDimensionIds(
        { subjectDimensionCache: new Map<string, string[]>(), user: { id: userId } },
        dimensionEntityCode
      );
      if (!entityIds.length) continue;
      snapshots.push({
        dimensionEntityCode,
        dimensionEntityName: scopeDimensionEntityMap.get(dimensionEntityCode)?.name ?? dimensionEntityCode,
        entities: await this.resolveDimensionEntityLabels(dimensionEntityCode, entityIds),
        entityIds
      });
    }
    return snapshots;
  }

  private async hydrateScopeAssignments(assignments: any[]) {
    const grouped = new Map<string, { capabilityId: string; dimensionEntityCode: string; entityIds: string[] }>();
    assignments.forEach(item => {
      const key = `${item.capabilityId}:${item.dimensionEntityCode}`;
      const record: { capabilityId: string; dimensionEntityCode: string; entityIds: string[] } =
        grouped.get(key) ?? {
        capabilityId: item.capabilityId,
        dimensionEntityCode: item.dimensionEntityCode,
        entityIds: []
      };
      record.entityIds.push(item.entityId);
      grouped.set(key, record);
    });
    const capabilityIds = [...new Set(assignments.map(item => item.capabilityId))];
    const capabilities = capabilityIds.length
      ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } })
      : [];
    const capabilityMap = new Map(capabilities.map(item => [item.id, item]));
    const result: any[] = [];
    for (const record of grouped.values()) {
      result.push({
        capabilityId: record.capabilityId,
        capabilityCode: capabilityMap.get(record.capabilityId)?.code ?? null,
        capabilityName: capabilityMap.get(record.capabilityId)?.name ?? null,
        dimensionEntityCode: record.dimensionEntityCode,
        dimensionEntityName:
          scopeDimensionEntityMap.get(record.dimensionEntityCode)?.name ?? record.dimensionEntityCode,
        entityIds: record.entityIds,
        entities: await this.resolveDimensionEntityLabels(record.dimensionEntityCode, record.entityIds)
      });
    }
    return result;
  }

  private async hydrateDelegations(delegations: any[]) {
    const capabilityIds = [...new Set(delegations.map(item => item.capabilityId))];
    const capabilities = capabilityIds.length
      ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } })
      : [];
    const capabilityMap = new Map(capabilities.map(item => [item.id, item]));
    return Promise.all(
      delegations.map(async item => ({
        ...item,
        capabilityCode: capabilityMap.get(item.capabilityId)?.code ?? null,
        capabilityName: capabilityMap.get(item.capabilityId)?.name ?? null,
        dimensionEntityName: item.dimensionEntityCode
          ? scopeDimensionEntityMap.get(item.dimensionEntityCode)?.name ?? item.dimensionEntityCode
          : null,
        entityLabel: item.dimensionEntityCode
          ? (await this.resolveDimensionEntityLabels(item.dimensionEntityCode, [item.entityId ?? '']))[0] ?? null
          : null
      }))
    );
  }

  private async evaluateCapabilityDecision(
    bundle: any,
    capabilityCode: string,
    resource: Record<string, any>,
    context: Record<string, any>
  ) {
    const matchedCapability = bundle.capabilities.find((item: any) => item.code === capabilityCode);
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, context?.resourceType);
    if (!matchedCapability) {
      return {
        allowed: false,
        resolvedCapabilities: bundle.capabilities.map((item: any) => item.code),
        resolvedScope: [],
        visibleViews,
        decisionReason: 'capability_not_granted'
      };
    }
    const allowed = await this.evaluateScope(bundle, matchedCapability, resource, context);
    return {
      allowed,
      resolvedCapabilities: bundle.capabilities.map((item: any) => item.code),
      resolvedScope: this.describeResolvedScope(bundle, matchedCapability.id),
      visibleViews,
      decisionReason: allowed ? 'allowed' : 'scope_or_relation_denied'
    };
  }

  private async evaluateApiDecision(
    bundle: any,
    api: { resource: string; action: string; method?: string; path?: string },
    resource: Record<string, any>,
    context: Record<string, any>
  ) {
    const bindings = await this.prisma.capabilityApiBinding.findMany({
      where: {
        resource: api.resource,
        action: api.action,
        ...(api.method ? { OR: [{ method: api.method }, { method: null }] } : {})
      },
      orderBy: [{ bindingMode: 'asc' }, { createdAt: 'asc' }]
    });
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, context?.resourceType);
    if (!bindings.length) {
      return {
        allowed: false,
        resolvedCapabilities: bundle.capabilities.map((item: any) => item.code),
        resolvedScope: [],
        visibleViews,
        decisionReason: 'binding_not_found'
      };
    }
    const capabilityMap = new Map(bundle.capabilities.map((item: any) => [item.id, item]));
    const matchedBindings = bindings.map(binding => ({
      ...binding,
      capability: capabilityMap.get(binding.capabilityId) ?? null
    }));
    const anyOfBindings = matchedBindings.filter(item => item.bindingMode === CapabilityBindingMode.ANY_OF);
    const allOfBindings = matchedBindings.filter(item => item.bindingMode === CapabilityBindingMode.ALL_OF);
    const anyOfAllowed = anyOfBindings.length
      ? (
          await Promise.all(
            anyOfBindings.map(async item =>
              item.capability ? this.evaluateScope(bundle, item.capability, resource, context) : false
            )
          )
        ).some(Boolean)
      : true;
    const allOfAllowed = (
      await Promise.all(
        allOfBindings.map(async item =>
          item.capability ? this.evaluateScope(bundle, item.capability, resource, context) : false
        )
      )
    ).every(Boolean);
    const allowed = allOfAllowed && anyOfAllowed;
    return {
      allowed,
      resolvedCapabilities: bundle.capabilities.map((item: any) => item.code),
      resolvedScope: bundle.roleStrategies.filter((item: any) =>
        matchedBindings.some(binding => binding.capabilityId === item.capabilityId)
      ),
      matchedBindings: matchedBindings.map(item => ({
        capabilityId: item.capabilityId,
        capabilityCode: (item.capability as any)?.code ?? null,
        bindingMode: item.bindingMode,
        resource: item.resource,
        action: item.action,
        method: item.method,
        path: item.path
      })),
      visibleViews,
      decisionReason: allowed ? 'allowed' : 'binding_scope_denied'
    };
  }

  private async evaluateScope(
    bundle: any,
    capability: HydratedCapability,
    resource: Record<string, any>,
    context: Record<string, any>
  ) {
    const strategies = bundle.roleStrategies.filter((item: any) => item.capabilityId === capability.id);
    const delegations = bundle.delegations.filter((item: any) => item.capabilityId === capability.id);
    const assignments = bundle.userScopeAssignments.filter((item: any) => item.capabilityId === capability.id);

    if (!strategies.length && !delegations.length) return true;
    if (strategies.some((item: any) => item.strategyMode === ScopeStrategyMode.all)) return true;

    const ownerUserId = resource.ownerUserId ?? resource.userId ?? context.ownerUserId;
    if (
      ownerUserId &&
      strategies.some((item: any) => item.strategyMode === ScopeStrategyMode.self) &&
      ownerUserId === bundle.user.id
    ) {
      return true;
    }

    const relationStrategies = strategies.filter((item: any) => item.strategyMode === ScopeStrategyMode.relation);
    for (const strategy of relationStrategies) {
      if (!strategy.dimensionEntityCode) continue;
      const [subjectIds, resourceIds] = await Promise.all([
        this.resolveSubjectDimensionIds(bundle, strategy.dimensionEntityCode),
        this.resolveResourceDimensionIds(capability, strategy.dimensionEntityCode, resource, context)
      ]);
      if (this.hasIntersection(subjectIds, resourceIds)) return true;
    }

    const assignmentStrategies = strategies.filter(
      (item: any) => item.strategyMode === ScopeStrategyMode.assignment && item.dimensionEntityCode
    );
    for (const strategy of assignmentStrategies) {
      const resourceIds = await this.resolveResourceDimensionIds(
        capability,
        strategy.dimensionEntityCode,
        resource,
        context
      );
      const assignmentIds = assignments
        .filter((item: any) => item.dimensionEntityCode === strategy.dimensionEntityCode)
        .map((item: any) => item.entityId);
      if (this.hasIntersection(assignmentIds, resourceIds)) return true;
    }

    for (const delegation of delegations) {
      if (!delegation.dimensionEntityCode || !delegation.entityId) continue;
      const resourceIds = await this.resolveResourceDimensionIds(
        capability,
        delegation.dimensionEntityCode,
        resource,
        context
      );
      if (resourceIds.includes(delegation.entityId)) return true;
    }

    return false;
  }

  private async resolveSubjectDimensionIds(bundle: any, dimensionEntityCode: string) {
    const cache = bundle.subjectDimensionCache as Map<string, string[]>;
    if (cache.has(dimensionEntityCode)) return cache.get(dimensionEntityCode) ?? [];
    const resolver = scopeSubjectResolverMap.get(`user:${dimensionEntityCode}`);
    let entityIds: string[] = [];
    if (resolver) {
      entityIds = await resolver.resolve({ prisma: this.prisma as any, subjectId: bundle.user.id });
    } else {
      entityIds = (
        await this.prisma.subjectDimensionRelation.findMany({
          where: { subjectEntityCode: 'user', subjectId: bundle.user.id, dimensionEntityCode }
        })
      ).map(item => item.entityId);
    }
    const deduped = [...new Set(entityIds)];
    cache.set(dimensionEntityCode, deduped);
    return deduped;
  }

  private async resolveResourceDimensionIds(
    capability: HydratedCapability,
    dimensionEntityCode: string,
    resource: Record<string, any>,
    context: Record<string, any>
  ) {
    const direct = this.resolveDimensionIdsFromPayload(dimensionEntityCode, resource, context);
    if (direct.length) return direct;

    const requestedResourceEntityCode =
      context.resourceEntityCode ?? resource.resourceEntityCode ?? capability.scopeTargets?.[0]?.resourceEntityCode;
    const matchingTargets = (capability.scopeTargets ?? []).filter(
      (item: any) =>
        item.dimensionEntityCode === dimensionEntityCode &&
        (!requestedResourceEntityCode || item.resourceEntityCode === requestedResourceEntityCode)
    );

    const result = new Set<string>();
    for (const target of matchingTargets) {
      const resolver = scopeResourceResolverMap.get(`${target.resourceEntityCode}:${dimensionEntityCode}`);
      if (!resolver) continue;
      const ids = await resolver.resolve({ resource, context });
      ids.forEach(id => result.add(id));
    }
    return [...result];
  }

  private resolveDimensionIdsFromPayload(
    dimensionEntityCode: string,
    resource: Record<string, any>,
    context: Record<string, any>
  ) {
    const candidates = [
      context?.resolvedDimensionIds?.[dimensionEntityCode],
      resource?.resolvedDimensionIds?.[dimensionEntityCode],
      context?.[`${dimensionEntityCode}Ids`],
      resource?.[`${dimensionEntityCode}Ids`],
      context?.[`${dimensionEntityCode}Id`],
      resource?.[`${dimensionEntityCode}Id`]
    ];
    const result = new Set<string>();
    candidates.forEach(candidate => {
      if (Array.isArray(candidate)) {
        candidate.forEach(item => item && result.add(String(item)));
        return;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        result.add(candidate.trim());
      }
    });
    return [...result];
  }

  private describeResolvedScope(bundle: any, capabilityId: string) {
    return {
      roleStrategies: bundle.roleStrategies.filter((item: any) => item.capabilityId === capabilityId),
      scopeAssignments: bundle.userScopeAssignments.filter((item: any) => item.capabilityId === capabilityId),
      delegations: bundle.delegations.filter((item: any) => item.capabilityId === capabilityId)
    };
  }

  private async resolveVisibleViews(capabilities: any[], resourceType?: string) {
    const viewCapabilities = capabilities.filter(item => item.kind === CapabilityKind.view);
    if (!viewCapabilities.length) return [];
    const bindings = await this.prisma.capabilityViewBinding.findMany({
      where: {
        capabilityId: { in: viewCapabilities.map(item => item.id) },
        ...(resourceType ? { resourceType } : {})
      }
    });
    if (!bindings.length) return viewCapabilities.map(item => item.code);
    const capabilityCodeMap = new Map(viewCapabilities.map(item => [item.id, item.code]));
    return bindings.map(item => ({
      capabilityId: item.capabilityId,
      capabilityCode: capabilityCodeMap.get(item.capabilityId) ?? null,
      resourceType: item.resourceType,
      viewKey: item.viewKey
    }));
  }

  private async resolveCapabilityRoutes(capabilities: any[]) {
    const menus = await this.prisma.sysMenu.findMany({
      where: { constant: false, status: Status.ENABLED },
      orderBy: [{ order: 'asc' }, { id: 'asc' }]
    });
    const allowedMenuIds = new Set<number>();
    const menuMap = new Map(menus.map(item => [item.id, item] as const));
    const homeMenu = menus.find(item => item.routeName === 'home');
    if (homeMenu) {
      allowedMenuIds.add(homeMenu.id);
    }

    if (capabilities.length) {
      const bindings = await this.prisma.capabilityUiBinding.findMany({
        where: { capabilityId: { in: capabilities.map(item => item.id) }, resourceType: 'menu' }
      });
      const routeNameSet = new Set(bindings.map(item => item.routeName).filter(Boolean));
      const resourceCodeSet = new Set(bindings.map(item => item.resourceCode).filter(Boolean));
      bindings.forEach(item => {
        if (item.menuId) {
          allowedMenuIds.add(item.menuId);
        }
      });
      menus.forEach(menu => {
        if (routeNameSet.has(menu.routeName) || resourceCodeSet.has(menu.routeName)) {
          allowedMenuIds.add(menu.id);
        }
      });
    }

    const stack = [...allowedMenuIds];
    while (stack.length) {
      const currentId = stack.pop();
      if (currentId === undefined) continue;
      const current = menuMap.get(currentId);
      if (!current || current.pid === 0) continue;
      const parent = menuMap.get(current.pid);
      if (parent && !allowedMenuIds.has(parent.id)) {
        allowedMenuIds.add(parent.id);
        stack.push(parent.id);
      }
    }

    const allowedMenus = menus.filter(item => allowedMenuIds.has(item.id));
    return this.buildCapabilityRouteTree(allowedMenus);
  }

  private buildCapabilityRouteTree(menus: any[], pid = 0): any[] {
    return menus
      .filter(item => item.pid === pid)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        name: item.routeName,
        path: item.routePath,
        component: item.component,
        meta: {
          title: item.menuName,
          i18nKey: item.i18nKey,
          keepAlive: item.keepAlive,
          constant: item.constant,
          icon: item.icon,
          order: item.order,
          href: item.href,
          hideInMenu: item.hideInMenu,
          activeMenu: item.activeMenu,
          multiTab: item.multiTab
        },
        children: this.buildCapabilityRouteTree(menus, item.id)
      }));
  }

  private async listDimensionRecords(actor: IAuthentication, dimensionEntityCode: string) {
    if (dimensionEntityCode === 'organization') {
      const tenantId = await this.resolveActorTenantId(actor);
      const records = await this.prisma.sysOrganization.findMany({
        where: { status: Status.ENABLED, ...(tenantId ? { tenantId } : {}) },
        orderBy: [{ name: 'asc' }, { id: 'asc' }]
      });
      return records.map(item => ({
        id: item.id,
        label: item.name,
        code: item.code
      }));
    }
    throw new BadRequestException(`Unsupported dimension entity: ${dimensionEntityCode}`);
  }

  private async resolveDimensionEntityLabels(dimensionEntityCode: string, entityIds: string[]) {
    const dedupedIds = [...new Set(entityIds.filter(Boolean))];
    if (!dedupedIds.length) return [];
    if (dimensionEntityCode === 'organization') {
      const records = await this.prisma.sysOrganization.findMany({
        where: { id: { in: dedupedIds } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }]
      });
      const recordMap = new Map(records.map(item => [item.id, item.name] as const));
      return dedupedIds.map(id => ({ id, label: recordMap.get(id) ?? id }));
    }
    return dedupedIds.map(id => ({ id, label: id }));
  }

  private async assertDelegationDimension(capabilityId: string, dimensionEntityCode: string) {
    if (!dimensionEntityCode) throw new BadRequestException('dimensionEntityCode is required');
    const supported = await this.prisma.capabilityScopeTarget.findFirst({
      where: { capabilityId, dimensionEntityCode }
    });
    if (!supported) {
      throw new BadRequestException('Capability does not support the delegated dimension entity');
    }
  }

  private async ensureUsersShareTenant(tenantId: string | null, userIds: string[]) {
    if (!tenantId || !userIds.length) return;
    const records = await this.prisma.sysUser.findMany({
      where: { id: { in: [...new Set(userIds)] } }
    });
    if (records.some(item => item.tenantId !== tenantId)) {
      throw new ForbiddenException('Delegation users must belong to the same tenant');
    }
  }

  private async ensureActorHasAnyCapability(userId: string, capabilityCodes: string[]) {
    const resolved = await this.resolveCapabilityCodeSet(userId);
    if (!capabilityCodes.some(code => resolved.has(code))) {
      throw new ForbiddenException('Capability denied');
    }
  }

  private async resolveCapabilityCodeSet(userId: string) {
    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoles.map(item => item.roleId);
    const roles = roleIds.length ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } }) : [];
    const templateIds = [...new Set(roles.map(item => item.templateId).filter(Boolean))] as string[];
    const now = new Date();
    const [roleCapabilities, templateCapabilities, delegations] = await Promise.all([
      roleIds.length
        ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } })
        : Promise.resolve([]),
      templateIds.length
        ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
        : Promise.resolve([]),
      this.prisma.delegation.findMany({
        where: {
          toUserId: userId,
          status: DelegationStatus.active,
          startAt: { lte: now },
          endAt: { gte: now }
        }
      })
    ]);
    const capabilityIds = [
      ...new Set([
        ...roleCapabilities.map(item => item.capabilityId),
        ...templateCapabilities.map(item => item.capabilityId),
        ...delegations.map(item => item.capabilityId)
      ])
    ];
    if (!capabilityIds.length) return new Set<string>();
    const capabilities = await this.prisma.capability.findMany({
      where: { id: { in: capabilityIds }, status: Status.ENABLED },
      select: { code: true }
    });
    return new Set(capabilities.map(item => item.code));
  }

  private groupByMany<T, K extends string | number>(
    items: T[],
    keySelector: (item: T) => K,
    valueSelector: (item: T) => string
  ) {
    const map = new Map<K, string[]>();
    items.forEach(item => {
      const key = keySelector(item);
      const list = map.get(key) ?? [];
      list.push(valueSelector(item));
      map.set(key, list);
    });
    return map;
  }

  private groupByManyObjects<T, K extends string | number>(items: T[], keySelector: (item: T) => K) {
    const map = new Map<K, T[]>();
    items.forEach(item => {
      const key = keySelector(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });
    return map;
  }

  private groupEntityRecords<T>(items: T[], keySelector: (item: T) => string) {
    return this.groupByManyObjects(items, keySelector);
  }

  private hasIntersection(left: string[], right: string[]) {
    if (!left.length || !right.length) return false;
    const rightSet = new Set(right);
    return left.some(item => rightSet.has(item));
  }

  private toAuditJson(detail: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(detail ?? null)) as Prisma.InputJsonValue;
  }

  private async writeAuditLog(
    actor: IAuthentication,
    action: string,
    resourceType: string,
    resourceId: string | null,
    detail: unknown
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: await this.resolveActorTenantId(actor),
        actorUserId: actor.userId,
        actorUsername: actor.username,
        actorType: actor.actorType,
        action,
        resourceType,
        resourceId,
        detail: this.toAuditJson(detail)
      }
    });
  }
}
