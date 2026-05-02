import { AdminUser, AppModuleKey, UserRole } from '../../../core/auth/auth.models';

export type { AdminUser } from '../../../core/auth/auth.models';

export interface AdminUsersData {
  modules: Array<{ key: AppModuleKey; label: string }>;
  roles: Array<UserRole | string>;
  users: AdminUser[];
}
