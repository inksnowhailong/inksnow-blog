---
title: 架构拆分实验-gitTask-1
date: 2024-9-6
categories:
  - 编程
tags:
  - 实验
  - 架构
---

## 关键业务逻辑

实现一个 Node 脚手架的 TodoList，但是底层其实是去重新多个新的 git 分支，然后完成的任务分支被合并到主分支中。

**目的**

促进敏捷开发，更清晰的任务开发，同时将写清晰 commit 的任务，重构为建立 todo 描述的任务，以达到至少每次重要变更都会有清晰的 commit。

**功能描述**

- [ ] 脚手架列出已有的任务列表，获取 git 全部分支并筛选出有特殊标记的分支 _（分支名字加个特殊前缀）_，并特殊展示当前所在分支
- [ ] 选择父级分支，新建一个新的任务，建立 git 分支，切换到这个分支
- [ ] 修改任务描述
- [ ] 选择任务标记完成，回到此任务的父级分支，并将这个 git 分支合并到父分支，（删除/标记删除）这个分支
- [ ] 选择任务，直接进行删除分支，回到任务父级分支

## 实验进展

从功能上来说，我我拆分出来 **“关键业务逻辑部分”** 和 **“git 操作部分”**。

这些部分应该完全脱离我的项目场景，不考虑用什么库实现，不考虑与用户交互是什么场景部分，我因自身技术原因，只是在这两部分的抽象实现上，使用了 TS。

### 业务上的依赖关系

::: tip 依赖关系
关键业务逻辑实现 --> git 操作实现
:::

这其中，关键业务逻辑应该是高层对象，git 操作才是低层的，高层依赖底层是不合理的，因为低层可能更频繁的更新，而高层则更新的频率低得多，所以这里需要依赖反转，让 git 去依赖关键业务逻辑的部分。

**怎么做呢？**

::: tip 依赖关系
| 关键业务逻辑实现 --> 关键业务逻辑抽象类 --> git 操作抽象类| <-- git 操作实现
:::

提取出抽象类，让 git 操作去实现 git 操作的抽象类，而关键业务逻辑用它的抽象类去依赖 git 操作抽象类

从而实现依赖反转，这里是从关键业务逻辑部分去搞出来一个所需的 git 操作的抽象类，关键业务逻辑的实现只去调用这个类会有的方法就好，而 git 操作可以去自定义实现，只要完成这些方法就没问题了。

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
export interface Task {
  /**任务名称 */
  name: string;
  /**自定义信息 */
  meta?: Record<string, any>;
  /**创建时间 */
  createTime: Number;
}
/**任务的数组 */
export interface TasksList extends Array<Task> {}

export abstract class TaskAbstract {
  /**获取列表 */
  abstract getList<T = TasksList | Error>(...ary: any[]): T | Promise<T>;
  /**添加任务 */
  abstract addTask<T = Task | Error>(task: Task): T;
  /**删除任务 */
  abstract deleteTask<T = Task | Error>(task: Task): T;

  /** */
}
```

:::
::: code-group-item git.abstract.ts

```ts
export abstract class TaskGitAction {
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
export class TaskGitActionImpl extends TaskGitAction {
  constructor() {
    super();
  }
}
```

:::
::: code-group-item GitTask.impl.ts

```ts
export class GitTaskImpl extends TaskAbstract {
  constructor(private gitAction: TaskGitAction) {
    super();
  }
}
```
:::
::::
