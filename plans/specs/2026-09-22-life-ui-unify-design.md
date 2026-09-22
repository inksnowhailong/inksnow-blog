# life 页 · 统一 AI 弹窗 + 双端布局收整

> 2026-09-22 用户当面否掉星图/树与三套聊天框后的收整规格。用户原话：
> "星图和树都删了，就先把当前的这个页面的整体 UI 交互，移动端和 pc 双端兼容做好"。
> 铁律：**全页只允许一个经 AI 的对话外壳**。

## 目标

1. 删掉星图（`lifeStarSky.vue`、`sky` 请求、`openConstellation`、sky-section）与知识地图里的树（SVG），
   方向弹窗里只留"大纲 + 卡点"两块（`lifeKnowledgeMap.vue` 去掉 `tree` 计算与 `<svg>`）。
2. 统一 AI 弹窗 `lifeAskModal.vue`：桌面居中对话框（max-w-lg），手机底部抽屉（全宽、圆顶角、上限 85vh）。
   - 删 `lifeChat.vue`、`lifeAsk.vue`；`lifeAskPanel.vue` 作为弹窗内部面板保留（去掉"两个态"的注释）。
   - 弹窗状态：`{ open, title, context, placeholder, prefix, directLabel, direct }` 沿用 lifeBoard 现有 `ask` 结构，只把 `anchor` 换成 `open: boolean`。
   - 弹窗顶部一行上下文标签（无上下文时显示"随便说"），下面是多轮记录（本次打开期间的 `askLog`，关闭清空），底部是输入条 + 草稿确认（沿用 `LifeAskPanel`）。
   - 唤起入口：① 右下角悬浮按钮（`fixed bottom-5 right-5`，手机上避开底部安全区 `pb-[env(safe-area-inset-bottom)]`），无上下文；② 打卡条目、体能债等现有 `openAsk` 调用处照旧，只是不再传 anchor；③ 研究线弹窗的"问 AI"；④ 节点弹窗的"AI 改"区整块删掉（含 `instruction/draft/askAi/adopt` 与 `/ai-draft` 请求），换成一个按钮"让 AI 改写"，通过 emit('ask', { prefix }) 交给 lifeBoard 打开统一弹窗，prefix 写明"改写计划项《标题》的标题或描述："——后端 `edit_plan` 能力会出草稿。
   - 弹窗打开时 `body` 加 `overflow-hidden`，Esc 与遮罩点击关闭；关闭清 `askLog / askReply / askPending`。
3. 不经 AI 的四条输入条（想法池、研究线进展、节点学习日志、节点放弃原因）保留 `LifeAskBar mode="note"`，
   但 note 模式改样：无边框底色 `bg-slate-50`、按钮改成文字"记下"而不是图标，占位改成动作句：
   "记一个想法" / "记一条进展" / "记一条：搞懂了什么，或卡在哪" / "为什么不做了"。
   目的：一眼分清"这条不经 AI，直接落库"。
4. 桌面布局（lg+）：
   ```
   ┌──────────── 总览（不动）────────────┐
   ├── 今日打卡 ─────────┬── 路线图 ───────┤
   │                     │ 想法池（折叠行）│
   └─────────────────────┴────────────────┘
                              [问 AI] 悬浮
   ```
   `grid lg:grid-cols-2`：左列（打卡 + 想法池）`lg:self-start lg:sticky lg:top-4` 只占内容高度并随滚动吸顶，右列路线图；无 `ai-column`。
5. 手机布局（< lg）：首屏 = 今日打卡；其下"更多"按钮展开 总览 · 路线图 · 想法池（沿用 `showMore`，文案改成"更多：总览 · 路线图 · 想法池"）。悬浮按钮常驻。
6. 性能：记日志 / 记进展 / 确认草稿后不再无脑 `loadAll()` 六连拉。
   `loadAll()` 拆成 `loadCore()`（diagnosis+plan+day）与 `loadIdeas()`；想法池相关动作只 `loadIdeas()`，节点弹窗 `changed` 只 `loadCore()`。sky 请求删除。
7. 后端不动。`learning/sky` 与 `knowledge-map` 接口留着不删。

## 约束

- 只用 Tailwind；所有有意义标签带 `data-alt`；中文 JSDoc；不加未要求的功能。
- 不提交 `.gitignore` / `docs/.vuepress/config.ts` / `package.json` 这三处 master 上原有的 WIP，用 pathspec 提交。
- 不跑 `npm test`/`build`；dev server 已在 8080 跑着，改完即可用 Playwright 看。

## 验收

- [ ] 1920×1080 全页截图：右侧无空白列，总览下面两列对齐，悬浮按钮在右下角。
- [ ] 375×812 截图：首屏只有打卡卡与"更多"，悬浮按钮不遮住"更多"。
- [ ] 页面上一共只有一个经 AI 的输入条，且它在弹窗里；`grep -c "LifeChat\|LifeAsk\b\|lifeAsk.vue\|lifeChat.vue\|LifeStarSky" components/*.vue` 为 0。
- [ ] 从打卡条目、悬浮按钮、研究线弹窗、节点弹窗四处打开的是同一个弹窗，标题行显示各自上下文。
- [ ] 控制台无报错（favicon 除外）。

## 追加 · 想法池列表与详情弹窗重做（2026-09-22 第二轮，用户已批准，不动后端）

数据：`pool.threads[]` 每条已有 `id content createdOn state(OPEN|STALE|DONE) lastActiveOn logCount conclusion concludedOn`。

### 列表（lifeBoard 的 ideas-section）

```
┌ 想法池 ─────────── 2 在动 · 1 搁着 · 2 已结 ┐   ← 标题行右侧是三段计数，替代「N 条」
│ [记一个想法]                                 │   ← note 输入条常驻在最上
│ 在动                                         │   ← 分段小标题（text-[11px] text-slate-400）
│ ▌试试用 canvas 画星图        3 条 · 2 天前   │   ← 左侧 2px 色条 brand-400
│ ▌研究一下 MCP 的 auth        1 条 · 今天     │
│ 搁着                                         │
│ ▏sqlite 的 WAL 到底啥        0 条 · 21 天前  │   ← 色条 slate-300 虚线感（border-dashed）
│ 已结 (2) ˅                                   │   ← 默认折叠，点开每行显示结论那句
│   ▌把星图删了：视觉压不住                     │   ← 色条 emerald-400，正文=原话，下一行小字=结论
└─────────────────────────────────────────────┘
```

- 删掉徽标（IDEA_STATES 的 label/cls 不再用于列表）；状态由分段 + 色条表达。
- 行右侧 `logCount 条 · 距 lastActiveOn 多久`：今天 / 昨天 / N 天前（用 lifeDate 里已有的工具，没有就写一个 `daysAgoLabel`）。
- 空段不渲染标题；全空显示原来的空态文案。
- 想法池整块折叠开关（`showIdeas`）保留；已结段自己再有一个折叠（`showDone`，默认 false）。
- 手机端行高保证 44px 可点。

### 详情弹窗（lifeIdeaModal.vue 重写模板，逻辑复用）

```
┌──────────────────────────────────────┐
│ 原话（text-base 加粗）    09-20 · 在动 │   头：右上角两个图标按钮：问 AI、更多(⋯)→ 删除
│ ┃ 结论：…（仅 DONE，emerald 左边条）   │
├──────────────────────────────────────┤
│ 09-22  发现 ResizeObserver 会二次触发  │   进展流：左栏日期(tabular-nums text-slate-400 w-14)，右栏原文
│ 09-21  试了 echarts，样式压不住        │   每行 hover 出删除小叉（现有 removeLog）
│ 09-20  记下                            │   最后一行固定是 createdOn 的「记下」
├──────────────────────────────────────┤
│ [记一条进展………………]  (记进展) (收尾)   │   底栏：一条 LifeAskBar mode=note + 两个按钮
└──────────────────────────────────────┘
```

- 底栏两种模式：默认「记进展」；点「收尾」切到结论模式——同一条输入栏底色转 amber-50、占位「一句结论，写下即结项」、按钮变「结项 +15 元」与「取消」。结论模式下 Ctrl+Enter 提交结论。
- DONE 的线：底栏不渲染，进展行不出删除叉，整窗只读；删除仍在 ⋯ 菜单里（已结删掉会回收额度，菜单项文案说明）。
- 现有的 `closing/conclusionDraft/dropping` 状态与 `conclude/remove/addLog/removeLog` 逻辑沿用，只改模板与少量状态名；`emit('ask')` 保留。
- 删除确认仍用现在那套（二次确认），不用 window.confirm。

### 验收

- [ ] 列表三段分组正确，空段不显示，已结默认折叠且展开后每行带结论
- [ ] 弹窗：进展流日期左栏对齐；点「收尾」栏变琥珀色，结项后弹窗转只读并显示结论
- [ ] 375px 宽下弹窗底栏不被键盘/安全区遮挡（沿用 lifeAskModal 的 safe-area 写法）
