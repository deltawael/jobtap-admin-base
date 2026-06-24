import { Inject, Injectable } from '@nestjs/common';

import { MenuReadRepoPortToken } from '@app/base-system/lib/bounded-contexts/iam/menu/constants';
import { MenuReadRepoPort } from '@app/base-system/lib/bounded-contexts/iam/menu/ports/menu.read.repo-port';

import { MenuRoute } from '../dto/route.dto';

@Injectable()
export class MenuService {
  constructor(
    @Inject(MenuReadRepoPortToken)
    private readonly repository: MenuReadRepoPort,
  ) {}

  async getConstantRoutes(): Promise<MenuRoute[]> {
    const constantMenus = await this.repository.getConstantRoutes();

    return constantMenus.map((menu) => ({
      name: menu.menuName,
      path: menu.routePath,
      component: menu.component,
      meta: {
        title: menu.menuName,
        i18nKey: menu.i18nKey,
        constant: menu.constant,
        hideInMenu: menu.hideInMenu,
        keepAlive: menu.keepAlive,
        icon: menu.icon,
        order: menu.order,
        href: menu.href,
        activeMenu: menu.activeMenu,
        multiTab: menu.multiTab,
      },
    }));
  }
}