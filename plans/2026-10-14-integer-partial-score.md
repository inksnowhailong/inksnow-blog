# Life 整数部分得分实施计划

> **For agentic workers:** Use `executing-plans` inline. Changes stay on `feat/life-integer-partial-score` until verified.

**Goal:** 全历史按“免债线 60%，每项按分钟比例向下取整到整数分”重算。

**Architecture:** 后端 `settleDay` 成为唯一计分来源，每个 `DailyItem` 下发 `earnedPoints`；总得分、额度与免债统一累加该字段。前端只展示服务端结果，不复制算法。

**Tech Stack:** NestJS、TypeScript、Jest、Vue 3、Tailwind CSS。

## Global Constraints

- 满分与各项原始分值不变。
- `earnedPoints = floor(points × min(1, minutes / thresholdMinutes))`。
- 未达到产生 1 分所需比例时得 0 分；达到阈值后获得该项满分。
- `reached` 仍只表示完整达标，不因部分得分变为 true。
- 新规则重算全部历史。

### Task 1: 后端统一计分

- [ ] `DailyItem` 增加 `earnedPoints`。
- [ ] 当日总分、计划内得分、免债得分统一累加整数部分分。
- [ ] 休息日做了但未完整达标的非计划项也可获得部分分。
- [ ] `DEBT_FREE_RATIO` 改为 `0.6`。

### Task 2: 回归测试与说明

- [ ] 覆盖 0 分、1 分、整数向下取整、完整达标与 6 分免债。
- [ ] 更新 MCP 与规则说明，删除“未达标不得分”的旧口径。
- [ ] 运行后端 Jest 与构建。

### Task 3: 前端展示

- [ ] 每日项显示 `earnedPoints / points`。
- [ ] 页脚说明改为整数部分分规则。
- [ ] 构建并在桌面、移动端验证逐项与总分一致。

### Task 4: 发布验证

- [ ] 分别合并后端 `main`、前端 `master` 并推送。
- [ ] 等待两条部署流水线成功。
- [ ] 线上读取结算，确认免债线为 6 且部分分钟产生整数分。
