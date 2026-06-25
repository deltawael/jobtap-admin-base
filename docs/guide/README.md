# 底座使用指引

本目录收拢了当前底座的核心使用手册，面向以下场景：

- 新环境初始化与本地开发
- 理解目标态的多租户与统一授权模型
- 为已有模块或新模块接入 capability 授权
- 交付客户化版本时进行品牌配置

## 建议阅读顺序

1. [仓库总览](../../README.md)
2. [环境初始化与基线](./environment-bootstrap.md)
3. [底座目标态说明](./base-project-guide.md)
4. [统一授权接入规范](./authz-module-onboarding.md)
5. [品牌定制说明](./customer-branding.md)

## 按场景查阅

- 新环境搭建、重建数据库基线、核对初始化账号：
  - [环境初始化与基线](./environment-bootstrap.md)
- 理解平台侧 / 租户侧边界、固定菜单结构、角色模板与能力目录职责：
  - [底座目标态说明](./base-project-guide.md)
- 为模块设计 capability、梳理按钮级覆盖和跨资源依赖：
  - [统一授权接入规范](./authz-module-onboarding.md)
- 替换品牌名、标题、图标和登录页展示内容：
  - [品牌定制说明](./customer-branding.md)

## 使用约束

- 本目录仅保留“底座使用指引”类文档。
- 代码路径、命令、接口、类型名等技术标识保持英文，说明文字以中文为主。
- 如后续新增指南文档，默认也放入 `docs/guide/` 并在本页补充入口。
