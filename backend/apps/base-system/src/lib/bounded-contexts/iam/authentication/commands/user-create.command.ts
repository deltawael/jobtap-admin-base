import { ICommand } from '@nestjs/cqrs';
import { Status } from '@prisma/client';

export class UserCreateCommand implements ICommand {
  constructor(
    readonly username: string,
    readonly password: string,
    readonly domain: string,
    readonly nickName: string,
    readonly status: Status,
    readonly avatar: string | null,
    readonly email: string | null,
    readonly phoneNumber: string | null,
    readonly roleIds: string[],
    readonly uid: string,
  ) {}
}