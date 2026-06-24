import { IEvent } from '@nestjs/cqrs';
import { Status } from '@prisma/client';

export class AccessKeyDeletedEvent implements IEvent {
  constructor(
    public readonly tenantId: string | null,
    public readonly AccessKeyID: string,
    public readonly AccessKeySecret: string,
    public readonly status: Status,
  ) {}
}
