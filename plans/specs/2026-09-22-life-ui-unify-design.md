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
