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
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ActorType,
  CapabilityKind,
  DelegationStatus,
  PolicyEffect,
  Prisma,
  ScopeType,
  Status,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { ApiRes } from '@lib/infra/rest/res.response';
import { PrismaService } from '@lib/shared/prisma/prisma.service';
import { IAuthentication } from '@lib/typings/global';

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

interface ScopeOverrideInput {
  id?: string;
  capabilityId: string;
  scopeType: ScopeType;
  scopeValue?: string | null;
  effect?: PolicyEffect;
  startAt?: string | null;
  endAt?: string | null;
}

interface DelegationInput {
  id?: string;
  tenantId?: string;
  fromUserId: string;
  toUserId: string;
  capabilityId: string;
  scopeType: ScopeType;
  scopeValue?: string | null;
  status?: DelegationStatus;
  startAt: string;
  endAt: string;
}

interface AuthProfilePayload {
  roleIds?: string[];
  scopeOverrides?: ScopeOverrideInput[];
  delegations?: DelegationInput[];
  linkedStaffId?: string | null;
}

interface CanPayload {
  userId?: string;
  capability: string;
  resource?: Record<string, any>;
  context?: Record<string, any>;
}

interface VisibleViewsPayload {
  userId?: string;
  resourceType: string;
  context?: Record<string, any>;
}

@ApiTags('Tenant AuthZ - Target State')
@Controller()
export class TenantAuthzController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants')
  async listTenants(@Request() req: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    if (this.isSystemAdmin(actor)) {
      const records = await this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });
      return ApiRes.success(records);
    }

    const tenantId = await this.resolveActorTenantId(actor);
    if (!tenantId) {
      return ApiRes.success([]);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return ApiRes.success(tenant ? [tenant] : []);
  }

  @Post('tenants')
  async createTenant(@Request() req: any, @Body() body: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);

    const created = await this.prisma.tenant.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? Status.ENABLED,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.writeAuditLog(actor, 'tenant.create', 'tenant', created.id, created);
    return ApiRes.success(created);
  }

  @Get('role-templates')
  async listRoleTemplates(@Query() query: any): Promise<ApiRes<any>> {
    const where: Prisma.RoleTemplateWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.actorType) where.actorType = query.actorType;

    const templates = await this.prisma.roleTemplate.findMany({
      where,
      orderBy: [{ builtIn: 'desc' }, { createdAt: 'asc' }],
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
      }))
    );
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
      orderBy: [{ module: 'asc' }, { kind: 'asc' }, { code: 'asc' }],
    });
    return ApiRes.success(capabilities);
  }

  @Get('roles')
  async listRoles(@Request() req: any, @Query() query: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const paging = this.parsePage(query);
    const tenantId = await this.resolveScopedTenantId(actor, query.tenantId);

    const where: Prisma.SysRoleWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.code) where.code = { contains: query.code };
    if (query.name) where.name = { contains: query.name };
    if (query.status) where.status = query.status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.sysRole.findMany({
        where,
        skip: (paging.current - 1) * paging.size,
        take: paging.size,
        orderBy: [{ builtIn: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.sysRole.count({ where }),
    ]);

    const hydrated = await this.hydrateRoles(records);
    return ApiRes.success({
      records: hydrated,
      total,
      current: paging.current,
      size: paging.size,
    });
  }

  @Post('roles')
  async createRole(@Request() req: any, @Body() body: RolePayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
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
        updatedBy: actor.userId,
      },
    });

    await this.syncRoleCapabilities(created.id, capabilityIds);
    await this.writeAuditLog(actor, 'role.create', 'role', created.id, {
      ...created,
      capabilityIds,
    });

    return ApiRes.success(await this.hydrateRole(created));
  }

  @Put('roles/:id')
  async updateRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<RolePayload>,
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');

    await this.assertRoleAccessible(actor, existing.tenantId);
    const tenantId = body.tenantId === undefined ? existing.tenantId : await this.resolveScopedTenantId(actor, body.tenantId);
    const capabilityIds = body.capabilityIds
      ? await this.resolveRoleCapabilityIds(body.templateId ?? existing.templateId, body.capabilityIds)
      : null;

    const updated = await this.prisma.sysRole.update({
      where: { id },
      data: {
        code: body.code ?? existing.code,
        name: body.name ?? existing.name,
        tenantId,
        templateId: body.templateId === undefined ? existing.templateId : body.templateId,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId,
      },
    });

    if (capabilityIds) {
      await this.syncRoleCapabilities(id, capabilityIds);
    }

    await this.writeAuditLog(actor, 'role.update', 'role', id, {
      before: existing,
      after: updated,
      capabilityIds,
    });

    return ApiRes.success(await this.hydrateRole(updated));
  }

  @Delete('roles/:id')
  async deleteRole(@Request() req: any, @Param('id') id: string): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.builtIn) throw new BadRequestException('Built-in role cannot be deleted');

    await this.assertRoleAccessible(actor, existing.tenantId);

    await this.prisma.$transaction([
      this.prisma.roleCapability.deleteMany({ where: { roleId: id } }),
      this.prisma.scopePolicy.deleteMany({ where: { roleId: id } }),
      this.prisma.sysUserRole.deleteMany({ where: { roleId: id } }),
      this.prisma.sysRole.delete({ where: { id } }),
    ]);

    await this.writeAuditLog(actor, 'role.delete', 'role', id, existing);
    return ApiRes.ok();
  }

  @Get('users/:id/auth-profile')
  async getUserAuthProfile(@Request() req: any, @Param('id') userId: string): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const profile = await this.buildAuthProfile(actor, userId);
    return ApiRes.success(profile);
  }

  @Put('users/:id/auth-profile')
  async updateUserAuthProfile(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() body: AuthProfilePayload,
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);

    if (body.roleIds) {
      await this.syncUserRoles(userId, body.roleIds);
    }
    if (body.scopeOverrides) {
      await this.replaceUserScopeOverrides(actor, userId, body.scopeOverrides);
    }
    if (body.linkedStaffId !== undefined) {
      await this.upsertStaffBinding(actor, userId, user.tenantId, body.linkedStaffId);
    }
    if (body.delegations) {
      await this.replaceDelegationsForUser(actor, user, body.delegations);
    }

    const profile = await this.buildAuthProfile(actor, userId);
    await this.writeAuditLog(actor, 'user.auth-profile.update', 'user', userId, profile);
    return ApiRes.success(profile);
  }

  @Get('delegations')
  async listDelegations(@Request() req: any, @Query() query: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const tenantId = await this.resolveScopedTenantId(actor, query.tenantId);
    const where: Prisma.DelegationWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.toUserId) where.toUserId = query.toUserId;
    if (query.fromUserId) where.fromUserId = query.fromUserId;
    if (query.capabilityId) where.capabilityId = query.capabilityId;
    if (query.status) where.status = query.status;

    const records = await this.prisma.delegation.findMany({
      where,
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
    });
    return ApiRes.success(records);
  }

  @Post('delegations')
  async createDelegation(@Request() req: any, @Body() body: DelegationInput): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
    await this.ensureUsersShareTenant(tenantId, [body.fromUserId, body.toUserId]);

    const created = await this.prisma.delegation.create({
      data: {
        id: randomUUID(),
        tenantId: tenantId ?? '',
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        capabilityId: body.capabilityId,
        scopeType: body.scopeType,
        scopeValue: body.scopeValue ?? null,
        status: body.status ?? DelegationStatus.active,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.writeAuditLog(actor, 'delegation.create', 'delegation', created.id, created);
    return ApiRes.success(created);
  }

  @Put('delegations/:id')
  async updateDelegation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<DelegationInput>,
  ): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.delegation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Delegation not found');
    await this.assertRoleAccessible(actor, existing.tenantId);

    const updated = await this.prisma.delegation.update({
      where: { id },
      data: {
        capabilityId: body.capabilityId ?? existing.capabilityId,
        scopeType: body.scopeType ?? existing.scopeType,
        scopeValue: body.scopeValue === undefined ? existing.scopeValue : body.scopeValue,
        status: body.status ?? existing.status,
        startAt: body.startAt ? new Date(body.startAt) : existing.startAt,
        endAt: body.endAt ? new Date(body.endAt) : existing.endAt,
        updatedBy: actor.userId,
      },
    });

    await this.writeAuditLog(actor, 'delegation.update', 'delegation', id, {
      before: existing,
      after: updated,
    });
    return ApiRes.success(updated);
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return ApiRes.success({
      records,
      total,
      current: paging.current,
      size: paging.size,
    });
  }

  @Post('authz/can')
  async can(@Request() req: any, @Body() body: CanPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const subjectUserId = body.userId ?? actor.userId;
    const bundle = await this.resolveAuthorizationBundle(actor, subjectUserId);
    const matchedCapability = bundle.capabilities.find(item => item.code === body.capability);
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, body.context?.resourceType);

    if (!matchedCapability) {
      return ApiRes.success({
        allowed: false,
        resolvedCapabilities: bundle.capabilities.map(item => item.code),
        resolvedScope: bundle.scopes,
        visibleViews,
        decisionReason: 'capability_not_granted',
      });
    }

    const allowed = this.evaluateScope(bundle, matchedCapability.id, body.resource ?? {}, body.context ?? {});
    return ApiRes.success({
      allowed,
      resolvedCapabilities: bundle.capabilities.map(item => item.code),
      resolvedScope: bundle.scopes.filter(item => item.capabilityId === matchedCapability.id),
      visibleViews,
      decisionReason: allowed ? 'allowed' : 'scope_or_relation_denied',
    });
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
      decisionReason: 'resolved',
    });
  }

  private parsePage(query: PageQuery) {
    const current = Math.max(Number(query.current) || 1, 1);
    const size = Math.min(Math.max(Number(query.size) || 10, 1), 100);
    return { current, size };
  }

  private isSystemAdmin(actor: IAuthentication) {
    return actor.actorType === 'system_admin' || actor.domain === 'built-in';
  }

  private assertSystemAdmin(actor: IAuthentication) {
    if (!this.isSystemAdmin(actor)) {
      throw new ForbiddenException('System admin only');
    }
  }

  private async resolveActorTenantId(actor: IAuthentication): Promise<string | null> {
    if (actor.tenantId) return actor.tenantId;
    if (!actor.domain || actor.domain === 'built-in') return null;

    const tenant = await this.prisma.tenant.findUnique({ where: { code: actor.domain } });
    return tenant?.id ?? null;
  }

  private async resolveScopedTenantId(actor: IAuthentication, requestedTenantId?: string | null) {
    if (this.isSystemAdmin(actor)) {
      return requestedTenantId ?? null;
    }

    const actorTenantId = await this.resolveActorTenantId(actor);
    if (!actorTenantId) {
      throw new ForbiddenException('Tenant context required');
    }
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

  private async hydrateRoles(records: any[]) {
    const roleIds = records.map(item => item.id);
    const tenantIds = [...new Set(records.map(item => item.tenantId).filter(Boolean))] as string[];
    const templateIds = [...new Set(records.map(item => item.templateId).filter(Boolean))] as string[];

    const [roleCapabilities, templates, tenants] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length ? this.prisma.roleTemplate.findMany({ where: { id: { in: templateIds } } }) : Promise.resolve([]),
      tenantIds.length ? this.prisma.tenant.findMany({ where: { id: { in: tenantIds } } }) : Promise.resolve([]),
    ]);

    const capabilityMap = this.groupByMany(roleCapabilities, item => item.roleId, item => item.capabilityId);
    const templateMap = new Map(templates.map(item => [item.id, item]));
    const tenantMap = new Map(tenants.map(item => [item.id, item]));

    return records.map(item => ({
      ...item,
      capabilityIds: capabilityMap.get(item.id) ?? [],
      capabilityCount: (capabilityMap.get(item.id) ?? []).length,
      templateCode: item.templateId ? templateMap.get(item.templateId)?.code ?? null : null,
      templateName: item.templateId ? templateMap.get(item.templateId)?.name ?? null : null,
      tenantName: item.tenantId ? tenantMap.get(item.tenantId)?.name ?? null : null,
    }));
  }

  private async hydrateRole(record: any) {
    const [result] = await this.hydrateRoles([record]);
    return result;
  }

  private async resolveRoleCapabilityIds(templateId: string | null, capabilityIds: string[]) {
    const set = new Set(capabilityIds.filter(Boolean));
    if (templateId) {
      const mappings = await this.prisma.roleTemplateCapability.findMany({ where: { templateId } });
      mappings.forEach(item => set.add(item.capabilityId));
    }
    return [...set];
  }

  private async syncRoleCapabilities(roleId: string, capabilityIds: string[]) {
    await this.prisma.roleCapability.deleteMany({ where: { roleId } });
    if (!capabilityIds.length) return;

    await this.prisma.roleCapability.createMany({
      data: capabilityIds.map(capabilityId => ({ roleId, capabilityId })),
      skipDuplicates: true,
    });
  }

  private async syncUserRoles(userId: string, roleIds: string[]) {
    await this.prisma.sysUserRole.deleteMany({ where: { userId } });
    if (!roleIds.length) return;

    await this.prisma.sysUserRole.createMany({
      data: roleIds.map(roleId => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  private async replaceUserScopeOverrides(
    actor: IAuthentication,
    userId: string,
    overrides: ScopeOverrideInput[],
  ) {
    await this.prisma.userScopeOverride.deleteMany({ where: { userId } });
    if (!overrides.length) return;

    await this.prisma.userScopeOverride.createMany({
      data: overrides.map(item => ({
        id: item.id ?? randomUUID(),
        userId,
        capabilityId: item.capabilityId,
        scopeType: item.scopeType,
        scopeValue: item.scopeValue ?? null,
        effect: item.effect ?? PolicyEffect.allow,
        startAt: item.startAt ? new Date(item.startAt) : null,
        endAt: item.endAt ? new Date(item.endAt) : null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })),
      skipDuplicates: true,
    });
  }

  private async upsertStaffBinding(
    actor: IAuthentication,
    userId: string,
    tenantId: string | null,
    linkedStaffId: string | null,
  ) {
    if (!tenantId) return;
    if (!linkedStaffId) {
      await this.prisma.userStaffBinding.deleteMany({ where: { userId } });
      return;
    }

    const existing = await this.prisma.userStaffBinding.findUnique({ where: { userId } });
    if (existing) {
      await this.prisma.userStaffBinding.update({
        where: { userId },
        data: {
          staffId: linkedStaffId,
          updatedBy: actor.userId,
        },
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
        updatedBy: actor.userId,
      },
    });
  }

  private async replaceDelegationsForUser(
    actor: IAuthentication,
    user: any,
    delegations: DelegationInput[],
  ) {
    await this.prisma.delegation.deleteMany({ where: { toUserId: user.id } });
    if (!delegations.length || !user.tenantId) return;

    await this.ensureUsersShareTenant(user.tenantId, delegations.flatMap(item => [item.fromUserId, item.toUserId]));
    await this.prisma.delegation.createMany({
      data: delegations.map(item => ({
        id: item.id ?? randomUUID(),
        tenantId: user.tenantId,
        fromUserId: item.fromUserId,
        toUserId: item.toUserId,
        capabilityId: item.capabilityId,
        scopeType: item.scopeType,
        scopeValue: item.scopeValue ?? null,
        status: item.status ?? DelegationStatus.active,
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })),
      skipDuplicates: true,
    });
  }

  private async buildAuthProfile(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);

    const bundle = await this.resolveAuthorizationBundle(actor, userId);
    const linkedStaff = await this.prisma.userStaffBinding.findUnique({ where: { userId } });

    return {
      userId,
      tenantId: user.tenantId,
      roles: bundle.roles,
      capabilities: bundle.capabilities,
      scopes: bundle.scopes,
      delegations: bundle.delegations,
      linkedStaffId: linkedStaff?.staffId ?? null,
    };
  }

  private async resolveAuthorizationBundle(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);

    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoles.map(item => item.roleId);
    const roles = roleIds.length
      ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } })
      : [];
    const templateIds = roles.map(item => item.templateId).filter(Boolean) as string[];

    const [roleCapabilities, templateCapabilities, capabilities, scopes, overrides, delegations] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } }) : Promise.resolve([]),
      Promise.resolve([]),
      roleIds.length ? this.prisma.scopePolicy.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      this.prisma.userScopeOverride.findMany({ where: { userId } }),
      this.prisma.delegation.findMany({
        where: {
          toUserId: userId,
          status: DelegationStatus.active,
          startAt: { lte: new Date() },
          endAt: { gte: new Date() },
        },
      }),
    ]);

    const capabilityIds = [...new Set([
      ...roleCapabilities.map(item => item.capabilityId),
      ...templateCapabilities.map(item => item.capabilityId),
      ...delegations.map(item => item.capabilityId),
      ...overrides.map(item => item.capabilityId),
    ])];

    const capabilityRecords = capabilityIds.length
      ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } })
      : [];

    const delegatedScopes = delegations.map(item => ({
      capabilityId: item.capabilityId,
      scopeType: item.scopeType,
      scopeValue: item.scopeValue,
      effect: PolicyEffect.allow,
      source: 'delegation',
      fromUserId: item.fromUserId,
      startAt: item.startAt,
      endAt: item.endAt,
    }));

    const roleScopes = scopes.map(item => ({
      capabilityId: item.capabilityId,
      scopeType: item.scopeType,
      scopeValue: item.scopeValue,
      effect: item.effect,
      source: 'role',
    }));

    const userScopes = overrides.map(item => ({
      capabilityId: item.capabilityId,
      scopeType: item.scopeType,
      scopeValue: item.scopeValue,
      effect: item.effect,
      source: 'user',
      startAt: item.startAt,
      endAt: item.endAt,
    }));

    return {
      user,
      roles,
      capabilities: capabilityRecords,
      scopes: [...roleScopes, ...userScopes, ...delegatedScopes],
      delegations,
    };
  }

  private async resolveVisibleViews(capabilities: any[], resourceType?: string) {
    const viewCapabilities = capabilities.filter(item => item.kind === CapabilityKind.view);
    if (!viewCapabilities.length) return [];

    const bindings = await this.prisma.capabilityViewBinding.findMany({
      where: {
        capabilityId: { in: viewCapabilities.map(item => item.id) },
        ...(resourceType ? { resourceType } : {}),
      },
    });

    if (!bindings.length) {
      return viewCapabilities.map(item => item.code);
    }

    const capabilityCodeMap = new Map(viewCapabilities.map(item => [item.id, item.code]));
    return bindings.map(item => ({
      capabilityId: item.capabilityId,
      capabilityCode: capabilityCodeMap.get(item.capabilityId) ?? null,
      resourceType: item.resourceType,
      viewKey: item.viewKey,
    }));
  }

  private evaluateScope(bundle: any, capabilityId: string, resource: Record<string, any>, context: Record<string, any>) {
    const scopes = bundle.scopes.filter((item: any) => item.capabilityId === capabilityId);
    if (!scopes.length) {
      return true;
    }

    if (scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.all)) {
      return true;
    }

    const ownerUserId = resource.ownerUserId ?? resource.userId ?? context.ownerUserId;
    if (
      ownerUserId &&
      scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.self) &&
      ownerUserId === bundle.user.id
    ) {
      return true;
    }

    const regionId = resource.regionId ?? context.regionId;
    if (
      regionId &&
      scopes.some(
        (item: any) =>
          item.effect === PolicyEffect.allow &&
          item.scopeType === ScopeType.region &&
          item.scopeValue === regionId,
      )
    ) {
      return true;
    }

    const departmentId = resource.departmentId ?? context.departmentId;
    if (
      departmentId &&
      scopes.some(
        (item: any) =>
          item.effect === PolicyEffect.allow &&
          item.scopeType === ScopeType.department &&
          item.scopeValue === departmentId,
      )
    ) {
      return true;
    }

    const customScopeKey = context.scopeValue ?? resource.scopeValue;
    if (
      customScopeKey &&
      scopes.some(
        (item: any) =>
          item.effect === PolicyEffect.allow &&
          item.scopeType === ScopeType.custom &&
          item.scopeValue === customScopeKey,
      )
    ) {
      return true;
    }

    return false;
  }

  private async ensureUsersShareTenant(tenantId: string | null, userIds: string[]) {
    if (!tenantId || !userIds.length) return;
    const records = await this.prisma.sysUser.findMany({ where: { id: { in: [...new Set(userIds)] } } });
    if (records.some(item => item.tenantId !== tenantId)) {
      throw new ForbiddenException('Delegation users must belong to the same tenant');
    }
  }

  private groupByMany<T, K extends string | number>(
    items: T[],
    keySelector: (item: T) => K,
    valueSelector: (item: T) => string,
  ) {
    const map = new Map<K, string[]>();
    items.forEach(item => {
      const key = keySelector(item);
      const values = map.get(key) ?? [];
      values.push(valueSelector(item));
      map.set(key, values);
    });
    return map;
  }

  private async writeAuditLog(
    actor: IAuthentication,
    action: string,
    resourceType: string,
    resourceId: string | null,
    detail: Prisma.InputJsonValue,
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
        detail,
      },
    });
  }
}
