# 环境初始化与基线

## 1. 适用范围

本文用于说明以下场景的标准做法：

- 本地开发环境初始化
- 新环境首次部署
- 基于当前目标态基线重建数据库

## 2. 当前数据库基线

当前仓库只保留一条目标态基线迁移：

- `backend/prisma/migrations/0_target_state_baseline`

这条基线已经包含：

- `tenant` 术语与多租户字段
- `capabilities / role_templates / roles / user_roles`
- `scope_policies / user_scope_overrides / delegations`
- `capability_ui_bindings / capability_api_bindings / capability_view_bindings`
- `audit_logs`
- 资源目录的 `directory / menu / button` 三类资源

数据库初始化统一走 Prisma migration + seed，不再保留其他基线路径。

## 3. 新环境初始化

### 3.1 本地开发

```bash
docker-compose -f docker-compose.middleware.yml up -d

cd backend
pnpm install
pnpm prisma:generate
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma db seed
pnpm start:dev

cd ../frontend
pnpm install
pnpm dev
```

### 3.2 完整 Docker Compose

```bash
docker-compose up -d
```

`db-init` 容器会自动执行：

```bash
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma db seed
```

## 4. 初始化基线内容

新环境初始化后至少会生成：

- 平台主体上下文：`tenantId = null`（仅在 Casbin 执行层映射为 `BUILT_IN`）
- 租户：`tenant_a`、`tenant_b`
- 平台预置角色模板：`system_admin`、`tenant_admin`、`boss`、`manager`、`staff`、`readonly`
- 能力目录
- 资源目录基础数据
- 角色模板与能力映射
- 管理台菜单与 capability UI 绑定
- 统一授权接口绑定基线
- 能力目录前端 3 级树投影与角色模板叶子 capability 基线
- 3 个管理员账号

### 4.1 初始化账号

| username | actorType | tenantId | Tenant.code（租户主数据编码） | status | 用途 |
| --- | --- | --- | --- | --- | --- |
| `system_admin` | `system_admin` | `null` | `-` | `ENABLED` | 平台管理员 |
| `tenant_admin_a` | `tenant_admin` | `tenant-a` | `tenant_a` | `ENABLED` | 租户 A 管理员 |
| `tenant_admin_b` | `tenant_admin` | `tenant-b` | `tenant_b` | `ENABLED` | 租户 B 管理员 |

约束如下：

- 不再初始化业务演示账号。
- `boss / manager / staff / readonly` 仅作为模板存在，供租户后续复制创建角色。
- `system_admin` 不绑定租户；两个租户管理员必须绑定各自租户。
- `Tenant.code` 只属于租户主数据，不进入 JWT 或 `IAuthentication`。

### 4.2 初始化密码策略

当前基线的管理员账号使用同一份默认密码哈希，定义在：

- `backend/prisma/seeds/sys/sysUser.ts`

建议的落地规则：

- 开发环境可以直接使用当前种子哈希。
- 测试 / 生产环境在执行 `db seed` 前替换默认哈希，或初始化完成后立即重置管理员密码。
- 当前基线未实现“首次登录强制改密”流程；如有需要，应作为独立业务需求追加。
- 建议密码策略至少满足：12 位及以上，包含大小写字母、数字和特殊字符。

### 4.3 资源目录约束

- 页面候选项来自前端已注册路由清单，不再依赖后端 `systemManage/getAllPages`。
- 角色模板保存时只提交叶子 capability id，模块节点和业务分组节点仅为前端投影。

## 5. 初始化验收

### 5.1 菜单验收

平台管理员应看到：

- `平台管理 / 租户管理`
- `平台管理 / 角色模板`
- `平台管理 / 能力目录`
- `平台管理 / 资源目录`
- `平台管理 / 平台审计`

租户管理员应看到：

- `租户管理 / 用户管理`
- `租户管理 / 角色管理`
- `租户管理 / 用户授权档案`
- `租户管理 / 租户审计`

补充说明：

- `个人中心` 是头像下拉入口的隐藏页面，不写入侧边菜单验收项。
- `登录日志 / 操作日志` 是独立日志功能，不等于 `平台审计 / 租户审计`。

### 5.2 基础功能验收

初始化完成后至少检查：

- `system_admin` 可访问登录日志、操作日志以及平台管理相关页面。
- `tenant_admin_a`、`tenant_admin_b` 在各自权限边界内访问租户管理相关页面。
- 所有已登录用户都可通过右上角头像进入个人中心。
- 个人中心应支持查看/修改个人资料，并支持本人修改密码。
- 具备用户管理与改密能力的管理员，可在用户管理页面执行独立修改密码。

### 5.3 授权与隔离验收

初始化完成后至少检查：

- `system_admin` 只能进入平台管理菜单。
- `tenant_admin_a` 只能访问租户 A 的用户、角色、授权档案、审计数据。
- `tenant_admin_b` 只能访问租户 B 的用户、角色、授权档案、审计数据。
- `GET /roles` 已支持多能力 `ANY_OF` 绑定，既可被 `tenant.role.read` 使用，也可被 `tenant.role.reference.read` 使用。
- `GET /audit-logs` 已按平台 / 租户能力区分放行。

## 6. 后续迁移规则

普通结构变更请继续追加迁移：

```bash
cd backend
pnpm exec prisma migrate dev --schema prisma/schema.prisma --name <change-name> --create-only
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm prisma:generate
```

不要因为新增字段或新增模块重新生成全量 baseline。

## 7. 相关文档

- [底座目标态说明](./base-project-guide.md)
- [统一授权接入规范](./authz-module-onboarding.md)
