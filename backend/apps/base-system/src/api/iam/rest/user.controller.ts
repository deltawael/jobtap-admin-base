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
import { Prisma, Status } from '@prisma/client';
import { randomUUID } from 'crypto';

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
    const tenantId = this.resolveTenantScope(actor);

    const where: Prisma.SysUserWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
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
    const mappings = userIds.length
      ? await this.prisma.sysUserRole.findMany({ where: { userId: { in: userIds } } })
      : [];
    const roleMap = this.groupByMany(mappings, item => item.userId, item => item.roleId);

    return ApiRes.success({
      records: records.map(item => ({
        ...item,
        roleIds: roleMap.get(item.id) ?? [],
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
    const tenantId = this.requireTenantScope(actor);
    await this.ensureRolesScoped(tenantId, dto.roleIds);

    const created = await this.prisma.sysUser.create({
      data: {
        id: randomUUID(),
        username: dto.username,
        password: dto.password,
        tenantId,
        actorType: 'tenant_user',
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

    await this.ensureRolesScoped(existing.tenantId, dto.roleIds);

    await this.prisma.sysUser.update({
      where: { id: dto.id },
      data: {
        username: dto.username,
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

  private requireTenantScope(actor: IAuthentication) {
    const tenantId = this.resolveTenantScope(actor);
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }
    return tenantId;
  }

  private assertTenantAccess(actor: IAuthentication, tenantId: string | null) {
    if (actor.actorType === 'system_admin') return;
    if (!tenantId || tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private async ensureRolesScoped(tenantId: string | null, roleIds: string[]) {
    if (!roleIds.length) return;
    const roles = await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Role not found');
    }
    if (roles.some(item => item.tenantId !== tenantId)) {
      throw new ForbiddenException('Role does not belong to the current tenant');
    }
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