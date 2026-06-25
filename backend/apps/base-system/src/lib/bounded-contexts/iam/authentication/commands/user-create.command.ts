import { ICommand } from '@nestjs/cqrs';
import { ActorType, Status } from '@prisma/client';

export class UserCreateCommand implements ICommand {
  constructor(
    readonly username: string,
    readonly password: string,
    readonly tenantId: string | null,
    readonly actorType: ActorType,
    readonly nickName: string,
    readonly status: Status,
    readonly avatar: string | null,
    readonly email: string | null,
    readonly phoneNumber: string | null,
    readonly roleIds: string[],
    readonly uid: string,
  ) {}
}