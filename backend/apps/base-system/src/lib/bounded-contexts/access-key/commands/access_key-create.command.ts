import { ICommand } from '@nestjs/cqrs';

export class AccessKeyCreateCommand implements ICommand {
  constructor(
    readonly tenantId: string | null,
    readonly description: string | null,
    readonly uid: string,
  ) {}
}
