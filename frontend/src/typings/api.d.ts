/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  namespace Common {
    interface PaginatingCommonParams {
      current: number;
      size: number;
      total: number;
    }

    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      records: T[];
    }

    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;
    type EnableStatus = 'ENABLED' | 'DISABLED';
    type CommonRecord<T = any> = {
      id: any;
      createBy: string;
      createTime: string;
      updateBy: string;
      updateTime: string;
      status: EnableStatus | null;
    } & T;
  }

  namespace Auth {
    interface LoginToken {
      token: string;
      refreshToken: string;
    }
    interface UserInfo {
      userId: string;
      userName: string;
      tenantId: string | null;
      actorType: 'system_admin' | 'tenant_admin' | 'tenant_user';
      roles: string[];
      capabilities: string[];
      visibleViews: Array<
        | string
        | {
            capabilityId: string;
            capabilityCode: string | null;
            resourceType: string;
            viewKey: string;
          }
      >;
    }
  }

  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;
    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }
    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }
  }

  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;
    type ScopeStrategyMode = 'all' | 'self' | 'relation' | 'assignment';
    type DelegationStatus = 'active' | 'expired' | 'revoked';
    type CapabilityKind = 'action' | 'view';
    type ScopeDimensionRecord = {
      id: string;
      label: string;
      code?: string | null;
    };
    type CapabilityScopeTarget = {
      id: string;
      capabilityId: string;
      resourceEntityCode: string;
      dimensionEntityCode?: string | null;
      dimensionEntityName?: string | null;
      supportsSelf: boolean;
    };
    type RoleScopeStrategy = {
      id?: string;
      roleId?: string;
      tenantId?: string | null;
      capabilityId: string;
      capabilityCode?: string | null;
      capabilityName?: string | null;
      strategyMode: ScopeStrategyMode;
      dimensionEntityCode?: string | null;
      dimensionEntityName?: string | null;
    };
    type ScopeAssignment = {
      capabilityId: string;
      capabilityCode?: string | null;
      capabilityName?: string | null;
      dimensionEntityCode: string;
      dimensionEntityName?: string | null;
      entityIds: string[];
      entities?: ScopeDimensionRecord[];
    };
    type ScopeCapability = {
      capabilityId: string;
      capabilityCode?: string | null;
      capabilityName?: string | null;
      dimensionEntityCode: string;
      dimensionEntityName?: string | null;
    };
    type RelationBinding = {
      dimensionEntityCode: string;
      dimensionEntityName?: string | null;
      entityIds: string[];
    };
    type ResolvedRelation = {
      dimensionEntityCode: string;
      dimensionEntityName?: string | null;
      entityIds: string[];
      entities: ScopeDimensionRecord[];
    };
    type Delegation = {
      id: string;
      createBy: string;
      createTime: string;
      updateBy: string;
      updateTime: string;
      tenantId: string;
      fromUserId: string;
      toUserId: string;
      capabilityId: string;
      capabilityCode?: string | null;
      capabilityName?: string | null;
      dimensionEntityCode?: string | null;
      dimensionEntityName?: string | null;
      entityId?: string | null;
      entityLabel?: ScopeDimensionRecord | null;
      status: DelegationStatus;
      startAt: string;
      endAt: string;
    };
    type Tenant = Common.CommonRecord<{ code: string; name: string; description: string | null }>;
    type TenantModel = Pick<Tenant, 'code' | 'name' | 'description'> & Partial<Pick<Tenant, 'status'>>;
    type Role = Common.CommonRecord<{
      name: string;
      code: string;
      description: string;
      tenantId: string | null;
      tenantName?: string | null;
      templateId: string | null;
      templateName: string | null;
      templateCode: string | null;
      capabilityIds: string[];
      capabilityCount: number;
      scopeStrategyCount: number;
      builtIn: boolean;
    }>;
    type RoleTemplate = Common.CommonRecord<{
      code: string;
      name: string;
      actorType: 'system_admin' | 'tenant_admin' | 'tenant_user';
      description: string | null;
      builtIn: boolean;
      capabilityIds: string[];
      capabilityCount: number;
    }>;
    type Capability = Common.CommonRecord<{
      code: string;
      name: string;
      module: string;
      kind: CapabilityKind;
      builtIn: boolean;
      description: string | null;
      scopeTargets?: CapabilityScopeTarget[];
    }>;
    type UserAuthProfile = {
      userId: string;
      tenantId: string | null;
      roles: Role[];
      capabilities: Capability[];
      relationBindings: RelationBinding[];
      resolvedRelations: ResolvedRelation[];
      scopeAssignments: ScopeAssignment[];
      scopeCapabilities: ScopeCapability[];
      delegations: Delegation[];
      linkedStaffId: string | null;
      roleIds: string[];
    };
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'name' | 'code' | 'status' | 'tenantId'> &
        CommonSearchParams & {
          tenantScope?: 'all' | 'platform' | 'tenant' | null;
        }
    >;
    type RoleList = Common.PaginatingQueryRecord<Role>;
    type AllRole = Pick<Role, 'id' | 'name' | 'code'>;
    type UserGender = '1' | '2';
    type User = Common.CommonRecord<{
      username: string;
      password: string;
      tenantId: string | null;
      tenantName?: string | null;
      avatar: string | null;
      nickName: string;
      phoneNumber: string | null;
      email: string | null;
      roleIds: string[];
    }>;
    type SelfProfileRole = {
      id: string;
      code: string;
      name: string;
    };
    type SelfProfile = {
      userId: string;
      username: string;
      tenantId: string | null;
      tenantName: string | null;
      actorType: 'system_admin' | 'tenant_admin' | 'tenant_user';
      roles: SelfProfileRole[];
      avatar: string | null;
      nickName: string;
      phoneNumber: string | null;
      email: string | null;
      status: EnableStatus | null;
    };
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'username' | 'nickName' | 'phoneNumber' | 'email' | 'status' | 'tenantId'> &
        CommonSearchParams & {
          tenantScope?: 'all' | 'platform' | 'tenant' | null;
        }
    >;
    type UserList = Common.PaginatingQueryRecord<User>;
    type MenuType = 'directory' | 'menu' | 'button';
    type MenuButton = { code: string; desc: string };
    type IconType = 1 | 2;
    type MenuPropsOfRoute = Pick<
      import('vue-router').RouteMeta,
      | 'i18nKey'
      | 'keepAlive'
      | 'constant'
      | 'order'
      | 'href'
      | 'hideInMenu'
      | 'activeMenu'
      | 'multiTab'
      | 'fixedIndexInTab'
      | 'query'
    >;
    type Menu = Common.CommonRecord<{
      pid: number;
      menuType: MenuType;
      menuName: string;
      routeName: string;
      routePath: string;
      component?: string;
      icon: string;
      iconType: IconType;
      buttons?: MenuButton[] | null;
      children?: Menu[] | null;
    }> &
      MenuPropsOfRoute;
    type MenuList = Common.PaginatingQueryRecord<Menu>;
    type MenuTree = { id: number; label: string; pid: number; children?: MenuTree[] };
    type AuditLog = Common.CommonRecord<{
      tenantId: string | null;
      actorUserId: string;
      actorUsername: string;
      actorType: 'system_admin' | 'tenant_admin' | 'tenant_user';
      action: string;
      resourceType: string;
      resourceId: string | null;
      detail: Record<string, any> | null;
    }>;
    type AuditLogSearchParams = CommonType.RecordNullable<
      Pick<AuditLog, 'tenantId' | 'resourceType'> & { action?: string | null } & CommonSearchParams
    >;
    type AuditLogList = Common.PaginatingQueryRecord<AuditLog>;
  }
}
