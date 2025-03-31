---
title: 前端抽象化，打破框架枷锁:Http请求也许该一样
date: 2025-03-31
categories:
  - 编程
  - 抽象前端，架构设计
tags:
  - JS/TS
---

## 前言
发送请求的库，和方法，有几种常用的，axios、fetch、uni.request等
通常我们会在一个文件中，写入大量长得几乎一模一样的函数，只是参数稍微改变，来储存大量请求函数
但是一旦使用的库变化了，这些或多或少，会有微调，如今我们将其抽象出来，让我们的使用变统一，让其实现解耦合，达到更高的复用性和可维护性。

## 内容核心
1. **请求参数与响应数据**
规定好参数和数据的格式，是整个系统的基础。将这部分提出来，让它们独立于具体实现。这样，你就能在不同的请求库中保持一致性，避免重复造轮子。
2. **核心业务逻辑**
请求方法的核心逻辑是最重要的部分。它负责处理请求和响应，确保数据的正确性和完整性。同时请求的拦截器是最常用的功能，同样直接在这里抽象出来，以确定最重要的功能。
3. **责任链**
另外的就是一个责任链设计，为了在拦截器中加入多个独立的功能，避免在请求方法中加入大量的逻辑判断，避免💩山代码。

4. **插件**
而插件，则是要去实现责任链，让每个插件都使用责任链模式来链接，这样就能在请求方法中，轻松地添加、删除或修改插件，而不需要改动核心逻辑。你可以根据需要自由组合插件，形成不同的请求方式。比如，你可以有一个插件专门处理错误，一个插件专门处理缓存，还有一个插件专门处理重试等。这样，你就能根据实际需求灵活调整请求的行为，而不需要修改核心代码。

不过，这个部分的插件我写了三个示例，实际你可以自己来定义都有什么

5. **适配器**
适配器很适合这种实现不同的情况，比如你需要在不同的环境中使用不同的请求库，或者你需要在不同的请求库中使用相同的请求方式。适配器可以帮助你实现这些需求，让你的代码更加灵活和可扩展。当然你也可以采用工厂模式，工厂模式能让你获得更多自由度，适配器模式则是可以更简单，而且通常来说一个项目，只会使用一个请求库，所以适配器模式更适合这种情况。

### 宏观的整体依赖关系
@startuml 宏观模块依赖关系

left to right direction

' 定义模块
package "DTO" {
  [Data Structures]
}

package "Core" {
  [Core Logic & DutyChain]
}

package "Framework Adapters" {
  [Request Adapters]
}

package "Plugins" {
  [Request Plugins]
}

package "Application" {
  [Business Logic]
}

' 模块之间的依赖关系
[Application] -up-> [Framework Adapters] : 实现
[Framework Adapters] -up-> [Core] : 依赖
[Framework Adapters] -up-> [Plugins] : 依赖
[Plugins] -up-> [Core] : 依赖
[Core] -up-> [DTO] : 依赖


@enduml

### 涉及的设计模式
- **责任链模式**:通过责任链模式，请求和响应的处理可以动态组合多个插件，增强扩展性和灵活性
- **适配器模式**:通过适配器模式，可以在不同的请求库之间切换，而不需要修改核心逻辑代码

## 设计的TS抽象源码
::: tip 提示
这里是一个设计的抽象模型，你可以根据这个模型去实现你的路由导航系统。无视框架，甚至无视语言，只要你能实现这个模型，你就可以在任何地方使用这个请求系统。
其他平台不是ts语言怎么办？**AI会出手，助你转译**
:::
[如果你不想先看这些源码，而是想看看图像👇](#图像也许会帮你更好的理解)
:::: code-group
::: code-group-item DTO
```ts
/**
 * HTTP 请求方法枚举
 */
export const enum RequestMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH"
}

/**
 * 请求参数接口
 */
export interface RequestParams<T = any> {
    /** 请求的 URL */
    url: string;
    /** 请求方法 */
    method: RequestMethod;
    /** 请求头 */
    headers?: Map<string, string>;
    /** 请求体数据（可选） */
    data?: T;
    /** 查询参数（可选） */
    params?: Map<string, string>;
    /** 元信息（可选） */
    meta?: Map<string, any>;
}

/**
 * 响应数据接口
 */
export interface ResponseData<T = any> {
    /** 响应状态码 */
    status: number;
    /** 响应消息 */
    message: string;
    /** 响应数据 */
    data: T;
    /** 元信息（可选） */
    meta?: Map<string, any>;
}

```
:::
::: code-group-item Core
```ts
import { RequestParams } from "./DTO";
import { ResponseData } from "./DTO";

/**
 * 请求方法接口
 */
export interface IRequestMethod {
    /**
     * 发起 HTTP 请求
     * @param params 请求参数
     * @returns 响应数据
     */
    <P,R>(params: RequestParams<P>): Promise<ResponseData<R>>;
}

/**
 * 请求拦截器接口
 */
export interface IRequestInterceptor {
    /**
     * 请求前的拦截处理
     * @param params 请求参数
     * @param options 可选配置
     * @returns 修改后的请求参数
     */
    beforeRequest(params: RequestParams, options?: any): Promise<RequestParams>;
}

/**
 * 响应拦截器接口
 */
export interface IResponseInterceptor {
    /**
     * 响应前的拦截处理
     * @param response 响应数据
     * @returns 修改后的响应数据
     */
    beforeResponse(response: ResponseData): Promise<ResponseData>;
}

/**
 * 责任链抽象类
 */
export abstract class DutyChain {
    /** 下一个责任链节点 */
    private nextDutyChain: DutyChain | null = null;

    /**
     * 设置下一个责任链节点
     * @param handler 下一个责任链节点
     * @returns 当前责任链节点
     */
    public setNext(handler: DutyChain): DutyChain {
        this.nextDutyChain = handler;
        return handler;
    }

    abstract  canUse(params: RequestParams | ResponseData): boolean
    /**
     * 执行责任链处理
     */
    abstract handler(): Promise<void>

    /**
     * 处理逻辑（抽象方法）
     * @param params 请求或响应参数
     */
    protected abstract process(params: RequestParams | ResponseData): Promise<void>;
}

```
:::

::: code-group-item plugins
```ts
import { DutyChain } from "./Core";
import { RequestParams } from "./DTO";
import { ResponseData } from "./DTO";

/**
 * 重复请求插件
 */
export class RepeatRequest extends DutyChain {
    canUse(params: RequestParams | ResponseData): boolean {
        throw new Error("Method not implemented.");
    }
    /**
     * 处理重复请求逻辑
     * @param params 请求参数
     */
    protected async process(params: RequestParams): Promise<void> {
        // 实现重复请求逻辑
    }

    /**
     * 执行责任链处理
     */
    public async handler(): Promise<void> {

    }
}

/**
 * 请求认证插件
 */
export class RequestAuth extends DutyChain {
    canUse(params: RequestParams | ResponseData): boolean {
        throw new Error("Method not implemented.");
    }
    /**
     * 处理请求认证逻辑
     * @param params 请求参数
     */
    protected async process(params: RequestParams): Promise<void> {
        // 实现请求认证逻辑
    }

    /**
     * 执行责任链处理
     */
    public async handler(): Promise<void> {

    }
}

/**
 * 消息处理插件
 */
export class Message extends DutyChain {
    canUse(params: RequestParams | ResponseData): boolean {
        throw new Error("Method not implemented.");
    }
    /**
     * 处理消息逻辑
     * @param response 响应数据
     */
    protected async process(response: ResponseData): Promise<void> {
        // 实现消息处理逻辑
    }

    /**
     * 执行责任链处理
     */
    public async handler(): Promise<void> {

    }
}

```
:::
::: code-group-item FrameworkAdapters
```ts
import { IRequestMethod } from "./Core";
import { IRequestInterceptor } from "./Core";
import { IResponseInterceptor } from "./Core";
import { DutyChain } from "./Core";

/**
 * 抽象请求适配器类
 */
export abstract class AbstractRequestAdapter {
    /** 请求方法实例 */
    public request: IRequestMethod;
    /** 请求拦截器实例 */
    private requestInterceptor: IRequestInterceptor;
    /** 响应拦截器实例 */
    private responseInterceptor: IResponseInterceptor;
    /** 请求责任链 */
    public requestDutyChain: DutyChain;
    /** 响应责任链 */
    public responseDutyChain: DutyChain;
    /** 错误责任链 */
    public errorDutyChain: DutyChain;

    /**
     * 初始化方法
     */
    public abstract init(): void;
}

```
:::
::: code-group-item Application
```ts
import { AbstractRequestAdapter } from "./FrameworkAdapters";

/**
 * 异步操作基类
 */
export abstract class AsyncBase {
    /** 请求适配器实例 */
    public Requester: AbstractRequestAdapter;

    /**
     * 构造函数
     * @param Requester 请求适配器实例
     */
    constructor(Requester: AbstractRequestAdapter) {
        this.Requester = Requester;
    }
}


```
:::
::: code-group-item demo
```ts
import { AsyncBase } from "../Application";
import { RequestMethod } from "../DTO";

export class Login extends AsyncBase {
  request = this.Requester.request;
  login(data: any) {
    return this.request<string,Record<string,any>>({
      url: "/login",
      method: RequestMethod.POST,
      data
    });
  }
}

```
:::
::::

## 图像也许会帮你更好的理解

### 流程图
@startuml HTTP请求系统流程图

skinparam monochrome true
skinparam backgroundColor white

actor 用户

participant "Application (AsyncBase)" as App
participant "AbstractRequestAdapter" as Adapter
participant "RequestInterceptor" as ReqInterceptor
participant "RequestDutyChain" as ReqChain
participant "Network" as Net
participant "ResponseDutyChain" as RespChain
participant "ResponseInterceptor" as RespInterceptor

' 流程开始
用户 -> App: 调用请求方法
App -> Adapter: 注入并调用 request(params)

' 请求拦截器阶段
Adapter -> ReqInterceptor: beforeRequest(params)
ReqInterceptor -> ReqInterceptor: 处理请求参数（如添加认证头）
ReqInterceptor --> Adapter: 返回处理后的 params

' 请求责任链阶段
Adapter -> ReqChain: handler()
ReqChain -> ReqChain: canUse(params) 判断是否继续
alt 可以继续
  ReqChain -> ReqChain: process(params) 执行插件逻辑（如 RepeatRequest）
  ReqChain -> ReqChain: 调用下一个责任链节点
else 结束
  ReqChain --> Adapter: 返回处理后的 params
end

' 发送网络请求
Adapter -> Net: 发送请求
Net --> Adapter: 返回原始响应数据

' 响应责任链阶段
Adapter -> RespChain: handler()
RespChain -> RespChain: canUse(response) 判断是否继续
alt 可以继续
  RespChain -> RespChain: process(response) 执行插件逻辑（如 Message）
  RespChain -> RespChain: 调用下一个责任链节点
else 结束
  RespChain --> Adapter: 返回处理后的 response
end

' 响应拦截器阶段
Adapter -> RespInterceptor: beforeResponse(response)
RespInterceptor -> RespInterceptor: 处理响应数据（如格式化）
RespInterceptor --> Adapter: 返回最终响应数据

' 返回数据
Adapter --> App: 返回 ResponseData
App --> 用户: 得到数据

@enduml
### 类图
以下uml图，可以帮你快速的理解我这里的依赖关系，他是单向的，高层策略和低层策略是很明显的。

**你可以右键下面这个图，在新的标签页中打开，这样可以放大和拖动的查看**


[这部分源码，我放到了github中，请去那边看吧👆](https://github.com/inksnowhailong/project-templates/tree/main/AbstractComponents/Request)

@startuml http数据请求抽象设计


left to right direction

' 数据传输对象（DTO）
package "DTO" {
    enum "RequestMethod" {
        GET
        POST
        PUT
        DELETE
        PATCH
    }
    interface "RequestParams" {
        +url: string
        +method: RequestMethod
        +headers?: Map<string, string>
        +data?: any
        +params?: Map<string, string>
        +meta?: Map<string, any>
    }
    interface "ResponseData" {
        +status: number
        +message: string
        +data: any
        +meta?: Map<string, any>
    }
}

' 核心逻辑（Core）
package "Core" {
    interface "IRequestMethod" {
        (params: RequestParams): Promise<ResponseData>
    }
    interface "IRequestInterceptor" {
        +beforeRequest(params: RequestParams, options?: any): Promise<RequestParams>
    }
    interface "IResponseInterceptor" {
        +beforeResponse(response: ResponseData): Promise<ResponseData>
    }
    abstract class "DutyChain" {
        -nextDutyChain: DutyChain
        +setNext(handler: DutyChain): DutyChain <<implemented>>
        -{abstract} canUse(params: RequestParams | ResponseData): boolean  判断是否有下一个责任链
        +{abstract} handler(): Promise<void> : 负责决定是否继续执行下一个责任链
        -{abstract} process(params: RequestParams | ResponseData): Promise<void>
    }
}

' 适配器（Framework Adapters）
package "Framework Adapters" {
    abstract class "AbstractRequestAdapter" {
        +request: IRequestMethod
        -requestInterceptor: IRequestInterceptor
        -responseInterceptor: IResponseInterceptor
        +requestDutyChain: DutyChain
        +responseDutyChain: DutyChain
        +errorDutyChain: DutyChain
        +init(): void
    }
}

' 插件（Plugins）
package "Plugins" {
    class "RepeatRequest" {

    }
    class "RequestAuth" {

    }
    class "Message" {

    }
}


package "Application" {
   abstract class AsyncBase {
     +Requester: AbstractRequestAdapter;
     +constructor(Requester: AbstractRequestAdapter)
    }
    ' 示例：登录页面
    class "Login" extends AsyncBase {
    }
}


' 关系链接
' DTO 与 Core 的依赖
"IRequestMethod" --> "RequestParams"
"IRequestMethod" --> "ResponseData"
"IRequestInterceptor" --> "RequestParams"
"IResponseInterceptor" --> "ResponseData"
"DutyChain" --> "RequestParams"
"DutyChain" --> "ResponseData"

' Core 与 Framework Adapters 的关系
"AbstractRequestAdapter" --> "IRequestMethod"
"AbstractRequestAdapter" --> "IRequestInterceptor"
"AbstractRequestAdapter" --> "IResponseInterceptor"
"AbstractRequestAdapter" --> "DutyChain" : uses requestDutyChain
"AbstractRequestAdapter" --> "DutyChain" : uses responseDutyChain
"AbstractRequestAdapter" --> "DutyChain" : uses errorDutyChain

' Core 与 Plugins 的继承关系
"DutyChain" <|-- "RepeatRequest"
"DutyChain" <|-- "RequestAuth"
"DutyChain" <|-- "Message"

' DutyChain 的责任链关系
"DutyChain" o--> "DutyChain" : next

' Plugins 与 DTO 的依赖
"RepeatRequest" --> "RequestParams" : 依赖
"RequestAuth" --> "RequestParams" : 依赖
"Message" --> "ResponseData" : 依赖


' Application 与 Framework Adapters 的依赖
"AsyncBase" --> "AbstractRequestAdapter"


note left of Plugins
    这些插件是示例，实际情况你可以自行决定都有什么插件
end note


note right of DutyChain
    这里使用责任链来让每个插件都有机会处理这个请求，
end note

@enduml
