---
title: 使用 Web Worker 正确优化 Three.js 渲染性能
date: 2025-07-07
categories:
  - 编程
tags:
  - 实验
  - JS/TS
---

# 使用 Web Worker 优化 Three.js 渲染的完整指南

## 背景
在使用 Three.js 渲染复杂 3D 场景（例如基于 GeoJSON 生成的 3D 地图）时，大量几何数据的处理可能导致主线程性能瓶颈。我的项目中，渲染时间从 700-800 毫秒下降到 300-400 毫秒，这得益于引入 Web Worker 和所有权转移机制。本文将详细说明实现过程，并总结出使用web worker优化threeJS性能的可行性可注意点。

## 问题
- **数据量大**：大量 Shape 对象和 ExtrudeGeometry 数据需处理。
- **传输限制**：Three.js 的 BufferGeometry 无法直接通过 postMessage 传递。
- **序列化开销**：传统 JSON 序列化在大数据量下效率低。threeJS的很多对象都支持toJSON和fromJSON方法，可以方便的进行序列化和反序列化,但是仍需要考虑其开销

## 解决方案
我通过以下步骤优化了性能：

### 1. 将任务移至 Web Worker
将几何体生成任务从主线程卸载到 Worker 线程，释放主线程用于渲染和交互。

### 2. 数据转换与传输
由于 Three.js 对象无法直接传递，我将数据转换为 ArrayBuffer 并利用所有权转移机制（transferable objects）实现高效通信。也同时解决了ThreeJS的对象无法直接传递的问题

#### (1) Shape 转 ArrayBuffer
```ts
/**
 * @description: 数据转换，将Shape转换为ArrayBuffer
 * @param {Shape} shape
 * @return {*}
 */
function shapeToArrayBuffer(shape) {
  const outer = shape.getPoints();
  const holes = shape.holes.map(h => h.getPoints());
  const outerLength = outer.length;
  const holeCounts = holes.map(h => h.length);
  const totalPoints = outerLength + holeCounts.reduce((a, b) => a + b, 0);

  const buffer = new ArrayBuffer(totalPoints * 2 * 4); // x, y 各占 4 字节
  const view = new Float32Array(buffer);

  let offset = 0;
  for (const p of outer) {
    view[offset++] = p.x;
    view[offset++] = p.y;
  }
  for (const hole of holes) {
    for (const p of hole) {
      view[offset++] = p.x;
      view[offset++] = p.y;
    }
  }
  return { buffer, meta: { outerLength, holeCounts } };
}
```

#### (2) ArrayBuffer 转 Shape
在 Worker 中还原 Shape：

```ts
/**
 * @description: shape 的 buffer 数据转换为 shape
 * @return {*}
 */
function arrayBufferToShape(
  buffer: ArrayBuffer,
  meta: {
    outerLength: number
    holeCounts: number[]
  }
): Shape {
  const view = new Float32Array(buffer)
  let offset = 0

  function readPoints(count: number): Vector2[] {
    const pts: Vector2[] = []
    for (let i = 0; i < count; i++) {
      const x = view[offset++]
      const y = view[offset++]
      pts.push(new Vector2(x, y))
    }
    return pts
  }

  const outer = readPoints(meta.outerLength)
  const shape = new Shape(outer)

  for (const holeCount of meta.holeCounts) {
    const hole = readPoints(holeCount)
    shape.holes.push(new Path(hole))
  }

  return shape
}

```

#### (3) ExtrudeGeometry 处理
主线程生成并提取 ArrayBuffer：

```ts
const geometry = new THREE.ExtrudeGeometry(shape, { depth: 3 });
const position = geometry.getAttribute('position').array.buffer;
const index = geometry.index?.array.buffer;
const data = { position, index, positionCount: geometry.getAttribute('position').count, indexCount: geometry.index?.count };
```

Worker 返回后还原：

```ts
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.position), 3));
if (data.index) geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(data.index), 1));
geometry.computeVertexNormals();
```

### 3. Worker 通信
主线程发送数据：

```ts
worker.postMessage({ shapes: shapeData }, [shapeData.buffer]);
```

Worker 处理并返回：

```ts
self.onmessage = (e) => {
  const shape = arrayBufferToShape(e.data.shapes.buffer, e.data.shapes.meta);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 3 });
  const result = {
    position: geometry.getAttribute('position').array.buffer,
    index: geometry.index?.array.buffer
  };
  self.postMessage(result, [result.position, result.index]);
};
```

## 效果
- **渲染时间**：从 700-800 毫秒降至 300-400 毫秒，提升约 50%-60%。（未采用其他优化手段，实际项目你可以更极致的优化）

**原因：**
- Worker 分担主线程任务。
- ArrayBuffer 零成本传输。

## 注意事项
- **延迟**：即使简化通信，postMessage 到 onmessage 仍有约 50左右 毫秒延迟，可能是浏览器调度开销。且worker文件内代码越多，这个延迟越高，所以其实这也算是worker的加载开销，无论那些代码是否使用到，都会有影响。
- **调试**：使用 performance.now() 和 DevTools 分析性能。

## 总结

通过 Web Worker 优化 Three.js 渲染性能时，需要重点关注以下几点：

- **对象传递限制**：Three.js 的对象无法直接通过 postMessage 传递，必须先序列化（如使用内置的 `toJSON` 方法），在 Worker 内通过 `fromJSON` 还原。这一过程虽然方便，但在大数据量下仍需关注序列化和反序列化的性能开销。
- **高效数据传输**：将 Three.js 对象转换为 ArrayBuffer，并利用所有权转移（transferable objects）机制进行传递，可以实现零拷贝、高效通信。这种方式适合大规模几何数据的高性能场景。
- **数据还原与渲染**：通过 ArrayBuffer 还原为 Three.js 的 Shape 或 BufferGeometry，再进行渲染，能够兼顾性能与灵活性。
- **Worker 通信延迟**：Worker 之间的数据传输不可避免会有一定延迟（如浏览器调度、消息队列等），通常在几十毫秒左右。需要评估 Worker 带来的性能提升是否大于通信延迟的损耗。
- **Worker 数量管理**：Worker 并不是开的越多越好。每个 Worker 的创建、销毁和通信都存在开销。建议根据实际任务量动态调整 Worker 数量，或采用 Worker 池（Pool）技术，避免频繁创建和销毁 Worker，从而提升整体性能和资源利用率。


通过合理利用 Web Worker 和所有权转移机制，可以显著提升 Three.js 在大数据量场景下的渲染性能。但在实际应用中，仍需结合项目特点，综合考虑数据结构、通信延迟和 Worker 管理等因素，才能实现最优的性能提升效果。
