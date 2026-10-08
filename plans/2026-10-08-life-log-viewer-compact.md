# Life 日志弹窗紧凑化实施计划

> **For agentic workers:** To implement this plan, use `executing-plans` inline. Follow project Git rules; all changes stay on `fix/life-log-viewer` until verification passes.

**Goal:** 将“记录日志”与“阅读日志”拆成同一组件内的两种空间形态：记录时紧凑、阅读时沉浸，同时兼容手机。

**Architecture:** `lifeLogViewer.vue` 保持数据和事件接口不变，仅增加内部 `writing` 视图状态。`initialId === null` 时进入紧凑记录态；选择历史日志后进入现有阅读态，关闭阅读可返回记录态。调用方无需改 API。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Tailwind CSS、现有 `LifeAskBar` / `LifeIcon`。

## Global Constraints

- 不引入新依赖和原生 CSS。
- 保留暗色模式、键盘操作、删除确认、草稿失败不丢失。
- 所有有意义标签保留 `data-alt`。
- 桌面记录窗最大宽度 `42rem`，不使用固定 `85vh`；阅读态维持宽屏双栏。
- 手机记录态全屏，输入区优先，历史日志在下方滚动；最小触控区域 44px。

---

### Task 1: 记录态与阅读态切换

**Files:**
- Modify: `docs/.vuepress/components/lifeLogViewer.vue`

**Interfaces:**
- Consumes: 现有 `open`、`initialId`、`logs`、`canWrite`。
- Produces: 内部 `writing: boolean`；对外 props/emits 不变。

- [ ] 打开且未指定 `initialId` 时进入记录态；指定日志时直接进入阅读态。
- [ ] 记录态点历史日志切换阅读态；阅读态提供“返回记录”入口。
- [ ] 保留桌面 ↑/↓、j/k 切换和手机左右滑切换。

### Task 2: 紧凑记录布局

**Files:**
- Modify: `docs/.vuepress/components/lifeLogViewer.vue`

**Interfaces:**
- Produces: 桌面自适应高度的单栏写作卡；手机全屏写作面。

- [ ] 顶部只保留标题、日志数量和关闭按钮。
- [ ] 输入框作为第一视觉层，提交提示与错误紧贴输入区。
- [ ] 最近日志压成日期、首段、来源三行以内的列表，限制最大高度后内部滚动。
- [ ] 空状态直接引导开始记录，不保留无意义占位区。

### Task 3: 阅读布局收敛

**Files:**
- Modify: `docs/.vuepress/components/lifeLogViewer.vue`

- [ ] 阅读态继续使用桌面双栏、手机列表/正文两级导航。
- [ ] 桌面面板高度改为视口约束 `max-h-[85vh]`，短内容不强制撑满。
- [ ] 正文仍限制 `max-w-3xl`，长代码块和表格独立横向滚动。

### Task 4: 验证与部署

- [ ] 运行 `npm run build`，要求退出码 0。
- [ ] 用移动端和桌面端走查：打开记录态、提交、打开历史、返回、删除确认、暗色模式。
- [ ] 仅提交本计划和 `lifeLogViewer.vue`，不带入工作区原有未跟踪文件。
- [ ] 合并到 `master` 并推送，等待 GitHub Actions “Deploy static content to Pages” 成功。
- [ ] 线上检查 `/inksnow-blog/life/` 的记录态与阅读态。
