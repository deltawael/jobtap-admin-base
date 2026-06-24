# 统一授权接入规范

## 1. 适用范围

本规范用于：

- 已有模块改造到 capability 模型
- 后续新增模块按目标态直接接入

未完成本规范要求的模块，不得视为授权接入完成。

## 2. 能力设计原则

能力按业务意图设计，不按控件机械拆分。默认优先使用四类：

- `read`
- `manage`
- `special action`
- `sensitive view`

示例：

- `tenant.role.read`
- `tenant.role.manage`
- `tenant.role.scope.manage`
- `tenant.user.read`
- `tenant.user.manage`
- `tenant.user.sensitive_view`

## 3. 按钮级覆盖规则

要求是“按钮级可追溯到 capability”，不是“一按钮一能力”。

允许多个按钮共享同一个能力，例如：

- 新建角色
- 编辑角色
- 删除角色
- 配置角色能力

都可以归属到：

- `tenant.role.manage`

而：

- 角色列表
- 角色详情

归属到：

- `tenant.role.read`

只有责任边界、风险边界、审批边界不同，才继续拆分能力。

## 4. 跨资源依赖规则

当一个模块动作依赖其他资源的读取能力时，必须显式建模，不能默认放通。

### 4.1 主能力直绑

适用于只被单模块使用的依赖接口。

例子：

- 某个只服务“用户管理”的推荐接口，可直接绑定到 `tenant.user.manage`

### 4.2 引用能力抽象

适用于多个模块共享的依赖资源。

推荐抽象为：

- `tenant.role.reference.read`
- `tenant.staff.reference.read`
- `tenant.org.reference.read`

然后由多个业务模块共同依赖。

这是默认推荐方案。

## 5. 接口多能力绑定

同一个接口必须支持多条 capability 绑定记录，并声明绑定语义。

### 5.1 `ANY_OF`

任一能力满足即可访问，适用于共享引用类读取接口。

示例：

- `GET /roles`
- 既可绑定 `tenant.role.read`
- 也可绑定 `tenant.role.manage`
- 还可绑定 `tenant.role.reference.read`

这样用户管理页里的“角色下拉”不需要绕过授权。

### 5.2 `ALL_OF`

必须同时具备多个能力才可访问，适用于高风险组合动作。

默认情况下：

- 引用类只读接口优先用 `ANY_OF`
- 普通 CRUD 通常单能力或 `ALL_OF` 单条记录
- 高风险动作才使用多能力 `ALL_OF`

角色模板/角色配置保存规则：

- 树形能力选择只提交叶子 capability id。
- 模块节点和业务分组节点只是前端投影，不得入库。

模块上线前必须同时提交 capability 清单、资源映射清单、模板默认分配清单、跨资源依赖清单。

## 6. 模块交付清单

每个模块都必须产出：

1. capability 清单
2. 页面 / 按钮 / 接口 / 视图块映射清单（页面候选源使用前端已注册路由清单）
3. 角色模板默认分配清单
4. 跨资源依赖说明
5. 验收用例

## 7. 示例一：角色管理模块

### 7.1 capability 清单

- `tenant.role.read`
- `tenant.role.manage`
- `tenant.role.scope.manage`
- `tenant.role.reference.read`

### 7.2 资源映射

| 资源 | capability |
| --- | --- |
| 角色列表页 | `tenant.role.read` |
| 查看角色详情 | `tenant.role.read` |
| 新建角色 | `tenant.role.manage` |
| 编辑角色 | `tenant.role.manage` |
| 删除角色 | `tenant.role.manage` |
| 配置角色 capability | `tenant.role.manage` |
| 配置角色 scope | `tenant.role.scope.manage` |
| 角色下拉接口 | `tenant.role.reference.read` 或 `tenant.role.read` / `tenant.role.manage` |

## 8. 示例二：用户管理模块

### 8.1 capability 清单

- `tenant.user.read`
- `tenant.user.manage`
- `tenant.user.sensitive_view`

### 8.2 依赖 capability

- `tenant.role.reference.read`
- `tenant.staff.reference.read`
- `tenant.org.reference.read`（如使用组织树）

### 8.3 资源映射

| 资源 | capability |
| --- | --- |
| 用户列表页 | `tenant.user.read` |
| 用户详情 | `tenant.user.read` |
| 新建用户 | `tenant.user.manage` |
| 编辑用户 | `tenant.user.manage` |
| 删除用户 | `tenant.user.manage` |
| 角色下拉接口 | `tenant.role.reference.read` |
| 员工下拉接口 | `tenant.staff.reference.read` |
| 敏感字段区块 | `tenant.user.sensitive_view` |

## 9. 新模块接入检查表

上线前逐项确认：

- 是否完成 capability 清单。
- 是否完成按钮级覆盖映射。
- 是否识别并建模跨资源依赖。
- 是否声明接口是单能力、`ANY_OF` 还是 `ALL_OF`。
- 是否为默认模板配置了合理能力集合。
- 是否补充了租户隔离与授权验收用例。

## 10. 基线示例账号与角色权限体现

初始化仅保留：

- `system_admin`
- `tenant_admin_a`
- `tenant_admin_b`

这三个账号分别用于验证：

- 平台管理能力是否与租户业务能力解耦
- 租户隔离是否正确
- 管理菜单是否按角色能力正确展示