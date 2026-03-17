---
title: 知名架构与DDD与FSD
date: 2026-3-17
categories:
    - 日济
---
# Hexagonal、Onion、Clean、DDD 与前端 FSD

## 1. 三种后端架构的核心概念、历史背景、原则与详细对比

这三种架构均属于“领域中心（Domain-Centric）”风格，核心目标一致：将业务规则与技术细节严格隔离，依赖方向始终向内（外层依赖内层），使核心逻辑独立于框架、数据库、UI、外部服务等易变部分，从而提升可测试性、可维护性与技术演化能力。

### 1.1 Hexagonal Architecture（六边形架构 / Ports & Adapters）
- **提出者与时间**：Alistair Cockburn，2005 年提出（原名 Ports and Adapters Architecture）。
- **核心隐喻**：应用被视为一个六边形（隐喻强调对称性与多面连接能力，非必须为六边）。
- **关键概念**：
  - **Ports（端口）**：应用核心自己定义的抽象“对话协议”。分为：
    - Inbound Ports（输入端口 / Primary Ports）：描述“外部如何驱动应用”（如 Use Case 接口、Command Handler）。
    - Outbound Ports（输出端口 / Secondary Ports）：描述“应用如何请求外部”（如 Repository 接口、NotificationPort）。
  - **Adapters（适配器）**：具体技术实现，负责翻译外部信号与端口协议。分为：
    - Driving Adapters（驱动适配器 / Primary）：输入侧（Web Controller、CLI、Test Harness、Message Consumer）。
    - Driven Adapters（被驱动适配器 / Secondary）：输出侧（JPA Repository 实现、HTTP Client、Email Sender）。
- **依赖规则**：适配器始终依赖端口，核心只依赖端口定义，完全不知道外部具体技术。
- **内部结构特点**：核心（Application Core）不强制分层，较为自由，可自行加入领域模型组织。
- **解决的原始问题**：传统分层架构中业务逻辑被框架与数据库锁定，导致测试困难、换技术代价极高、自动化测试脚本无法直接驱动应用。
- **典型文件夹描述（文本结构）**：
```
src/
├── application/          # 核心用例 + Inbound/Outbound Ports
├── domain/               # 实体、值对象、领域服务（可选）
├── ports/                # 接口定义（或直接放在 application）
└── adapters/             # 所有具体实现（inbound + outbound）
```

### 1.2 Onion Architecture（洋葱架构）
- **提出者与时间**：Jeffrey Palermo，2008 年提出。
- **核心隐喻**：洋葱层层包裹，最中心是领域模型。
- **关键概念与层级（由内向外）**：
1. **Domain Layer**：纯领域模型（Entities、Value Objects、Aggregates、Domain Services、Domain Events、Business Rules）。无任何技术依赖。
2. **Application Layer**：应用服务（Application Services）、用例编排、Repository 接口、DTO 定义、事务边界。
3. **Infrastructure Layer**：具体技术实现（ORM Repository、外部 API Client、Email Sender、File System 等）。
4. **UI / Presentation / Tests**：最外层。
- **依赖规则**：所有外层依赖内层，内层绝不知道外层存在（依赖倒置原则贯彻到底）。
- **特点**：受早期 DDD 影响，显式强调“领域模型在最中心”，结构更明确。
- **解决的原始问题**：传统 N 层架构的紧耦合（UI 直接依赖 DAL），导致数据库/框架升级时全系统重构。
- **典型文件夹描述**：
```
src/
├── Domain/               # 纯业务模型 + 接口
├── Application/          # 服务 + 用例
└── Infrastructure/       # 具体实现
```

### 1.3 Clean Architecture（整洁架构）
- **提出者与时间**：Robert C. Martin（Uncle Bob），2012 年正式提出（博客文章，后收录于《Clean Architecture》书籍）。
- **核心隐喻**：同心圆（四个主要圈）。
- **详细层级（由内向外）**：
1. **Entities**（最内）：企业级业务实体与规则（跨多个应用通用的核心逻辑，如银行账户转账规则）。
2. **Use Cases**（应用业务规则层）：具体用例编排（Interactors），协调 Entities，处理输入输出转换。
3. **Interface Adapters**（接口适配器层）：Controller、Presenter、Gateway、数据转换器（把外部数据格式转为 Use Case 可接受格式）。
4. **Frameworks & Drivers**（框架与驱动层）：Web 框架、数据库、UI 框架、外部工具等。
- **核心铁律（The Dependency Rule）**：源码依赖只能向内。内层完全不知道外层任何类、框架、具体实现。
- **特点**：规则最严格，强调“框架是细节”“架构要大声喊出业务意图（Screaming Architecture）”。
- **解决的原始问题**：业务规则被框架污染，导致系统脆弱、测试需要真实环境、架构意图不明显。
- **典型文件夹描述**：
```
src/
├── entities/             # 企业实体
├── usecases/             # 用例
├── adapters/             # 接口适配器
└── frameworks/           # 框架驱动
text
```

### 1.4 三者详细对比表

| 维度                   | Hexagonal                                      | Onion                                          | Clean                                          |
|------------------------|------------------------------------------------|------------------------------------------------|------------------------------------------------|
| 提出时间               | 2005                                           | 2008                                           | 2012                                           |
| 隐喻                   | 六边形 + 多端口插拔                            | 洋葱层层包裹                                   | 同心圆 + 依赖规则                              |
| 核心强调               | 边界对称、Ports 与 Adapters                    | 领域模型显式中心 + 分层                        | Dependency Rule + Use Cases 分离               |
| 内部核心结构           | 自由（可自行加 DDD）                           | 强制 Domain + Application                      | Entities + Use Cases 严格分离                  |
| 适配器/端口概念        | 显式且核心概念                                 | 隐含（通过接口实现）                           | 通过 Interface Adapters 体现                   |
| 对“细节”的态度        | 全部是可替换适配器                             | 外层技术细节                                   | 最外层“细节”                                   |
| 依赖严格度             | 中等                                           | 中高                                           | 最高                                           |
| 测试友好度             | 最高（Driving/Driven 适配器可完全 mock）       | 高                                             | 最高（Entities 与 Use Cases 可纯单元测试）     |
| 样板代码量             | 中等                                           | 中等                                           | 较高                                           |
| 团队上手难度           | 中等                                           | 较低（结构直观）                               | 较高（规则严格）                               |
| 典型适用业务复杂度     | 集成密集、多输入输出（微服务、API 重度）       | 复杂领域、长生命周期企业应用                   | 极高维护需求、金融/保险/大型系统               |
| 与 DDD 结合友好度      | 高                                             | 最高                                           | 高                                             |

## 2. DDD（领域驱动设计）在整个体系中的精确定位

DDD（Eric Evans，2003 年《Domain-Driven Design》蓝皮书）**不是架构风格**，而是**领域建模方法论 + 设计哲学**。它回答“业务逻辑本身应该如何理解、表达、切割与组织”。

### 2.1 DDD 两大组成部分
- **战略设计（Strategic Design）**：
- Bounded Context（限界上下文）
- Core Domain（核心域）、Supporting Subdomain、Generic Subdomain
- Context Map（上下文映射：Shared Kernel、Customer-Supplier、Conformist 等）
- Ubiquitous Language（统一语言：代码、文档、业务人员共同语言）

- **战术设计（Tactical Design）**：
- Entity（实体，有唯一标识）
- Value Object（值对象，无身份，可替换）
- Aggregate（聚合根 + 聚合边界，事务一致性边界）
- Domain Event（领域事件）
- Domain Service（领域服务，跨实体逻辑）
- Repository（仓储接口）
- Application Service（应用服务）
- Factory、Specification 等

### 2.2 DDD 与三大架构的精确结合方式
- **最内层**：DDD Entities / Aggregates / Value Objects / Domain Services / Domain Events（纯业务，无任何技术依赖）。
- **Application 层**：Application Services / Use Cases / Command & Query Handlers（编排多个 Aggregate，处理事务）。
- **Ports / Adapters 层**：Repository 接口（Outbound Port）定义在领域或应用层，实现放在 Infrastructure。
- **结果映射**：
- Onion：Domain 层直接承载大部分 DDD 战术元素。
- Clean：Entities 层 = DDD 实体与核心规则；Use Cases 层 = 应用服务。
- Hexagonal：核心 Application + Domain = DDD 模型，Ports 直接对应 Repository / Domain Service 接口。

不结合 DDD 时：架构结构干净，但领域模型易成“贫血模型”（仅数据容器，业务规则散在服务层）。
单独使用 DDD 时：模型表达力强，但易发生技术泄漏（JPA 注解进入 Entity）。
两者结合：领域模型丰富 + 边界严格保护，成为大型复杂系统的标准实践。

## 3. 前端领域的 Feature-Sliced Design (FSD)

FSD 是专为现代前端（React、Vue、Next.js、TypeScript）设计的**业务导向 + 垂直切片**代码组织方法论，可视为“前端原生实现的 Clean Architecture + DDD 战术实践变体”。它强调“按业务特征组织而非技术类型”，解决前端业务规则泄漏、状态碎片化、框架锁定等问题。

### 3.1 FSD 核心结构：Layer → Slice → Segment

**Layer（层）** —— 固定 6 层，依赖严格单向下（上层可依赖下层，下层禁止反向依赖）：

1. **app**
 - 责任：应用整体初始化、全局配置、Provider、路由入口、i18n、Theme、Error Boundary。
 - 示例内容：App.tsx、root providers、global styles。

2. **pages**
 - 责任：路由级页面容器（Next.js App Router / Vue Router 对应）。
 - 内容：页面级组合（组合 widgets + features），不含复杂业务逻辑。

3. **widgets**
 - 责任：页面级可复用大部件（跨页面但仍属特定上下文）。
 - 示例：Header、Sidebar、DashboardMetrics、UserProfileCard。

4. **features**
 - 责任：用户具体功能 / 用例（业务操作入口）。
 - 示例：auth/sign-in、cart/add-to-cart、subscription/checkout、search/advanced-filter。
 - 包含 UI + 状态 + api 调用，但业务规则应下沉到 entities。

5. **entities**
 - 责任：核心业务实体与纯领域逻辑（对应 DDD 战术元素）。
 - 内容：TypeScript 类型 + 纯函数（calculatePrice、validateOrder、isSubscriptionActive 等）。
 - 无任何 UI、状态管理、API 依赖。

6. **shared**
 - 责任：跨所有层与 slice 的原子复用。
 - 内容：ui/（Button、Modal）、lib/（axios 封装、date utils）、config/、constants。

**Slice（切片）** —— 每个层内按业务域垂直划分
- 示例：features/payment/checkout、entities/order、entities/user。
- 同层不同 slice 原则上**禁止直接互相 import**（防止隐形耦合，必须通过 entities 或 shared 中转）。

**Segment（段）** —— 每个 slice 内部按技术目的细分（推荐但非强制）：
- ui / components
- model / store（Zustand、Jotai、Redux slice、纯业务状态机）
- api（TanStack Query hooks）
- lib（纯工具函数）
- types / schemas
- config

### 3.2 FSD 关键约束与规则
- **单向依赖**：严格上层 → 下层。
- **同层隔离**：features/payment/ 不能直接 import features/auth/ 的内容。
- **Public API 原则**：每个 slice 必须通过 index.ts 暴露有限公共接口，内部文件使用相对路径或别名，防止实现细节泄漏。
- **业务逻辑下沉**：features 层只负责编排，核心计算/校验/状态机必须放在 entities 层纯函数。

### 3.3 FSD 与 Clean Architecture 的精确对比

| 维度             | Clean Architecture                     | FSD                                    |
|------------------|----------------------------------------|----------------------------------------|
| 结构隐喻         | 同心圆                                 | 水平层 + 垂直业务切片                  |
| 依赖方向         | 严格向内                               | 单向下（上层依赖下层）                 |
| 业务中心         | Entities + Use Cases                   | entities + features（垂直用例）        |
| 前端优化         | 通用                                   | 专为状态、交互、路由优化               |
| 典型适用         | 后端为主                               | 前端专属（中后台、SaaS、复杂交互）     |

FSD 特别适合中后台管理系统、复杂 SaaS、ToB 产品、大型电商/金融前端、多人协作、微前端、需求频繁变化的项目。
