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

import { ApiRes } from '@lib/infra/rest/res.response';
import { PrismaService } from '@lib/shared/prisma/prisma.service';
import { IAuthentication } from '@lib/typings/global';

import { PageUsersDto } from '../dto/page-users.dto';
import { UserCreateDto, UserUpdateDto } from '../dto/user.dto';

@ApiTags('User - Module')
@Controller('user')
export class UserController {
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

    const created = await this.prisma.sysUser.create({
      data: {
        id: randomUUID(),
        username: dto.username,
        password: dto.password,
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
