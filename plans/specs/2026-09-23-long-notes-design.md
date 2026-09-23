# 日志可以是一篇整理稿（长正文 + 首段折叠）

> 2026-09-23 用户："日志内容会比较多——和 Claude 研究完让它整理，然后 CV 过去。" 追问后拍板：**不另设锚点，列表里显示正文开头那一段，点开看全文。**

## 范围
学习日志（`life_log_note` / `add_log` / 节点弹窗）、研究线进展、读书笔记——三处都是 NOTE 事件，一起生效。

## 后端（hlNestServer，分支 feat/long-notes）
- `LifeEvent.note` 列改成 `text`（实体 `@Column({ type: 'text', nullable: true })`；SQLite 不用迁移列类型，但补一条空迁移记录说明，或不补——由实现者判断，注释写清）。
- 长度上限统一 `NOTE_MAX = 20000`（放 `rules.ts`），三处用例（learningLog / reading.log / manageIdeas 进展）与对应 DTO 的 `@MaxLength` 都改用它；超长报「上限 2 万字，现在 N 字」。
- `interpretMessage` 里 `add_log` / `log_research` 的 `slice(0, 120)` / `slice(0, 1000)` 去掉，改按 NOTE_MAX 截。
- 聊天能力 `add_log.text` 描述改成「日志正文，可以是一篇整理稿；使用者说"记下来"时把他给的内容原样放进去，别压缩」；`life_log_note` / `life_idea progress` / `life_book log` 的 MCP 描述同样改（会话研究完直接把整理稿写进来，不用使用者 CV）。
- 读接口返回全文不变（列表折叠由前端做）；知识地图整理大纲把全文喂给模型（现状已是全文，确认即可）。
- smoke：记一条 5000 字的日志能存能读；20001 字被拒。

## 前端（inksnow-blog，分支 feat/long-notes）
- 新 `lifeMarkdown.ts`：不引依赖（pnpm 严格隔离拿不到 markdown-it，package.json 是用户 WIP 不动），手写一个够用的渲染：`#`/`##`/`###` 标题、`-`/`*`/`1.` 列表、```` ``` ```` 代码块、行内 `code`、**粗体**、链接、段落；先 HTML 转义再渲染，链接 `rel="noopener"`。导出 `renderMarkdown(text): string` 与 `firstParagraph(text, max = 160): string`（第一个空行之前的内容，去掉 Markdown 标记，超 max 截断加 …）。
- 新 `lifeNoteRow.vue`：一条日志行的通用展示——日期左栏、正文区默认显示 `firstParagraph`，正文超过一段或超过 160 字时右侧出一个「展开」小箭头（`data-alt="note-toggle"`），展开后 `v-html="renderMarkdown(text)"` 渲染在 `prose-sm`（Tailwind 类，若项目没装 typography 插件就手写几条 `[&_h2]:…` 任意变体）；`slots.actions` 放删除叉。三个弹窗（节点学习日志 / 研究线进展 / 书弹窗）与读书行的最近笔记都换成它。
- 输入：`LifeAskBar` note 模式 `maxlength` 改 20000，最大高度 `MAX_H` 从 180 提到 320（长文粘贴能看到更多），Ctrl+Enter 提交不变。
- 验收：粘贴一篇 3000 字带标题/列表/代码块的整理稿 → 列表只显示首段 + 展开箭头 → 展开后标题/列表/代码块渲染正确、无 XSS（`<script>` 被转义）；375 宽不横向滚动。
