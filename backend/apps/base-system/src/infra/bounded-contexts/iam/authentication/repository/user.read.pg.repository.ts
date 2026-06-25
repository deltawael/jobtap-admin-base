import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UserProperties } from '@app/base-system/lib/bounded-contexts/iam/authentication/domain/user.read.model';
import { UserReadRepoPort } from '@app/base-system/lib/bounded-contexts/iam/authentication/ports/user.read.repo-port';
import { PageUsersQuery } from '@app/base-system/lib/bounded-contexts/iam/authentication/queries/page-users.query';

import { PaginationResult } from '@lib/shared/prisma/pagination';
import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class UserReadRepository implements UserReadRepoPort {
  constructor(private prisma: PrismaService) {}

  private readonly USER_ESSENTIAL_FIELDS = {
    id: true,
    username: true,
    tenantId: true,
    actorType: true,
    avatar: true,
    email: true,
    phoneNumber: true,
    nickName: true,
    status: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    password: false,
  };

  private async attachRoleIds<T extends { id: string }>(users: T[]): Promise<Array<T & { roleIds: string[] }>> {
    if (users.length === 0) return [];
    const userRoles = await this.prisma.sysUserRole.findMany({
      where: { userId: { in: users.map(user => user.id) } },
      select: { userId: true, roleId: true }
    });
    const roleMap = new Map<string, string[]>();
    userRoles.forEach(item => {
      const ids = roleMap.get(item.userId) ?? [];
      ids.push(item.roleId);
      roleMap.set(item.userId, ids);
    });
    return users.map(user => ({ ...user, roleIds: roleMap.get(user.id) ?? [] }));
  }

  private async attachRoleIdsToUser<T extends { id: string }>(user: T | null): Promise<(T & { roleIds: string[] }) | null> {
    if (!user) return null;
    const [result] = await this.attachRoleIds([user]);
    return result;
  }

  async findUserById(id: string): Promise<UserProperties | null> {
    const user = await this.prisma.sysUser.findUnique({ where: { id } });
    return this.attachRoleIdsToUser(user) as Promise<UserProperties | null>;
  }

  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    return this.prisma.sysUserRole.findMany({ where: { roleId }, select: { userId: true } }).then(results => results.map(item => item.userId));
  }

  async findUsersByIds(ids: string[]): Promise<UserProperties[]> {
    const users = await this.prisma.sysUser.findMany({ where: { id: { in: ids } } });
    return this.attachRoleIds(users) as Promise<UserProperties[]>;
  }

  async findUserByIdentifier(identifier: string): Promise<UserProperties | null> {
    const user = await this.prisma.sysUser.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }, { phoneNumber: identifier }] } });
    return this.attachRoleIdsToUser(user) as Promise<UserProperties | null>;
  }

  async pageUsers(query: PageUsersQuery): Promise<PaginationResult<UserProperties>> {
    const where: Prisma.SysUserWhereInput = {};
    if (query.username) where.username = { contains: query.username };
    if (query.nickName) where.nickName = { contains: query.nickName };
    if (query.status) where.status = query.status;
    const users = await this.prisma.sysUser.findMany({ where, skip: (query.current - 1) * query.size, take: query.size, select: this.USER_ESSENTIAL_FIELDS });
    const total = await this.prisma.sysUser.count({ where });
    const usersWithRoleIds = await this.attachRoleIds(users);
    return new PaginationResult<UserProperties>(query.current, query.size, total, usersWithRoleIds as UserProperties[]);
  }

  async getUserByUsername(username: string): Promise<Readonly<UserProperties> | null> {
    const user = await this.prisma.sysUser.findUnique({ where: { username } });
    return this.attachRoleIdsToUser(user) as Promise<Readonly<UserProperties> | null>;
  }

  async findRolesByUserId(userId: string): Promise<Set<string>> {
    const userRoles = await this.prisma.sysUserRole.findMany({ where: { userId }, select: { roleId: true } });
    const roleIds = userRoles.map(userRole => userRole.roleId);
    const roles = await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } }, select: { code: true } });
    return new Set(roles.map(role => role.code));
  }
}