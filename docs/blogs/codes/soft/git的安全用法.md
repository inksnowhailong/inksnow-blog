---
title: git的更安全用法
date: "2024-12-11"
categories:
  - 编程
---

如果你已经学会了git的基础操作，比如：**拉分支|拉代码|合并分支|处理冲突**等这些操作，那么相信你已经是一个有不错经验的开发者了。

如果你在一个**不错的团队**中，你的项目git分支通常是有人去管理其规范的，但是若管理不当，依旧可能在开发中是混乱的，可能出现master发布了不该发布的功能这种致命问题。

亦或者，你并没有这种团队，或者你的团队没人特别的去管理其规范，这里将介绍我所采取的方案，以**减少冲突，减少事故**的发生。

## 首先，分支的流程规范
::: tip
  分支的管理规范，不应当是固定的,应该是根据不同团队规模，不同的环境支持，应有不同的规范产生。
:::

### 一个生产环境、一个测试环境、团队较小

@startuml

left to right direction


object master {
  type:主分支
  desc:生产环境主分支
}
object release {
  type:预发布分支
  desc:测试环境测试分支
}
object develop {
  type:开发分支
  desc:模块合并、冲突修复
}
object featureA {
  type:开发A模块分支
}
object featureB {
  type:开发B模块分支
}

master --|> featureA : 从生产拉出开发某模块的开发分支
master --|> featureB : 从生产拉出开发某模块的开发分支
master ..|> release : 只有准备发测试时产生，也就是说 通常在开发模块的小分支开发完成后产生
release --|> develop : 立即准备一个合并用的develop分支

featureA --* develop
featureB --* develop
develop --* release : develop解决掉冲突后，或者修改了一轮bug后合并到release
release --* master : 测试完成后合并到生产环境进行发版

legend  right
  实线箭头：拉出分支
  虚线箭头：只在需要时拉出分支
  实心零形：合并分支
end legend

@enduml

这是一般情况的分支管理情况，小公司大概就是这种，大公司的话团队又会被分割成一个一个小团队，项目也会被分割，所以以上的方式也是可用的。

### 更多的环境，更大的团队
对于更复杂的情况，就会有更多规范分支出现，这些分支的功能会更特化，提交与审核就变得更复杂更谨慎。
这就需要根据情况进行设计了，但基本上思路和变化都是很少的，无非是多几个步骤，减少冲突，让变化单向流动
## git分支 保护规则

无论gitee 还是github 还是gitlab,都支持分支的推送保护规则。
比如：
- **禁止直接推送**：强制要求开发者通过 Pull Request (PR) 来提交代码，而不是直接推送到受保护的分支。
- **要求拉取请求审批**：至少需要一个（或多个）审查员批准 PR 才能合并代码。
- **状态检查**：在合并代码之前，必须通过所有 CI 检查（例如单元测试、代码质量检查等）。
- **要求签名提交**：要求所有合并的提交都必须使用 GPG 或 S/MIME 进行签名。
- **合并策略**：
  - 强制使用 squash merge 或 rebase merge，而不允许创建 merge commit。
  - 合并 PR 时自动更新基于目标分支的最新代码。

具体设置方法：
  [github分支保护文档](https://docs.github.com/zh/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
  [gitee分支保护文档](https://gitee.com/help/articles/4295)
  [gitLab分支保护文档](https://gitlab.cn/docs/jh/user/project/protected_branches.html)
