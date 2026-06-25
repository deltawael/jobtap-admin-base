import { Role } from '../domain/role.model';

export interface RoleWriteRepoPort {
  deleteById(id: string): Promise<void>;

  save(role: Role): Promise<void>;

  update(role: Role): Promise<void>;
}