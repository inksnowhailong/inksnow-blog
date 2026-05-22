---
title: 把多Agent团队做成一个Skill
date: 2026-5-22
categories:
    - 日济
    - AI Agent 工程
---
# 把多 Agent 团队做成一个 Skill：tvs-team-spawn 的设计与作品介绍

我最近做了一个新作品：`tvs-team-spawn`。（当我做完，测试完，使用后，分享后，有群友说这个像是harness,对啊！！像是雏形了）

它是一个 Cursor Skill，为了解决cursor没法团队模式的，作用一句话讲完：

> 在任意一个项目里一句 `/tvs-team-spawn`，就能装配出一支完整的多 Agent 协作团队——leader、若干 sub、邮箱、黑板、记忆、stop hook、worktree 编排，全部一次性建好，开新 chat 就能直接用。

这篇文章是它的作品介绍，会讲清楚四件事：

- 它解决了什么问题
- 它装出来的团队长什么样
- 几个关键机制为什么这么设计
- 怎么用、适合什么场景

## 为什么要做这个 Skill

单个 Agent 已经能写代码、能改架构、能跑很复杂的任务。

但只要任务一变大，就会撞到几个固定的瓶颈：

```text
单 Agent 同时干 5 件事 → 上下文混乱
单 Agent 既写代码又自审 → 审查不严
单 Agent 没有"另一个视角" → 边界容易漏
单 Agent 长任务 → 上下文窗口压缩，越往后越掉链子
```

很多人解决方法是：在同一个 chat 里来回切角色，"你现在是 critic，请审一下"。

这个做法治标，因为它没真正分开"上下文"和"职责边界"，只是给模型加了一个 prompt 切换。

真正的解法是把不同职责放到**独立的 chat、独立的上下文、独立的记忆、独立的工作目录**里，让它们用一个明确的通信协议协作。

但自己手搓这种系统门槛很高：

```text
通信怎么设计？
chat 怎么知道自己是哪个 agent？
没有任务时怎么静默等待，有任务时怎么自动被唤醒？
leader 怎么派活，sub 怎么回执，回执怎么走审查链？
团队共识写哪里，每个 agent 的私有记忆怎么管？
怎么避免 sub 互相直发消息搞乱通信图？
worktree 怎么隔离并行作业？
```

这些问题每一个都不复杂，但放到一起就是一套真要花一两周才能搭好的工程。

`tvs-team-spawn` 把这套工程封装成一个 Skill，让任何项目一句话起团队。

## 它装出来的团队长什么样

跑完 `/tvs-team-spawn` 后，你的项目目录会多出这些东西：

```text
.cursor/
├── runtime/team.mjs              通信和编排的运行时
├── hooks/team-stop-driver.mjs    必定生效的 stop hook
├── schemas/team-*.schema.json    消息和配置的契约
├── hooks.json                    hook 注册
├── skills/
│   ├── team-leader-<teamName>/   leader 的 skill
│   ├── sub-architect/            按你选的角色生成
│   ├── sub-executor/
│   ├── sub-critic/
│   └── sub-qa-tester/
└── .team/
    ├── config.json               团队拓扑 + chat 绑定表
    ├── inbox/<agent>/            每个 agent 一个邮箱目录
    ├── blackboard/               团队共识三件套
    │   ├── shared-context.md     目标、成员、当前阶段
    │   ├── conventions.md        通信约定 + 项目特殊规则
    │   └── decisions.jsonl       决策记录
    ├── memory/<agent>/           每个 agent 的私有记忆
    ├── worktrees/                按需创建的 git worktree
    └── state/                    probe marker、watcher pid 等运行态
```

启动方式也很轻：开 N+1 个 chat（一个 leader + 每个 sub 一个），每个 chat 输入对应的 skill 名（例如 `/team-leader-myteam` / `/sub-critic`），它们会自动绑定、自动加载记忆、自动进入待命状态。

之后你只在 leader chat 里下达需求，其它窗口完全不用碰：

```text
你在 leader chat 说：
"做一个全局搜索功能，前端 + 接口 + 测试都要"

leader 自动拆任务 → 派给 sub-executor → 写代码 → 回执
                                            ↓
leader 收到回执 → 派给 sub-critic 审查 → 找问题 → 回执
                                            ↓
leader 收到审查 → 派给 sub-executor 返工 → 回执
                                            ↓
leader 派给 sub-qa-tester 设计验收用例 → 回执
                                            ↓
leader 汇总给你 → 等你拍板 commit
```

整个过程中你只跟 leader 一个 chat 对话，其它 chat 在背后并行干活。

## 几个核心能力

下面这些是我觉得最值得拿出来讲的设计点，它们决定了这套系统是真能稳定跑，而不是 demo 级别。

### 一、self-probe 身份绑定

每个 chat 启动时都需要知道"我是这个团队里的哪个 agent"，然后把自己注册到路由表里。

这件事看起来简单，实际上有个根本困难：

> Cursor 的 chat 子进程拿不到自己的 conversation_id。

如果让 chat 自己去猜——比如扫 transcripts 目录找最近修改的文件——多 chat 并发时几乎一定猜错。

`tvs-team-spawn` 的解法是把"写身份"这件事交给 stop hook：

```text
chat 启动
  ↓
跑 pre-bind-probe . <agent>
  → 在 state 目录写一个 marker 文件，里面只写"我是哪个 agent"
  ↓
chat 主动停止本轮
  ↓
stop hook 触发
  → Cursor 通过 stdin 把准确的 conversation_id 传给 hook
  → hook 读 marker，知道这个 chat 该绑成哪个 agent
  → 把 conversation_id ↔ agent 写入 bindings
  → 注入 followup_message 让 chat 继续走启动协议
```

这个设计的工程美感不在算法本身，在责任转移：

> 不要让一个不知情的对象自证身份。让那个真正知情的对象替它写。

整条链路里 conversation_id 从来没经过 chat 进程的猜测，全部由 hook 进程直接拿到。这是这套系统最底层、最关键的一块。

### 二、必定生效的 stop hook

多 Agent 系统最容易出问题的地方，是 agent "干完一波就停下来等"，但没有重新挂回 mailbox-watch，导致下一个任务再也唤醒不了它。

最直觉的解法是写文档让 agent 自觉："处理完任务必须挂回待命"。

但 LLM 看着规则不一定会严格遵守。所以我把这件事做成了 stop hook 的强制行为：

```text
每次 chat 停止 → stop hook 触发
  ↓
真实探测 watcher 进程是否存活（process.kill(pid, 0) 探活）
  ↓
邮箱有消息       → 强制注入"去处理"
邮箱空 + 无 watcher → 强制注入"必须启动 watcher，本轮只允许做这一件事"
邮箱空 + 有 watcher → 不打扰，让 chat 安静等
```

第三种情况是关键。chat 已经挂回 watcher 时，hook 不会啰嗦；但只要 watcher 不在，**下一次 chat 任何形式的停止，hook 都会按头注入指令，直到它真的挂起为止**。

> 不要把系统稳定性押在 LLM 自觉上。所有"必须做"的行为，必须有外部强制兜底。

这是这套系统真正能长时间运行的根本原因。

### 三、watcher 自愈循环

很多人会把 mailbox-watch 设计成永驻 daemon。我做了反直觉的选择：

> 每个 watcher 默认只跑 1 小时就退出。

```text
watcher 启动 → 监听邮箱 → 1 小时超时 → 退出
  ↓
chat 收到"后台命令完成"通知 → 新一轮 chat
  ↓
stop hook 触发 → 检测无 watcher → 强制注入"启动新 watcher"
  ↓
chat 启动新 watcher → 再守 1 小时
```

单个 watcher 是短命的，但整条循环可以无限延续。

对比一下两种思路：

| 维度 | 永驻 daemon | 滚动等待器 |
|---|---|---|
| 单点稳定性 | 依赖"进程不要崩" | 单进程死了立刻有新的接替 |
| 残留清理 | 需要外部脚本 | 1 小时内自动失效 |
| 故障恢复 | 需要人工或额外看护 | hook 自动补位 |
| 内存累积 | 长时间可能漏 | 每轮重启天然回收 |

> 与其追求"一个永不挂的进程"，不如设计"一群进程的接替循环"。

这跟 Erlang "let it crash" 是同一个味道：单点不需要绝对可靠，整体的接替机制才是可靠性来源。

### 四、邮箱通信 + 黑板共识

通信层有两个明确分工：

- **邮箱**用于一次性消息：派任务、回执、追加协作请求，按 `inbox/<receiver>/from-<sender>/*.json` 路径隔离，消费即删除，不留历史
- **黑板**用于稳定共识：团队目标、协作约定、关键决策；只有 leader 能写，sub 只读

这种区分让通信图始终清晰。sub 之间禁止直接发消息——所有协作请求都在回执的 `follow_up_suggestions` 里提，由 leader 决定是否转派。

为什么这么严格？因为多 Agent 系统一旦出现 sub 互相直发消息，通信图会立刻退化成网状，调试和审计都变得困难。中心化协调（hub-and-spoke）是 Skill 默认的协作拓扑：

```text
        ┌──────────┐
        │  leader  │
        └──┬─┬─┬─┬─┘
           │ │ │ │
    ┌──────┘ │ │ └──────┐
    ▼        ▼ ▼        ▼
 ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
 │ sub │ │ sub │ │ sub │ │ sub │
 └─────┘ └─────┘ └─────┘ └─────┘
```

leader 是唯一的协调者，也是唯一会跟用户对话的人。

### 五、批量记忆初始化

每个 agent 都应该有自己的私有记忆：定位、关注点、不该做什么、沟通风格、硬边界、人格。这些信息决定了它跟其它 agent 协作时"是谁、怎么干、什么不碰"。

旧的做法是每个 agent 开 chat 之后，单独跑一遍 `/tvs-mind-seed`，每个跑 4-6 轮访谈。5 个 agent 就是 5 套访谈，半小时起步。

新机制把这件事提前到团队装配阶段：

```text
装配工问 3-5 道团队级问题
  ↓
（技术栈 / 代码风格 / 沟通基调 / 硬边界 / 历史教训）
  ↓
装配工根据每个 agent 的角色先验自动推断它的记忆字段
  ↓
（positioning / focus / outOfScope / boundaries / tone）
  ↓
给用户一张总览表审一遍
  ↓
批量写入所有 agent 的 profile / personality / memory-active
```

5 套独立访谈被压缩成 1 套团队访谈 + 1 次审阅，启动 chat 时记忆已经就绪，不用再跑任何额外步骤。

### 六、19 个内置角色 + 两套模型选型方案

skill 自带 19 个常见角色：architect、executor、explore、document-specialist、designer、writer、vision、planner、critic、analyst、qa-tester、tracer、security-reviewer、debugger、test-engineer、code-reviewer、scientist、git-master、code-simplifier。

每个角色带一份默认的 system prompt 模板 + memory hints + 推荐模型。

装配工会根据你的任务类型推荐配比：

```text
新功能：planner + executor + critic + test-engineer
大型重构：architect + executor + code-reviewer + git-master
Bug 排查：tracer + debugger + critic
安全敏感：security-reviewer + code-reviewer + critic
前端：designer + executor + critic
```

最后一步会给你两份模型选型推荐：

| 方案 | 思路 |
|---|---|
| A. 最佳质量优先（不计 token） | 决策类用 Opus + thinking，执行类用 GPT extra-high |
| B. 质量优先 + 节约 token | 决策类保持旗舰，执行类降到 Sonnet（按需带 thinking） |

为什么这么分？因为决策类（leader、critic）一旦出错全链返工，是值得砸算力的位置；执行类按 spec 跑量，旗舰反而容易"加戏"出 bug——GPT 的"严格守 spec"特性在这里反而是优点。

> 把贵的算力花在判断者身上，把快的算力花在执行者身上。这是多 Agent 团队的 Pareto 最优。

## 几个典型工作流

### 派一个标准任务

```text
你 → leader chat: "做完整登录流程"
leader: 拆解 → todo_write 给你看 → 派给 sub-executor
sub-executor: 实现 → 回执
leader: 派给 sub-critic
sub-critic: 找问题 → 回执
leader: 决定返工 / 直接合并 / 转 qa-tester
qa-tester: 设计验收用例 → 回执
leader: 汇总 → 跟你确认 → commit
```

### 跨界协作

leader 可以自己当代码勘察员，无需开 sub-explore。
SQL 任务也可以让 executor 兼任，不必专门加 backend sub。
跨界的边界由装配时录入的 `conventions.md` 守住。

### 并行作业

需要并行的几个任务，leader 默认为每个 sub 创建独立 git worktree：

```text
leader: worktree-create sub-A → branch-A
leader: worktree-create sub-B → branch-B
两个 sub 同时改不同文件，互不冲突
最后由 leader 统一合并回主分支
```

worktree 的创建、合并、commit、push 都由 leader 独占，sub 不允许调任何修改性 git 命令——这是装配时写进 `conventions.md` 的硬约束。

## 适合 / 不适合的场景

|  | 适合 | 不适合 |
|---|---|---|
| 任务复杂度 | 大需求、长任务、跨多模块 | 一次性小改、trivial fix |
| 并行可能性 | 前端 + 后端 + 测试可并行 | 必须串行完成的步骤 |
| 审查需求 | 需要严格 Critic / QA | 探索性 demo 代码 |
| 任务体量 | > 1 小时编码量 | 几分钟能搞完 |
| 团队组成 | 至少 3 个角色有协作必要 | 一个 agent 就够干完 |

多 Agent 不是"更智能"，是"用结构化协作换可控质量"。如果任务本来就小、就快、就直接，硬上团队反而是工程债。

> 一次完整的 leader → sub → leader 回路大约 2-5 分钟（不含实际编码时间），这是结构性开销。小任务直接在 leader chat 自己做更快。

## 怎么用

skill 装好后，在任意项目里：

```text
/tvs-team-spawn
```

装配工会跟你做一轮访谈（sub 数量 / 角色构成 / leader 职能 / 团队名 / 团队目标），然后自动跑：

```text
0a. 资产安装（runtime / hooks / schemas）
0.  依赖检查
1.  访谈
2.  角色推荐
3.  初始化目录
4.  添加成员
5.  写黑板
6.  生成 leader + sub skills
6.5 批量初始化所有 agent 记忆
7.  确认 stop hook
8.  更新 .gitignore
8.5 输出模型选型推荐
9.  收尾告诉你启动方式
```

跑完后开 N+1 个 chat 输入对应 skill 名，团队就上线了。

## 开源信息

skill 在我维护的 `ai-tools-skills` 仓库里：

- GitHub：<https://github.com/inksnowhailong/ai-tools-skills/tree/main/skills/tvs-team-spawn>

配套的 `tvs-mind-seed` 也在同一个仓库，单独使用可以为某个已绑定的 agent 做更深入的人格定制。

## 一句话总结

写到这里，我想用一句话概括 `tvs-team-spawn` 想做的事：

> 让 AI 团队跑起来，靠的不是更聪明的 prompt，是更稳的工程机制。

agent 写代码的能力已经够强了，缺的是它们之间的"协作可靠性"——路由、身份、强制、自愈、责任边界，每一条都需要被设计，而不是希望它自然发生。

这个 skill 把这些机制全部封装好了。

你只需要打开 Cursor，在你下一个项目里说一句 `/tvs-team-spawn`，剩下的我都替你想好了。(´ω｀)
