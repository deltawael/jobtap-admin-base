# 实体声明驱动的数据授权说明

## 1. 适用范围

本文说明当前底座已经落地的数据授权模型，覆盖：

- 角色侧范围策略设计
- 用户授权档案中的显式范围配置与委派
- 业务模块接入 `authz/can` 时的数据范围判定
- 旧 `scopeType/scopeValue` 模型的迁移边界

本文聚焦“数据范围授权”，不替代通用 capability 接入规范。模块级 capability 设计仍以 [统一授权接入规范](./authz-module-onboarding.md) 为准。

## 2. 目标

当前模型不再固定 `region / department / custom` 这类范围枚举，而是改为：

- 哪些实体可作为范围维度，由底座声明
- 某个能力支持哪些范围维度，由能力绑定声明
- 用户如何解析到该维度，和资源如何解析到该维度，由解析器声明

这样做的目的有两个：

- 把“范围是什么”从硬编码枚举改成实体级建模
- 把“角色策略”和“具体实体 ID”分离，避免角色页同时承担策略设计和具体授权录入

## 3. 核心模型

### 3.1 范围维度实体

范围维度不是枚举，而是实体声明。

当前 V1 已落地：

- `organization`

含义是：

- 组织可以作为范围维度参与授权判定
- 任何业务实体只要能声明“自己可解析到组织”，就可以支持组织范围

### 3.2 解析器

数据授权引擎只认“声明式单链解析”，不做任意多跳图遍历。

当前模型分为两类解析器：

- `SubjectDimensionResolver`
  - 说明用户如何解析到某个维度
- `ResourceDimensionResolver`
  - 说明业务资源如何解析到某个维度

当前已落地示例：

- 用户侧：`user -> staff -> organization`
- 资源侧：`organization_scoped -> organization`

### 3.3 能力范围目标

能力不是天然有数据范围语义，只有显式声明过的能力才允许配置数据范围。

能力与范围目标通过 `capability_scope_target` 建模，描述：

- 该能力作用在哪类资源实体上
- 该能力支持哪些维度实体
- 是否支持内建 `self`

未声明 `capability_scope_target` 的能力：

- 不出现在角色范围策略配置里
- 不参与 relation / assignment 维度授权判定

## 4. 存储模型

当前 V1 已新增并落库的核心表如下：

- `scope_dimension_entities`
  - 记录哪些实体可作为范围维度
- `scope_subject_resolvers`
  - 记录用户侧范围解析元数据
- `scope_resource_resolvers`
  - 记录资源侧范围解析元数据
- `capability_scope_targets`
  - 记录能力支持哪些资源实体与范围维度
- `role_scope_strategies`
  - 记录角色对能力采用什么范围策略
- `user_scope_assignments`
  - 记录用户在某能力、某维度实体上的显式实体 ID 配置
- `subject_dimension_relations`
  - 记录主体到维度实体的直接关系，用于关系解析补充

`delegations` 也已切到实体维度模型，新增：

- `dimension_entity_code`
- `entity_id`

旧字段 `scope_type` / `scope_value` 仍保留在表结构中，主要用于兼容迁移与过渡查询，不再作为新模型主语义。

## 5. 角色、用户、委派三层职责

### 5.1 角色

角色不再保存具体范围值，只保存策略。

角色侧每个能力只允许一个生效策略：

- `all`
- `self`
- `relation`
- `assignment`

如果一个能力绑定了多个维度实体，前端会把它们展示成互斥选项，例如：

- 按关联组织
- 按用户配置组织

### 5.2 用户授权档案

具体实体 ID 不再录入角色，而统一收敛到用户授权档案。

用户授权档案当前包含：

- `linkedStaffId`
- `resolvedRelations`
  - 当前用户经解析得到的维度实体集合，只读展示
- `scopeAssignments`
  - 仅用于承接 `assignment` 策略对应的实体 ID
- `delegations`
  - 额外 allow 集合，仍受时间窗和状态约束

### 5.3 委派

委派也统一改为维度实体模型。

委派记录不再配置旧式 `scopeType/scopeValue` 语义，而是直接绑定：

- 能力
- `dimensionEntityCode`
- `entityId`
- 时间窗
- 状态

## 6. 接口边界

### 6.1 角色接口拆分

角色基础信息和范围策略拆成两个接口面：

- `POST /roles`
- `PUT /roles/:id`
  - 仅处理角色基础信息和 `capabilityIds`
  - 绑定 `tenant.role.manage`

- `GET /roles/:id/scope-strategies`
- `PUT /roles/:id/scope-strategies`
  - 仅处理 `role_scope_strategy[]`
  - 绑定 `tenant.role.scope.manage`

### 6.2 用户授权档案

用户授权档案接口已统一改为：

- `GET /users/:id/auth-profile`
- `PUT /users/:id/auth-profile`

返回和保存的重点字段为：

- `linkedStaffId`
- `scopeAssignments`
- `delegations`

返回但只读展示的字段为：

- `resolvedRelations`

### 6.3 维度实体引用

为前端选择维度实体记录，新增：

- `GET /scope-dimensions/:dimensionEntityCode/records`

当前已用于：

- 角色范围策略页引用能力支持的维度实体
- 用户授权档案页配置组织实体 ID
- 委派授权页选择委派实体

## 7. 运行时决策逻辑

统一授权服务当前按以下顺序做范围判定：

### 7.1 `all`

直接放行。

### 7.2 `self`

按资源 owner 关系判断。

`self` 是保留的内建策略，不进入范围维度实体目录。

### 7.3 `relation`

取：

- 用户侧通过 `SubjectDimensionResolver` 解析出的维度实体 ID
- 资源侧通过 `ResourceDimensionResolver` 或显式上下文解析出的维度实体 ID

然后做交集判定。

### 7.4 `assignment`

取：

- 资源侧解析出的维度实体 ID
- `user_scope_assignment` 中该能力下的实体 ID

然后做交集判定。

### 7.5 `delegation`

委派作为额外 allow 集合叠加：

- 仍受 `status`、`startAt`、`endAt` 约束
- 仅在资源维度实体与委派实体 ID 命中时放行

### 7.6 多角色合并

多角色按 OR 合并。

一个能力最终只看命中的策略集合是否允许，不再使用 `deny` 规则做反向覆盖。

## 8. `authz/can` 接入要求

模块接入 `authz/can` 时，除 capability 外，还需要明确资源范围上下文。

当前契约新增：

- `resourceEntityCode`
- `resolvedDimensionIds`

推荐顺序如下：

1. 模块自己已拿到资源所属维度时，直接传 `resolvedDimensionIds`
2. 否则传 `resourceEntityCode`，由已注册的 `ResourceDimensionResolver` 解析

如果模块既不传显式维度，也没有注册资源解析器，则 relation / assignment 判定无法成立。

## 9. 当前前端交互

### 9.1 角色页

角色页的数据授权区域已经改成“按能力选策略”：

- 不再录入 `scopeValue`
- 不再录入 `deny`
- 一个能力只保留一个当前生效策略

角色基础信息编辑与范围策略编辑已经拆成两个操作面。

### 9.2 用户授权档案页

用户授权档案当前拆成三块：

- 关联关系快照
- 显式范围配置
- 委派授权

含义分别是：

- 关系快照：只读看当前用户通过解析已命中的组织等维度实体
- 显式范围配置：只为 `assignment` 策略维护实体 ID
- 委派授权：维护时间窗内的额外范围放行

## 10. V1 约束

当前版本刻意做了收敛，边界如下：

- 元数据采用“代码注册 + seed 入库”，不提供平台管理界面
- `all` 与 `self` 保留为内建策略
- “维度实体可扩展”只作用于实体型范围，不影响 `self`
- 仅支持声明式单跳 / 单链解析
- 一个能力只允许一个生效维度策略
- 不支持同一能力多维度并行 OR
- 不再提供 `deny` 配置入口

## 11. 迁移说明

旧模型到新模型的迁移已按 V1 规则做了收敛：

- 旧角色 `all` / `self` 映射到同名策略
- 旧角色 `region` / `department` / `custom` 且带 `scopeValue` 的规则，统一映射到 `organization` 维度下的 `assignment`
- 旧用户 `scope override` 中带实体值的 allow 记录，统一迁移到 `user_scope_assignment`
- 旧委派中带实体值的记录，补齐到 `dimension_entity_code + entity_id`

V1 的前提是假设旧实体型范围都可解释为组织范围。如果历史数据里存在无法解释为组织实体的值，需要单独清洗。

## 12. 新模块接入检查表

模块要接入数据范围授权时，至少完成以下检查：

1. 是否声明了新的范围维度实体，或者确认复用 `organization`
2. 是否声明了用户侧解析链路
3. 是否声明了资源侧解析链路
4. 是否为能力补齐 `capability_scope_target`
5. 是否在前端只暴露角色策略，而不在角色页录入具体实体 ID
6. 是否把具体实体 ID 配置放到用户授权档案或委派里
7. 是否补充 relation / assignment / self / delegation 的验收用例

## 13. 相关文档

- [统一授权接入规范](./authz-module-onboarding.md)
- [底座目标态说明](./base-project-guide.md)
- [环境初始化与基线](./environment-bootstrap.md)
