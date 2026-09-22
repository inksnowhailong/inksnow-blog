# 休息日日历 + 点格子问那天

> 2026-09-22 用户指令："休息日要能让 AI 配置，法定节假日应同步正确"；"不能点格子问 AI 那天做了什么"。

## A · 休息日日历（后端 feat/calendar，排在 feat/reading 之后）

### 数据
- 新表 `life_calendar_days`：`id uuid · userId(index) · date text · kind text 'REST'|'WORK' · note varchar(200)|null · createdAt · updatedAt`，唯一 (userId, date)。
- 新表 `life_settings`：`id uuid · userId · key text · value simple-json · updatedAt`，唯一 (userId, key)。本期只有一个 key：`restWeekdays`（number[]，默认 `[0,6]`）。
- 迁移 `1790400000000-calendar.ts`。

### 规则（scoring.ts / schedule.ts）
- `CalendarUseCase.resolve(userId, from, to)` → `Map<date, 'REST'|'WORK'>`：先按 `restWeekdays` 生成默认（周几休息 → REST），再用覆盖表盖上。
- `settleDay` 增加参数 `dayKind: 'REST'|'WORK'`：
  - REST：`planned = 只有 pinned 的每日项`（常驻项照排，其余不排、不欠债；做了照得分）。
  - WORK：节点按自己的 `weekdays` 判断，**但**若该日周几不在节点 weekdays 里而节点是"工作日型"（weekdays ⊆ [1..5] 且非空）则视为排了——这是调休上班日的语义。
- 所有调用 `settleDay` 的地方（diagnose/ledger/settlement/range/monthly）都先 `resolve` 再传入；`isWorkday()` 只保留给"默认周几休息"的兜底，不再直接决定 planned。
- `LifeDiagnosis.rules` 带 `restWeekdays`；月度结算与 `settlement/range` 每天返回 `dayKind` 与 `note`，前端画格子用。

### 接口
```
GET  /life/calendar?from&to          → [{date, kind, note, isOverride}]
PUT  /life/calendar  {days:[{date, kind:'REST'|'WORK'|null, note?}]}   null = 删覆盖
GET  /life/settings/rest-weekdays    → {weekdays}
PUT  /life/settings/rest-weekdays    {weekdays}
```

### 聊天能力 / MCP
- `set_calendar {days:[{date, kind, note?}]}`：使用者说"10 月 1 到 7 放假""9 月 27 周六要上班""以后周六也休"（后者走 `set_rest_weekdays {weekdays}`）。风险 MEDIUM（改欠债），草稿 kind `calendar`，前端确认后 PUT。
- MCP `life_calendar`：`action: list|set|rest_weekdays`。描述明确：**法定节假日与调休上班日由调用方（Claude Code）自己查清当年安排后逐日写入，本服务不联网抓**；写之前先 list 看已有覆盖。

### 前端
- 格子墙：REST 日格子改成虚线边框、无底色（title 显示备注，如「国庆」）；WORK 覆盖的周末格按工作日样式画。图例一行补「虚格=休息日」。
- 打卡卡：当天是 REST 时标题「今天休息 · 做了算白赚」（后端 verdict 已有类似文案，取后端的）。

## B · 点格子问那天

- 前端：日历格子可点（`data-alt="heat-cell"` 变 button），点了 `openAsk({ title: '9 月 15 日', context: '问这一天做了什么、为什么欠债都行', prefix: '关于 2026-09-15 这一天：', focusDate: '2026-09-15' })`；`askStream` 多传 `focusDate`。未来日期不可点。
- 后端：`POST /life/ask`（流式）请求体加可选 `focusDate`；`InterpretMessageUseCase.execute(userId, message, history, focusDate?)` 在系统提示里追加一段「被问到的那一天」：该日结算（得分/满分/各项分钟与达标）、当天全部事件按类型列出（DO/NOTE/CHECK/SPEND/REPAY/EXERCISE/MISS，含备注与关联的清单项/研究线/书名）、当天是否休息日。要求模型回答那天的事只引用这段。
- 验收：点 9 月 15 日格 → 弹窗标题「9 月 15 日」→ 问"那天做了什么" → 回答列出当天记录；点未来格无反应。
