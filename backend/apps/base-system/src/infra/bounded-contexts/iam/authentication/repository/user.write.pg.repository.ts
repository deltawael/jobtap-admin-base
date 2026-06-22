import { Injectable } from '@nestjs/common';

import { User } from '@app/base-system/lib/bounded-contexts/iam/authentication/domain/user';
import { UserWriteRepoPort } from '@app/base-system/lib/bounded-contexts/iam/authentication/ports/user.write.repo-port';

import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class UserWriteRepository implements UserWriteRepoPort {
  constructor(private prisma: PrismaService) {}

  private buildUserRoleData(userId: string, roleIds: string[]) {
    return [...new Set(roleIds)].map(roleId => ({ userId, roleId }));
  }

  async deleteUserRoleByRoleId(roleId: string): Promise<void> {
    await this.prisma.sysUserRole.deleteMany({ where: { roleId } });
  }

  async deleteUserRoleByDomain(domain: string): Promise<void> {
    await this.prisma.$transaction(async prisma => {
      const users = await prisma.sysUser.findMany({ where: { domain }, select: { id: true } });
      const userIds = users.map(user => user.id);
      if (userIds.length === 0) return;
      await prisma.sysUser.deleteMany({ where: { id: { in: userIds } } });
      await prisma.sysUserRole.deleteMany({ where: { userId: { in: userIds } } });
    });
  }

  async deleteUserRoleByUserId(userId: string): Promise<void> {
    await this.prisma.sysUserRole.deleteMany({ where: { userId } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.sysUser.delete({ where: { id } });
  }

  async save(user: User, roleIds: string[]): Promise<void> {
    const userRoleData = this.buildUserRoleData(user.id, roleIds);
    await this.prisma.$transaction(async prisma => {
      await prisma.sysUser.create({
        data: {
          id: user.id,
          username: user.username,
          password: user.password.getValue(),
          domain: user.domain,
          nickName: user.nickName,
          status: user.status,
          avatar: user.avatar,
          email: user.email,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          createdBy: user.createdBy
        }
      });
      if (userRoleData.length > 0) {
        await prisma.sysUserRole.createMany({ data: userRoleData, skipDuplicates: true });
      }
    });
  }

  async update(user: User, roleIds: string[]): Promise<void> {
    const userRoleData = this.buildUserRoleData(user.id, roleIds);
    await this.prisma.$transaction(async prisma => {
      await prisma.sysUser.update({
        where: { id: user.id },
        data: {
          username: user.username,
          nickName: user.nickName,
          status: user.status,
          avatar: user.avatar,
          email: user.email,
          phoneNumber: user.phoneNumber,
          updatedAt: user.createdAt,
          updatedBy: user.createdBy
        }
      });
      await prisma.sysUserRole.deleteMany({ where: { userId: user.id } });
      if (userRoleData.length > 0) {
        await prisma.sysUserRole.createMany({ data: userRoleData, skipDuplicates: true });
      }
    });
  }
}