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

## 产品速览

先给个一眼能看完的能力清单：

- **一句 `/tvs-team-spawn` 装配**：从访谈到生成 leader + 全员 sub skill，全自动
- **19 种内置角色任选任意配比**：你需要什么团队就拉什么团队（详见后面"角色配方"）
- **同一个 Skill 服务多个项目**：每个项目独立的团队、独立的记忆、独立的邮箱，互不干扰
- **必定生效的 stop hook**：agent 任何"忘了挂回待命"的行为都会被 hook 强制纠正
- **chat 身份绑定**：一句 `bind` 自动把当前 chat 注册进团队路由表，不用手动管理 chat ↔ agent 映射
- **跨平台稳的 watcher**：优先用 chokidar，没装也能跑（自动回退 fs.watch + 5 秒轮询兜底）
- **watcher 自愈循环**：短命进程 + hook 接替，避免长驻 daemon 的脏状态
- **三层知识分工**：codegraph 答代码结构、记忆库答业务领域、黑板放团队协调态，互补不重叠
- **邮箱通信 + 黑板共识**：所有协作都走文件系统，可审计、可重放、可调试
- **批量记忆初始化**：一轮团队级访谈搞定所有 agent 的人设和边界
- **worktree 并行作业**：多 sub 同时改不同分支，由 leader 统一合并
- **模型选型推荐**：装配末尾自动给出"最佳质量"和"节约 token"两套配置方案

下面把这些拆开讲。

## 它装出来的团队长什么样

跑完 `/tvs-team-spawn` 后，你的项目目录会多出这些东西：

```text
.cursor/
├── hooks/team-stop-driver.mjs    必定生效的 stop hook（部署时生成）
├── hooks.json                    hook 注册
├── skills/
│   ├── team-leader-<teamName>/   leader 的 skill
│   ├── sub-<role-a>/             按你装配时选的角色逐个生成
│   ├── sub-<role-b>/             比如 architect / executor / critic / qa-tester ...
│   └── ...                       19 种内置角色任选任意组合，sub 数量也由你定
└── .team/
    ├── config.json               团队拓扑 + chat 绑定表
    ├── inbox/<agent>/            每个 agent 一个邮箱目录
    ├── blackboard/               团队共识三件套
    │   ├── shared-context.md     目标、成员、当前阶段
    │   ├── conventions.md        通信约定 + 项目特殊规则
    │   └── decisions.jsonl       决策记录
    ├── memory/<agent>/           每个 agent 的私有记忆
    ├── worktrees/                按需创建的 git worktree
    └── watchers/                 watcher pid 等运行态
```

> 通信和编排的运行时 `team.mjs` 不拷进项目——它在 skill 自己的目录里（软链方式安装），所有命令都从 skill 路径直接跑，项目里只留 `.team/` 这些运行态。

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

## 一个 Skill，多个项目并行

这是我自己最喜欢的一个产品特性：**同一份 Skill 可以同时装在任意多个项目里，每个项目按自己的需要捏自己的团队，互不干扰**。

每个项目的所有团队运行态都在自己的 `.cursor/.team/` 目录里，跟 git 同级：

- 团队拓扑、角色配比、成员命名
- 邮箱（项目级隔离，不会串）
- 黑板（项目共识不外溢）
- 每个 agent 的私有记忆（项目 A 的 executor 不会用 B 的偏好）
- bindings（chat ↔ agent 路由表，项目级）
- watcher 进程（pid 文件、监听器，互相不干扰）

也就是说你可以同时让 Cursor 里这样跑着：

```text
ProjectA · Vue 前端重构
  └── 团队：architect + designer + executor + critic + qa-tester

ProjectB · Python 数据科学
  └── 团队：scientist + writer + critic

ProjectC · 安全审计
  └── 团队：security-reviewer + code-reviewer + tracer + debugger

ProjectD · 文档/教程站
  └── 团队：document-specialist + writer + critic
```

四个项目、四套团队、四组记忆、四条邮件流，全部并行、全部隔离。你切换项目窗口的时候，每个团队都还在自己那边按部就班待命，不会因为你今天主要在 ProjectA 干活，B 的团队就"忘了"自己是谁。

之所以能做到这一点，是因为整个系统的存储设计就是"项目本地化"的：

```text
全局（随 skill 安装、软链到仓库，所有项目共享一份）：
  ~/.cursor/skills/tvs-team-spawn/    运行时 team.mjs（通信与编排，不拷进项目）
项目级（每个项目自己一份，绝对隔离）：
  <project>/.cursor/.team/                运行态：邮箱 / 黑板 / 记忆 / watcher pid
  <project>/.cursor/skills/               部署时生成的 leader / sub skill
  <project>/.cursor/hooks/team-stop-driver.mjs    部署时生成的 stop driver
```

全局只有"机制代码"（运行时在 skill 里，软链方式安装，`git pull` 即更新）；每个项目自己持有"团队实例"。装配工在每个项目第一次跑时，只生成项目侧的产物——`.team/` 运行态、leader/sub skill、stop driver——运行时本身不拷贝，所有命令都直接从 skill 路径跑。换电脑、换工作目录、git clone 到新机器，跑一次 spawn 重新生成项目侧产物就能起来。

> 一份 Skill，N 个项目，N 套团队，N 组记忆。每套都按那个项目自己的需要捏。

## 几个核心能力

下面这些是我觉得最值得拿出来讲的设计点，它们决定了这套系统是真能稳定跑，而不是 demo 级别。

### 一、chat 身份绑定

每个 chat 启动时都需要知道"我是这个团队里的哪个 agent"，然后把自己注册到一张路由表（`config.json` 的 `bindings`）里——这样后续 stop hook 才能凭会话 id 反查出"当前这个 chat 是谁"。

绑定本身分两半，一半在 chat、一半在 hook，各取自己能稳定拿到的东西：

```text
chat 启动 → 跑一次 bind <agent>
  → 取当前会话 id：优先用显式传入的 id；
     没有就取"最近修改的那个 transcript 文件"的 uuid
     （所以要求这个 chat 先发过一条消息，保证它的 transcript 是最新的那个）
  → 写入 bindings[会话id] = agent
  → 同时清掉这个 agent 之前的旧绑定（重绑即迁移，不留脏映射）
  ↓
之后每次 stop hook 触发
  → 宿主通过 stdin 把【精确的】会话 id 直接交给 hook
  → hook 用这个精确 id 查 bindings，立刻知道该 chat 是哪个 agent
```

这里的分工很关键：**真正精确的会话 id，永远是 hook 从宿主拿到的那个**；chat 端的 `bind` 只负责在一个受控的时刻（你刚在这个 chat 发完消息、它的 transcript 是最新的）把"这条会话 → 这个 agent"这条映射先落下来。一次只绑一个 chat、加上"按 agent 去重"的兜底，就避开了多 chat 并发时"猜错身份"的坑。

> 路由表只认会话 id。绑定的全部职责，就是在对的时机把 id 和 agent 对上号，然后让 hook 这个唯一拿得到精确 id 的角色去查。

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

而每个 watcher 具体"怎么盯邮箱"，我也留了一层稳健性：优先用 `chokidar`（跨平台文件事件更稳，尤其能扛住编辑器的原子写入 / 重命名、以及网络盘的事件抖动），团队初始化时一次性全局装好、所有项目所有 chat 都受益。但没装也绝不卡——自动回退到 Node 内置 `fs.watch` + 5 秒轮询。这里要强调一句：**轮询不是可有可无的双保险，是主力的一条腿**——`fs.watch` 在 Windows 和网络盘上是真会漏事件、还会把一次写报成好几次，没有轮询兜底，watcher 偶尔就会"睡过去"叫不醒。

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

**再补一层：知识的三层分工。** 黑板只是团队协作里"知识"的一种。我把团队要用的知识刻意拆成三层，互不重叠，各管一摊：

- **代码结构**（X 在哪定义、谁调用它、改了影响谁）→ 交给 codegraph（AST 知识图谱），机器维护、秒级新鲜。团队初始化时一次性接好，勘察 / 架构 / 审查类角色（explore / architect / code-reviewer / tracer）共享，比让每个 agent 反复 grep 又省 token 又准。
- **业务领域知识**（这个项目的业务规则、历史背景）→ 放专门的记忆库。
- **本次协作的临时状态**（当前目标、阶段、决策）→ 才放黑板。

为什么这么分？因为这三类知识的"谁来维护、多久过期"完全不同：代码结构归工具自动维护、改一行就变；领域知识慢、靠人沉淀；协调态最易变、随任务走。**按"维护方 + 时效"给知识分层，而不是一锅烩塞进一个地方**，是我觉得很多 agent 记忆系统没想清楚的一点。agent 查什么去对应的层，既不会拿过期信息，也不会为了一个结构问题烧一堆 token 去翻代码。

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

### 六、19 个内置角色 + 任意配比

skill 自带 19 个常见角色，覆盖从架构判断到具体执行的完整光谱：

```text
判断 / 决策类：
  architect / planner / analyst / scientist / code-simplifier

实现 / 执行类：
  executor / test-engineer / git-master

审查 / 把关类：
  critic / code-reviewer / security-reviewer

侦察 / 调试类：
  explore / tracer / debugger

知识 / 文档类：
  document-specialist / writer / vision

设计 / 体验类：
  designer

测试 / 验收类：
  qa-tester
```

每个角色带一份默认的 system prompt 模板 + memory hints + 推荐模型。**装配时你按业务需要任选任意配比**，sub 数量也自己定。装配工会根据你描述的任务类型给推荐方案：

| 业务场景 | 推荐配比 |
|---|---|
| 新功能开发 | planner + executor + critic + test-engineer |
| 大型重构 | architect + executor + code-reviewer + git-master |
| Bug 排查 | tracer + debugger + critic |
| 安全审计 | security-reviewer + code-reviewer + critic |
| 前端项目 | designer + executor + critic + qa-tester |
| 数据科学 | scientist + writer + critic |
| 文档 / 教程站 | document-specialist + writer + critic |
| TDD 测试驱动开发 | test-engineer + executor + code-reviewer |
| 性能优化 | analyst + executor + critic + qa-tester |
| 复杂调研 / 探索 | explore + analyst + document-specialist + critic |

这些只是推荐起点，你完全可以拒绝、改造或者自己拼一套。同样的 skill 在不同项目里可以拉完全不同的团队——这是它跟"固定形态的多 Agent 框架"最大的不同。

至少要保证一个审查角色（critic / code-reviewer / security-reviewer 之一），别的随你。

### 七、两套模型选型方案

装配的最后一步，装配工会按你团队的实际配比，给出两份选型推荐：

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

不一定每种工作都要开一个对应 sub。装配时可以把某些能力"挂到"已有 sub 身上：

- 让 leader 兼任代码勘察员（不开 sub-explore，leader 自己跑 Grep / Glob）
- 让 executor 兼任跨界小活（一个 sub 主前端，顺手能写少量 SQL）
- 让 git-master 的权限委托给 leader（小团队不必单独开 git 角色）

这些"职能扩展"在装配访谈时录入，会写进 `conventions.md` 守住边界——sub 知道自己什么可以兼、什么必须转给别人。

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
0.  依赖检查（chokidar，可选，缺了自动回退）
0.5 接入 codegraph（结构知识层，可选）
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

这个 skill 把这些机制全部封装好了。一份 Skill，多个项目并行；19 种角色随你配比；每个团队的记忆都属于它自己那个项目，长期积累下来就是一群"懂你这条业务线"的 agent。

你只需要打开 Cursor，在你下一个项目里说一句 `/tvs-team-spawn`，剩下的我都替你想好了。(´ω｀)
