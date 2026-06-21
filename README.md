# JobTap Admin Base

JobTap Admin Base 是一个基于 Vue 3 + Vite + NestJS 的中后台基础项目，面向后续客户化交付场景，已经完成品牌配置与资源替换的集中化整理。

## 在线预览

- 预览地址：请在本地启动后访问 `http://localhost:9527`

## 文档导航

- [简介](#简介)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [品牌定制](#品牌定制)
- [技术栈](#技术栈)

## 简介

本项目采用 monorepo 结构，包含：

- `frontend`：前端管理后台
- `backend`：NestJS 后端服务
- `deploy`：数据库初始化与部署辅助资源
- `docs`：项目文档与客户定制说明

当前默认品牌为 `JobTap`。界面品牌、运行时品牌和客户交付相关的替换入口已经集中收敛，便于后续快速做客户化换标。

## 项目结构

```text
jobtap-admin-base/
├── backend/
├── frontend/
├── deploy/
├── docs/
├── docker-compose.yml
└── docker-compose.middleware.yml
```

## 快速开始

### 1. 启动中间件

```bash
docker-compose -f docker-compose.middleware.yml up -d
```

### 2. 安装后端依赖并初始化数据库

```bash
cd backend
pnpm install
pnpm prisma:generate
```

推荐先启动 PostgreSQL 和 Redis，再执行数据库初始化。

方式一：使用 `Makefile`

```bash
cd backend
make init_migration
```

方式二：直接使用 Prisma 命令

```bash
cd backend
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma db seed
```

如果后续修改了 `prisma/schema.prisma`，可以使用下面的命令维护迁移：

```bash
cd backend
make generate_migration
make deploy_migration
pnpm prisma:generate
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

## 品牌定制

客户定制说明见：

- [docs/customer-branding.md](./docs/customer-branding.md)

## 技术栈

### 前端

- Vue 3
- Vite 6
- TypeScript
- Pinia
- UnoCSS

### 后端

- NestJS
- Prisma
- PostgreSQL
- Redis
- TypeScript

## 说明

- 当前仓库已经完成主要品牌入口的集中化改造。
- 真实上游依赖名和部分外部工具链接仍会保留，例如 `@soybeanjs/*`，因为这些是实际依赖来源，不属于业务品牌展示范围。