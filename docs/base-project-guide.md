# 底座使用指南

## 1. 项目定位

`JobTap Admin Base` 用作后续客户化交付的后台底座，目标不是保留模板的所有演示能力，而是提供一套可继续扩展的前后端基础框架。

当前仓库已经完成的收敛工作包括：

- 品牌文案和 LOGO 替换入口集中化
- 数据库初始化统一为 `Prisma migration + Prisma seed`
- 登录空壳能力收口为密码登录体验
- 用户管理完成一轮“可用化”改造，支持头像、角色和租户域继承规则

## 2. 目录说明

```text
jobtap-admin-base/
├── frontend/   前端管理后台，Vue 3 + Vite
├── backend/    后端服务，NestJS + Prisma
├── deploy/     历史 SQL 快照与部署参考
├── docs/       项目文档与客户化说明
├── docker-compose.yml
└── docker-compose.middleware.yml
```

推荐阅读顺序：

1. 根目录 [README.md](../README.md)
2. 本文档
3. [customer-branding.md](./customer-branding.md)
4. [removable-unimplemented-features.md](./removable-unimplemented-features.md)

## 3. 已有可用功能

以下能力当前视为底座内置能力，可在后续项目中直接沿用或二次扩展。

### 3.1 认证与基础框架

- 密码登录
- 403 / 404 / 500 异常页
- 基于用户路由的菜单装配
- 中英文切换
- 主题配置、页签、布局切换

说明：
旧的 `/login/:module(...)` 路由兼容仍保留，但产品能力已经收口到密码登录；`code-login`、`register`、`reset-pwd`、`bind-wechat` 不应再当作可用业务功能继续建设。

### 3.2 当前菜单内模块

当前种子菜单里已经暴露的模块包括：

- 首页 `home`
- 用户管理 `manage/user`
- 角色管理 `manage/role`
- 菜单管理 `manage/menu`
- Access Key `access-key`
- 登录日志 `log/login`
- 操作日志 `log/operation`

这些模块里，用户 / 角色 / 菜单管理和日志模块可作为基础权限后台继续使用；首页和部分展示卡片仍带演示属性，后续可按客户要求精简。

### 3.3 用户管理当前规则

用户管理是当前底座里已经做过业务收口的模块，后续扩展请遵守以下约束：

- 前端列表和表单不展示 `domain`
- 创建用户时 `domain` 由后端继承当前登录操作者的 `req.user.domain`
- 用户表单内直接维护 `roleIds`
- 角色为必填，至少选择一个
- 头像为空时前端使用 fallback 展示，不依赖远程默认图

如果后续再扩展用户资料字段，应优先沿用这套“前端最少暴露、后端兜底继承”的模式。

## 4. 初始化与运行规则

完整启动步骤以根目录 [README.md](../README.md) 为准，这里只强调底座规则：

### 4.1 中间件启动

- 本地中间件使用 `docker-compose.middleware.yml`
- 完整联调用 `docker-compose.yml`

### 4.2 数据库初始化

统一使用 Prisma：

- 结构来源：`backend/prisma/migrations`
- 初始数据来源：`backend/prisma/seeds`

`deploy/postgres` 下的 SQL 仅作为历史参考保留，不再作为当前推荐初始化路径。

### 4.3 迁移与种子原则

- 新增表结构：优先新增 migration
- 新增基础数据：优先补 seed
- 不要再把新的初始化逻辑写回 `deploy/postgres/*.sql` 当作主流程

## 5. 后续项目接入建议

拿这个仓库做新项目底座时，建议按下面顺序处理。

### 5.1 第一阶段：先确认要保留的基础能力

建议先明确：

- 是否保留首页演示内容
- 是否保留 `access-key`
- 是否保留日志模块
- 是否需要继续沿用当前 RBAC 菜单/角色模型

如果只是做标准管理后台，通常保留用户、角色、菜单、日志即可，其余演示内容按项目再裁剪。

### 5.2 第二阶段：完成客户化基础替换

优先处理：

- 品牌名、系统标题、页脚、水印
- `logo.png`、`favicon.svg`、`favicon.ico`
- Swagger 品牌信息
- 默认种子超管展示名

具体入口见 [customer-branding.md](./customer-branding.md)。

### 5.3 第三阶段：接入业务模块

建议按照“前端页面 + 后端 DTO/Command/Query/Repository + 种子菜单/权限”的完整链路接入，而不是只补页面。

推荐最小落地顺序：

1. 后端定义 DTO、命令、查询和仓储接口
2. 后端补控制器与 Prisma 持久化
3. 前端补 API typing 和 service
4. 前端补页面、表单、搜索和 i18n
5. 如需菜单可见，再补菜单种子和权限规则

## 6. 质量检查与提交流程

### 6.1 常用检查命令

前端：

```bash
cd frontend
pnpm typecheck
pnpm exec eslint --fix src
```

后端：

```bash
cd backend
pnpm exec tsc -p tsconfig.build.json --noEmit
```

### 6.2 提交前注意事项

前端 `pre-commit` 会执行：

- `pnpm typecheck`
- `pnpm lint-staged`

而 `lint-staged` 当前配置是：

- `* -> eslint --fix`

这意味着：

- 任何已暂存前端文件都会被 `eslint --fix` 扫到
- 如果生成文件有本地改动但未暂存，`lint-staged` 回滚失败时容易造成工作区混乱

特别注意 `frontend/src/typings/components.d.ts`：

- 它是 `unplugin-vue-components` 生成文件
- 当页面新用了 `NAvatar` 等自动注册组件时，这个文件会变化
- 如果它变化了，应与业务代码一起提交，不要单独留成未暂存修改

## 7. 已知边界与保留项

当前有几类内容是“故意保留，但不等于业务完成态”：

- 首页的部分统计卡片、新闻流和展示内容仍偏演示
- 历史 SQL 文件仍保留在 `deploy/postgres`，但不是推荐主流程
- 登录兼容路由仍保留旧模块字面量，只用于兼容历史地址
- 依赖名如 `@soybeanjs/*` 属于上游技术标识，不属于业务品牌范围

如果未来目标从“可交付底座”变成“最小化后台骨架”，建议单独开一轮继续清理，而不要和正常业务迭代混在一起。

## 8. 推荐维护方式

建议把这个仓库当作“内部基础版本”维护，而不是一次性模板包：

- 底层规范变更尽量先回到这个仓库沉淀
- 客户项目只做客户特有业务和配置差异
- 通用能力优化优先反哺到底座

这样后续新项目启动时，才不会每次都从旧模板重新清理一遍。