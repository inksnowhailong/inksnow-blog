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

## 追加 · 打卡项带「在这」（2026-09-22 第三轮，用户已选路 B，不动后端）

动机：手机端路线图折在「更多」里，打卡时看不到"今天该学哪一项"。解法不是把路线图搬回首屏，而是让每个打卡项自己带当前清单项。

```
┌ 英文技术阅读                    2 分 ┐
│ 0/20 分钟             +15  +30  ◎  │
│ 在这  messages 结构 →               │   ← 新增一行：小标签 + 当前清单项标题，整行可点
└─────────────────────────────────────┘
```

- 「在这」= 该每日项所属方向（DAILY 节点的 parentId 那个 DIRECTION）在路线图里的当前清单项，规则与 `lifePlanTree.vue` 的 `sections` 完全一致（第一个未完成组里第一个未完成项）。
- **把 `lifePlanTree.vue` 里的 `withProgress` 与 `sections` 计算抽成 `usePlanSections.ts`（导出 `planSections(plan)`），树与打卡卡共用同一份，不许复制一遍。**
- 点这一行 → `openNode(node, path)` 打开该清单项弹窗（path 用 方向标题 › 组标题）。
- 该方向没有清单项（如纯每日项）或全部做完 → 不渲染这一行。
- 桌面与手机同样显示；手机端「更多」里的路线图保持不变。
- 文案：`在这` 用与路线图里同款的琥珀小标签样式，标题 text-xs text-slate-600，右侧一个 `LifeIcon name="right"`（没有就用现有的箭头图标名）。

验收：
- [ ] 打卡卡上有清单的每日项显示「在这」行，点了开对应清单项弹窗；无清单的每日项不显示
- [ ] 路线图与打卡卡的「在这」指向同一项（改动一项为完成后两处同步跳到下一项）

## 追加 · 统一 AI 入口、统一弹窗壳、日志去标签、研究线常开（2026-09-22 第四轮，用户指令）

用户原话：研究线不要折叠默认展开、在动段有最大高度纵向滚动；各处 AI 入口要同一个图标钮，总览状态卡没有入口了；弹窗按钮风格不统一；学习日志就是日志，去掉搞懂/卡点按钮。

### A · AI 入口只有一种

- 新组件 `lifeAskButton.vue`：`<button data-alt="ask-button">` 内含 `LifeIcon name="sparkle"`，`h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-500`（手机 `h-9 w-9`），props：`title`（必填，作 title/aria-label）。`emit('click')`。
- 放置（每处只这一颗，位置固定在标题行/行的最右）：
  - 总览「战胜内心的批判家」卡标题行右 → `openAsk` 上下文「今天的分数」，prefix「关于今天的投入和分数：」
  - 总览「奖励与惩罚」卡标题行右 → 现有 `openBankAsk` 的上下文（额度/体能债）。红方块与小绿钮的点击保留（它们是数据元素的快捷方式），但不再算"入口"
  - 打卡卡每项：行右（分数旁）→ `openDailyAsk(it)`；标题恢复为普通文字，不再是下划线按钮
  - 路线图标题行右 → 上下文「路线图」，prefix「关于我的学习路线图：」
  - 研究线标题行右 → 上下文「研究线」，prefix「关于我的研究线：」
  - 研究线弹窗头部图标行（已有，换成该组件）
  - 节点弹窗头部图标行（替代底部灰按钮「让 AI 改写」）
  - 右下角 FAB 保留（它是无上下文入口，样式不变）

### B · 弹窗壳只写一份

- 新组件 `lifeModal.vue`：props `open`、`title`、`meta?`（标题下一行小字）；slots：`icons`（头部右侧图标行）、默认（滚动正文）、`foot`（底栏）。
  - 遮罩 `fixed inset-0 z-[110]`，手机底部抽屉（grabber、`max-h-[85vh]`、safe-area）/ 桌面居中 `max-w-lg`，Esc（含 defaultPrevented 约定）与遮罩点击 → `emit('close')`，body `overflow-hidden` 开关、onUnmounted 清理。这些逻辑现在在三个弹窗里各写一份，全部搬进来。
  - 头部：左 title/meta，右 `<slot name="icons">` + 固定的关闭钮 `data-alt="modal-close"`；图标钮统一 `h-8 w-8`（手机 `h-9 w-9`）。
  - 底栏 `data-alt="modal-foot"`：`flex items-center justify-between border-t pt-3`；约定：右侧 **一个** 实心主按钮（`h-9 px-4 rounded-lg bg-brand-500 text-white text-sm`，加载中 disabled），左侧文字次按钮（`text-sm text-slate-500`）。删除类动作不进底栏。
- `lifeAskModal / lifeIdeaModal / lifeNodeModal` 全部改为 `<LifeModal>` 包裹：
  - 问 AI：icons 无；底栏不用（输入栏就是它的底）。
  - 研究线：icons = [✧][⋯]；底栏 = 现有输入栏 + 「记进展」主按钮 / 收尾模式「结项 +15 元」主按钮 + 「取消」次按钮；⋯ 菜单里是删除（现状）。
  - 节点：icons = [✧][⋯]；⋯ 菜单 = 「砍掉这条」（进入原有的原因输入 + 确认，确认区渲染在正文底部，不在底栏）；底栏主按钮 = 有改动时「保存」，否则清单项显示「标记完成 / 取消完成」；次按钮 = 有改动时「放弃改动」。原 `modal-actions` 区删掉；`save-rule`/`save-edit` 的内联保存按钮并入底栏「保存」（一个按钮保存所有脏字段，后端接口不变，多次 PATCH 顺序发也行）。

### C · 学习日志去标签

- `lifeNodeModal.vue` 删掉 `LOG_TAGS / logTag / log-tag-picker` 与日志行上的标签徽标；`addLog` 不再传 `tag`。
- 后端与 `useLifeDraft` 的 `tag` 字段保留（MCP 路径仍用），页面不展示。

### D · 研究线常开

- 去掉 `showIdeas` 与 `ideas-toggle`，标题行改为静态标题 + 右侧计数 + ✧。
- 「在动」段的 `<ul>` 加 `max-h-64 overflow-y-auto`；搁着段不限；已结段保持折叠开关。

### 验收

- [ ] 页面上所有 `[data-alt="ask-button"]` 外观一致；总览两卡、打卡项、路线图、研究线、两个弹窗头部各一颗
- [ ] 三个弹窗共用 LifeModal：头部图标行等高、关闭钮同位；研究线与节点弹窗底栏都是"右主按钮 + 左次按钮"
- [ ] 节点弹窗无搞懂/卡点 UI；日志行无徽标
- [ ] 研究线无折叠开关；在动段超过约 16rem 出现纵向滚动条
- [ ] 375 与 1920 截图，控制台无报错
