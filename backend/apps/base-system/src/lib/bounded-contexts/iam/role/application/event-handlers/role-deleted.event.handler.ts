import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { AuthZManagementService } from '@lib/infra/casbin';

import { RoleDeletedEvent } from '../../domain/events/role-deleted.event';

@EventsHandler(RoleDeletedEvent)
export class RoleDeletedHandler implements IEventHandler<RoleDeletedEvent> {
  constructor(
    private readonly authZManagementService: AuthZManagementService,
  ) {}

  async handle(event: RoleDeletedEvent) {
    await this.authZManagementService.removeFilteredPolicy(0, event.code);
    Logger.log(
      `Casbin Rule FilteredPolicy with Sub deleted, RoleDeleted Event is ${JSON.stringify(event)}`,
      '[role] RoleDeletedHandler',
    );
  }
}