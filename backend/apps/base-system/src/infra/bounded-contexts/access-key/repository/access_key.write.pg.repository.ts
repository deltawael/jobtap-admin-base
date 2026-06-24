import { Injectable } from '@nestjs/common';

import { AccessKey } from '@app/base-system/lib/bounded-contexts/access-key/domain/access_key.model';
import { AccessKeyWriteRepoPort } from '@app/base-system/lib/bounded-contexts/access-key/ports/access_key.write.repo-port';

import { BUILT_IN } from '@lib/shared/prisma/db.constant';
import { PrismaService } from '@lib/shared/prisma/prisma.service';

@Injectable()
export class AccessKeyWritePostgresRepository
  implements AccessKeyWriteRepoPort
{
  constructor(private prisma: PrismaService) {}

  async deleteById(id: string): Promise<void> {
    await this.prisma.sysAccessKey.delete({
      where: { id },
    });
  }

  async save(accessKey: AccessKey): Promise<void> {
    await this.prisma.sysAccessKey.create({
      data: {
        id: accessKey.id,
        domain: accessKey.tenantId ?? BUILT_IN,
        AccessKeyID: accessKey.AccessKeyID,
        AccessKeySecret: accessKey.AccessKeySecret,
        status: accessKey.status,
        description: accessKey.description ?? null,
        createdAt: accessKey.createdAt,
        createdBy: accessKey.createdBy,
      },
    });
  }
}
