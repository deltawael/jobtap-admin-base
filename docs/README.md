# 文档总入口

`docs/` 目录当前分为两类内容：

- 使用指引：面向底座使用者、实施者和后续开发者
- 其他说明：后续如有归档或内部记录，可继续在本目录下按子目录扩展

## 使用指引

- [底座使用指引首页](./guide/README.md)
- [环境初始化与基线](./guide/environment-bootstrap.md)
- [底座目标态说明](./guide/base-project-guide.md)
- [统一授权接入规范](./guide/authz-module-onboarding.md)
- [实体声明驱动的数据授权说明](./guide/data-scope-authorization.md)
- [品牌定制说明](./guide/customer-branding.md)

## 当前说明

- 新增底座使用手册时，默认放入 `docs/guide/` 并在本页补充入口。
- 当前底座“已有功能”总览见 `guide/base-project-guide.md`。
- 初始化后应直接验收的菜单、日志、个人中心和改密能力见 `guide/environment-bootstrap.md`。
- `authz-module-onboarding.md` 只负责模块 capability 接入规范，不承担数据范围模型说明职责。
- 数据范围策略、用户显式范围配置、委派维度模型和 `authz/can` 的范围判定规则见 `guide/data-scope-authorization.md`。
