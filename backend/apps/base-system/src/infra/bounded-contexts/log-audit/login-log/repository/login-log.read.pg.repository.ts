import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { LoginLogProperties } from '@app/base-system/lib/bounded-contexts/log-audit/login-log/domain/login-log.read.model';
import { LoginLogReadRepoPort } from '@app/base-system/lib/bounded-contexts/log-audit/login-log/ports/login-log.read.repo-port';
import { PageLoginLogsQuery } from '@app/base-system/lib/bounded-contexts/log-audit/login-log/queries/page-login-logs.query';

import { BUILT_IN } from '@lib/shared/prisma/db.constant';
import { PaginationResult } from '@lib/shared/prisma/pagination';
import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class LoginLogReadRepository implements LoginLogReadRepoPort {
  constructor(private prisma: PrismaService) {}

  async pageLoginLogs(
    query: PageLoginLogsQuery,
  ): Promise<PaginationResult<LoginLogProperties>> {
    const where: Prisma.SysLoginLogWhereInput = {};

    if (query.username) {
      where.username = {
        contains: query.username,
      };
    }

    if (query.tenantId) {
      where.domain = query.tenantId;
    }

    if (query.address) {
      where.address = {
        contains: query.address,
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    const loginLogs = await this.prisma.sysLoginLog.findMany({
      where,
      skip: (query.current - 1) * query.size,
      take: query.size,
      orderBy: [
        {
          loginTime: 'desc',
        },
      ],
    });

    const total = await this.prisma.sysLoginLog.count({ where });

    const rows = loginLogs.map(({ domain, ...log }) => ({
      ...log,
      tenantId: domain === BUILT_IN ? null : domain,
    }));

    return new PaginationResult<LoginLogProperties>(
      query.current,
      query.size,
      total,
      rows,
    );
  }
}
