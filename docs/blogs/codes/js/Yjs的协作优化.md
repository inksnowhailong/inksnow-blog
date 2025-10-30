---
title: Yjs+TipTap 的自定义：WebSocket 拦截性能优化 + 历史记录自定义处理回滚
date: 2025-10-29
categories:
  - 编程
tags:
  - JS/TS
---
# Yjs 协作：把“发送消息优化”和“版本回滚”做简单了

这篇记两件很常用、也很实用的小技巧：

- 把编辑产生的一堆 update 合并成“间隔 1 秒发一次”，少走网络请求；
- 不搞复杂的快照体系，只用 Yjs 原生能力做“任意版本回滚”。

如果你已经用过 y-websocket，下面的内容可以直接抄走用。

---

## 用到的依赖

```ts
import * as Y from "yjs";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebsocketProvider } from "y-websocket";
```

`lib0` 是 Yjs 官方的工具库，主要用来做二进制编解码。

---

## 1) 拦截 `ws.send`，把 update 合并后再发（带防抖）

先说为什么：Yjs 每次小编辑都会产生一个 update，如果原样直发，网络会很“碎”。
思路其实很简单——拦一手 `provider.ws.send`，只收集“同步 update”消息，1 秒后把收集到的都合并成一个再发出去。

效果：通常能减少 90% 左右的请求次数（视输入频率而定），服务器压力也跟着降。

### 拦截与合并的实现

```ts
// 在 provider 连接成功之后
const originalSend = provider.ws!.send.bind(provider.ws!);
const pendingUpdates: Uint8Array[] = [];
let sendTimeout: any = null;

provider.ws!.send = (data: ArrayBuffer) => {
    // 下面是采用y-websocket的消息格式来解析的
  const decoder = decoding.createDecoder(data);
  const messageType = decoding.readVarUint(decoder);

  // 只关心 Yjs 的 Sync 消息
  if (messageType === 0) {
    const syncStep = decoding.readVarUint(decoder);
    // step=2 表示 update
    if (syncStep === 2) {
      // 拿到真正的 update 二进制
      const update = decoding.readVarUint8Array(decoder);
      pendingUpdates.push(update);

      // 防抖：1 秒后把收集到的都合并发出去
      clearTimeout(sendTimeout);
      sendTimeout = setTimeout(() => {
        if (pendingUpdates.length === 0) return;

        const merged = Y.mergeUpdates(pendingUpdates);

        // 重新编码为“sync step 2”的消息格式
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0); // messageType: sync
        encoding.writeVarUint(encoder, 2); // syncStep: update
        encoding.writeVarUint8Array(encoder, merged);

        originalSend(encoding.toUint8Array(encoder));
        fetchHistoryRecords(); // 可选：合并后刷新一下版本列表
        pendingUpdates.length = 0;
      }, 1000);

      return; // 拦截这次原始发送
    }
  }

  // 其它消息（例如 awareness）别动，直接转发
  originalSend(data);
};
```

### 小贴士

- 一定要按“sync step 2”的协议格式重新编码，不然服务端收不到正确 update；
- `awareness` 等非文档同步消息不要拦；
- 合并间隔（上面用的是 1000ms）按产品体验调整即可。

---

## 2) 不用快照，也能回滚到任意版本（基于 XmlFragment 拷贝）

思路是这样的：

1. 服务端把“Yjs 的 update 二进制”当成版本增量存起来（index + 时间戳 + 二进制），不做自定义处理；
2. 客户端想回滚到第 N 个版本时，取出 1..N 的 update，依次 apply 到一个临时文档 tempDoc 上，得到目标时刻的文档；
3. 把 tempDoc 中目标 XmlFragment 的子节点克隆，覆盖到当前文档对应的 Fragment 上（事务内完成）。

这样做不依赖 snapshot、更不依赖 y-indexeddb，纯 Yjs 能力就够了。

### 拉取历史版本

```ts
const fetchHistoryRecords = async () => {
  const res = await fetch(`http://your-api/docx/versions?room=${documentId}&limit=100`);
  const { versions } = await res.json();

  const records = versions.map((v: any) => ({
    ...v,
    update: new Uint8Array(v.update) // 确保是 Uint8Array
  }));

  setHistoryRecords(records);
};
```

### 回滚到指定版本（正确做法）

```ts
const restoreVersion = async (targetIndex: number) => {
  const ydoc = ydocRef.current;
  if (!ydoc) return;

  // 取出 ≤ targetIndex 的所有 update，并按 index 排序
  const availableRecords = historyRecords
    .filter(r => r.index <= targetIndex && r.update?.length)
    .sort((a, b) => a.index - b.index);

  if (availableRecords.length === 0) return;

  // 1) 构建临时文档：把历史增量依次应用进去
  const tempDoc = new Y.Doc();
  availableRecords.forEach((record) => {
    Y.applyUpdate(tempDoc, record.update as Uint8Array);
  });

  // 2) 将临时文档的目标 Fragment 内容写回当前文档
  //    注意：这里的 "default" 要和你实际使用的 Fragment 名字一致
  const sourceFragment = tempDoc.getXmlFragment("default");
  const targetFragment = ydoc.getXmlFragment("default");

  ydoc.transact(() => {
    // 清空当前 Fragment
    targetFragment.delete(0, targetFragment.length);
    // 克隆临时文档的子节点并插入
    const clonedChildren = sourceFragment
      .toArray()
      .map((node) => node.clone());
    if (clonedChildren.length > 0) {
      targetFragment.insert(0, clonedChildren as any);
    }
  }, "restore-version");

};
```

### 注意点

- 这里用的是“Fragment 拷贝覆盖”的方式，不会改变文档的 docId、连接状态等，只替换目标 Fragment 的内容；
- Fragment 名称要和你创建编辑器时约定的名称一致（示例使用的是 "default"）；
- 历史记录按 index 递增应用即可，无需在客户端做额外 merge；
- 和本地缓存（y-indexeddb）不冲突，各司其职即可；
- 如果要保留当前状态，回滚前先把当前文档也记为一个版本。

---


后端侧的落库规则很直接：

- 每当收到一个 update（可以是前面“合并后”的 update），就存成一条版本记录；
- 不需要自定义解析，直接把 Yjs 的 update 二进制（Uint8Array）原样保存；
- 返回历史时按 index 递增即可，客户端会依次 apply 生成 tempDoc 并完成回滚覆盖。

---

## 复盘（一句话版）

1. 拦 `ws.send`，只收集“sync step 2”的 update，防抖后用 `Y.mergeUpdates` 合并，再使用原有方法发送；
2. 版本回滚就是：拉历史 update → 依次 apply 到 tempDoc → 把 tempDoc 的 Fragment 子节点克隆并覆盖当前文档 Fragment（事务中完成）。

这套做法零额外插件，行为可控，线上可用；要不要上，只看你的产品对“实时性 vs. 请求数”的取舍。
