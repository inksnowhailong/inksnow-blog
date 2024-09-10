---
title: 架构拆分实验-gitTask-2
date: 2024-9-10
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
- 关键业务逻辑之前描述的不太对，这里将采用“Todo逻辑”来描述

## 重新划分依赖关系

::: tip 依赖关系

@startuml

 package "Todo逻辑部分" {
  interface "TaskTodo" {
    + getList(...ary: any[])
    + addTask(task: Task)
    + finishTask(task: Task)
    + updateTask(task: Task)
    + deleteTask(task: Task)
  }
  class "Task" {
    + name: string
    + meta: Record<string, any>
    + createTime: Number
  }
   interface "VersionControl" {
    +getBranchList()
    +createBranch(branchName:string)
    +mergeBranch()
  }

  class "TaskTodoService" implements TaskTodo

  TaskTodo --> VersionControl :"依赖版本控制接口,未来即使不用git，只要实现了这个接口就能用"
  TaskTodo --|> Task :"管理"
 }

   package "底层实现" {

     class "GitRepository" {
      +checkout(branchName: String)
      +add(file: String)
      +commit(message: String)
      +merge(branchName: String)
      +delete(branchName: String)
    }
    class "GitService"

    "GitService" ..|>  VersionControl : "git服务实现VersionControl"
    "GitService" --|> GitRepository : "git服务依赖git命令操作类"
   }


@enduml
:::
