import { request } from '../request';

/** get role list */
export function fetchGetRoleList(params?: Api.SystemManage.RoleSearchParams) {
  return request<Api.SystemManage.RoleList>({ url: '/roles', method: 'get', params });
}

/** get all roles */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.AllRole[]>({ url: '/systemManage/getAllRoles', method: 'get' });
}

/** get user list */
export function fetchGetUserList(params?: Api.SystemManage.UserSearchParams) {
  return request<Api.SystemManage.UserList>({ url: '/user', method: 'get', params });
}

/** get menu list */
export async function fetchGetMenuList(
  _params: Api.Common.CommonSearchParams
): Promise<NaiveUI.FlatResponseData<Api.SystemManage.MenuList>> {
  const response = await request<Api.SystemManage.Menu[]>({ url: '/route', method: 'get' });
  if (response.error) return { data: null, error: response.error, response: response.response };
  const menus = response.data || [];
  return {
    data: { records: menus, total: menus.length, current: 1, size: menus.length },
    error: null,
    response: response.response
  };
}

export function fetchGetAllPages() {
  return request<string[]>({ url: '/systemManage/getAllPages', method: 'get' });
}

export function fetchGetMenuTree() {
  return request<Api.SystemManage.Menu[]>({ url: '/route/tree', method: 'get' });
}

export function fetchGetTenants() {
  return request<Api.SystemManage.Tenant[]>({ url: '/tenants', method: 'get' });
}

export function createTenant(req: Api.SystemManage.TenantModel) {
  return request({ url: '/tenants', method: 'post', data: req });
}

export type RoleTemplateModel = Partial<Pick<Api.SystemManage.RoleTemplate, 'id'>> &
  Pick<Api.SystemManage.RoleTemplate, 'name' | 'code' | 'actorType' | 'description' | 'status' | 'capabilityIds'>;

export function fetchGetRoleTemplates(
  params?: Partial<Pick<Api.SystemManage.RoleTemplate, 'actorType' | 'status' | 'code' | 'name'>>
) {
  return request<Api.SystemManage.RoleTemplate[]>({ url: '/role-templates', method: 'get', params });
}

export function createRoleTemplate(req: RoleTemplateModel) {
  return request({ url: '/role-templates', method: 'post', data: req });
}

export function updateRoleTemplate(req: RoleTemplateModel) {
  return request({ url: `/role-templates/${req.id}`, method: 'put', data: req });
}

export type CapabilityModel = Partial<Pick<Api.SystemManage.Capability, 'id'>> &
  Pick<Api.SystemManage.Capability, 'name' | 'code' | 'module' | 'kind' | 'description' | 'status'>;

export function fetchGetCapabilities(
  params?: Partial<Pick<Api.SystemManage.Capability, 'module' | 'kind' | 'status' | 'code' | 'name'>>
) {
  return request<Api.SystemManage.Capability[]>({ url: '/capabilities', method: 'get', params });
}

export function createCapability(req: CapabilityModel) {
  return request({ url: '/capabilities', method: 'post', data: req });
}

export function updateCapability(req: CapabilityModel) {
  return request({ url: `/capabilities/${req.id}`, method: 'put', data: req });
}

export type RoleModel = Partial<Pick<Api.SystemManage.Role, 'id'>> &
  Pick<
    Api.SystemManage.Role,
    'name' | 'code' | 'description' | 'status' | 'templateId' | 'capabilityIds' | 'scopePolicies'
  >;

export function createRole(req: RoleModel) {
  return request({ url: '/roles', method: 'post', data: req });
}

export function updateRole(req: RoleModel) {
  return request({ url: `/roles/${req.id}`, method: 'put', data: req });
}

export function deleteRole(id: string) {
  return request({ url: `/roles/${id}`, method: 'delete' });
}

export function fetchGetUserAuthProfile(userId: string) {
  return request<Api.SystemManage.UserAuthProfile>({ url: `/users/${userId}/auth-profile`, method: 'get' });
}

export type UserAuthProfileModel = Pick<
  Api.SystemManage.UserAuthProfile,
  'roleIds' | 'scopeOverrides' | 'delegations' | 'linkedStaffId'
>;

export function updateUserAuthProfile(userId: string, req: UserAuthProfileModel) {
  return request<Api.SystemManage.UserAuthProfile>({ url: `/users/${userId}/auth-profile`, method: 'put', data: req });
}

export function fetchGetDelegations(
  params?: Partial<
    Pick<Api.SystemManage.Delegation, 'tenantId' | 'fromUserId' | 'toUserId' | 'capabilityId' | 'status'>
  >
) {
  return request<Api.SystemManage.Delegation[]>({ url: '/delegations', method: 'get', params });
}

export function fetchGetAuditLogList(params?: Api.SystemManage.AuditLogSearchParams) {
  return request<Api.SystemManage.AuditLogList>({ url: '/audit-logs', method: 'get', params });
}

export function fetchGetRoleMenuIds(roleId: string) {
  return request<number[]>({ url: `/route/auth-route/${roleId}`, method: 'get' });
}

export function fetchAssignRoutes(req: Api.SystemManage.RoleMenu) {
  return request<boolean>({
    url: '/authorization/assign-routes',
    method: 'post',
    data: { ...req, domain: 'built-in' }
  });
}

export function fetchAssignPermission(req: Api.SystemManage.RolePermission) {
  return request<boolean>({
    url: '/authorization/assign-permission',
    method: 'post',
    data: { ...req, domain: 'built-in' }
  });
}

export type RouteModel = Pick<
  Api.SystemManage.Menu,
  | 'menuType'
  | 'menuName'
  | 'routeName'
  | 'routePath'
  | 'component'
  | 'order'
  | 'i18nKey'
  | 'icon'
  | 'iconType'
  | 'status'
  | 'pid'
  | 'keepAlive'
  | 'constant'
  | 'href'
  | 'hideInMenu'
  | 'activeMenu'
  | 'multiTab'
  | 'fixedIndexInTab'
>;

export function createRoute(req: RouteModel) {
  return request({ url: '/route', method: 'post', data: req });
}

export function updateRoute(req: RouteModel) {
  return request({ url: '/route', method: 'put', data: req });
}

export function deleteRoute(id: number) {
  return request({ url: `/route/${id}`, method: 'delete' });
}

export type UserModel = Partial<Pick<Api.SystemManage.User, 'id'>> &
  Pick<
    Api.SystemManage.User,
    'username' | 'password' | 'avatar' | 'nickName' | 'phoneNumber' | 'email' | 'status' | 'roleIds'
  >;

export function createUser(req: UserModel) {
  return request({ url: '/user', method: 'post', data: req });
}

export function updateUser(req: UserModel) {
  return request({ url: '/user', method: 'put', data: req });
}

export function deleteUser(id: string) {
  return request({ url: `/user/${id}`, method: 'delete' });
}

export function fetchGetApiEndpointTree() {
  return request<Api.SystemManage.ApiEndpoint[]>({ url: '/api-endpoint/tree', method: 'get' });
}

export async function fetchGetRoleApiEndpoints(roleCode: string) {
  const response = await request<any[]>({ url: `/api-endpoint/auth-api-endpoint/${roleCode}`, method: 'get' });
  const casbinRules = response.data || [];
  return casbinRules.map(item => `${item.v1}:${item.v2}`);
}
