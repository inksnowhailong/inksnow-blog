# 想法池重设计 · 研究线

> 2026-09-22 经深度访谈定稿，用户已批准。实现计划见 `plans/2026-09-22-idea-thread.md`。

## 目标

想法池是**一份关于好奇心的数据集**，主要读者是 AI 而非本人。每条是一根"研究线"：一句原话开头、几条短进展、一句结论收尾。Claude Code 通过 MCP 一次读全，回答"兴趣分布怎么漂、是什么行为模式、怎么思考、接下来该碰什么"。

## 研究线的形状

```
原话       你当时说的那一句，不整理、不覆盖（≤500 字）
记于       YYYY-MM-DD
进展[]     每条一句 + 日期，AI 或你追加（复用 life_events 的 NOTE 事件，ideaId 关联）
结论       一句话（≤500 字）；写下即结项，发 15 元
结于       YYYY-MM-DD
```

状态**不落库**，由字段推出：

```
conclusion 为空                    → OPEN  进行中
OPEN 且 ≥14 天无进展（含记下当天）   → STALE 搁着
conclusion 非空                    → DONE  已结
```

## 删掉的东西

冷却期、沉底、动手、四行笔记、季度回看。对应字段 `status / coolUntil / startedOn / note / notedOn / quarterMark / reviewedOn`、接口 `start / note / review`、MCP 动作 `start / note / review`、聊天能力 `write_research_note` 一并删除。

## 保留的东西

- 记一行字零成本、不计分、不经模型：`POST /life/ideas`
- 进展日志：`GET/POST /life/ideas/:id/logs`、`DELETE /life/logs/:id`
- 结项奖励 `RULES.RESEARCH_NOTE_YUAN = 15`，触发条件改为"写一句结论"
- 删除一条线：`DELETE /life/ideas/:id`，连带进展；已结的删掉额度回收

## 新增

- `POST /life/ideas/:id/conclude` `{ conclusion }`
- `GET /life/ideas/dump` 返回紧凑纯文本，供分析
- MCP：`life_idea` 动作改为 `capture / pool / progress / conclude`；新增只读 `life_ideas_dump`
- `life_idea` 工具描述明确要求模型：会话里出现"我想试试 / 帮我查查 / 我好奇"时主动提议记一笔；研究有实质推进时提议追加进展；得出结论时提议结项

## 页面（极简）

- 侧栏折叠区保留，每行：原话 + 日期 + 徽标（进行中 / 搁着 / 已结）
- 详情弹窗：原话、进展流、追加进展输入条、"写结论收尾"输入条；已结的只读展示结论
- 删除：时间线冷却/动手节点、四行笔记表单、季度回看三个按钮

## 数据迁移

旧记录只保留 `content / createdOn`。`status = 'NOTED'` 的，结论取 `note.judgment`，为空则退到 `note.result`、再退到 `note.question`；`concludedOn = notedOn`。其余状态一律视作进行中。写成 TypeORM migration，走现有 CI 的 `migration:run`。

## 验收标准

- [ ] `GET /life/ideas/dump`（及 MCP `life_ideas_dump`）一次拿到全部研究线，格式紧凑可读
- [ ] 页面上给一条线写结论 → 徽标变已结、`ledger.earnedFromNotes` +15
- [ ] 进行中的线 14 天无进展 → 徽标显示"搁着"，数据库无对应字段
- [ ] 旧库里 NOTED 的想法迁移后结论非空，其余为进行中
- [ ] `start / note / review` 接口与 MCP 动作已不存在
- [ ] 会话里说"我想试试 X"，模型会提议记一笔（依赖 MCP 连通，见未决）

## 未决 / 风险

- `life` MCP 服务本会话连不上（nginx 对客户端注册返回 404），MCP 侧验收前需先修通
- 会话结束前的"要不要记一笔"提醒属于 Claude Code 全局配置（hook / CLAUDE.md），不在本仓库范围
