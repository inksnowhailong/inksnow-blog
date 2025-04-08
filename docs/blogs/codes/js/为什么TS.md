---
title: TypeScript：从类型工具到前端系统设计的跃迁
date: 2025-4-8
categories:
  - 编程
tags:
  - JS/TS
---

# TypeScript 是什么？
*你是否曾觉得 TypeScript 只是给 JavaScript 加了个类型“紧身衣”？本文不聊基础的 JS vs TS 对决，而是带你走进一个更高层次的视角——如何用 TS 从“码农式写代码”转型为“工程师式设计系统”。通过两个简单例子，我将展示 TS 不仅是工具，更是思维方式的革命。*
## 官方定义
TypeScript（简称 TS）是一种由微软开发的开源编程语言，作为 JavaScript 的超集，通过引入静态类型系统扩展了其能力。TS 代码能够编译为纯 JavaScript，从而在任何支持 JavaScript 的环境中运行，包括但不限于浏览器、Node.js、Deno、Bun 以及各类应用程序。

> **官方描述**：TypeScript 为 JavaScript 添加了附加语法，以支持与编辑器更紧密的集成，在开发阶段尽早捕获错误，从而提升代码质量和开发效率。

## 不同视角下的 TypeScript

### 消极观点
对于持怀疑态度的开发者而言，TypeScript 的优势在项目中并不显著。他们倾向于认为，JavaScript 的灵活性完全够用，TS 的类型约束反而像“绑手绑脚”。在资源有限或追求快速交付的场景下，TS 常被视为“锦上添花”而非必需品。

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
提到类型严格，后端的老大哥 Java 不得不提。它天生带着静态类型和面向对象的光环，架构师们靠着业务抽象和系统设计，构建出复杂而稳定的系统。反观前端，过去我们忙着调 CSS、拼页面，类型安全似乎离得很远。

TypeScript 于我而言，像是给前端进化出了更高的“工程化”的能力。它不仅让代码更安全、IDE 更聪明，还赋予了我们更高层次的能力——**业务抽象与系统设计**。这种能力让前端不再只是“画图工具”，而是具备了更高层次的解耦与设计能力。这种能力在复杂项目中尤为关键，能够帮助前端开发者构建更具结构化、可维护性的系统，能扛起复杂项目的核心支柱。

## 来点例子 🌰
接下来，我们将通过示例展示 TS 在前端开发中的两种使用方式，突出其在抽象设计和解耦上的价值。


### 先以一个简单例子开始：登录
#### 常见实现
在开发一个登录功能时，我们可以从一个最简单的示例开始，逐步完成页面开发任务。下面是一个极简的实现，我省略了很多复杂细节，但这正是 TypeScript 使用者的典型做法：先定义类型，再声明函数，最后调用它来实现功能。

```ts
// 定义用户数据的类型
interface LoginParams {
  username: string;
  password: string;
}

// 模拟一个登录数据，其会渲染到页面上
const data: LoginParams =   { username: "admin", password: "123456" },

// 登录函数，接收用户名和密码，返回登录结果
async function login(params:LoginParams): Promise<{ success: boolean; message: string }> {
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
就在你觉得登录功能已经完美无缺的时候，某天领导突然发话：“我们得支持手机号登录，光靠账户密码可不行！”于是，你卷起袖子，开始改代码。
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

async function login(params:LoginParams | PhoneLoginParams): Promise<{ success: boolean; message: string }>{
  let res:Promise<{ success: boolean; message: string }>
  // 你根据状态切换登录方式
  if(loginType === "phone") {
   res = await request.phoneLogin(params)
  } else {
    res = await request.login(params)
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
这个实现看起来挺不错，完全符合 TypeScript 的标准套路：定义类型，声明函数，然后调用。领导的任务完成了，皆大欢喜！但别急着庆祝——这其实是💩山代码的起点。
仔细一看，你的代码跟直接用 JavaScript 写几乎没啥区别，无非是多加了几个类型定义而已。

#### 换个思路
下面，我将带你换个角度，用另一种方式思考 TypeScript 的用法，彻底告别💩山代码。

首先，我们得明确一件事：我们要实现的是一个登录功能，核心就是“登录”这件事。至于登录页面长什么样，登录后跳转哪里，这些都不是重点。那么，为什么不围绕这个核心，构建一个抽象的登录模块呢？我们可以简单地把登录模块拆成两部分：**数据部分**和**业务逻辑部分**。

- 数据部分：定义登录所需的参数和返回值，清晰明了。
``` ts
// login.domain.ts
// 登录的参数
export interface LoginParams {
  username: string;
  password: string;
}
//登录的结果
export interface loginResult {
  success:boolean;
  message:string
}

// 登录服务模块
export interface Login {
  login(params:LoginParams):Promise<loginResult>
}

```
- 实现阶段：我选择用类的形式来编写这个登录模块，因为它通用性更强，结构清晰。不管你是用什么技术栈，哪怕是 React 玩家，也可以轻松把这个逻辑改成 Hook，完全没问题。
```ts
// login.service.ts
import type {LoginParams,loginResult,Login} from './login.dto.ts'
exort class LoginService implements Login {
  // 登录
  async login(params:LoginParams):loginResult {
    const res = await request.login(params)
    if(res.code === 200) {
      return { success: true, message: "登录成功" }
    } else {
      return { success: false, message: "登录失败" }
    }
  }
}
```
- 使用阶段：我们只需要传入登录服务，就可以完成登录。
```ts
// login.tsx/login.vue/login.html
import type {Login,LoginParams} from './login.dto.ts'
import {LoginService} from './login.service.ts'
// 初始化一个登录服务
const login:Login = new LoginService()
// 登录的参数
const data:LoginParams = {username:"admin",password:"123456"}
// 登录
login.login(data).then(res=>{
  console.log(res)
})
```
- 扩展阶段：如果需要添加手机号登录，我们只需在登录服务中新增一个手机号登录的实现，然后在调用时切换一下登录方式，就能无缝搞定。
``` ts
// login.domain.ts
// 登录的参数
export interface LoginParams {
  username: string;
  password: string;
}

// 我们增加了手机号登录的参数
export interface PhoneLoginParams {
  phone: string;
  code: string;
}

//登录的结果
export interface loginResult {
  success:boolean;
  message:string
}
// 登录服务
export interface Login {
  login(params:LoginParams):Promise<loginResult>
  phoneLogin(params:PhoneLoginParams):Promise<loginResult>
}

```
```ts
// login.service.ts
import type {LoginParams,loginResult,Login} from './login.dto.ts'

export class LoginService implements Login {
  async login(params:LoginParams):loginResult {
    const res = await request.login(params)
  }
  // 手机号登录
  async phoneLogin(params:PhoneLoginParams):loginResult {
    const res = await request.phoneLogin(params)
    if(res.code === 200) {
      return { success: true, message: "登录成功" }
    } else {
      return { success: false, message: "登录失败" }
    }
  }
}
```
```ts
// login.tsx/login.vue/login.html
import type {Login,LoginParams,PhoneLoginParams} from './login.dto.ts'
import {LoginService} from './login.service.ts'
// 初始化一个登录服务
const login:Login = new LoginService()
// 登录的参数
const data:LoginParams = {username:"admin",password:"123456"}
// 手机号登录的参数
const data2:PhoneLoginParams = {phone:"12345678901",code:"123456"}
// 登录
login.login(data).then(res=>{
  console.log(res)
})
// 手机号登录
login.phoneLogin(data2).then(res=>{
  console.log(res)
})
```

@startuml
package "登录模块" {
  interface Login {
    +login(params: LoginParams): Promise<loginResult>
    +phoneLogin(params: PhoneLoginParams): Promise<loginResult>
  }

  class LoginService {
    +login(params: LoginParams): Promise<loginResult>
    +phoneLogin(params: PhoneLoginParams): Promise<loginResult>
  }

  class LoginParams {
    +username: string
    +password: string
  }

  class PhoneLoginParams {
    +phone: string
    +code: string
  }

  class loginResult {
    +success: boolean
    +message: string
  }
}

package "登录页面" {
  class "login.tsx/login.vue/login.html" as LoginPage {

  }
}

LoginService ..|> Login
Login --> LoginParams
Login --> PhoneLoginParams
Login --> loginResult
LoginPage --> Login
@enduml


>提示：对于登录功能来说，策略模式简直是天作之合。
看看我们做了什么：通过对登录模块进行抽象，把每个部分都独立拆分出来。原本杂乱无章的代码，瞬间变得井井有条。

更妙的是，登录页面并不直接依赖具体的 LoginService，而是依赖一个抽象的 Login 接口。LoginService 只是 Login 的一个实现而已，这种设计让扩展性变得非常高。

比如，要加个注册功能怎么办？很简单：在登录模块中新增一个注册的实现，然后调用时切换一下方式即可完成需求
### 第二个例子:数据持久化
这次，我们再用另一个简单的例子。
假设登录功能完成后，我们需要存储 token 和一些用户数据。这样，后续调用接口时就能直接使用，还能实现一段时间内的免登录。
> 注意，这里我用 class 的方式实现，主要是为了让整体思路更直观。不过实际开发中，关键是思路的转变，你完全可以用其他方式（比如函数式或 Hook）来实现
#### 常见实现
```ts
interface loginResult {
  token:string
  user:User
}

// 某个登录模块
class LoginService {
  async login():loginResult {
    const res = await request.login()
        // 储存token
    localStorage.setItem("token",res.token)
    // 储存用户数据
    localStorage.setItem("user",JSON.stringify(res.user))
    return res
  }
  async getSomeData() {
    const user = localStorage.getItem("user")
    const res = await request.getSomeData({
      id:user.id
    })
    return res
  }
}
```
流程很简单：先发起数据请求，把获取到的数据存储到本地；下次需要时，直接从本地读取数据，再调用接口使用。

#### 换个思路
对于前端来说，数据持久化并不陌生，常见的方案有 localStorage、sessionStorage、Cookie，或者直接把数据丢进状态管理工具，比如 Vuex、Pinia、Redux 等等。
但站在业务的角度，我们其实只关心两件事：拿到数据和存入数据。至于数据最终存在哪里，那是实现层面的细节，不应该干扰业务逻辑。
``` ts
// storage.ts
// 数据持久化模块
export interface DataPersistence {
  setData(key:string,data:any):void
  getData(key:string):any
}
```
然后我们以某种方式，实现这个持久化的接口
```ts
// storage.service.ts
import type {DataPersistence} from './storage.ts'
export class StorageService implements DataPersistence {
  setData(key:string,data:any):void {
    localStorage.setItem(key,data)
  }
  getData(key:string):any {
    return localStorage.getItem(key)
  }
}
```
在业务代码中，我们直接依赖持久化的抽象，而不是具体的实现。
这样一来，无论是切换到 localStorage 还是sessionStorage，甚至其他存储方式，都不需要改动业务逻辑，灵活又省心。
```ts
// demo.ts
import type {DataPersistence} from './storage.ts'

interface loginResult {
  token:string
  user:User
}
// 某个登录模块
class LoginService {
  constructor(private storage:DataPersistence) {
  }
  async login():loginResult {
    const res = await request.login()
    this.storage.setData("token",res.token)
    this.storage.setData("user",JSON.stringify(res.user))
    return res
  }
  async getSomeData() {
    const user = this.storage.getData("user")
    const res = await request.getSomeData({
      id:user.id
    })
    return res
  }
}
```
**抽象的力量**
瞧，我们不再纠结数据存在哪里，而是专注于数据如何使用。依赖抽象，而非具体实现，这恰恰体现了**依赖倒置原则**和**单一职责原则**的精髓。

我并不是面向对象的狂热粉丝，这里也不是要鼓吹面向对象。但不得不说，对于当前的前端开发来说，面向对象的思维也是不可缺少的。
#### 图示变化
接下来，我用图示来直观展示这种设计上的转变。

**常规实现**：通常的做法是这样的，两个模块之间直接耦合，登录模块硬依赖具体的实现，比如
@startuml
 class login
 object localStorage

 login ..|> localStorage
@enduml

另一种思路是，让登录模块依赖一个抽象的持久化接口（比如 DataPersistence），而具体的实现（比如 localStorage）可以随时切换，互不干扰。
@startuml
 class login

 interface DataPersistence

 class localStorage

 login ..|> DataPersistence
 localStorage ..|> DataPersistence
@enduml

## 总结
从例子中，你可以清楚地看出 TypeScript 类型系统两种用法的差异。不同的思考方式，直接决定了代码结构的迥异。

- 第一种方式：传统的 TS 使用套路——定义类型，声明函数，然后调用。这是大多数开发者的习惯，也是 TS 的常见用法，简单直接，但容易陷入“实现即完事”的思维。
- 第二种方式：TS 的另一种玩法——先拆解需求，梳理依赖关系，再设计模块间的结构。这样的代码易修改、易扩展，层次分明。这更像是一位 **“工程师”** 的思考方式：你不再只是完成需求，而是设计一个系统，既能满足当前需要，又为未来的变化预留空间。

**这样做的明确好处**
这种设计带来的优势显而易见，以下是几点核心收益：

1. **长远维护性：**项目更容易维护和扩展，某处改动的影响范围更小，减少“牵一发而动全身”的风险。
2. **结构清晰：**代码层次分明，不会随着时间推移变得臃肿不堪，想找个改动点也不用翻天覆地。
3. **高复用性：**依赖关系更合理，模块间的逻辑解耦，迁移某个功能到其他项目时轻而易举。
4. **单元测试友好：**前端写单元测试往往费力不讨好，但通过模块划分和明确的依赖关系，单元测试变得可行且有价值。**这部分我之后会在另一篇博客详细展开。**
5. **AI 时代的竞争力：**AI 能轻松搞定框架和库的使用，但它不懂你的业务，更不会为未来设计系统。这种能力将**让你在 AI 时代不可替代。**

**尾声**
想让代码从💩山变艺术品？试试这种思维吧！欢迎留言聊聊你的 TS 心得，或者关注我，我会尽我所想，分享给你。
