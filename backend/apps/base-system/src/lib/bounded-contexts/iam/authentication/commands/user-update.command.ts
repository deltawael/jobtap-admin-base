import { ICommand } from '@nestjs/cqrs';
import { Status } from '@prisma/client';

export class UserUpdateCommand implements ICommand {
  constructor(
    readonly id: string,
    readonly username: string,
    readonly nickName: string,
    readonly status: Status,
    readonly avatar: string | null,
    readonly email: string | null,
    readonly phoneNumber: string | null,
    readonly roleIds: string[],
    readonly uid: string,
  ) {}
}