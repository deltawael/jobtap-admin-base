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
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActorType, Prisma, Status } from '@prisma/client';

import { Password } from '@app/base-system/lib/bounded-contexts/iam/authentication/domain/password.value-object';

import { ApiRes } from '@lib/infra/rest/res.response';
import { PrismaService } from '@lib/shared/prisma/prisma.service';
import { IAuthentication } from '@lib/typings/global';

import { PageUsersDto } from '../dto/page-users.dto';
import {
  ChangeOwnPasswordDto,
  ChangeUserPasswordDto,
  UpdateSelfProfileDto,
} from '../dto/user-profile.dto';
import { UserCreateDto, UserUpdateDto } from '../dto/user.dto';

@ApiTags('User - Module')
@Controller('user')
export class UserController {
  private static readonly USER_PASSWORD_MANAGE_CAPABILITY = 'tenant.user.password.manage';

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve Paginated Users' })
  async page(@Request() req: any, @Query() queryDto: PageUsersDto): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    const paging = this.parsePage(queryDto.current, queryDto.size);
    const where: Prisma.SysUserWhereInput = {};
    const tenantWhere = this.resolveUserTenantWhere(actor, queryDto.tenantScope, queryDto.tenantId);
    if (tenantWhere !== undefined) where.tenantId = tenantWhere;
    if (queryDto.username) where.username = { contains: queryDto.username };
    if (queryDto.nickName) where.nickName = { contains: queryDto.nickName };
    if ((queryDto as any).phoneNumber) where.phoneNumber = { contains: (queryDto as any).phoneNumber };
    if ((queryDto as any).email) where.email = { contains: (queryDto as any).email };
    if (queryDto.status) where.status = queryDto.status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.sysUser.findMany({
        where,
        skip: (paging.current - 1) * paging.size,
        take: paging.size,
        orderBy: [{ built_in: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.sysUser.count({ where }),
    ]);

    const userIds = records.map(item => item.id);
    const tenantIds = [...new Set(records.map(item => item.tenantId).filter(Boolean))] as string[];
    const [mappings, tenants] = await Promise.all([
      userIds.length ? this.prisma.sysUserRole.findMany({ where: { userId: { in: userIds } } }) : Promise.resolve([]),
      tenantIds.length ? this.prisma.tenant.findMany({ where: { id: { in: tenantIds } } }) : Promise.resolve([])
    ]);
    const roleMap = this.groupByMany(mappings, item => item.userId, item => item.roleId);
    const tenantMap = new Map(tenants.map(item => [item.id, item.name] as const));

    return ApiRes.success({
      records: records.map(item => ({
        ...item,
        roleIds: roleMap.get(item.id) ?? [],
        tenantName: item.tenantId ? tenantMap.get(item.tenantId) ?? null : null
      })),
      total,
      current: paging.current,
      size: paging.size,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a New User' })
  async createUser(@Body() dto: UserCreateDto, @Request() req: any): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    const tenantId = this.resolveRequestedTenantScope(actor, dto.tenantId);
    const roles = await this.ensureRolesScoped(tenantId, dto.roleIds);
    const actorType = await this.resolveActorTypeByRoles(roles);
    const hashedPassword = await Password.hash(dto.password);

    const created = await this.prisma.sysUser.create({
      data: {
        id: randomUUID(),
        username: dto.username,
        password: hashedPassword.getValue(),
        tenantId,
        actorType,
        built_in: false,
        avatar: dto.avatar,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        nickName: dto.nickName,
        status: dto.status,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.syncUserRoles(created.id, dto.roleIds);
    return ApiRes.ok();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    return ApiRes.success(await this.buildSelfProfile(actor.userId));
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Body() dto: UpdateSelfProfileDto, @Request() req: any): Promise<ApiRes<any>> {
    const actor = req.user as IAuthentication;
    await this.requireUserById(actor.userId);

    await this.prisma.sysUser.update({
      where: { id: actor.userId },
      data: {
        avatar: this.normalizeOptionalText(dto.avatar),
        nickName: dto.nickName,
        phoneNumber: this.normalizeOptionalText(dto.phoneNumber),
        email: this.normalizeOptionalText(dto.email),
        updatedBy: actor.userId,
      },
    });

    return ApiRes.success(await this.buildSelfProfile(actor.userId));
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changeOwnPassword(@Body() dto: ChangeOwnPasswordDto, @Request() req: any): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    const existing = await this.requireUserById(actor.userId);

    const passwordMatched = await this.comparePassword(existing.password, dto.oldPassword);
    if (!passwordMatched) {
      throw new BadRequestException('Old password is incorrect');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password cannot be the same as old password');
    }

    const hashedPassword = await Password.hash(dto.newPassword);
    await this.prisma.sysUser.update({
      where: { id: actor.userId },
      data: {
        password: hashedPassword.getValue(),
        updatedBy: actor.userId,
      },
    });

    return ApiRes.ok();
  }

  @Put()
  @ApiOperation({ summary: 'Update a User' })
  async updateUser(@Body() dto: UserUpdateDto, @Request() req: any): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.sysUser.findUnique({ where: { id: dto.id } });
    if (!existing) throw new NotFoundException('User not found');

    this.assertTenantAccess(actor, existing.tenantId);
    if (existing.built_in && actor.actorType !== 'system_admin') {
      throw new ForbiddenException('Built-in users cannot be updated by tenant actors');
    }

    const tenantId = dto.tenantId === undefined ? existing.tenantId : this.resolveRequestedTenantScope(actor, dto.tenantId);
    if (tenantId !== existing.tenantId) {
      throw new BadRequestException('User tenant cannot be changed');
    }

    const roles = await this.ensureRolesScoped(existing.tenantId, dto.roleIds);
    const actorType = await this.resolveActorTypeByRoles(roles);

    await this.prisma.sysUser.update({
      where: { id: dto.id },
      data: {
        username: dto.username,
        actorType,
        avatar: dto.avatar,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        nickName: dto.nickName,
        status: dto.status,
        updatedBy: actor.userId,
      },
    });
    await this.syncUserRoles(dto.id, dto.roleIds);
    return ApiRes.ok();
  }

  @Put(':id/change-password')
  @ApiOperation({ summary: 'Change user password by administrator' })
  async changeUserPassword(
    @Param('id') id: string,
    @Body() dto: ChangeUserPasswordDto,
    @Request() req: any,
  ): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    await this.ensureActorHasCapability(actor.userId, UserController.USER_PASSWORD_MANAGE_CAPABILITY);

    const existing = await this.requireUserById(id);
    this.assertTenantAccess(actor, existing.tenantId);
    if (existing.built_in && actor.actorType !== 'system_admin') {
      throw new ForbiddenException('Built-in users cannot be updated by tenant actors');
    }

    const hashedPassword = await Password.hash(dto.newPassword);
    await this.prisma.sysUser.update({
      where: { id },
      data: {
        password: hashedPassword.getValue(),
        updatedBy: actor.userId,
      },
    });

    return ApiRes.ok();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a User' })
  async deleteUser(@Request() req: any, @Param('id') id: string): Promise<ApiRes<null>> {
    const actor = req.user as IAuthentication;
    const existing = await this.prisma.sysUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.built_in) throw new BadRequestException('Built-in user cannot be deleted');

    this.assertTenantAccess(actor, existing.tenantId);

    await this.prisma.$transaction([
      this.prisma.sysUserRole.deleteMany({ where: { userId: id } }),
      this.prisma.userScopeOverride.deleteMany({ where: { userId: id } }),
      this.prisma.userStaffBinding.deleteMany({ where: { userId: id } }),
      this.prisma.delegation.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } }),
      this.prisma.sysUser.delete({ where: { id } }),
    ]);

    return ApiRes.ok();
  }

  private parsePage(current?: number, size?: number) {
    return {
      current: Math.max(Number(current) || 1, 1),
      size: Math.min(Math.max(Number(size) || 10, 1), 100),
    };
  }

  private resolveTenantScope(actor: IAuthentication) {
    if (actor.actorType === 'system_admin') return null;
    return actor.tenantId ?? null;
  }

  private normalizeOptionalText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private resolveRequestedTenantScope(actor: IAuthentication, requestedTenantId?: string | null) {
    if (actor.actorType === 'system_admin') return requestedTenantId ?? null;
    const tenantId = this.resolveTenantScope(actor);
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
    return tenantId;
  }

  private resolveUserTenantWhere(
    actor: IAuthentication,
    tenantScope?: 'all' | 'platform' | 'tenant',
    tenantId?: string | null
  ): Prisma.StringNullableFilter | string | null | undefined {
    if (actor.actorType !== 'system_admin') {
      return actor.tenantId ?? null;
    }
    if (tenantScope === 'platform') return null;
    if (tenantScope === 'tenant') {
      return tenantId ? tenantId : { not: null };
    }
    if (tenantId !== undefined && tenantId !== null) return tenantId;
    return undefined;
  }

  private assertTenantAccess(actor: IAuthentication, tenantId: string | null) {
    if (actor.actorType === 'system_admin') return;
    if (!tenantId || tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private async requireUserById(userId: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async comparePassword(hashedPassword: string, plainPassword: string) {
    try {
      return await Password.fromHashed(hashedPassword).compare(plainPassword);
    } catch {
      return false;
    }
  }

  private async buildSelfProfile(userId: string) {
    const user = await this.requireUserById(userId);
    const userRoleMappings = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoleMappings.map(item => item.roleId);
    const [tenant, roles] = await Promise.all([
      user.tenantId ? this.prisma.tenant.findUnique({ where: { id: user.tenantId } }) : Promise.resolve(null),
      roleIds.length
        ? this.prisma.sysRole.findMany({
            where: { id: { in: roleIds } },
            orderBy: [{ builtIn: 'desc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    return {
      userId: user.id,
      username: user.username,
      tenantId: user.tenantId,
      tenantName: user.tenantId ? tenant?.name ?? user.tenantId : '平台',
      actorType: user.actorType,
      roles: roles.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
      })),
      avatar: user.avatar,
      nickName: user.nickName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      status: user.status,
    };
  }

  private async ensureActorHasCapability(userId: string, capabilityCode: string) {
    const capabilityCodes = await this.resolveCapabilityCodes(userId);
    if (!capabilityCodes.has(capabilityCode)) {
      throw new ForbiddenException('Capability denied');
    }
  }

  private async resolveCapabilityCodes(userId: string) {
    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId } });
    const roleIds = userRoles.map(item => item.roleId);
    const roles = roleIds.length ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } }) : [];
    const templateIds = [...new Set(roles.map(item => item.templateId).filter(Boolean))] as string[];
    const now = new Date();
    const [roleCapabilities, templateCapabilities, overrides, delegations] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length
        ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
        : Promise.resolve([]),
      this.prisma.userScopeOverride.findMany({ where: { userId } }),
      this.prisma.delegation.findMany({
        where: {
          toUserId: userId,
          status: 'active',
          startAt: { lte: now },
          endAt: { gte: now },
        },
      }),
    ]);

    const capabilityIds = [
      ...new Set([
        ...roleCapabilities.map(item => item.capabilityId),
        ...templateCapabilities.map(item => item.capabilityId),
        ...overrides.map(item => item.capabilityId),
        ...delegations.map(item => item.capabilityId),
      ]),
    ];

    if (!capabilityIds.length) {
      return new Set<string>();
    }

    const capabilities = await this.prisma.capability.findMany({
      where: { id: { in: capabilityIds }, status: Status.ENABLED },
      select: { code: true },
    });

    return new Set(capabilities.map(item => item.code));
  }

  private async ensureRolesScoped(tenantId: string | null, roleIds: string[]) {
    if (!roleIds.length) return [];
    const roles = await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Role not found');
    }
    if (roles.some(item => item.tenantId !== tenantId)) {
      throw new ForbiddenException('Role does not belong to the current tenant');
    }

    return roles;
  }

  private async resolveActorTypeByRoles(roles: Array<{ templateId: string | null }>): Promise<ActorType> {
    const templateIds = [...new Set(roles.map(item => item.templateId).filter(Boolean))] as string[];
    if (!templateIds.length) return ActorType.tenant_user;
    const templates = await this.prisma.roleTemplate.findMany({ where: { id: { in: templateIds } } });
    const actorTypes = new Set(templates.map(item => item.actorType));
    if (actorTypes.has(ActorType.system_admin)) return ActorType.system_admin;
    if (actorTypes.has(ActorType.tenant_admin)) return ActorType.tenant_admin;
    return ActorType.tenant_user;
  }

  private async syncUserRoles(userId: string, roleIds: string[]) {
    await this.prisma.sysUserRole.deleteMany({ where: { userId } });
    if (!roleIds.length) return;

    await this.prisma.sysUserRole.createMany({
      data: roleIds.map(roleId => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  private groupByMany<T, K extends string>(items: T[], keySelector: (item: T) => K, valueSelector: (item: T) => string) {
    const map = new Map<K, string[]>();
    items.forEach(item => {
      const key = keySelector(item);
      const list = map.get(key) ?? [];
      list.push(valueSelector(item));
      map.set(key, list);
    });
    return map;
  }
}
