# 环境初始化与基线

## 1. 适用范围

本文用于说明以下场景的标准做法：

- 本地开发环境初始化
- 新环境首次部署
- 基于当前目标态基线重建数据库
- 生产升级时评估 Prisma seed 是否可安全重复执行

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

数据库初始化统一走 Prisma migration + seed，不再保留其他基线路径。`pnpm exec prisma db seed` 既用于初始化，也可能在升级流程中重复执行，相关约束见下文 “Seed 升级安全规则”。

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

### 3.3 Seed 升级安全规则

项目要求如下：

- `pnpm exec prisma db seed` 不应只被视为“初始化命令”，而应被视为生产升级中可安全重复执行的项目能力。
- 默认目标是：重复执行 seed 时补齐缺失基线，但不覆盖线上人工维护的数据。
- 这是项目要求与目标态，不等于当前仓库中的所有 seed 未来都只能采用一种写法；关键在于新增或修改 seed 时必须先选策略并写清升级语义。

#### 3.3.1 Seed 策略分类

新增 seed 文件前，必须先判断它属于哪一种写入策略，不能默认写成覆盖式逻辑：

| 策略 | 默认推荐 | 典型实现 | 适用对象 | 升级语义 |
| --- | --- | --- | --- | --- |
| `仅缺失时创建` | 是 | `findUnique + create`、`createMany + skipDuplicates` | 账号、租户、角色模板、能力目录、菜单等初始化后可能继续被线上维护的数据 | 缺失时补建，已存在时保持原值，不覆盖线上人工维护内容 |
| `受控同步型` | 否 | 有明确覆盖范围的 `upsert(... update ...)`、定向 `update` | 代码是唯一事实来源、且仓库基线必须持续纠正数据库值的基础元数据 | 允许覆盖既有值，但必须明确说明覆盖范围、适用对象和为何允许覆盖 |
| `清理/重建型` | 否 | `deleteMany + createMany`、先清理再重建 | 明确的系统映射表、派生关系表或必须剔除废弃基线数据的场景 | 可能删除或重建数据，必须单独说明删除条件、风险和升级影响 |

如果无法明确证明某类数据应由仓库默认值持续纠正，就不要使用 `受控同步型` 或 `清理/重建型`。

#### 3.3.2 决策原则

- 只要线上可能有人维护这份数据，就不能默认使用覆盖同步型。
- 只有“代码是唯一事实来源”的基础元数据，才考虑 `受控同步型` 或 `清理/重建型`。
- 如果某条 seed 会删除数据，必须在文档和 PR 描述中明确删除条件、受影响对象和升级影响。
- 如果缺失数据需要在升级时自动补齐，但已存在数据不应被覆盖，默认使用 `仅缺失时创建`。
- 如果一个 seed 文件同时处理多类数据，应分别说明每类数据的策略；无法说清时应拆分文件，而不是混用模糊逻辑。

#### 3.3.3 新增 seed 文件检查清单

新增 seed 前，至少要回答并记录以下问题：

- 这份数据是否允许线上人工修改？
- 升级重复执行时，缺失数据是否需要自动补建？
- 已存在数据是否允许被仓库默认值覆盖？
- 是否存在删除或重建行为？
- 这份 seed 最终属于哪种策略，为什么？

实现与评审要求如下：

- 默认优先选择 `仅缺失时创建`。
- 如果采用 `受控同步型` 或 `清理/重建型`，PR 描述中必须明确写出策略、理由和升级影响。
- 读完上述判断后，工程师应能独立决定该 seed 更适合写成 `findUnique + create`、`createMany + skipDuplicates`，还是极少数受控同步或清理逻辑。
- 未经论证，不要直接写 `upsert + update`、`deleteMany + createMany` 这类覆盖式实现。

#### 3.3.4 当前基线现状

当前仓库已见的 seed 主要采用 `createMany + skipDuplicates`，语义上属于“仅缺失时创建”。这说明当前基线的默认方向是：缺失时补齐，不主动覆盖已存在数据。

典型例子包括：

- `backend/prisma/seeds/sys/sysTenant.ts`
- `backend/prisma/seeds/sys/sysUser.ts`
- `backend/prisma/seeds/sys/sysRoleTemplate.ts`
- `backend/prisma/seeds/sys/sysCapability.ts`
- `backend/prisma/seeds/sys/sysMenu.ts`

这些例子只能说明当前仓库主流实现偏向“仅缺失时创建”，不能被反向理解为“以后新增 seed 可以不做策略判断”。如果后续确实需要引入 `受控同步型` 或 `清理/重建型`，必须作为明确设计决策单独论证，并在文档和 PR 描述中写清升级影响。

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
