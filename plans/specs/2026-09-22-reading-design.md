# 读书模块

> 2026-09-22 用户批准。读书从"四个每日项之一"升级成独立模块：每日项照旧计分但**永远有、天天排（含周末）、不可砍**；另外记"读了什么书、每次读到什么"。

## 数据（后端 hlNestServer，分支 feat/reading）

- 新表 `life_books`（实体 `src/Life/Entities/Book.entities.ts`，仿 Idea）：
  `id uuid · userId(index) · title varchar(200) · status text 'READING'|'DONE' · startedOn text · finishedOn text|null · createdAt · updatedAt`
- `life_events` 加列 `bookId varchar nullable`（与 `ideaId` 同款，index）。读书笔记 = `kind NOTE + bookId`，`note` 正文 ≤1000，`occurredOn`。
- `life_plan_nodes` 加列 `pinned boolean default 0`。
- 迁移 `src/migration/1790300000000-reading.ts`：建表、两列加法（SQLite 用 ALTER TABLE ADD COLUMN 即可）、数据：`UPDATE life_plan_nodes SET pinned=1, weekdays='[0,1,2,3,4,5,6]' WHERE level='DAILY' AND title='读书' AND status='ACTIVE'`。down 对称（表删掉；列删不掉就留着，注释说明）。

## 用例与规则

- `ReadingUseCase`（`src/Life/useCase/reading.ts`）：
  - `add(userId, title, source)` → Book（title trim、≤200、非空；同名在读的书不重复建，返回已有那本）
  - `list(userId)` → `{ reading: BookView[], done: BookView[] }`；`BookView = Book & { logCount, lastLogOn|null }`
  - `log(userId, bookId, text, occurredOn?, source)` → 追加 NOTE 事件（bookId），返回 `{id, bookId, occurredOn, text, source}`
  - `logs(userId, bookId, limit=200)` → 倒序
  - `finish(userId, bookId)` → status DONE, finishedOn=today；已 DONE 报错
  - `remove(userId, bookId)` → 删书并删其笔记事件
  - 按书名模糊找书 `find(userId, keyword)` 供聊天/MCP 用（在读优先，包含匹配）
- `pinned` 保护：`ManagePlanUseCase.drop / check / update(改 weekdays/startOn/endOn/exceptDates/onlyDates/status)` 与 `edit_daily_schedule`、`drop_plan` 能力遇到 `pinned` 节点 → `BadRequestException('这一项是常驻的，不能砍也不能改排期')`。改 points/thresholdMinutes/title/description 允许。
- 事件删除 `DELETE /life/logs/:id` 现有逻辑已能删 NOTE，确认对 bookId 事件同样可用。
- `PlanTreeNode` / 每日项结算返回里带 `pinned`，前端据此隐藏砍掉入口。

## 接口（LifeKeyGuard 下）

```
GET    /life/books                  → list()
POST   /life/books   {title}        → add
GET    /life/books/:id/logs         → logs
POST   /life/books/:id/logs {text, occurredOn?} → log
POST   /life/books/:id/finish       → finish
DELETE /life/books/:id              → remove
```
DTO 加在 `life.dto.ts`（`AddBookDto`、`AddBookLogDto`）。

## 聊天能力（capabilities.ts + interpretMessage.ts）

- `add_book {title}`：使用者说"开始读《X》/ 新书 X"时用。草稿 kind `book_add`。
- `log_reading {book, text}`：使用者说"今天读了《X》，讲了… / 读到…"时用；`book` 填书名关键词，匹配不到就提示先 add_book。草稿 kind `reading_log {bookId, bookTitle, text}`。
- `finish_book {book}`：说"《X》读完了"。草稿 kind `book_finish`。
- 三个草稿都是 LOW 风险；`applyDraft` 前端对应调上面接口。

## MCP（lifeTool.mcp.ts）

- 新工具 `life_book`：`action: add|list|log|finish`，参数 `title? / book? / text? / occurredOn?`。描述要求模型：会话里使用者提到在读某本书、读到了什么，主动提议记一条；只记他说的，不总结。

## 前端（inksnow-blog，分支 feat/life-ui-unify 上继续）

- `lifeBoard.vue`：
  - `loadBooks()` → `GET /life/books`，与 `loadIdeas` 同级；开锁时并行拉。
  - 左列在研究线**上面**加 `data-alt="books-section"`：标题行「读书」+ 右侧「在读 N · 读完 M」+ ✧（openAsk 上下文「读书」，prefix「关于我在读的书：」）；`LifeAskBar mode=note` 占位「记一本书」→ `POST /life/books`；在读列表 `LifeBookRow`（书名、`N 条 · 几天前`，左侧色条 brand）；读完段折叠（默认收），展开每行书名 + `起止日期`。空态一句「还没在读的书」。
  - 打卡项「读书」（按 `pinned` 判断，不按标题）下面一行 `data-alt="punch-reading"`：「在读 ·《第一本在读书名》→」，样式同「在这」；点了开书弹窗。没有在读的书则显示「在读 · 还没记书」并点开读书卡的输入条（滚过去聚焦）。
  - 打卡项/节点弹窗对 `pinned` 节点：⋯ 菜单不出「砍掉」，排期相关编辑禁用。
- `lifeBookRow.vue`（仿 lifeIdeaRow）。
- `lifeBookModal.vue`（LifeModal）：头=书名 + `startedOn · 在读/读完`；icons=[✧][⋯]；正文=笔记时间线（日期左栏，行 hover 删）；底栏=`LifeAskBar mode=note` 占位「读到什么，想到什么」+ 主按钮「记一条」，次按钮「读完」（DONE 后底栏不渲染，只读）；⋯ 菜单=删除（二次确认）。Esc/遮罩关。
- `useLifeDraft.ts`：`book_add / reading_log / book_finish` 的 describe + apply。
- 手机端：读书卡随左列在「更多」里；打卡项那行「在读」在首屏。

## 验收

- [ ] 迁移后「读书」每日项 pinned=1、周末也排；页面与 AI 都砍不掉、改不了排期
- [ ] 记一本书 → 在读列表出现；记笔记 → 弹窗时间线出现、卡片行计数 +1；读完 → 进读完段
- [ ] 打卡「读书」格下显示在读书名，点开书弹窗
- [ ] 聊天说"今天读了《X》，讲了 Y" → 草稿 → 确认落库
- [ ] MCP `life_book list` 能列书；`life_book log` 能记
- [ ] smoke 测试补一节：加书、记笔记、读完、pinned 砍不掉

## 实现期裁定（2026-09-22）

- 「读书」pinned 后周末也排，周末只有它一项（2 分）：免债线 ceil(2×0.8)=2，即**周末没读书当天欠 2 个**；一个月 8～9 个周末日最坏欠 16～18 个。这是"天天排"的字面后果，不是算错。
- 迁移按 `title LIKE '%读书%'` 找常驻项，找不到打 warn，不静默。
- 回滚（plan-changes revert）遇到 pinned 节点一律拒绝。

## 追加 · 读书独立成一整张卡（2026-09-23，用户否掉"两处编辑"后重设计）

用户原话："以后记录读书岂不是需要编辑俩位置"。裁定：读书**只有一个地方**——一整张卡，不进打卡格，不靠弹窗。

```
┌ 读书                                 今天 0/30 分钟 · 2 分   ✧ ┐
│ [+15] [+30] [◎补到达标]                                        │  ← 记分钟，和原打卡格同一套 punch()
│ 在读  ●《穷查理宝典》 ○《xxx》                 （多本时点选当前）│  ← 一行 chip；一本时只显示书名
│ [读到什么，想到什么 ………………………………]  (记下)                     │  ← 记到当前那本，LifeAskBar note
│ 09-23  奖励与惩罚的超级反应倾向                                   │  ← 当前书最近 5 条笔记，行 hover 删
│ 09-22  开读                                                     │
│ 记一本书 [………………]      读完 (2) ˅                                │  ← 底部：加书 + 读完段折叠
└─────────────────────────────────────────────────────────────────┘
```

- 打卡格：`pinned` 的每日项**不再渲染在四格里**，`dailyTitle` 也只数非 pinned 的项（变成「每日三项」）；读书的分钟/达标/分值从 `activeDay.items` 里那条 pinned 项取，显示在读书卡标题行。
- 读书卡位置：桌面左列最上（打卡卡之上还是之下？——之下，紧挨着，同为"今天要做的"）；手机首屏 = 打卡卡 + 读书卡，都不进「更多」。
- 当前书：`activeBookId`，默认取在读列表第一本；多本时 chip 可切，记在 localStorage（`life-reading-book`）。没有在读书：chip 行显示「还没记书」，笔记输入条禁用，加书输入条聚焦提示。
- 笔记：直接 `POST /life/books/:id/logs`，落库后重拉当前书 logs（只拉这一本）与 books 计数；最近 5 条之外有「全部 N 条」文字按钮 → 打开现有 `lifeBookModal`（弹窗保留为"看全部/读完/删书"的次级入口，不再是主入口）。
- 读完段与「记一本书」沿用现有实现，搬到卡底部。
- 「在读 ·《书名》」那行从打卡格删掉（`punch-reading`），`lifeBookRow` 保留给读完段。
- 聊天 `reading_log` 草稿不变；`log_minutes` 对读书项照旧可用。
- 验收：页面上记读书只需在这一张卡上操作（分钟 + 内容）；打卡格只剩三项；375 宽首屏能看到读书卡的 +15/+30 与笔记输入条；控制台无报错。
