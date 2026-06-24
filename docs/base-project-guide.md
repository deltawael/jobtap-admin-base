# 底座目标态说明

## 1. 目标态原则

当前底座以“多租户 + 统一授权中心”为核心，约束如下：

- 继续采用 `tenant` 术语，不再把 `domain` 作为业务主语义。
- 采用 `单库共享表 + tenant_id 强隔离`。
- capability 是唯一主授权源。
- 菜单、按钮、接口、视图块都通过 capability 投影，不再让角色直接绑定菜单或 API。

## 2. 平台侧与租户侧边界

### 2.1 平台侧

平台级资源包括：

- 租户
- 角色模板
- 能力目录
- 资源目录
- 平台审计
- 系统配置

平台管理员能力重点是“维护标准”，而不是天然拥有任意租户业务数据可见权。

### 2.2 租户侧

租户级资源包括：

- 用户
- 租户角色
- 用户授权档案
- scope override
- delegation
- 租户审计
- 各类业务数据

租户管理员只管理本租户，不可跨租户操作。

## 3. 固定菜单结构

### 3.1 平台管理

- `平台管理 / 租户管理`
- `平台管理 / 角色模板`
- `平台管理 / 能力目录`
- `平台管理 / 资源目录`
- `平台管理 / 平台审计`

### 3.2 租户管理

- `租户管理 / 用户管理`
- `租户管理 / 角色管理`
- `租户管理 / 用户授权档案`
- `租户管理 / 租户审计`

说明：

- `资源目录` 负责维护菜单、按钮、页面视图、接口元数据。
- `资源目录` 不是主授权模型，只是 capability 的投影目录。
- 角色页不再展示“菜单权限 / API 权限”，只展示角色基础信息、能力配置、scope 配置。

## 4. 角色模板与角色实例

平台预置模板：

- `system_admin`
- `tenant_admin`
- `boss`
- `manager`
- `staff`
- `readonly`

约束：

- `system_admin` 负责平台标准治理。
- `tenant_admin` 负责租户内用户、角色、授权档案和租户审计。
- `boss` 是否能看敏感数据，不由模板名决定，只由 `view capability` 决定。
- `manager` 代表通用管理层模板，默认与 scope 联动。
- `readonly` 默认只有被授予模块的只读能力。

## 5. 能力目录、资源目录、授权档案

### 5.1 能力目录

能力目录维护业务意图能力，例如：

- 前端按 capability code 投影 3 级树：模块 / 业务分组 / 叶子能力。
- 角色模板与角色配置只保存叶子 capability id，不保存虚拟分组节点。

- `tenant.role.read`
- `tenant.role.manage`
- `tenant.user.read`
- `tenant.user.manage`
- `tenant.user.sensitive_view`

### 5.2 资源目录

资源目录维护：

- 菜单资源
- 按钮资源
- 页面视图资源
- API 资源

这些资源允许绑定 capability，但不允许反过来成为主授权源。

- 菜单与路由可见性由 `capability_ui_bindings` 投影。
- 资源目录页面候选项来自前端已注册路由清单，不再依赖旧 `systemManage/getAllPages`。

### 5.3 用户授权档案

用户授权档案聚合展示：

- 角色继承能力
- 直接 scope override
- delegation
- 可见 view capability
- 关联员工

## 6. 统一授权中心

统一授权服务对外只保留三类决策：

- `can(user, capability, resource, context)`
- `allowedScope(user, capability, context)`
- `visibleViews(user, resourceType, context)`

接口绑定基线支持：

- `ANY_OF`
- `ALL_OF`

用途：

- `ANY_OF`：共享引用类读取接口，满足任一能力即可访问。
- `ALL_OF`：高风险动作的组合校验，必须同时满足多个能力。

## 7. 当前开发约束

- 新模块不得继续沿用“角色 -> 菜单 -> API”老配置方式。
- 任意租户内业务表都必须带 `tenant_id`。
- 任意租户内查询默认必须注入 `tenant_id`。
- 新模块上线前必须完成 capability 清单、资源映射清单、模板映射清单。

更细的授权接入规则见：

- [authz-module-onboarding.md](./authz-module-onboarding.md)