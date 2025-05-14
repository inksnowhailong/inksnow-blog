---
title: 深入分析 JavaScript 中的 Web Worker 和 Service Worker
date: 2025-5-13
categories:
 - 编程
tags:
 - JS/TS
---
# 深入分析 JavaScript 中的 Web Worker 和 Service Worker

## 引言
本文不打算介绍 Web Worker 和 Service Worker 的用法，而是深入探讨它们的底层机制，包括执行时机、性能影响、可传递数据类型以及两者的区别，特别说明耗时任务阈值的选择理由
## Web Worker

### 执行时机

- **创建时间**
  Web Worker 在主线程调用 `new Worker('worker.js')` 时创建。浏览器立即分配一个新线程并加载指定的 JavaScript 文件。创建过程同步执行，但脚本加载和解析是异步的：
  - 典型加载时间为 **1-10 毫秒**，具体取决于脚本大小和浏览器性能（[MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)）。
  - 脚本加载完成后，Worker 线程执行其全局代码。

- **内部独立事件循环**
  Web Worker 拥有独立的事件循环，与主线程完全隔离，遵循 JavaScript 事件循环模型：
  - **宏任务队列**：处理 `setTimeout`、`setInterval`、消息事件等。
  - **微任务队列**：处理 `Promise` 等微任务。
  - 事件循环持续运行，直到主线程调用 `worker.terminate()` 或 Worker 调用 `self.close()`。

- **事件通信的接收与发送时间**
  Web Worker 通过 `postMessage` 与主线程异步通信：
  - **主线程 → Worker**：主线程调用 `worker.postMessage(data)`，消息进入 Worker 事件队列，在下一次事件循环触发 `onmessage`。
  - **Worker → 主线程**：Worker 调用 `self.postMessage(data)`，消息进入主线程事件队列，在下一次事件循环触发 `onmessage`。
  - **发送时间**：`postMessage` 异步调用，立即返回，消息传输由浏览器调度，延迟通常微秒到毫秒。

### 性能影响

- **发送到接收的时间**
  数据传递延迟取决于数据大小：
  - 小型数据（几 KB）：**10 微秒到 1 毫秒**。
  - 大型数据（MB 级别）：序列化/反序列化可能需 **数毫秒**。
  - 使用 `Transferable` 对象（如 `ArrayBuffer`）实现零拷贝，延迟接近零。

- **性能瓶颈**
  - **结构化克隆**：默认深拷贝数据，大型对象（如复杂数组）序列化开销显著。
  - **线程创建**：频繁创建/销毁 Worker 增加资源分配开销。
  - 使用 `Transferable` 对象或优化数据结构可缓解瓶颈。

- **耗时任务阈值**
  建议耗时超过 20-30 毫秒 的任务转移到 Web Worker。
  **理由**：
- 主线程以 60fps（16.67ms/帧）渲染，任务超 16ms 导致卡顿。通信往返（1-10ms，视数据大小）增加开销。
- 小数据通信（~2ms）：任务需超 20ms 确保收益；大数据通信（~10ms）：阈值升至 30ms。
- 示例：任务耗时 18ms，通信 5ms，总计 23ms，不如主线程直接执行（18ms）。但 50ms 任务加 5ms 通信（55ms）优于主线程阻塞 50ms。
- 适用场景：加密、大数组排序、图像处理。

### 可传递数据类型

- **结构化克隆（复制传递）**
  数据通过深拷贝传递，支持：
  - 基本类型：`number`、`string`、`boolean`、`null`、`undefined`
  - 对象类型：`Object`、`Array`、`Date`、`RegExp`、`Map`、`Set`
  - 错误类型：`Error`、`EvalError`、`RangeError` 等
  - 文件相关：`Blob`、`File`、`FileList`
  - 图像数据：`ImageData`

- **所有权转移（Transferable 对象）**
  零拷贝传递，数据所有权转移：
  - `ArrayBuffer`
  - `MessagePort`
  - `ImageBitmap`
  - `OffscreenCanvas`

**示例代码**：

```javascript
// main.js
const worker = new Worker('worker.js');
const buffer = new Uint8Array(1024 * 1024 * 32).buffer; // 32MB
worker.postMessage(buffer, [buffer]);
worker.onmessage = (event) => console.log(event.data);

// worker.js
self.onmessage = (event) => {
  self.postMessage('Buffer received in Worker');
};
```

## Service Worker

### 执行时机

- **创建时间**
  Service Worker 在主线程调用 `navigator.serviceWorker.register('/sw.js')` 时异步创建，返回 Promise：
  - 浏览器下载脚本并触发 `install` 事件，通常需 **100-500 毫秒**（[MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)）。
  - 首次注册后进入等待状态，激活需页面刷新或旧页面关闭。

- **内部独立事件循环**
  Service Worker 的事件循环是**事件驱动**的，仅在事件（如 `install`、`activate`、`fetch`）触发时运行：
  - 任务完成后，浏览器可能终止 Service Worker 以节省资源。
  - 包含宏任务（如 `fetch`）和微任务（如 `Promise`）。

- **事件通信的接收与发送时间**
  Service Worker 通过 `postMessage` 通信：
  - **主线程 → Service Worker**：调用 `navigator.serviceWorker.controller.postMessage(data)`，消息在 Service Worker 下一次事件循环触发 `onmessage`。
  - **Service Worker → 主线程**：调用 `self.clients.matchAll().then(clients => clients.forEach(client => client.postMessage(data)))`，消息在主线程下一次事件循环处理。
  - **发送时间**：`postMessage` 异步，立即返回。

### 性能影响

- **发送到接收的时间**
  - 小数据：**10 微秒到 1 毫秒**。
  - 大数据：序列化增加到数毫秒。
  - 唤醒 Service Worker 可能额外增加 **几十到几百毫秒** 延迟。

- **性能瓶颈**
  - **启动延迟**：每次唤醒增加延迟。
  - **网络拦截**：`fetch` 事件处理增加事件循环开销。
  - **缓存优化**：使用 Cache API 可将响应时间缩短至毫秒。

- **耗时任务阈值**
  建议用于耗时超过 **200-500 毫秒** 的网络相关任务或离线场景。但是，一般关于获取数据的请求需要得到最新的值，所以如果用于缓存，请仔细斟酌使用缓存的逻辑。
  - 适用场景：缓存资源、离线访问、推送通知。
### 可传递数据类型

- **结构化克隆和所有权转移**
  同 Web Worker，支持结构化克隆和 `Transferable` 对象。

- **网络相关**
  额外支持：
  - `Request`
  - `Response`

**示例代码**：

```javascript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => cache.addAll(['/index.html']))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```

## Web Worker 与 Service Worker 的区别

| **特性**           | **Web Worker**                       | **Service Worker**                   |
|--------------------|--------------------------------------|--------------------------------------|
| **用途**           | 计算密集型任务                       | 网络请求、缓存、推送通知             |
| **创建时间**       | 同步，1-10ms 加载                   | 异步，100-500ms 安装                 |
| **事件循环**       | 持续运行                             | 事件驱动，空闲终止                   |
| **通信接收时间**   | 下一次事件循环                       | 下一次事件循环，可能有唤醒延迟       |
| **发送时间**       | 异步，立即返回                       | 异步，立即返回                       |
| **性能瓶颈**       | 数据序列化                           | 启动延迟、网络拦截                   |
| **耗时任务阈值**   | >30ms（UI 流畅性）                   | >200ms（网络优化）                   |
| **数据类型**       | 结构化克隆 + Transferable            | 结构化克隆 + Transferable + 网络对象 |
| **生命周期**       | 主线程控制                           | 浏览器管理                           |
| **运行环境**       | 任意网页                             | HTTPS 或 localhost                   |

## 一些替代方案

得益于react的研究，发现了requestIdleCallback和MessageChannel，对于非紧急、耗时较短（5-20ms）且不希望影响主线程的任务，可使用 requestIdleCallback 或 MessageChannel 替代 Web Worker，避免线程创建和通信开销。

### requestIdleCallback
优先级：低，属于闲置任务,通常在帧渲染后（16.67ms 内）或更晚，延迟不确定（毫秒到秒），取决于浏览器负载,可接受参数来得到当前帧剩余时间，从而判断是否执行任务。适合非紧急任务（如日志发送、数据预处理）。

### MessageChannel
优先级：高，属于微任务，MessageChannel 的 port.postMessage 触发的 onmessage 事件被放入微任务队列（Microtask Queue），在当前宏任务（Macrotask）执行完成且调用栈清空后立即执行，与 Promise.resolve().then() 和 queueMicrotask() 同属微任务优先级，优先于宏任务队列中的任务（如 setTimeout 或 DOM 事件）。其执行延迟通常为微秒到毫秒（~0.1-1ms），适合需要低延迟、异步但快速执行的任务。

### 示例代码：
```js

// requestIdleCallback
requestIdleCallback(() => console.log('Idle task'));

// MessageChannel
const channel = new MessageChannel();
channel.port1.onmessage = () => console.log('Task done');
channel.port2.postMessage('Start');
```
## 总结

Web Worker 适合耗时超 30ms 的计算任务，利用独立线程避免主线程阻塞，优化 UI 流畅性。Service Worker 专为网络管理和离线支持设计，适合超 200ms 的网络任务，通过缓存提升性能。两者的事件循环和通信机制为开发者提供了灵活的多线程能力，合理选择可显著提升 Web 应用性能。
