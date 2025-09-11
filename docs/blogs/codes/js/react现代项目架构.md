---
title: 前端抽象化，打破框架枷锁:react现代化项目中的思想体现
date: 2025-09-11
categories:
  - 编程
  - 抽象前端，架构设计
tags:
  - JS/TS
---
**引言**
这一系列前文分别拆解了多端通讯、HTTP 请求、路由等专题，以及 OOP 在现代前端中的用法。但回到真实项目，时间与经验往往不允许我们一开始就搭一个“理想架构”甚至连设计一个高质量的模块都没时间，更多时候，我们需要在几小时内启动新项目，或在存量代码上渐进式重构、进行二开。
这篇文章给出一套“够用且可演进”的 React 现代化分层实践：把展示、状态/副作用、业务用例与服务边界划清，让组件更轻、逻辑更聚焦、测试更可控；同时尽量与框架解耦，方便未来迁移或替换实现。
文末附有可复制的 AI 提示词，可在 Cursor、VS Code 等 IDE 中约束生成严格遵循本文分层的代码。随着项目演进，建议同步更新提示词以贴合你的领域模型与团队规范。
# 基于 DDD 的前端分层实践（React + TypeScript）

这是一套面向react前端的轻量分层规范，目标是把“展示、状态、副作用、业务逻辑、数据访问”清晰拆开：组件更轻、用例更清晰、服务更可复用、测试更可控。它不追求“全能框架”，而是帮助你在日常迭代中，稳步提升可读性与可维护性。并且将业务逻辑与 React 解耦，方便未来迁移到其他框架（如 Vue、Svelte、原生 Web Components）。

## 架构图
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam packageStyle rectangle
skinparam defaultFontName Menlo

package "UI 层" {
  [Component]
  note right of [Component]
    - 纯展示与交互
    - 允许本地 UI state
    - 不直接操作业务/全局状态
  end note
}

package "状态层" {
  [Hook/Store]
  note right of [Hook/Store]
    - 管理状态与副作用
    - 组合调用 UseCase
    - 向组件暴露 数据+动作
  end note
}

package "业务用例层" {
  [UseCase]
  note right of [UseCase]
    - 编排完整业务流程
    - 领域规则校验
    - 与 React 解耦
  end note
}

package "服务层" {
  [Service]
  note right of [Service]
    - 纯函数/技术细节
    - 外部交互(HTTP/文件/算法)
  end note
}


[Component] --> [Hook/Store] : 触发动作/订阅状态
[Hook/Store] --> [UseCase] : 调用用例
[UseCase] --> [Service] : 调用外部能力
[Service] --> [UseCase] : 结果/错误
[UseCase] --> [Hook/Store] : DTO/结果

@enduml

## 🎯 各层职责与内容

### 1. Component（UI 层）
- 职责: 纯展示与交互承载。
- 包含: React 组件（例如 Modal、Form、Button）、样式与布局、交互事件绑定。
- 设计原则:
  - css使用原子化css（如tailwindcss,unocsss）,一次性解决大量关于css的老问题
  - 可以包含纯 UI 的本地 state（例如弹窗显隐、输入值、hover 状态），但与业务数据分离
  - 不包含业务规则与流程
  - 不直接操作全局/业务状态（通过 Hook/Store 获取数据与动作）
  - 高复用组件尽量保持“更小、更纯”，页面层多写一点没关系，避免把变化集中堆到一个“巨石组件”里

### 2. Hook/Store（状态管理层）
- 职责: 管理可视状态与副作用，承载微型业务 Store，并协调全局 Store；对外暴露“响应式数据 + 动作”。
- 包含:
  - 非 Store 型 Hook：`useState`、`useReducer`、`useEffect`、`useCallback` 等
  - 微型业务 Store：按功能模块拆分的模块级单例 Store（仅存状态与同步修改，不写业务流程）
  - 协调全局 Store：整合用户信息、主题、语言等跨模块状态
  - 将多个 UseCase 进行场景化组合，为组件提供统一的数据接口
- 设计原则:
  - UI 层只关心可视状态；业务数据通过 Hook/Store 提供
  - 协调本地状态、微型 Store 与全局 Store 的边界
  - 处理异步与副作用，把复杂度挡在组件之外
  - 对内调用 UseCase，对外仅暴露数据与交互函数

示例（登录：本地表单 state + 用例调用）
```ts
// hooks/useAuth.ts
import { useState } from 'react'

// 假 UseCase（真实项目替换为注入的 UseCase 实例）
type Credentials = { username: string; password: string }
type User = { id: string; name: string; token: string }

const loginUseCase = async (cred: Credentials): Promise<User> => {
  if (!cred.username || !cred.password) throw new Error('EMPTY')
  return { id: 'u1', name: cred.username, token: 'token-xxx' }
}
const logoutUseCase = async (): Promise<void> => Promise.resolve()

export function useAuth() {
  // 业务相关状态（Hook 管理并暴露）
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const login = async () => {
    setLoading(true); setError(undefined)
    try {
      const u = await loginUseCase({ username, password })
      setUser(u)
    } catch (e) {
      setError('登录失败，请检查账号或稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await logoutUseCase()
    setUser(null)
    setPassword('')
  }

  return {
    username, setUsername,
    password, setPassword,
    user, loading, error,
    login, logout,
  }
}
```

### 3. UseCase（业务逻辑层）
- 职责: 承载“可读的业务流程”，进行领域规则校验与服务编排。用例是变化最频繁的地方，必须一眼读懂、注释清晰。
- 示例:
  ```ts
  // 示例：展示流程可读性与依赖注入
  class DemoUseCase {
    constructor(
      private readonly aService: AService,
      private readonly bService: BService,
      private readonly cStore: Store
    ) {}

    async execute(href: string, storeData: Partial<StoreState>) {
      // 1) 获取 A 数据
      const aData = await this.aService.getA(href);

      // 2) 基于 A 数据获取 B
      const b = await this.bService.getB(aData);

      // 3) 更新 Store（也可选择返回结果，由 Hook/Store 处理）
      this.cStore.update({
        ...storeData,
        b,
      });

      // 推荐返回领域实体/DTO，而非裸数据
      return b;
    }
  }
  ```
- 包含: 业务用例类（如 ImageStoryUseCase、ScriptGenerationUseCase）、完整的业务流程方法、业务规则验证、构建/协调领域实体。
- 设计原则:
  - 用例包含完整的业务流程与校验
  - 协调多个 Service 调用，屏蔽技术细节
  - 返回领域实体或 DTO，而非原始数据
  - 方法“无实例依赖状态”，不把业务长期状态挂在类字段上
  - 与 React 解耦，保持纯 TypeScript

### 4. Service（外部服务层）
- 职责: 集成外部系统与技术细节，提供可复用的“纯函数式”能力。
- 包含: 技术实现（图片处理、网络请求、加解密、格式转换等）、错误包装与重试策略、可被多个 UseCase 复用的函数/模块。
- 设计原则:
  - 尽量写成纯函数：输入 → 输出，不依赖外部闭包/全局状态
  - 所需依赖通过显式参数传入（而非偷偷引用）
  - 聚焦技术细节，屏蔽上层业务语义
  - 与 React 解耦，保持纯 TypeScript

## 📊 状态管理策略
- 功能模块状态: 按“模块”拆分多个微型 Store（而非按页面），优先单例
- 纯 UI 状态: 组件内 useState，与业务解耦，只服务于视觉/交互
- 业务流程状态: 放在 UseCase 的执行流程里，以局部变量或参数传递，避免在类上维护长期状态
- 全局状态: 全局 Store（如用户信息、主题、语言等），仅在确有共享需求时引入

## 数据流向
用户操作 → Component（触发动作） → Hook/Store（协调 Store 与 UseCase） → UseCase（执行业务） → Service（外部交互/数据访问） → Store（更新） → Component（渲染）

## 设计模式应用
- 依赖注入（DI）: UseCase 通过构造函数注入 Service，降低耦合
- 策略模式: 把“可替换的规则/算法”抽象为策略，方便扩展
- 观察者/事件总线: 跨页面、跨组件通信（如 ChatBox）用事件流解耦

## 🧪 测试策略
- Component 层: 不建议做单测，保障可访问性与视觉回归即可
- Hook/Store 层: 不建议做重单测，尽量把复杂逻辑下沉到 UseCase
- UseCase 层: 强烈建议做单测，这是性价比最高的测试点
- Service 层: 被 UseCase 覆盖；必要时做集成/契约测试（API 客户端/SDK 按团队规范）
- 注: 谦卑对象模式（Humble Object Pattern）把难测试的 UI/外部交互与“可测试的核心逻辑”拆开，核心逻辑独立为纯对象做单测。

## 错误处理机制
- 错误分类:
  - 领域错误: 业务规则校验失败（如 StoryValidationError）
  - 基础设施错误: 外部服务/网络失败（如 ImageUploadError）
  - 应用错误: 用例编排/应用层错误（如 UseCaseError）
- 处理流程:
  1. Service 捕获原始错误 → 包装为可识别的应用/基础设施错误
  2. UseCase 根据业务语义抛出领域错误
  3. Hook 统一兜底，将错误转成用户可读的提示与可恢复动作
  4. Component 仅负责展示（不做错误分流与恢复逻辑）

## 性能优化策略
- 状态优化: useMemo 做派生数据，useCallback 控制引用稳定性；适度使用 React.memo，以真实瓶颈为依据
- 业务优化:
  - UseCase 方法尽量“无实例状态”，只依赖入参与返回值
  - 多微型 Store，少巨大组件的本地 state，便于子组件拆分与重用
  - Store 只负责“状态 + 简单的同步修改”，业务流程放入 UseCase
  - 统一 Tailwind 设计令牌（圆角、边框、主题、阴影），减少随意发挥

---

## 🤖 AI 生成提示词（可直接复制使用）

请严格按照“组件 Component → Hook/Store → UseCase → Service”的分层生成 React + TypeScript 代码，并遵守以下约束：

1) 目标与范围
- 输出满足下述“功能描述”的最小可用实现，并提供必要的类型与依赖注入示例。

2) 分层要求（必须遵守）
- Component: 仅展示与交互，不包含业务规则；可以使用纯 UI 的本地 state；不直接读写全局/业务状态；通过 Hook/Store 获取数据与动作。
- Hook/Store: 管理可视状态与副作用；承载微型业务 Store（模块级单例，存状态与同步修改）；协调全局 Store；对内组合调用 UseCase，将用例中逻辑得到的数据变为状态，对外暴露数据与动作。
- UseCase: 编排完整业务流程，做领域校验；不依赖 React；方法不依赖实例长期状态；返回领域实体/DTO（必要时由 Hook/Store 更新状态）。
- Service: 技术细节与外部交互的“纯函数”，所需依赖显式入参传入；不依赖 React；可复用。

3) 错误与边界
- 分类: 领域错误/基础设施错误/应用错误；在 Service 包装原始错误，在 UseCase 识别并抛出领域错误，在 Hook 转换为用户可读信息，哪怕和前面一样，也要有一个单独定义函数调用的过程。


1) 代码风格与命名
- UseCase 命名: XxxUseCase；Service 函数: getXxx/createXxx；错误以 XxxError 结尾。
- 所有模块使用 TypeScript，避免 any（必要时用最小可行类型）。
- 代码简洁、注释清晰，变量命名语义化，避免缩写与模糊词。
请按上述规范完整输出，不要省略分层与类型。
