---
title: 使用 Jotai 解决 useState 的同步获取状态问题
date: 2025-10-09
categories:
  - 编程
tags:
  - JS/TS
---
# 使用 Jotai 解决 useState 的同步获取状态问题

作为 React 开发者，无论你是初学者还是资深老手，状态管理总是项目中不可避免的痛点。对于 React 新手来说，`useState` 是第一个接触的 Hook，它简单、直观，让你快速上手组件逻辑。但随着项目规模扩大，`useState` 的局限性会像隐形炸弹一样悄然引爆：状态更新是异步的，无法立即获取最新值。这不仅仅是小问题，它会迫使你引入额外的变量、回调或复杂逻辑来“绕弯”，从而增加代码的认知负担。

在本文中，我们将深入探讨 React 状态管理的“快照机制”如何导致这些痛点，然后介绍 Jotai——一个轻量级的原子状态管理库——如何优雅地解决它。我们甚至可以封装一个自定义 Hook 来“平替” `useState`，让你的代码更简洁、更同步。更酷的是，Jotai 还有许多实用特性，能解决 React 中常见的棘手问题。无论你是想简化日常开发还是优化大型应用，Jotai 都能降低代码复杂性，让状态管理变得像喝水一样自然。

## React 状态管理的痛点：快照机制与异步更新的陷阱

React 的状态更新基于“快照机制”（Snapshot Mechanism）。简单来说，当组件渲染时，React 会捕获当前的状态快照，并据此生成 UI。如果你在同一渲染周期内更新状态，React 不会立即反映变化，而是调度一个异步更新。这设计是为了优化性能，避免不必要的重渲染，但它也带来了副作用：**你无法在更新后立即获取最新状态**。

### 常见场景举例

想象一下这些日常开发中的“噩梦”：

1. **使用自定义Hook的状态同步问题**：
   你有一个自定义Hook用于数据提交，它需要接收最新的表单数据。但由于状态更新异步，你无法直接传递更新后的状态：
   ```jsx
   // 自定义Hook
   function useSubmitData() {
     const submitData = (formData) => {
       console.log('提交数据:', formData);
       // 发送到服务器...
     };
     return { submitData };
   }

   // 组件中使用
   function MyForm() {
     const [name, setName] = useState('');
     const [email, setEmail] = useState('');
     const { submitData } = useSubmitData();

     const handleSubmit = () => {
       const newName = 'John';
       const newEmail = 'john@example.com';

       setName(newName);
       setEmail(newEmail);

       // 问题：这里 name 和 email 还是旧值！
       submitData({ name, email }); // 传递的是旧数据

       // 被迫手动构造新数据
       submitData({ name: newName, email: newEmail }); // 必须这样做
     };

     return <button onClick={handleSubmit}>提交</button>;
   }
   ```

2. **输入框实时验证**：
   用户输入内容后，需要立即验证并显示结果：
   ```jsx
   const [input, setInput] = useState('');
   const [isValid, setIsValid] = useState(true);

   const handleChange = (e) => {
     const newValue = e.target.value;
     setInput(newValue);

     // 问题：input 还是旧值，必须用 newValue
     const valid = newValue.length >= 3; // 不能用 input.length
     setIsValid(valid);

     // 如果还要基于验证结果做其他事情...
     if (valid) {
       // 必须用 newValue 而不是 input
       console.log(`有效输入：${newValue}`);
     }
   };
   ```

3. **批量更新中的依赖问题**：
   在 `useEffect` 或事件处理中，多个状态更新后需要依赖最新值进行后续逻辑。这往往导致“闭包陷阱”：函数捕获了旧快照。

这些问题不是 bug，而是 React 的核心设计。但对于新手，它会让状态管理感觉像“猜谜游戏”；对于老手，它会累积成维护噩梦，迫使你转向 Redux 或 Zustand 等库——但这些往往过于重量级。

## Jotai：原子状态的救星，完美解决同步获取

Jotai 是一个由 Daiki 开发的轻量级 React 状态管理库（仅 1KB 左右），灵感来源于 Recoil。它使用“原子”（Atoms）来表示状态片段，每个原子都是独立的、可组合的。**Jotai 的关键优势：状态更新是同步的！** 你可以立即读取最新值，而无需额外变量或回调。

### 为什么 Jotai 能解决异步问题？

- **原子是同步更新的**：`useAtom` Hook 返回 `[value, setValue]`，其中 `setValue` 更新后，`value` 立即反映变化（在同一作用域内）。
- **无快照陷阱**：Jotai 不依赖 React 的批处理机制，而是通过 Provider 层级管理订阅，确保读取总是最新的。
- **零配置**：无需 boilerplate，直接在组件中使用。

安装 Jotai 超简单：
```bash
npm install jotai
```

### 基本示例：解决Hook状态传递问题

让我们用 Jotai 重写上面的表单提交场景：

```jsx
import { atom, useAtom } from 'jotai';

// 定义原子
const nameAtom = atom('');
const emailAtom = atom('');

// 自定义Hook
function useSubmitData() {
  const submitData = (formData) => {
    console.log('提交数据:', formData);
    // 发送到服务器...
  };
  return { submitData };
}

function MyForm() {
  const [name, setName] = useAtom(nameAtom);
  const [email, setEmail] = useAtom(emailAtom);
  const { submitData } = useSubmitData();

  const handleSubmit = () => {
    setName('John');
    setEmail('john@example.com');

    // Jotai 的优势：可以立即获取最新值
    submitData({ name: 'John', email: 'john@example.com' });
    // 或者使用衍生原子自动组合数据
  };

  return <button onClick={handleSubmit}>提交</button>;
}
```

更好的方案是使用衍生原子：

```jsx
// 衍生原子：自动组合表单数据
const formDataAtom = atom((get) => ({
  name: get(nameAtom),
  email: get(emailAtom)
}));

function MyForm() {
  const [name, setName] = useAtom(nameAtom);
  const [email, setEmail] = useAtom(emailAtom);
  const [formData] = useAtom(formDataAtom); // 总是最新的组合数据
  const { submitData } = useSubmitData();

  const handleSubmit = () => {
    setName('John');
    setEmail('john@example.com');

    // 直接使用最新的组合数据，无需手动构造
    submitData(formData);
  };

  return <button onClick={handleSubmit}>提交</button>;
}
```

### 封装自定义 Hook：平替 useState

为了让迁移更无缝，我们可以封装一个 `useSyncState` Hook，使用 Jotai 模拟 `useState` 的 API，但保证同步读取：

```jsx
import { atom, useAtom } from 'jotai';
import { useMemo } from 'react';

// 为每个组件实例创建独立的原子
export function useSyncState(initialValue) {
  const stateAtom = useMemo(() => atom(initialValue), []);
  return useAtom(stateAtom);
}

// 使用示例
function MyComponent() {
  const [value, setValue] = useSyncState(''); // 像 useState 一样简单

  const updateAndLog = () => {
    const newValue = 'new value';
    setValue(newValue);
    // 注意：这里仍然是旧值，因为React的渲染机制
    // 如果需要立即使用新值，应该直接使用 newValue
    console.log(newValue); // 使用新值而不是state
  };

  return <button onClick={updateAndLog}>更新</button>;
}
```

这个 Hook 完美平替 `useState`：API 相同，但内部用 Jotai 确保同步。组件卸载时，原子自动清理（通过 `useMemo` 隔离）。

## Jotai 的高级用法：解决 React 开发的常见麻烦

Jotai 不止于同步，它还有许多特性，能让 React 开发更高效。以下是几个实用场景，展示如何降低代码复杂性：

### 1. **衍生原子（Derived Atoms）：自动计算复杂状态**
   React 中，派生状态（如总和、过滤列表）往往需要 `useMemo` 或额外 Hook。Jotai 的 `atom` 支持计算值：
   ```jsx
   const countAtom = atom(0);
   const doubledAtom = atom((get) => get(countAtom) * 2); // 自动派生

   function Display() {
     const [count] = useAtom(countAtom);
     const [doubled] = useAtom(doubledAtom); // 总是最新，无需手动 memo

     return <p>计数: {count}, 双倍: {doubled}</p>;
   }
   ```
   这比 `useMemo` 更简洁，避免了依赖数组的坑。

### 2. **原子组合：模块化状态树**
   大型应用中，状态碎片化是常态。Jotai 允许组合原子：
   ```jsx
   const userAtom = atom({ name: '', age: 0 });
   const fullNameAtom = atom((get) => `${get(userAtom).name} (${get(userAtom).age}岁)`);

   // 更新部分字段
   const updateUser = atom(null, (get, set, updates) => {
     set(userAtom, { ...get(userAtom), ...updates });
   });
   ```
   比 `useReducer` 更灵活，减少 boilerplate。

### 3. **持久化与异步加载：无缝集成**
   Jotai 支持插件如 `jotai/utils` 的 `atomWithStorage`，自动持久化到 localStorage：
   ```jsx
   import { atomWithStorage } from 'jotai/utils';

   const themeAtom = atomWithStorage('theme', 'light'); // 自动保存/恢复

   function ThemeToggle() {
     const [theme, setTheme] = useAtom(themeAtom);
     return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>切换</button>;
   }
   ```
   对于异步数据（如 API），用 `atomWithLazyQuery` 懒加载，解决 `useEffect` 的副作用链。

### 4. **性能优化：选择性订阅**
   Jotai 只重渲染订阅的原子组件，远胜 `useState` 的全局重绘。结合 `useAtomValue` 只读模式，进一步细化。

这些特性让 Jotai 成为“瑞士军刀”：新手用它简化入门，老手用它重构遗留代码，都能显著降低复杂性。

## 结语：Jotai，让状态管理回归本真

从 `useState` 的异步陷阱，到 Jotai 的同步原子世界，我们看到状态管理可以如此优雅。封装 `useSyncState` 后，你甚至无需大改现有代码，就能享受同步读取的便利。更重要的是，Jotai 的轻量设计和强大扩展性，让 React 开发从“纠结状态”转向“专注业务”——对新手，它是温柔的入门垫；对老手，它是高效的优化器。

试试 Jotai，你会发现：状态不再是负担，而是乐趣。欢迎在评论区分享你的 Jotai 心得！
