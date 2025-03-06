---
title: WebAssembly!让邪教来突破JS
date: 2025-3-6
categories:
 - 编程
tags:
 - 实验
---
 **WebAssembly（简称 wasm）**是一种旨在突破 Web 性能瓶颈的技术方案。它由 W3C 官方推动，并且得到了主流浏览器的广泛支持。它的核心思想是通过运行其他高性能编程语言（比如 C、C++、Rust 等）来实现复杂功能，然后将这些代码编译成一种 Web 平台能够识别和执行的字节码文件。JavaScript 可以像调用第三方库一样直接引入并使用这种字节码，使用方式简单、高效，同时具备跨平台特性和足够的安全性。

简单来说，WebAssembly 让开发者可以用高性能语言编写代码，编译后在浏览器中运行，既提升了 Web 应用的性能，又保持了良好的兼容性和安全性。

## 尝试
于是乎，我也做了个尝试，尝试后也发现了一些问题，这里分享出我的实验，以此来给想了解的开发者们，一个初步理解

- **开发环境**:rust+wasm-bindgen
- **功能**:JSON的序列化和反序列化
- **调用环境**:vite+react

### rust的实现代码

首先需要运行 cargo new json-rust-wasm --lib 来新建一个lib项目

这里是源码
:::: code-group
::: code-group-item Cargo.toml
```toml
[package]
name = "json-rust-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = { version = "0.2.100", features = ["serde"] }
serde-wasm-bindgen = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3

```
:::
::: code-group-item lib.rs
```rs
use serde::Serialize; // 导入 Serialize trait
use serde_json::{from_str, to_string, Value};
use serde_wasm_bindgen::Serializer;
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;

// 反序列化：JSON 字符串 -> JsValue（通用的 JS 对象）
#[wasm_bindgen]
pub fn json_parse(json_str: &str) -> Result<JsValue, JsValue> {
    // 将 JSON 字符串解析为 serde_json::Value
    let value: Value = from_str(json_str).map_err(|e| JsValue::from_str(&e.to_string()))?;
    // 将 Value 转换为 JsValue
    let serializer = Serializer::new().serialize_maps_as_objects(true);
    value
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// 序列化：JsValue（任意 JS 数据） -> JSON 字符串
#[wasm_bindgen]
pub fn json_stringify(js_value: JsValue) -> Result<String, JsValue> {
    // 将 JsValue 转换为 serde_json::Value
    let value: Value = from_value(js_value).map_err(|e| JsValue::from_str(&e.to_string()))?;
    // 将 Value 序列化为 JSON 字符串
    to_string(&value).map_err(|e| JsValue::from_str(&e.to_string()))
}

```
:::
::::

这里有几个需要注意的点
- 库的版本最好固定，因为rust各种库之间版本变化总能引起报错
- 依赖下载挺慢的，网上可以查询使用镜像库来下载的方法。
- 打包需要额外工具打包
  - cargo install wasm-bindgen-cli，安装一个工具，安装也慢
  - 安装完成后运行 wasm-pack build  打包成wasm

### vite项目中使用
Vite 官方提供了一种导入 WebAssembly 的语法，例如：import init from './example.wasm?init'。这种方式适用于直接打包的纯 WebAssembly 文件（即没有额外包装的 wasm 文件）。然而，如果使用 wasm-pack 工具打包 WebAssembly，情况会有所不同。wasm-pack 会生成额外的包装文件（比如 JavaScript 绑定代码）以及 TypeScript 类型定义，因此无法直接使用 Vite 官方的这种导入方式。

正确的做法是安装并使用 Vite 的插件 vite-plugin-wasm。配置好这个插件后，你可以像导入普通 ES 模块一样，直接引入由 wasm-pack 打包生成的 JavaScript 文件。例如：
```ts
import { json_parse, json_stringify } from "./pkg/json_rust_wasm";
```
这种方式利用了 wasm-pack 生成的绑定代码，让 wasm 的使用更加自然和无缝。如果你处理的是不依赖 wasm-pack、仅以某种方式打包的纯 wasm 文件，那么仍然可以采用 Vite 官方的导入语法。
### 当前案例不可实际使用
整个测试过程顺利完成，但结果却不尽如人意。我尝试用 WebAssembly（wasm）来处理 JSON 的序列化和反序列化，并与原生 JavaScript 进行性能对比，结果发现 wasm 的表现反而更慢，甚至不如直接使用 JavaScript。经过一番调查，我找到了原因：

1. 浏览器对 JSON 的高度优化：浏览器内置的 JSON 处理（例如 JSON.parse 和 JSON.stringify）已经经过了极高的性能优化，本身就非常高效。
调用
2. wasm 的开销：尽管单次调用 wasm 的时间开销微乎其微，但频繁调用会累积一定的性能影响，尤其是在简单任务中，这种开销可能超过 wasm 带来的好处。
3. wasm 的适用场景：wasm 更适合高强度的计算任务，能够突破 JavaScript 的性能瓶颈。例如，音视频转码、加密解密、图形处理、音频计算或大数据处理等场景，才能真正发挥其优势。而且，只有在计算量足够大的情况下，性能提升才会显著。否则，JavaScript 本身的能力其实不容小觑。
因此，对于 JSON 序列化这种轻量级任务，直接使用 JavaScript 原生方法可能仍是更好的选择。
