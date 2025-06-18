---
title: 构建一个MCP服务,让你的公司代码规范,文档,组件库,配置等统一管理
date: 2025-06-18
categories:
  - 编程
tags:
  - JS/TS
  - 架构
---
# 构建一个 MCP 服务：统一管理公司代码规范、文档、组件库和配置

在这篇博客中，我将分享我最近开发的 **MCP（Model Control Protocol）服务**，最初为我的个人博客（`inksnowhl.cn`）设计，用于便捷获取博客内容和代码片段。随着开发的深入，我发现这个服务不仅能满足个人需求，还能扩展到企业团队中，用于统一管理文档、公共组件、代码规范和配置。以下是我的开发初衷、核心思路和实现流程，希望能为你提供灵感，照猫画虎打造自己的 MCP 服务。

## 开发初衷：从个人博客到企业应用

最初，我的目标是为我的编程博客开发一个**随时可查的解决方案**，让开发者（包括我自己）能通过工具快速访问文章列表和内容，尤其是整理过的代码片段。比如，在 **Cursor**、**Trae** 或 **VS Code** 中，输入一个命令就能拉取某篇博客的代码示例，省去手动搜索的麻烦。

在开发过程中，我意识到这个基于 **MCP 协议** 的服务，天然适合扩展到企业场景。企业开发中，团队常常面临以下问题：
- **文档分散**：技术文档、API 说明散落在不同地方，版本不一致。
- **组件重复开发**：缺乏统一的分发机制，导致公共组件重复造轮子。
- **代码规范不统一**：不同开发者使用不同的代码风格，影响协作效率。
- **配置管理复杂**：环境变量、构建配置等需要手动同步，容易出错。

于是，我决定将 MCP 服务扩展为一个**统一的内容访问和分发接口**，通过 HTTP 端点支持博客内容获取和企业资源同步，兼容 Cursor、Trae 和 VS Code 等工具。

## 核心思路：构建灵活的 MCP 服务

为了实现上述目标，我将项目分为两部分：**基于 NestJS 的 MCP 服务端** 和 **代理服务（inksnow-mcp-proxy）**，前者是你服务的核心，后者已发布到 npm供给各位使用。以下是核心设计思路：

1. **服务端功能**：
   - 提供两个主要接口：获取博客文章列表和获取指定文章内容。
   - 返回结构化数据（适合程序处理）和文本数据（可以让AI分析并输出重点）。
   - 通过 HTTP 端点支持扩展，适用于企业文档、组件和配置分发。

2. **代理服务**：
   - 简化工具集成，将 MCP 请求转发到指定服务器。
   - 支持调试日志，方便排查问题。
   - 通过 npm 发布，降低使用门槛。

3. **企业扩展**：
   - 使用相同的 MCP 协议，添加新工具支持企业资源管理，如代码规范配置文件、组件库分发等。
   - 确保服务高扩展性和容错性，适应不同场景。

## 实现流程

### 1. MCP 服务端开发
我选择了 **NestJS** 作为服务端框架，因为它模块化强、易于扩展，并且社区支持丰富。以下是实现步骤：

- **框架搭建**：
  - 使用 NestJS ，相关库使用的`@rekog/mcp-nest` `zod` `@modelcontextprotocol/sdk`。
  - 借助 `@rekog/mcp-nest` 的 `@Tool` 装饰器，定义符合 MCP 协议的工具接口。
  - 使用 **zod** 库验证输入参数和输出数据结构，确保接口可靠性。

- **核心功能**：
  - **文章列表接口**：通过 HTTP 请求从远程 JSON 文件（`pathList.json`）获取博客文章的标题、路径和日期。
  - **文章内容接口**：根据路径参数，从内容映射文件（`contentMap.json`）提取指定文章内容。
  - 使用 Node.js 的 `https` 模块处理请求，异步操作通过 `Promise` 实现。

- **错误处理**：
  - 在网络请求失败或数据解析错误时，返回默认值（如空数组）以保证服务可用性。
  - 提供清晰的错误信息，方便调试。

- **输出设计**：
  - 每个接口返回两部分数据：
    - `content` cursor一定要这个字段的内容返回才可识别，这是常见的ai对话格式
    - `structuredContent`，为通过outputSchema验证的结构化数据

- **核心代码示例**
    - 文章列表接口
        ```ts
            @Injectable()
            export class BlogToolMcp {
            @Tool({
                name: 'list_blogs',
                description: '输出inksnow编程博客的全部文章列表',
                parameters: z.object({}),
                outputSchema: z.object({   //这里是返回的结构的验证
                list: z.array(
                    z.object({
                    title: z.string(),
                    path: z.string(),
                    date: z.string(),
                    }),
                ),
                }),
            })
            async listBlogs(_params: any) {
                // 使用你自己的实现去搞数据
                const listData = []

                // 对于cursor的服务，必须要返回content和structuredContent。其他的没试过，trae的能完全兼容
                return {
                content: [
                    {
                    type: 'text',
                    text: `${JSON.stringify(listData)}`,
                    },
                ],
                structuredContent: { list: listData },
                };
            }
            }
        ```


### 2. 代理服务开发
为了让 MCP 服务更易于集成到 Cursor 等工具中，我开发了 **inksnow-mcp-proxy**，一个轻量级的代理工具，已发布到 npm，直接用即可。它的使用流程如下：

- **功能设计**：
  - 接收 Cursor、Trae 或 VS Code 的 MCP 请求（如 `initialize`、 `tools/call`），并转发到指定的 HTTP 端点。
  - 处理服务器响应，确保返回数据符合 MCP 协议。
  - 支持 `DEBUG=1` 环境变量，输出详细日志以便排查问题。

- **工具集成**示例：
  - 在 Cursor IDE 中配置代理：
    ```json
    {
        "mcpServers": {
            "HLMcp": {
                "command": "npx",
                "args": ["inksnow-mcp-proxy","https://你的MCP服务地址例如：https://xxx.cn/"],
                "env": {
                    "DEBUG": "1" // 可选，开启调试日志，编辑器的输出中可以看到日志
                }
            }
        }
        }
    ```
- 支持常见的IDE集成，例如Cursor，Trae，VSCode等
- 源码地址：[inksnow-mcp-proxy](https://github.com/inksnowhailong/inksnow-mcp-server)求star呀

### 3. 企业场景扩展
MCP 服务的灵活性使其非常适合企业环境。以下是如何扩展到企业资源管理的思路：

- **文档分发**：
  - 开发新工具（如 `get_document`），从企业服务器获取最新技术文档或 API 说明。
  - 开发者通过 Cursor 等工具调用此接口
