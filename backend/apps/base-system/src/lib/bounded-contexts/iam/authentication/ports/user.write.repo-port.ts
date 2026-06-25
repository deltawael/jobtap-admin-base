import { User } from '../domain/user';

export interface UserWriteRepoPort {
  deleteUserRoleByRoleId(roleId: string): Promise<void>;
  deleteUserRoleByUserId(userId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  save(user: User, roleIds: string[]): Promise<void>;
  update(user: User, roleIds: string[]): Promise<void>;
}