# JobTap Admin Base

`JobTap Admin Base` 已切换到“目标态优先”的多租户与统一授权中心基线。

当前仓库的核心约束：

- 统一术语：`domain -> tenant`，运行时与存储层都不再保留 `domain` 作为租户语义
- 多租户模型：`单库共享表 + tenant_id 强隔离`
- 授权主模型：`capability + scope + delegation`
- 菜单、按钮、接口、视图块都只是 capability 的投影
- 动态路由来源：`GET /authz/routes` + `capability_ui_bindings`
- 不再保留旧的“角色直配菜单 / 角色直配 API”作为主授权模型
- 数据库基线统一为 `backend/prisma/migrations/0_target_state_baseline`

## 当前目标态

平台侧管理功能：

- 租户管理
- 角色模板管理
- 能力目录管理
- 资源目录管理
- 平台审计

租户侧管理功能：

- 用户管理
- 角色管理
- 用户授权档案
- 租户审计

通用基础功能：

- 登录日志
- 操作日志
- 个人中心
- 本人修改资料
- 本人修改密码
- 用户管理中的管理员独立改密

说明：

- `登录日志 / 操作日志` 是独立日志功能，不等于 `平台审计 / 租户审计`。
- `个人中心` 是从右上角头像进入的隐藏路由页面，不属于侧边菜单。
- `管理员独立改密` 属于用户管理动作，不是独立菜单。
- 当前“已有功能”只统计用户可见、可操作、可验收的正式能力，不包含 `403/404`、`iframe-page`、历史残留 `access-key` 等技术页或待清理能力。

平台预置角色模板：

- `system_admin`
- `tenant_admin`
- `boss`
- `manager`
- `staff`
- `readonly`

新环境初始化后只创建 3 个管理员账号：

- `system_admin`
- `tenant_admin_a`
- `tenant_admin_b`

## 快速开始

### 1. 启动中间件

```bash
docker-compose -f docker-compose.middleware.yml up -d
```

### 2. 初始化后端数据库

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma db seed
```

### 3. 启动后端

```bash
cd backend
pnpm start:dev
```

### 4. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 5. 访问地址

- 前端：`http://localhost:9527`
- 后端：`http://localhost:9528/v1`
- Swagger：`http://127.0.0.1:9528/api-docs`

## 验证命令

前端：

```bash
cd frontend
pnpm typecheck
```

后端：

```bash
cd backend
pnpm prisma:generate
pnpm build
```

## 文档导航

- [文档总入口](./docs/README.md)
- [环境初始化与基线](./docs/guide/environment-bootstrap.md)
- [底座目标态说明](./docs/guide/base-project-guide.md)
- [统一授权接入规范](./docs/guide/authz-module-onboarding.md)
- [品牌定制说明](./docs/guide/customer-branding.md)

## 说明

- 数据库初始化统一走 Prisma migration + seed，不再保留其他基线路径。
- 普通结构变更请在当前基线之上继续追加 Prisma migration，不要重复重建全量 baseline。
- 初始化账号的默认密码明文不在文档中固化；种子使用统一初始密码哈希，部署前应替换种子中的默认哈希，或初始化后立即重置管理员密码。
