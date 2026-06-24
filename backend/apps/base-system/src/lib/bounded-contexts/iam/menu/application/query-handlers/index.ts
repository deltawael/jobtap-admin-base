import { MenusByIdsQueryHandler } from './menus.by-ids.query.handler';
import { MenusQueryHandler } from './menus.query.handler';
import { MenusTreeQueryHandler } from './menus.tree.query.handler';

export const QueryHandlers = [
  MenusQueryHandler,
  MenusByIdsQueryHandler,
  MenusTreeQueryHandler,
];
