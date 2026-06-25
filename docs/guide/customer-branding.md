# 品牌定制说明

## 1. 适用范围

本文用于指导如何把当前底座快速调整为客户化品牌版本。当前默认品牌为 `JobTap`。

## 2. 主要入口

### 2.1 前端品牌配置

主配置文件：

- `frontend/src/config/brand.ts`

该文件集中维护：

- 应用标题与描述
- 中英文系统标题
- 页脚文本与链接
- 水印默认文本
- 演示账号标识
- 首页项目动态文案

如需替换客户品牌，优先修改此文件。

### 2.2 前端图标与 Logo 资源

固定替换点：

- `frontend/public/logo.png`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`

界面应继续通过统一品牌入口引用这些资源，不要在页面里直接散落客户专属素材路径。

### 2.3 后端品牌配置

主配置文件：

- `backend/libs/config/src/brand.config.ts`

该文件集中维护：

- Swagger 标题
- Swagger 描述
- 服务条款展示文本
- 联系方式展示信息
- License 展示信息
- 默认种子管理员显示名

## 3. 品牌定制步骤

### 3.1 更新品牌文案

优先更新以下文件：

- `frontend/src/config/brand.ts`
- `backend/libs/config/src/brand.config.ts`
- `frontend/.env`

要求：

- `VITE_APP_TITLE` 与 `VITE_APP_DESC` 应与前端品牌配置保持一致。
- 中文和英文系统标题应同时检查，避免只更新单一语言。

### 3.2 替换 Logo 与图标

除非客户要求更深层的视觉改版，否则只替换以下文件：

- `frontend/public/logo.png`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`

### 3.3 检查前端客户可见区域

以下位置已经接入统一品牌配置，但每次换标后仍应人工复核：

- 浏览器标题与页面描述：`frontend/index.html`
- 全局页脚：`frontend/src/layouts/modules/global-footer/index.vue`
- 登录页演示账号展示：`frontend/src/views/_builtin/login/modules/pwd-login.vue`
- 加载页：`frontend/src/plugins/loading.ts`
- 页面标题格式化：`frontend/src/router/guard/title.ts` 与 `frontend/src/store/modules/app/index.ts`
- 水印默认文案：`frontend/src/layouts/modules/theme-drawer/modules/page-fun.vue`
- 首页品牌头像与项目动态文案：
  - `frontend/src/components/custom/brand-avatar.vue`
  - `frontend/src/views/home/modules/header-banner.vue`
  - `frontend/src/views/home/modules/project-news.vue`

### 3.4 检查后端客户可见区域

以下位置已经接入品牌替换：

- Swagger 运行时展示：`backend/libs/bootstrap/src/swagger/init-doc.swagger.ts`
- 种子管理员显示名：`backend/prisma/seeds/sys/sysUser.ts`

## 4. 数据库初始化说明

数据库初始化统一走 Prisma：

- 结构变更来自 `backend/prisma/migrations`
- 初始数据来自 `backend/prisma/seeds`

如果本地 PostgreSQL 卷中的数据早于当前 Prisma baseline，执行 `prisma migrate deploy` 前应先清理旧卷，否则可能出现 `P3005`。

## 5. 验收清单

每次完成品牌定制后，至少检查以下内容：

1. 前端类型检查通过：
   - `pnpm -C frontend typecheck`
2. 浏览器标签标题与客户品牌一致。
3. `favicon` 已正确替换。
4. 登录页、侧栏 / 顶栏 Logo、页脚、加载页展示一致。
5. 中文和英文系统标题都已更新。
6. 首页演示文案不再出现旧客户名或模板品牌痕迹。
7. Swagger 标题和描述已更新。
8. 默认种子管理员显示名已更新。

## 6. 本轮不改动的内容

以下内容默认保持不变，因为它们属于上游依赖标识或非核心品牌素材：

- 上游依赖名，例如 `@soybeanjs/*`
- 第三方头像 / 演示素材 URL（除非客户明确要求替换）

## 7. 推荐执行顺序

建议每次按以下顺序处理：

1. 修改 `frontend/src/config/brand.ts`
2. 修改 `backend/libs/config/src/brand.config.ts`
3. 替换 `logo.png`、`favicon.svg`、`favicon.ico`
4. 执行 `pnpm -C frontend typecheck`
5. 人工验证登录页、布局 Logo、页脚、加载页和 Swagger 页面
