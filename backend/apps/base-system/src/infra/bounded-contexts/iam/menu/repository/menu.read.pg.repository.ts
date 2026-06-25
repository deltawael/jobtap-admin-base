import { Injectable } from '@nestjs/common';
import { Status } from '@prisma/client';

import {
  MenuProperties,
  MenuTreeProperties,
} from '@app/base-system/lib/bounded-contexts/iam/menu/domain/menu.read.model';
import { MenuReadRepoPort } from '@app/base-system/lib/bounded-contexts/iam/menu/ports/menu.read.repo-port';

import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class MenuReadPostgresRepository implements MenuReadRepoPort {
  constructor(private prisma: PrismaService) {}

  async getChildrenMenuCount(id: number): Promise<number> {
    return this.prisma.sysMenu.count({
      where: {
        pid: id,
      },
    });
  }

  async getMenuById(id: number): Promise<Readonly<MenuProperties> | null> {
    return this.prisma.sysMenu.findUnique({
      where: { id },
    });
  }

  async getConstantRoutes(): Promise<Readonly<MenuProperties[]> | []> {
    return this.prisma.sysMenu.findMany({
      where: {
        constant: true,
        status: Status.ENABLED,
      },
    });
  }

  async findAll(): Promise<MenuTreeProperties[] | []> {
    return this.prisma.sysMenu.findMany();
  }

  async findAllConstantMenu(
    constant: boolean,
  ): Promise<MenuTreeProperties[] | []> {
    return this.prisma.sysMenu.findMany({
      where: {
        constant,
      },
    });
  }

  async findMenusByIds(ids: number[]): Promise<MenuProperties[]> {
    return this.prisma.sysMenu.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}