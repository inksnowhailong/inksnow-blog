---
title: 为什么需要TS?更高层次理解
date: 2025-4-3
categories:
  - 编程
tags:
  - JS/TS
---

# TypeScript 是什么？

## 官方定义
TypeScript（简称 TS）是一种由微软开发的开源编程语言，作为 JavaScript 的超集，通过引入静态类型系统扩展了其能力。TS 代码能够编译为纯 JavaScript，从而在任何支持 JavaScript 的环境中运行，包括但不限于浏览器、Node.js、Deno、Bun 以及各类应用程序。

> **官方描述**：TypeScript 为 JavaScript 添加了附加语法，以支持与编辑器更紧密的集成，在开发阶段尽早捕获错误，从而提升代码质量和开发效率。

## 不同视角下的 TypeScript

### 消极观点
对于持怀疑态度的开发者而言，TypeScript 的优势在短期或小规模项目中并不显著。他们倾向于认为，JavaScript 的动态特性提供了更高的灵活性，而 TS 的类型约束反而成为一种限制，降低了快速迭代的自由度。在资源有限或追求快速交付的场景下，TS 常被视为“锦上添花”而非必需品。

- **典型看法**：
  - “小项目用 TS 纯属浪费时间，JS 够用了。”
  - “类型错误运行一下就能发现，TS 的编译报错反而烦人。”

### 积极观点
对于大多数拥护者来说，TypeScript 的核心价值在于显著提升代码质量、增强 IDE 支持（如智能提示和类型推断）以及优化团队协作效率。尽管它引入了学习曲线和初期配置成本，但在中大型项目或需要长期维护的场景中，其收益远超投入。即使在小型项目中，TS 的类型推断和轻量配置也能为开发带来便利。

- **核心优势**：
  - 减少运行时错误，提高代码健壮性。
  - 通过类型定义提升代码可读性和可维护性。
  - 增强开发体验，借助现代工具链提高效率。

## 时代背景与趋势
随着前端生态的演进，主流框架如 Vue、React 和 Angular 逐渐拥抱 TypeScript，同时 Node.js 生态也在向 ESM（ECMAScript Modules）规范靠拢。这种趋势表明，TS 的发展并非偶然，而是对类型安全和工程化需求的响应。它不仅带来了更高的安全性，还通过 IDE 的强大支持，让前端开发者也能享受到类型严格带来的红利。

> **问题**：但 TS 的价值仅限于此吗？它是否还有更深层次的意义？

## 深入一步：类型系统与前端的进化
当我们谈到类型严格时，不得不提及后端领域的主流语言——Java。Java 天生具备静态类型系统和面向对象编程（OOP）特性。对于 Java 程序员或后端开发者而言，随着职业生涯的深入，发展路径通常分为两条：
- **管理方向**：如技术总监，聚焦团队管理和战略规划。
- **技术极致**：如架构师，追求技术深度与系统设计能力。

对于架构师而言，相较于高级工程师，其技术能力不仅体现在编程语言和框架的精通，更在于**系统设计能力**。而系统设计能力的核心包括：
1. **业务理解**：将业务需求转化为技术方案。
2. **抽象设计**：通过模块化、解耦和复用提升系统可扩展性。

回到前端，TypeScript 的引入为前端开发注入了类似的潜力。TS 不仅让代码更安全、IDE 提示更智能，还赋予了前端更强的**业务抽象能力**。它使得前端开发不再局限于界面实现，而是具备了更高层次的解耦与设计能力。这种能力在复杂项目中尤为关键，能够帮助前端开发者构建更具结构化、可维护性的系统。

## 来点例子 🌰
接下来，我们将通过示例展示 TS 在前端开发中的两种使用方式，突出其在抽象设计和解耦上的价值。本文**不以 JS 与 TS 的直接对比**为重点（那更适合基础教程），而是旨在展示一种思维方式的转变——从“写代码”到“设计工程”。

### 先以一个简单例子开始：登录
我们从一个最简示例来演示，这是一个登录功能，你首先编写了这样的一个登录功能来完成页面开发的任务。我简化了很多东西，但是通常来说TS使用者，就会这样，定义类型，定义函数，然后调用。
```ts
// 定义用户数据的类型
interface LoginParams {
  username: string;
  password: string;
}

// 模拟一个登录数据，其会渲染到页面上
const data: LoginParams =   { username: "admin", password: "123456" },

// 登录函数，接收用户名和密码，返回登录结果
async function login(params:LoginParams): { success: boolean; message: string } {
  const res = await request.login(params)
    if(res.code === 200) {
      return { success: true, message: "登录成功" }
    } else {
      return { success: false, message: "登录失败" }
    }
}

// 示例调用
const result1 = login("admin", "123456");
console.log(result1); // { success: true, message: "登录成功" }
```
然后突然某一天，领导说，我们得加个手机号登录，不能仅仅是账户密码了，于是你开始修改代码。
```ts
interface LoginParams {
  username: string;
  password: string;
}
// 新增手机号登录
interface PhoneLoginParams {
  phone: string;
  code: string;
}
// 你定义了一个状态，用于切换登录方式
type LoginType = "phone" | "password"

const loginType: LoginType =  "phone"
const data: LoginParams = { username: "admin", password: "123456"}
const data2: PhoneLoginParams = { phone: "12345678901", code: "123456"}

async function login(params:LoginParams | PhoneLoginParams): { success: boolean; message: string } {
  let res:Promise<{ success: boolean; message: string }>
  // 你根据状态切换登录方式
  if(loginType === "phone") {
   res = await request.phoneLogin(params)
  } else {
    res = await request.passwordLogin(params)
  }

  if(res.code === 200) {
    return { success: true, message: "登录成功" }
  } else {
    return { success: false, message: "登录失败" }
  }
}

// 现在你拥有了两种登录方式，你可以在运行时切换登录方式
loginType = "password"
login(data).then(res=>{
  console.log(res)
})

loginType = "phone"
login(data2).then(res=>{
  console.log(res)
})
```
这看起来不错，就是最标准的TS使用方式，定义类型，定义函数，然后调用，也完成了领导的任务。
但是其实，这便是💩山代码的开始。你的代码和写JS的时候，几乎没有任何区别，只不过是多了一些类型定义而已。
一旦未来发生需求变更，或者功能扩展，这个部分代码将越来越臃肿，越来越难以维护。

**下面我将展示另一种思路，让你从另一种角度思考TS。**
同样，从最开始的登录功能开始，这一次，我们将抽离出，页面关心的部分和业务逻辑部分。
```ts

/**
 * dto 将业务涉及的数据，抽离出来，脱离框架，脱离页面。
 * 思考一下页面关心的部分，即UI部分，它们真正依赖的是什么？
 **/

// 登录所需参数
interface LoginParams {
  username: string;
  password: string;
}

// 登录结果
interface LoginResult {
  success: boolean;
  message: string;
}

// 登录的方法，它根本就不应该关心登录所需参数和逻辑，它只管拿到登录的结果才对
interface LoginMethod<T extends Record<string, any>> {
  (params:T): Promise<LoginResult>
}

/**
 *业务逻辑部分，让登录的功能，脱离框架，脱离页面。
 **/
// 这里采用面向对象方式来展示
class Login {
  private userlogin: LoginMethod<LoginParams>

   loginMethod(params:Record<string, any>): Promise<LoginResult> {
    return this.userlogin<T>(params)
  }
}

/**
 * view 页面
 * 思考一下页面关心的部分，即UI部分，它们真正依赖的是什么？
**/

// 模拟一个登录数据，其会渲染到页面上
const data: LoginParams =   { username: "admin", password: "123456" },

// 一个登录的业务模块
const login = new Login()

// 登录

login.loginMethod<LoginParams>(data).then(res=>{
  console.log(res)
})
```
然后同样的，迎来了需求变更，需要增加手机号登录，于是你开始修改代码。
```ts


/**
 * dto
 **/

// 登录所需参数
interface LoginParams {
  username: string;
  password: string;
}

// 手机号登录所需参数
interface PhoneLoginParams {
  phone: string;
  code: string;
}

// 登录类型
const enum LoginType {
  USERNAME = "username",
  PHONE = "phone"
}

// 登录结果
interface LoginResult {
  success: boolean;
  message: string;
}

// 登录的方法，它根本就不应该关心登录所需参数和逻辑，它只管拿到登录的结果才对
interface LoginMethod<T extends Record<string, any>> {
  (params:T): Promise<LoginResult>
}

/**
 *业务逻辑
 **/
class Login {
  loginType: LoginType

  // 账户密码登录
  private userlogin: LoginMethod<LoginParams> = async (params:LoginParams): Promise<LoginResult> => {
    const res = await request.login(params)
    if(res.code === 200) {
    return { success: true, message: "登录成功" }
    } else {
    return { success: false, message: "登录失败" }
    }
  }

  // 手机号登录
  private phonelogin: LoginMethod<PhoneLoginParams> = async (params:PhoneLoginParams): Promise<LoginResult> => {
    const res = await request.phoneLogin(params)
    if(res.code === 200) {
      return { success: true, message: "登录成功" }
    } else {
      return { success: false, message: "登录失败" }
    }
  }

  loginMethod(params:Record<string, any>): Promise<LoginResult> {
    const type = this.validateLoginType(params)
    switch(type) {
      case LoginType.USERNAME:
        return this.userlogin<T>(params)
      case LoginType.PHONE:
        return this.phonelogin<T>(params)

    }
  }

  validateLoginType(params:Record<string, any>): LoginType {
    if("username" in params) {
      return LoginType.USERNAME
    } else if("phone" in params) {
      return LoginType.PHONE
    } else {
      throw new Error("参数错误")
    }
  }
}

/**
 * view 页面
 * 思考一下页面关心的部分，即UI部分，它们真正依赖的是什么？
**/

// 模拟一个登录数据，其会渲染到页面上
const data: LoginParams =   { username: "admin", password: "123456" },
const data2: PhoneLoginParams = { phone: "12345678901", code: "123456"}
// 一个登录的业务模块
const login = new Login()
// 登录
login.loginMethod<LoginParams>(data).then(res=>{
  console.log(res)
})

login.loginMethod<PhoneLoginParams>(data2).then(res=>{
  console.log(res)
})
```
这样的方式，你的页面就明显了有不同的层次，高层数据，中层业务逻辑，低层页面。依赖关系只会是低层次依赖高层次，而不会是高层次依赖低层次。







