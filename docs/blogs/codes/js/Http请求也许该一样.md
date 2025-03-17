---
title: 前端抽象化，打破框架枷锁:Http请求也许该一样
date: 2025-02-28
categories:
  - 编程
  - 抽象前端，架构设计
tags:
  - JS/TS
---
想一想，发送请求的库，和方法，有几种常用的，axios、fetch、uni.request等
通常我们会在一个文件中，写入大量长得几乎一模一样的函数，只是参数稍微改变，来储存大量请求函数
但是一旦使用的库变化了，这些或多或少，会有微调，如今我们将其抽象出来，让我们使用变统一，让其实现脱离掉


## 以下是我的简单抽象出来的东西
```ts
/**
 * @description: 请求形式
 * @return {*}
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * @description: 发起请求的参数
 * @return {*}
 */
export interface RequestOptions<T> {
  url: string;
  method?: HttpMethod;
  data?: T;
  params?: Record<string, any>;
  header?: Record<string, string>;
}

/**
 * @description: 请求响应的数据类型
 * @return {*}
 */
export interface ApiResponse<T, E = any> {
  code: number;
  data: T;
  message: string;
  error?: E; //可选 一般是后端返回的错误信息
}

/**
 * @description: 具体发起请求的函数，一般是axios、fetch等来实现这个函数
 * @param {*} P
 * @param {*} R
 * @return {*}
 */
export type RequestMethod = <P = any, R = any>(
  params: RequestOptions<P>
) => Promise<ApiResponse<R>>;

/**
 * @description: 单个请求模块的，抽象类，由依赖注入来得到请求的函数
 * @return {*}
 */
export abstract class AsyncBase<T = RequestMethod> {
  public request: T;
  constructor(request: T) {
    this.request = request;
  }
}

```
那么接下来，就是如何使用这个抽象的东西了，它分为**请求库函数**和**模块请求封装**

## 请求库函数

让这些库，变成同一种用法👆
### axios
比如axios, 这是最契合的，各种配置，就不展示了，只需要满足这个接口，就完全ok
```ts
const service: RequestMethod = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL || "", // 设置你的API基础URL
  timeout: 5000, // 请求超时时间
});

```
### uni.request
这需要一些转换
```ts
// 实现 uni.request 封装
const uniRequestService: RequestMethod = async <P = any, R = any>(
  options: RequestOptions<P>
): Promise<ApiResponse<R>> => {
  // 设置默认选项
  const defaultOptions: Partial<RequestOptions<P>> = {
    method: 'GET', // 默认 GET 请求
    header: {}, // 默认空 header
  };

  // 合并用户传入的选项与默认选项
  const finalOptions = { ...defaultOptions, ...options };

  // 返回一个 Promise，适配 ApiResponse 类型
  return new Promise<ApiResponse<R>>((resolve, reject) => {
    uni.request({
      url: finalOptions.url, // 请求地址
      method: finalOptions.method || 'GET', // 请求方法
      data: finalOptions.data, // 请求体数据
      header: finalOptions.header, // 请求头
      dataType: 'json', // 返回数据格式
      success: (res) => {
        // 类型断言，确保返回数据符合 ApiResponse<R>
        const response = res.data as ApiResponse<R>;
        resolve(response);
      },
      fail: (err) => {
        // 请求失败时，返回一个标准的错误响应
        //或者做一些错误处理什么的
        const errorResponse: ApiResponse<R> = {
          code: -1,
          data: null as R, // 类型安全处理
          message: err.errMsg || '请求失败',
        };
        reject(errorResponse);
      },
      complete: () => {

      },
    });
  });
};
```
## 模块请求封装

接下来就是请求函数的封装了，写一大堆的函数并非最优选择，我们来优化它

```ts
// 比如某个模块，我们在文件里可以这样写
// 这样写的目的，是可以让其进行更多的扩展，更多的统一化操作，以及带来IDE的提示，减少页面内import代码量
export class DemoApi extends AsyncBase {
  /**
   * demo
   */
  Demo = async <
    P extends DemoParams,  // 这些参数和返回值，你也可以抽离到一个专门的ts文件中写类型
        R = DemoResponse
      >(
        data: P
      ) => {
    return this.request<P,R>({
      url: "/demo",
      method: "POST",
      data
    });
  };
}
```

这个类，我们完全可以用单例模式进行包装，这东西，初始化一次就够了

### 使用示例
一种是使用一个函数
```ts
// request:RequestMethod
 const Api = new DemoApi(request);

// 之后采用依赖注入，分发到所有地方，亦或者是写个hook函数都可
// 更好的方式，是采用工厂模式，通过一个字段，得到不同模块的请求类
```
