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
  CapabilityBindingMode,
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

interface ScopePolicyInput {
  id?: string;
  capabilityId: string;
  scopeType: ScopeType;
  scopeValue?: string | null;
  effect?: PolicyEffect;
  description?: string | null;
}

interface RolePayload {
  code: string;
  name: string;
  description?: string | null;
  status?: Status;
  tenantId?: string | null;
  templateId?: string | null;
  capabilityIds?: string[];
  scopePolicies?: ScopePolicyInput[];
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
  capability?: string;
  api?: {
    resource: string;
    action: string;
    method?: string;
    path?: string;
  };
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
      return ApiRes.success(await this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } }));
    }
    const tenantId = await this.resolveActorTenantId(actor);
    if (!tenantId) return ApiRes.success([]);
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
    if (query.code) where.code = { contains: query.code };
    if (query.name) where.name = { contains: query.name };
    const templates = await this.prisma.roleTemplate.findMany({ where, orderBy: [{ builtIn: 'desc' }, { createdAt: 'asc' }] });
    const templateIds = templates.map(item => item.id);
    const mappings = templateIds.length ? await this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } }) : [];
    const capabilityMap = this.groupByMany(mappings, item => item.templateId, item => item.capabilityId);
    return ApiRes.success(templates.map(item => ({ ...item, capabilityIds: capabilityMap.get(item.id) ?? [], capabilityCount: (capabilityMap.get(item.id) ?? []).length })));
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
        updatedBy: actor.userId,
      },
    });
    await this.syncRoleTemplateCapabilities(created.id, body.capabilityIds ?? []);
    await this.writeAuditLog(actor, 'role-template.create', 'role-template', created.id, { ...created, capabilityIds: body.capabilityIds ?? [] });
    return ApiRes.success(await this.hydrateRoleTemplate(created));
  }

  @Put('role-templates/:id')
  async updateRoleTemplate(@Request() req: any, @Param('id') id: string, @Body() body: Partial<RoleTemplatePayload>): Promise<ApiRes<any>> {
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
        updatedBy: actor.userId,
      },
    });
    if (body.capabilityIds) await this.syncRoleTemplateCapabilities(id, body.capabilityIds);
    await this.writeAuditLog(actor, 'role-template.update', 'role-template', id, { before: existing, after: updated, capabilityIds: body.capabilityIds });
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
    return ApiRes.success(await this.prisma.capability.findMany({ where, orderBy: [{ builtIn: 'desc' }, { module: 'asc' }, { kind: 'asc' }, { code: 'asc' }] }));
  }

  @Post('capabilities')
  async createCapability(@Request() req: any, @Body() body: CapabilityPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    this.assertSystemAdmin(actor);
    const created = await this.prisma.capability.create({
      data: { id: randomUUID(), code: body.code, name: body.name, module: body.module, kind: body.kind, builtIn: false, description: body.description ?? null, status: body.status ?? Status.ENABLED, createdBy: actor.userId, updatedBy: actor.userId },
    });
    await this.writeAuditLog(actor, 'capability.create', 'capability', created.id, created);
    return ApiRes.success(created);
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
        updatedBy: actor.userId,
      },
    });
    await this.writeAuditLog(actor, 'capability.update', 'capability', id, { before: existing, after: updated });
    return ApiRes.success(updated);
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
      this.prisma.sysRole.findMany({ where, skip: (paging.current - 1) * paging.size, take: paging.size, orderBy: [{ builtIn: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.sysRole.count({ where }),
    ]);
    return ApiRes.success({ records: await this.hydrateRoles(records), total, current: paging.current, size: paging.size });
  }

  @Post('roles')
  async createRole(@Request() req: any, @Body() body: RolePayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
    const capabilityIds = await this.resolveRoleCapabilityIds(body.templateId ?? null, body.capabilityIds ?? []);
    const created = await this.prisma.sysRole.create({
      data: { id: randomUUID(), code: body.code, name: body.name, tenantId, templateId: body.templateId ?? null, builtIn: false, description: body.description ?? null, pid: '0', status: body.status ?? Status.ENABLED, createdBy: actor.userId, updatedBy: actor.userId },
    });
    await this.syncRoleCapabilities(created.id, capabilityIds);
    await this.syncRoleScopePolicies(actor, tenantId, created.id, body.scopePolicies ?? []);
    await this.writeAuditLog(actor, 'role.create', 'role', created.id, { ...created, capabilityIds, scopePolicies: body.scopePolicies ?? [] });
    return ApiRes.success(await this.hydrateRole(created));
  }

  @Put('roles/:id')
  async updateRole(@Request() req: any, @Param('id') id: string, @Body() body: Partial<RolePayload>): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    await this.assertRoleAccessible(actor, existing.tenantId);
    const tenantId = body.tenantId === undefined ? existing.tenantId : await this.resolveScopedTenantId(actor, body.tenantId);
    const capabilityIds = body.capabilityIds ? await this.resolveRoleCapabilityIds(body.templateId ?? existing.templateId, body.capabilityIds) : null;
    const updated = await this.prisma.sysRole.update({
      where: { id },
      data: {
        code: existing.builtIn ? existing.code : body.code ?? existing.code,
        name: body.name ?? existing.name,
        tenantId,
        templateId: body.templateId === undefined ? existing.templateId : body.templateId,
        description: body.description === undefined ? existing.description : body.description,
        status: body.status ?? existing.status,
        updatedBy: actor.userId,
      },
    });
    if (capabilityIds) await this.syncRoleCapabilities(id, capabilityIds);
    if (body.scopePolicies) await this.syncRoleScopePolicies(actor, tenantId, id, body.scopePolicies);
    await this.writeAuditLog(actor, 'role.update', 'role', id, { before: existing, after: updated, capabilityIds, scopePolicies: body.scopePolicies });
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
    return ApiRes.success(await this.buildAuthProfile(req.user as IAuthentication, userId));
  }

  @Put('users/:id/auth-profile')
  async updateUserAuthProfile(@Request() req: any, @Param('id') userId: string, @Body() body: AuthProfilePayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);
    if (body.roleIds) {
      await this.ensureRoleIdsTenant(user.tenantId, body.roleIds);
      await this.syncUserRoles(userId, body.roleIds);
    }
    if (body.scopeOverrides) await this.replaceUserScopeOverrides(actor, userId, body.scopeOverrides);
    if (body.linkedStaffId !== undefined) await this.upsertStaffBinding(actor, userId, user.tenantId, body.linkedStaffId);
    if (body.delegations) await this.replaceDelegationsForUser(actor, user, body.delegations);
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
    return ApiRes.success(await this.prisma.delegation.findMany({ where, orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }] }));
  }

  @Post('delegations')
  async createDelegation(@Request() req: any, @Body() body: DelegationInput): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const tenantId = await this.resolveScopedTenantId(actor, body.tenantId);
    await this.ensureUsersShareTenant(tenantId, [body.fromUserId, body.toUserId]);
    const created = await this.prisma.delegation.create({
      data: { id: randomUUID(), tenantId: tenantId ?? '', fromUserId: body.fromUserId, toUserId: body.toUserId, capabilityId: body.capabilityId, scopeType: body.scopeType, scopeValue: body.scopeValue ?? null, status: body.status ?? DelegationStatus.active, startAt: new Date(body.startAt), endAt: new Date(body.endAt), createdBy: actor.userId, updatedBy: actor.userId },
    });
    await this.writeAuditLog(actor, 'delegation.create', 'delegation', created.id, created);
    return ApiRes.success(created);
  }

  @Put('delegations/:id')
  async updateDelegation(@Request() req: any, @Param('id') id: string, @Body() body: Partial<DelegationInput>): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.delegation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Delegation not found');
    await this.assertRoleAccessible(actor, existing.tenantId);
    const updated = await this.prisma.delegation.update({ where: { id }, data: { capabilityId: body.capabilityId ?? existing.capabilityId, scopeType: body.scopeType ?? existing.scopeType, scopeValue: body.scopeValue === undefined ? existing.scopeValue : body.scopeValue, status: body.status ?? existing.status, startAt: body.startAt ? new Date(body.startAt) : existing.startAt, endAt: body.endAt ? new Date(body.endAt) : existing.endAt, updatedBy: actor.userId } });
    await this.writeAuditLog(actor, 'delegation.update', 'delegation', id, { before: existing, after: updated });
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
      this.prisma.auditLog.findMany({ where, skip: (paging.current - 1) * paging.size, take: paging.size, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return ApiRes.success({ records, total, current: paging.current, size: paging.size });
  }

  @Post('authz/can')
  async can(@Request() req: any, @Body() body: CanPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const subjectUserId = body.userId ?? actor.userId;
    const bundle = await this.resolveAuthorizationBundle(actor, subjectUserId);
    if (body.capability) return ApiRes.success(await this.evaluateCapabilityDecision(bundle, body.capability, body.resource ?? {}, body.context ?? {}));
    if (body.api) return ApiRes.success(await this.evaluateApiDecision(bundle, body.api, body.resource ?? {}, body.context ?? {}));
    throw new BadRequestException('capability or api is required');
  }

  @Post('authz/visible-views')
  async visibleViews(@Request() req: any, @Body() body: VisibleViewsPayload): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const subjectUserId = body.userId ?? actor.userId;
    const bundle = await this.resolveAuthorizationBundle(actor, subjectUserId);
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, body.resourceType);
    return ApiRes.success({ visibleViews, resolvedCapabilities: bundle.capabilities.map((item: any) => item.code), decisionReason: 'resolved' });
  }

  private parsePage(query: PageQuery) {
    return { current: Math.max(Number(query.current) || 1, 1), size: Math.min(Math.max(Number(query.size) || 10, 1), 100) };
  }

  private isSystemAdmin(actor: IAuthentication) {
    return actor.actorType === 'system_admin' || actor.domain === 'built-in';
  }

  private assertSystemAdmin(actor: IAuthentication) {
    if (!this.isSystemAdmin(actor)) throw new ForbiddenException('System admin only');
  }

  private async resolveActorTenantId(actor: IAuthentication): Promise<string | null> {
    if (actor.tenantId) return actor.tenantId;
    if (!actor.domain || actor.domain === 'built-in') return null;
    const tenant = await this.prisma.tenant.findUnique({ where: { code: actor.domain } });
    return tenant?.id ?? null;
  }

  private async resolveScopedTenantId(actor: IAuthentication, requestedTenantId?: string | null) {
    if (this.isSystemAdmin(actor)) return requestedTenantId ?? null;
    const actorTenantId = await this.resolveActorTenantId(actor);
    if (!actorTenantId) throw new ForbiddenException('Tenant context required');
    if (requestedTenantId && requestedTenantId !== actorTenantId) throw new ForbiddenException('Cross-tenant access denied');
    return actorTenantId;
  }

  private async assertRoleAccessible(actor: IAuthentication, tenantId?: string | null) {
    const scopedTenantId = await this.resolveScopedTenantId(actor, tenantId ?? null);
    if (tenantId && scopedTenantId && tenantId !== scopedTenantId) throw new ForbiddenException('Cross-tenant access denied');
  }

  private async hydrateRoleTemplates(records: any[]) {
    const templateIds = records.map(item => item.id);
    const mappings = templateIds.length ? await this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } }) : [];
    const capabilityMap = this.groupByMany(mappings, item => item.templateId, item => item.capabilityId);
    return records.map(item => ({ ...item, capabilityIds: capabilityMap.get(item.id) ?? [], capabilityCount: (capabilityMap.get(item.id) ?? []).length }));
  }

  private async hydrateRoleTemplate(record: any) {
    const [result] = await this.hydrateRoleTemplates([record]);
    return result;
  }

  private async hydrateRoles(records: any[]) {
    const roleIds = records.map(item => item.id);
    const tenantIds = [...new Set(records.map(item => item.tenantId).filter(Boolean))] as string[];
    const templateIds = [...new Set(records.map(item => item.templateId).filter(Boolean))] as string[];
    const [roleCapabilities, roleScopes, templates, tenants] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      roleIds.length ? this.prisma.scopePolicy.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length ? this.prisma.roleTemplate.findMany({ where: { id: { in: templateIds } } }) : Promise.resolve([]),
      tenantIds.length ? this.prisma.tenant.findMany({ where: { id: { in: tenantIds } } }) : Promise.resolve([]),
    ]);
    const capabilityMap = this.groupByMany(roleCapabilities, item => item.roleId, item => item.capabilityId);
    const scopeMap = this.groupByManyObjects(roleScopes, item => item.roleId ?? '');
    const templateMap = new Map(templates.map(item => [item.id, item]));
    const tenantMap = new Map(tenants.map(item => [item.id, item]));
    return records.map(item => ({
      ...item,
      capabilityIds: capabilityMap.get(item.id) ?? [],
      capabilityCount: (capabilityMap.get(item.id) ?? []).length,
      scopePolicies: scopeMap.get(item.id) ?? [],
      scopePolicyCount: (scopeMap.get(item.id) ?? []).length,
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

  private async syncRoleTemplateCapabilities(templateId: string, capabilityIds: string[]) {
    await this.prisma.roleTemplateCapability.deleteMany({ where: { templateId } });
    if (!capabilityIds.length) return;
    await this.prisma.roleTemplateCapability.createMany({ data: capabilityIds.map(capabilityId => ({ templateId, capabilityId })), skipDuplicates: true });
  }

  private async syncRoleCapabilities(roleId: string, capabilityIds: string[]) {
    await this.prisma.roleCapability.deleteMany({ where: { roleId } });
    if (!capabilityIds.length) return;
    await this.prisma.roleCapability.createMany({ data: capabilityIds.map(capabilityId => ({ roleId, capabilityId })), skipDuplicates: true });
  }

  private async syncRoleScopePolicies(actor: IAuthentication, tenantId: string | null, roleId: string, policies: ScopePolicyInput[]) {
    await this.prisma.scopePolicy.deleteMany({ where: { roleId } });
    if (!policies.length) return;
    await this.prisma.scopePolicy.createMany({
      data: policies.map(item => ({ id: item.id ?? randomUUID(), tenantId, roleId, capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue ?? null, effect: item.effect ?? PolicyEffect.allow, description: item.description ?? null, createdBy: actor.userId, updatedBy: actor.userId })),
      skipDuplicates: true,
    });
  }

  private async ensureRoleIdsTenant(tenantId: string | null, roleIds: string[]) {
    if (!roleIds.length) return;
    const roles = await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) throw new BadRequestException('Role not found');
    if (roles.some(item => item.tenantId !== tenantId)) throw new ForbiddenException('Role does not belong to the current tenant');
  }

  private async syncUserRoles(userId: string, roleIds: string[]) {
    await this.prisma.sysUserRole.deleteMany({ where: { userId } });
    if (!roleIds.length) return;
    await this.prisma.sysUserRole.createMany({ data: roleIds.map(roleId => ({ userId, roleId })), skipDuplicates: true });
  }

  private async replaceUserScopeOverrides(actor: IAuthentication, userId: string, overrides: ScopeOverrideInput[]) {
    await this.prisma.userScopeOverride.deleteMany({ where: { userId } });
    if (!overrides.length) return;
    await this.prisma.userScopeOverride.createMany({
      data: overrides.map(item => ({ id: item.id ?? randomUUID(), userId, capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue ?? null, effect: item.effect ?? PolicyEffect.allow, startAt: item.startAt ? new Date(item.startAt) : null, endAt: item.endAt ? new Date(item.endAt) : null, createdBy: actor.userId, updatedBy: actor.userId })),
      skipDuplicates: true,
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
      await this.prisma.userStaffBinding.update({ where: { userId }, data: { staffId: linkedStaffId, updatedBy: actor.userId } });
      return;
    }
    await this.prisma.userStaffBinding.create({ data: { id: randomUUID(), tenantId, userId, staffId: linkedStaffId, createdBy: actor.userId, updatedBy: actor.userId } });
  }

  private async replaceDelegationsForUser(actor: IAuthentication, user: any, delegations: DelegationInput[]) {
    await this.prisma.delegation.deleteMany({ where: { toUserId: user.id } });
    if (!delegations.length || !user.tenantId) return;
    await this.ensureUsersShareTenant(user.tenantId, delegations.flatMap(item => [item.fromUserId, item.toUserId]));
    await this.prisma.delegation.createMany({
      data: delegations.map(item => ({ id: item.id ?? randomUUID(), tenantId: user.tenantId, fromUserId: item.fromUserId, toUserId: item.toUserId, capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue ?? null, status: item.status ?? DelegationStatus.active, startAt: new Date(item.startAt), endAt: new Date(item.endAt), createdBy: actor.userId, updatedBy: actor.userId })),
      skipDuplicates: true,
    });
  }

  private async buildAuthProfile(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);
    const bundle = await this.resolveAuthorizationBundle(actor, userId);
    const linkedStaff = await this.prisma.userStaffBinding.findUnique({ where: { userId } });
    return { userId, tenantId: user.tenantId, roleIds: bundle.roles.map((item: any) => item.id), roles: bundle.roles, capabilities: bundle.capabilities, scopes: bundle.scopes, scopeOverrides: bundle.scopes.filter((item: any) => item.source === 'user'), delegations: bundle.delegations, linkedStaffId: linkedStaff?.staffId ?? null };
  }

  private async resolveAuthorizationBundle(actor: IAuthentication, userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleAccessible(actor, user.tenantId);
    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoles.map(item => item.roleId);
    const roles = roleIds.length ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } }) : [];
    const templateIds = roles.map(item => item.templateId).filter(Boolean) as string[];
    const [roleCapabilities, templateCapabilities, roleScopes, overrides, delegations] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } }) : Promise.resolve([]),
      roleIds.length ? this.prisma.scopePolicy.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      this.prisma.userScopeOverride.findMany({ where: { userId } }),
      this.prisma.delegation.findMany({ where: { toUserId: userId, status: DelegationStatus.active, startAt: { lte: new Date() }, endAt: { gte: new Date() } } }),
    ]);
    const capabilityIds = [...new Set([...roleCapabilities.map(item => item.capabilityId), ...templateCapabilities.map(item => item.capabilityId), ...delegations.map(item => item.capabilityId), ...overrides.map(item => item.capabilityId)])];
    const capabilityRecords = capabilityIds.length ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } } }) : [];
    const delegatedScopes = delegations.map(item => ({ capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue, effect: PolicyEffect.allow, source: 'delegation', fromUserId: item.fromUserId, startAt: item.startAt, endAt: item.endAt }));
    const roleScopeItems = roleScopes.map(item => ({ capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue, effect: item.effect, source: 'role', description: item.description }));
    const userScopes = overrides.map(item => ({ capabilityId: item.capabilityId, scopeType: item.scopeType, scopeValue: item.scopeValue, effect: item.effect, source: 'user', startAt: item.startAt, endAt: item.endAt }));
    return { user, roles, capabilities: capabilityRecords, scopes: [...roleScopeItems, ...userScopes, ...delegatedScopes], delegations };
  }

  private async evaluateCapabilityDecision(bundle: any, capabilityCode: string, resource: Record<string, any>, context: Record<string, any>) {
    const matchedCapability = bundle.capabilities.find((item: any) => item.code === capabilityCode);
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, context?.resourceType);
    if (!matchedCapability) return { allowed: false, resolvedCapabilities: bundle.capabilities.map((item: any) => item.code), resolvedScope: [], visibleViews, decisionReason: 'capability_not_granted' };
    const allowed = this.evaluateScope(bundle, matchedCapability.id, resource, context);
    return { allowed, resolvedCapabilities: bundle.capabilities.map((item: any) => item.code), resolvedScope: bundle.scopes.filter((item: any) => item.capabilityId === matchedCapability.id), visibleViews, decisionReason: allowed ? 'allowed' : 'scope_or_relation_denied' };
  }

  private async evaluateApiDecision(bundle: any, api: { resource: string; action: string; method?: string; path?: string }, resource: Record<string, any>, context: Record<string, any>) {
    const bindings = await this.prisma.capabilityApiBinding.findMany({ where: { resource: api.resource, action: api.action, ...(api.method ? { OR: [{ method: api.method }, { method: null }] } : {}) }, orderBy: [{ bindingMode: 'asc' }, { createdAt: 'asc' }] });
    const visibleViews = await this.resolveVisibleViews(bundle.capabilities, context?.resourceType);
    if (!bindings.length) return { allowed: false, resolvedCapabilities: bundle.capabilities.map((item: any) => item.code), resolvedScope: [], visibleViews, decisionReason: 'binding_not_found' };
    const capabilityMap = new Map(bundle.capabilities.map((item: any) => [item.id, item]));
    const matchedBindings = bindings.map(binding => ({ ...binding, capability: capabilityMap.get(binding.capabilityId) ?? null }));
    const anyOfBindings = matchedBindings.filter(item => item.bindingMode === CapabilityBindingMode.ANY_OF);
    const allOfBindings = matchedBindings.filter(item => item.bindingMode === CapabilityBindingMode.ALL_OF);
    const anyOfAllowed = anyOfBindings.length ? anyOfBindings.some(item => item.capability && this.evaluateScope(bundle, item.capabilityId, resource, context)) : true;
    const allOfAllowed = allOfBindings.every(item => item.capability && this.evaluateScope(bundle, item.capabilityId, resource, context));
    const allowed = allOfAllowed && anyOfAllowed;
    return {
      allowed,
      resolvedCapabilities: bundle.capabilities.map((item: any) => item.code),
      resolvedScope: bundle.scopes.filter((item: any) => matchedBindings.some(binding => binding.capabilityId === item.capabilityId)),
      matchedBindings: matchedBindings.map(item => ({ capabilityId: item.capabilityId, capabilityCode: (item.capability as any)?.code ?? null, bindingMode: item.bindingMode, resource: item.resource, action: item.action, method: item.method, path: item.path })),
      visibleViews,
      decisionReason: allowed ? 'allowed' : 'binding_scope_denied',
    };
  }

  private async resolveVisibleViews(capabilities: any[], resourceType?: string) {
    const viewCapabilities = capabilities.filter(item => item.kind === CapabilityKind.view);
    if (!viewCapabilities.length) return [];
    const bindings = await this.prisma.capabilityViewBinding.findMany({ where: { capabilityId: { in: viewCapabilities.map(item => item.id) }, ...(resourceType ? { resourceType } : {}) } });
    if (!bindings.length) return viewCapabilities.map(item => item.code);
    const capabilityCodeMap = new Map(viewCapabilities.map(item => [item.id, item.code]));
    return bindings.map(item => ({ capabilityId: item.capabilityId, capabilityCode: capabilityCodeMap.get(item.capabilityId) ?? null, resourceType: item.resourceType, viewKey: item.viewKey }));
  }

  private evaluateScope(bundle: any, capabilityId: string, resource: Record<string, any>, context: Record<string, any>) {
    const scopes = bundle.scopes.filter((item: any) => item.capabilityId === capabilityId);
    if (!scopes.length) return true;
    if (scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.all)) return true;
    const ownerUserId = resource.ownerUserId ?? resource.userId ?? context.ownerUserId;
    if (ownerUserId && scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.self) && ownerUserId === bundle.user.id) return true;
    const regionId = resource.regionId ?? context.regionId;
    if (regionId && scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.region && item.scopeValue === regionId)) return true;
    const departmentId = resource.departmentId ?? context.departmentId;
    if (departmentId && scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.department && item.scopeValue === departmentId)) return true;
    const customScopeKey = context.scopeValue ?? resource.scopeValue;
    if (customScopeKey && scopes.some((item: any) => item.effect === PolicyEffect.allow && item.scopeType === ScopeType.custom && item.scopeValue === customScopeKey)) return true;
    return false;
  }

  private async ensureUsersShareTenant(tenantId: string | null, userIds: string[]) {
    if (!tenantId || !userIds.length) return;
    const records = await this.prisma.sysUser.findMany({ where: { id: { in: [...new Set(userIds)] } } });
    if (records.some(item => item.tenantId !== tenantId)) throw new ForbiddenException('Delegation users must belong to the same tenant');
  }

  private groupByMany<T, K extends string | number>(items: T[], keySelector: (item: T) => K, valueSelector: (item: T) => string) {
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

  private toAuditJson(detail: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(detail ?? null)) as Prisma.InputJsonValue;
  }

  private async writeAuditLog(actor: IAuthentication, action: string, resourceType: string, resourceId: string | null, detail: unknown) {
    await this.prisma.auditLog.create({ data: { tenantId: await this.resolveActorTenantId(actor), actorUserId: actor.userId, actorUsername: actor.username, actorType: actor.actorType, action, resourceType, resourceId, detail: this.toAuditJson(detail) } });
  }
}
