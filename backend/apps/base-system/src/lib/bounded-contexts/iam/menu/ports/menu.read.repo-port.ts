import { MenuProperties, MenuTreeProperties } from '../domain/menu.read.model';

export interface MenuReadRepoPort {
  getChildrenMenuCount(id: number): Promise<number>;

  getMenuById(id: number): Promise<MenuProperties | null>;

  getConstantRoutes(): Promise<Readonly<MenuProperties[]> | []>;

  findAll(): Promise<MenuTreeProperties[] | []>;

  findAllConstantMenu(constant: boolean): Promise<MenuTreeProperties[] | []>;

  findMenusByIds(ids: number[]): Promise<MenuProperties[]>;
}