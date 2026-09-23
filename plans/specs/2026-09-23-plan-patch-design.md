# 数据驱动的计划编辑（plan_node 先行）

> 2026-09-23 用户批准："给 AI 数据本身，让 AI 直接改数据"。护栏不变：先出草稿、点头才落库、高风险字段红/黄确认。
> 本期只做 `plan_node`；顺序（sortOrder）与挂靠（parentId）随之解决。book / idea / calendar 下期照抄。

## 1 · 字段说明书（后端 `src/Life/schema/planNode.schema.ts`，纯数据）

```ts
export type FieldRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export interface FieldSpec {
  label: string;                       // 给人看的名字
  type: 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'weekdays' | 'dates' | 'node';
  writable: boolean | ((node: PlanNode) => boolean);   // 可按 level 判
  risk: FieldRisk | ((before: any, after: any) => FieldRisk);
  values?: readonly string[];          // enum
  max?: number;                        // string 长度
  group?: 'schedule';                  // 改了要出七天预览
  hint?: string;                       // 给模型的一句说明
}
export const PLAN_NODE_FIELDS: Record<string, FieldSpec> = {
  title:            { label: '标题', type: 'string', writable: true, risk: 'LOW', max: 200 },
  description:      { label: '说明与做完标准', type: 'string', writable: true, risk: 'LOW', max: 1000 },
  sortOrder:        { label: '位置', type: 'number', writable: true, risk: 'LOW', hint: '同级里的先后；一般用 position 而不是直接填数' },
  parentId:         { label: '挂在哪下面', type: 'node', writable: true, risk: 'MEDIUM', hint: '填方向或组的名字' },
  status:           { label: '状态', type: 'enum', values: ['ACTIVE','DONE','PAUSED','DROPPED'], writable: true,
                      risk: (b, a) => (a === 'DROPPED' ? 'HIGH' : 'MEDIUM') },
  droppedReason:    { label: '砍掉的原因', type: 'string', writable: true, risk: 'LOW', max: 500 },
  required:         { label: '必修', type: 'boolean', writable: (n) => n.level === 'CHECKLIST', risk: 'LOW' },
  isMainline:       { label: '主线', type: 'boolean', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM' },
  thresholdMinutes: { label: '达标分钟', type: 'number', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM' },
  points:           { label: '分值', type: 'number', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM' },
  weekdays:         { label: '周几做', type: 'weekdays', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM', group: 'schedule' },
  startOn:          { label: '开始日期', type: 'date', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM', group: 'schedule' },
  endOn:            { label: '结束日期', type: 'date', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM', group: 'schedule' },
  exceptDates:      { label: '单独不做的日子', type: 'dates', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM', group: 'schedule' },
  onlyDates:        { label: '只在这些天做', type: 'dates', writable: (n) => n.level === 'DAILY', risk: 'MEDIUM', group: 'schedule' },
  // 只读：id userId level pinned doneOn createdAt updatedAt
  level:            { label: '层级', type: 'enum', values: ['DIRECTION','DAILY','CHECKLIST'], writable: false, risk: 'LOW' },
  pinned:           { label: '常驻', type: 'boolean', writable: false, risk: 'LOW' },
  doneOn:           { label: '完成日期', type: 'date', writable: false, risk: 'LOW' },
};
```
- pinned 节点：`status / parentId / schedule 组` 一律拒绝（沿用 `guardPinned`）。
- 每种 `type` 一个格式化函数 `formatField(spec, value, ctx)` 给人看：weekdays → 「工作日 / 周末 / 一三五」（复用 `describeSchedule`），status → 中文，node → 节点标题，boolean → 是/否，date/dates 原样。

## 2 · 通用补丁用例（后端 `src/Life/useCase/planPatch.ts`）

```ts
interface PatchInput {
  node: string;                                   // 名字，matchNode 解析
  changes: Record<string, unknown>;
  position?: { after?: string; before?: string; first?: true; last?: true };
  reason?: string;
}
interface PatchDraft {
  kind: 'entity_patch'; entity: 'plan_node'; id: string; title: string; path: string;   // path = 方向 › 组
  risk: FieldRisk;                                                                       // 取所有字段最高
  changes: Array<{ field: string; label: string; before: unknown; after: unknown; beforeText: string; afterText: string }>;
  preview?: SchedulePreviewDay[];   // 动了 schedule 组才有（复用现有 previewSchedule，接日历）
  impact?: DropImpact;              // status → DROPPED 才有（复用 previewDrop）
  apply: { method: 'PATCH'; path: string; body: Record<string, unknown> };   // 前端原样发，不做任何解释
}
```
- `prepare(userId, input) → PatchDraft`：
  1. `node` 用 `matchNode` 解析（歧义 → 抛带候选的错误，调用方反问）。
  2. 逐字段查说明书：不存在/不可写（含按 level 不可写）→ 400「X 不能改」；类型/枚举/长度校验；`type:'node'` 的值按名字解析成 id 且必须是 DIRECTION。
  3. `position` → 算出 `sortOrder`：取目标同级兄弟（同 parentId、非 DROPPED，按 sortOrder），插到 after/before 指定项旁；若同时改 parentId 则按新 parent 的兄弟算。结果写进 `changes.sortOrder`，`body` 里带 `siblingsReorder: Array<{id, sortOrder}>`（重排后兄弟们的新序号，服务端一次落）。
  4. 无实际变化的字段剔除；一个都没剩 → 400「没有要改的」。
  5. risk = max；schedule 组 → preview；status→DROPPED → impact，并要求 `droppedReason`（没有就取 `reason`，再没有 → 400）。
- `apply(userId, id, body)`（即 `PATCH /life/plan/:id` 的服务端）：
  - body 只收说明书里可写字段 + `siblingsReorder`；`status: 'DROPPED'` → 走 `managePlan.drop(id, reason)`；`DROPPED → ACTIVE` → `revive`；其余 → `managePlan.update`（PLAN_UPDATE 事件带 before/after 快照，现状）。`siblingsReorder` 逐条 update sortOrder（不记事件）。
  - `UpdatePlanDto` 改成按说明书生成白名单（`@IsOptional` + 类型），不再手写字段列表。

## 3 · 聊天能力（`capabilities.ts` / `interpretMessage.ts`）

- **删** `edit_plan`、`edit_daily_rule`、`edit_daily_schedule`、`drop_plan`。**留** `create_plan`（加 `position`）、`check_item`、`undo_records`。
- **加** `plan_patch`：
  ```
  { node: '哪一项（名字）', changes: { <字段>: <新值> },
    position?: { after?: '名字', before?: '名字', first?: true, last?: true }, reason?: '砍掉时的原因' }
  ```
  `changes` 的 JSON schema 由说明书生成（可写字段各一条，带 label/hint/enum）。描述里写清：挪顺序用 position；砍掉 = `changes.status='DROPPED'` + reason；改排期只填要改的那个字段。capability 标 `Risk.HIGH`（现有枚举只有 LOW/HIGH），真实风险以草稿的 `risk` 为准。
- dispatch：`case 'plan_patch'` → `planPatch.prepare` → 返回草稿（kind `entity_patch`）；歧义/400 → answer 反问或转述原因。
- 系统提示：在路线图那段后面加「计划项可改的字段」= 说明书里 writable 的 `label（field）` 列表 + 两个例子（"挪到 token 后面" → position.after；"数据库改成选修" → changes.required=false）。

## 4 · MCP（`lifeTool.mcp.ts`）

- `life_plan_manage`：`action` 加 `patch`（参数同 plan_patch），去掉 `schedule`（被 patch 覆盖），`drop` 保留但内部走 patch status=DROPPED；描述里附可改字段列表（由说明书生成）。
- MCP 的 patch 直接 `prepare` + `apply`（MCP 一侧没有点头环节，现状 drop 也是直接执行）。

## 5 · 前端（`useLifeDraft.ts`、`lifeDraftDetail.vue`、`lifeBoard.vue`）

- 新 kind `entity_patch`：
  - `describeDraft`：`改「{title}」：{label} {beforeText} → {afterText}`，多字段用「；」连；status→DROPPED 时说「砍掉「title」：reason」。
  - `draftDetails`：`changes` 逐行 `{label, before: beforeText, after: afterText}`；有 `preview` 追加七天（复用现有 daily_schedule 的渲染，含休息日标记）；有 `impact` 追加现有 plan_drop 的影响行。
  - `applyDraft`：`api(draft.apply.path, { method: draft.apply.method, body: JSON.stringify(draft.apply.body) })`——不看 entity 不看 field，通用。
  - `touchesPlan(draft)`：`kind === 'entity_patch' && risk !== 'LOW'` 或原 PLAN_KINDS；`isDestructive`：`risk === 'HIGH'` 或原 DESTRUCTIVE_KINDS。
- **删** `plan_update / daily_rule / daily_schedule / plan_drop` 四个 kind 的 describe/details/apply（后端不再产生）。`plan_create` 保留。
- 节点弹窗的「保存」仍走 `PATCH /life/plan/:id`（body 是白名单字段，服务端同一入口）。

## 6 · 验收
- [ ] 聊天说"把上下文缓存挪到 token 后面" → 草稿「改「上下文缓存」：位置 5 → 3」→ 点头 → 路线图顺序变了
- [ ] "把上下文缓存挪到成本控制组" → 草稿「挂在哪下面：调用基础 → 成本控制」黄色确认
- [ ] "数据库这项改成选修" → 草稿「必修：是 → 否」
- [ ] "读书只在周末做" → 草稿带七天预览；"砍掉 xxx" → 红色 + 影响 + 原因
- [ ] 常驻项改排期/砍掉 → 拒绝；CHECKLIST 改 points → 400「这一项没有分值」
- [ ] MCP `life_plan_manage patch` 同样能挪顺序
- [ ] smoke 补：patch 改标题、position.after 重排兄弟、parentId 换组、status DROPPED 走 drop、非法字段 400、pinned 拒绝
- [ ] 前端 `grep -rn "plan_update\|daily_rule\|daily_schedule\|plan_drop" components/` 为空
