export interface IAuthentication {
  uid: string;
  userId: string;
  username: string;
  tenantId: string | null;
  actorType: 'system_admin' | 'tenant_admin' | 'tenant_user';
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  error?: {
    code: number;
    message: string;
  };
  data?: T;
}

export type CreationAuditInfoProperties = Readonly<{
  createdAt: Date;
  createdBy: string;
}>;

export type UpdateAuditInfoProperties = Readonly<{
  updatedAt: Date | null;
  updatedBy: string | null;
}>;
