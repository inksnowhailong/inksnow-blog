---
title: 架构拆分实验-gitTask-2
date: 2024-9-9
categories:
 - 编程
tags:
    - 实验
    - 架构
---

## 重构

在上次的拆分出现了以下几个问题
- 只是在纯拆，没有让其结构明确。
- 依赖关系的划分变得更混乱，甚至git操作相关概念和系统的关系也不太对
- 抽象类是实现和抽象混合的，可以用于复用操作的，但是我的操作上完全就是在描述结构，没有具体实现，应该用接口来搞。

<!-- ## 重新划分 -->

## 源码

:::: code-group
::: code-group-item demo.ts

```ts
const gitAction = new TaskGitActionImpl();
new GitTaskImpl(gitAction);
```

:::
::: code-group-item task.abstract.ts

```ts
/** 单个任务类型 */
export type Task =  {
  /**任务名称 */
  name: string;
  /**自定义信息 */
  meta?: Record<string, any>;
  /**创建时间 */
  createTime: Number;
}
/**任务的数组 */
export type TasksList = Task[];

export interface TaskTodo {
  /**获取列表 */
  getList<T = TasksList | Error>(...ary: any[]): T | Promise<T>;
  /**添加任务 */
  addTask<T = Task | Error>(task: Task): T;
  /**完成任务 */
  finishTask<T = Task | Error>(task: Task): T;
  /**修改任务描述 */
  updateTask<T = Task | Error>(task: Task): T;
  /**删除任务 */
  deleteTask<T = Task | Error>(task: Task): T;
}

```

:::
::: code-group-item git.abstract.ts

```ts
export interface TaskGitAction<T = any> {
  /** 获取git分支列表 */

  /**新建分支 */

  /**删除分支 */

  /**切换分支 */

  /**获取当前分支 */

  /**获取当前分支的父分支 */

  /**合并当前分支到father分支 */

}

```

:::
::: code-group-item TaskGitAction.Impl.ts

```ts
export class TaskGitActionImpl implements TaskGitAction<Task>  {
  constructor() {
    super();
  }
}
```

:::
::: code-group-item GitTask.impl.ts

```ts
export class GitTaskImpl implements TaskTodo {
  constructor(private gitAction: TaskGitAction) {
    super();
  }
}
```
:::
::::
