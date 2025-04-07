<!-- ---
title: 为什么需要TS?更高层次理解
date: 2025-4-3
categories:
  - 编程
tags:
  - JS/TS
--- -->

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
#### 常见实现
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
这看起来不错，就是最标准的TS使用方式，定义类型，定义函数，然后调用，也完成了领导的任务。
但是其实，这便是💩山代码的开始。你的代码和写JS的时候，几乎没有任何区别，只不过是多了一些类型定义而已。
一旦未来发生需求变更，或者功能扩展，这个部分代码将越来越臃肿，越来越难以维护。

#### 换个思路
 **下面我将展示另一种思路，让你从另一种角度思考TS。**
首先，我们确定一点是，我们要做的是一个登录的功能，核心就是登录。至于登录的页面是怎样的，登录后要做什么，都并不是核心部分。
那么我们就以这个核心部分，建立一个抽象登录模块，登录模块我们简单的拆分为两个部分：**数据部分**和**业务逻辑部分**
数据部分,需要登录的参数和返回值。
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
接下来是实现部分，我采用类的方式来写这个，会更容通用，如果你是react玩家，你将其实现为hook也是完全没问题的
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
最后就是使用的地方，我们只需要传入登录服务，就可以完成登录。
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
同样的，如果需要添加手机号登录，我们只需要在登录服务中添加一个手机号登录的实现，然后调用的时候切换一下登录方式即可。
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


> 提示:对于登录功能来说,策略模式是再适合不过的设计模式了
看，我们对这个登录模块进行了抽象，将每个不同部分都独立开来了。它从杂乱不堪的样子，变得井井有条。需要注意的是，我们登录页面并没有硬性的依赖LoginService，而是依赖于Login，LoginService只是Login的一个实现。

更多的，如果要扩展注册，只需要在登录模块中添加一个注册的实现，然后调用的时候切换一下登录方式即可。
### 第二个例子:http请求
通常的TS项目中的请求,简单来说就是以下结构
#### 常见的请求流程
```ts
// 一个封装了的axios
export const request =  axios.create({
  baseURL: 'http://localhost:3000'
})
//  ... 拦截器, 请求, 响应, 错误处理, 等等
//一个api文件,你可能会这样写
interface apiParams {
  id:number
}
// 定义请求的结果
interface apiResult {
  data:any
}
export function getApi(params:apiParams):apiResult {
  return request.get('/api',{params})
}

// 你可能会这样使用
import {getApi} from '@/api/api.ts'
function getData (){
  getApi({id:1}).then(res=>{
    console.log(res)
    // 处理数据 放到可以响应式更新页面的状态中
  })
}
```
通常的这种结构,其实简单,且容易理解,但是当你的项目需要迁移到另一个项目中,或者需要迁移到另一个框架中,axios不再可以使用,你可能会发现,你之前的代码,已经无法满足新的需求了.你需要一些把要复用的请求,复制到新的项目中,但是只有请求的类型和url是复用的,其他部分要重新写.亦或者一个页面引入了大量请求,导致这个文件非常臃肿,难以维护.当很久之后你需要去理解和修改这个文件时,你得一点点去找到数据的前世今生,才知道每个接口是干嘛的
亦或者,你的团队有一个很不错的生态,有自动生成api请求的工具或者其他的什么,那样其实也很不错,但是我这里要说的,还是一种思路的变更,它可以让你在面对需求变更的时候,更加从容.也能帮助你的团队,**建立这样的美好的生态**
#### 换个思路
对于一个接口请求,在乎的,只是参数、地址、方式、返回值,而请求的实现,以及什么取消重复,拦截,都并不重要.所以我们要将这个东西抽象出来,让接口请求函数不再依赖某个具体实现,而是任何一个满足其需求的东西
```ts
// request.ts
// 请求的类型
export const enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}
export interface RequestParams<T = any> {
  url: string;
  method: RequestMethod;
  data: T;
}
// 请求的返回值
export interface RequestResult<T = any> {
  data: T;
  status: number;
  message: string;
}
// 请求的函数
export interface Request<P = any,R = any>{
    (params:RequestParams<P>):Promise<RequestResult<R>>
}

// 这里也为请求模块.编写一个基础抽象类,我们用类去整理出一个一个模块的请求函数,而不是只是平铺在文件里
export abstract class AsyncBase {
  request:Request
  constructor(request:Request){
    this.request = request
  }
}
```
接下来是其实现,我们有了基础抽象类,就可以去实现具体的请求函数了
```ts
// axios.ts
// 使用axios
import axios from 'axios'
import type {Request,RequestParams,RequestResult} from './request.ts'
const axiosRequest=  axios.create({
  baseURL: 'http://localhost:3000'
})
// 使用axios的request方法
export const request:Request = (params:RequestParams)=>{
  // 这里你需要一些操作去让axios 符合Request的类型，这也就是适配器模式的思想了
  return axiosRequest(params)
}
```
```ts
// demoApi.ts
import type {Request,RequestParams,RequestResult} from './request.ts'

interface apiParams {
  id:number
}
// 定义请求的结果
interface apiResult {
  data:any
}

export class demoApi extends AsyncBase {
  /*
  * 请求数据的
  */
  getApi(params:apiParams):Promise<apiResult> {
    return this.request<apiParams,apiResult>({url:'/api',method:RequestMethod.GET,data:params})
  }
}
```
当你用起来后,不同部分将用不同的请求模块,不同模块有它的不同请求列表,你可以拥有IDE提示的来完成你的请求,而不是在文件中到处找.
```ts
// 使用
import {demoApi} from './demoApi.ts'
import {request} from './axios.ts'
// 初始化一个请求模块  依赖注入一个request,其实这个你可以放到全局，使用单例模式，给全局使用
const demo = new demoApi(request)
demo.getApi({id:1}).then(res=>{
  console.log(res)
})
```
这种方式,相比于第一种,你的request可以

### 例子中的内容总结
你可以清楚的看出来,TS类型系统的两种用法的不同,因为思考方式的不同,导致代码的结构也不同.

- 第一种方式,是传统的TS使用方式,定义类型,定义函数,然后调用.这是一个常见的开发者的思考方式,也是TS的常见使用方式.
- 第二种方式,是TS的另一种使用方式,去思考需求有哪些部分,然后依赖关系应该是怎样的,然后去设计模块之间的关系,让它们容易修改,容易扩展,且结构清晰.这才是更像一名 **"工程师"** 的思考方式.你不再只是去实现需求,而是去设计系统来满足需求,且为未来可能的需求变更,留下了足够的扩展空间.




