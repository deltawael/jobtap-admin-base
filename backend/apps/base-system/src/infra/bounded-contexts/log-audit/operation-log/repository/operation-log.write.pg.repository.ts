import { Injectable } from '@nestjs/common';

import { OperationLog } from '@app/base-system/lib/bounded-contexts/log-audit/operation-log/domain/operation-log.model';
import { OperationLogWriteRepoPort } from '@app/base-system/lib/bounded-contexts/log-audit/operation-log/ports/operation-log.write.repo-port';

import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class OperationLogWriteRepository implements OperationLogWriteRepoPort {
  constructor(private prisma: PrismaService) {}

  async save(operationLog: OperationLog): Promise<void> {
    await this.prisma.sysOperationLog.create({
      data: {
        userId: operationLog.userId,
        username: operationLog.username,
        tenantId: operationLog.tenantId,
        moduleName: operationLog.moduleName,
        description: operationLog.description,
        requestId: operationLog.requestId,
        method: operationLog.method,
        url: operationLog.url,
        ip: operationLog.ip,
        userAgent: operationLog.userAgent,
        params: operationLog.params,
        body: operationLog.body,
        response: operationLog.response,
        startTime: operationLog.startTime,
        endTime: operationLog.endTime,
        duration: operationLog.duration,
      },
    });
  }
}