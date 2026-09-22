<script setup lang="ts">
/**
 * 计划节点详情弹窗
 * @description 一条计划的全部信息都在这里看、在这里改。
 * 要 AI 改写不在这儿写指令——弹窗里不再自带输入框，头部那颗星芒把上下文交给
 * 全页唯一的问 AI 弹窗，草稿仍然是出给人点头，模型永远不直接写库。
 *
 * 壳（遮罩、抽屉、Esc、滚动锁、头部与底栏版式）在 LifeModal 里，与另两个弹窗同一份。
 */
import { ref, computed, watch } from 'vue';
import LifeModal from './lifeModal.vue';
import LifeIcon from './lifeIcon.vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeKnowledgeMap from './lifeKnowledgeMap.vue';

const props = defineProps<{
  /** 选中的节点，为 null 时不显示 */
  node: any;
  /** 面包屑，如「AI 控制能力 › 调用基础」 */
  path: string;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 数据变了，让面板重新拉 */
  (e: 'changed'): void;
  /** 让全页那个问 AI 弹窗接手，带上这条计划当上下文 */
  (e: 'ask', payload: { prefix: string }): void;
}>();

const title = ref('');
const description = ref('');
const busy = ref(false);
const errorMsg = ref('');
const dropping = ref(false);
const dropReason = ref('');

/** 更多菜单，砍掉藏在里面 */
const menuOpen = ref(false);

/**
 * 开关更多菜单
 * @description 收起时不碰 dropping：砍掉的原因输入渲染在正文底部，
 * 菜单是它的入口而不是它的容器，关掉入口不该把已经摊开的那一步收回去
 */
function toggleMenu(open = !menuOpen.value) {
  menuOpen.value = open;
}

/** 从菜单里进入砍掉流程，输入框在正文底部 */
function startDrop() {
  menuOpen.value = false;
  dropping.value = true;
}

/**
 * 常驻项
 * @description 后端给这类节点打了 pinned：天天排、砍不掉、排期也改不了
 *（如「读书」）。前端据此收掉砍掉入口，免得点下去只换回一句报错。
 * 用 ?. 兜底：后端还没带上这个字段时按普通节点处理
 */
const isPinned = computed(() => !!props.node?.pinned);

/** 每日项才有的计分设定 */
const threshold = ref(0);
const points = ref(0);
const isDaily = computed(() => props.node?.level === 'DAILY');

/** 计分设定被改过 */
const ruleDirty = computed(
  () =>
    isDaily.value &&
    (threshold.value !== (props.node?.thresholdMinutes ?? 0) ||
      points.value !== (props.node?.points ?? 0)),
);

const logs = ref<any[]>([]);
const logDraft = ref('');
const logsLoading = ref(false);

/** 拉这一项的学习日志。方向节点会汇总它下面所有清单项的 */
async function loadLogs() {
  if (!props.node) return;
  logsLoading.value = true;
  try {
    logs.value = await props.api(`/life/plan/${props.node.id}/logs`);
  } catch {
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

/** 记一条 */
function addLog() {
  const text = logDraft.value.trim();
  if (!text) return;
  run(async () => {
    await props.api(`/life/plan/${props.node.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    logDraft.value = '';
    await loadLogs();
    emit('changed');
  });
}

const knowledgeMap = ref<any>(null);
// 知识地图是从日志整理出来的，记一条或删一条都要让它跟着重算
watch(() => logs.value.length, () => knowledgeMap.value?.load?.());

/** 删掉一条记错的 */
function removeLog(id: string) {
  run(async () => {
    await props.api(`/life/logs/${id}`, { method: 'DELETE' });
    await loadLogs();
    emit('changed');
  });
}

/** 换了节点就重置所有临时状态，免得上一条的草稿串到这一条 */
watch(
  () => props.node?.id,
  () => {
    reset();
    errorMsg.value = '';
    dropping.value = false;
    dropReason.value = '';
    menuOpen.value = false;
    logDraft.value = '';
    logs.value = [];
    if (props.node) loadLogs();
  },
  { immediate: true },
);

/**
 * 节点内容被外面改了就跟着换
 * @description AI 改写是在这个弹窗外面落的库，不跟着换的话输入框会一直
 * 显示改之前的文字，还会被 dirty 当成"有未保存的改动"。
 * 盯的是内容而不是对象本身：只有服务端那份真的变了才覆盖，
 * 因而记一条日志引起的刷新不会把手上没存的编辑冲掉
 */
watch(
  () => [
    props.node?.title,
    props.node?.description,
    props.node?.thresholdMinutes,
    props.node?.points,
  ],
  reset,
);

const isDone = computed(() => props.node?.status === 'DONE');
const isChecklist = computed(() => props.node?.level === 'CHECKLIST');

/** 标题或说明被改过 */
const dirty = computed(
  () =>
    title.value !== (props.node?.title ?? '') ||
    description.value !== (props.node?.description ?? ''),
);

/** 手上有没有没存的改动，底栏按哪个按钮就看它 */
const anyDirty = computed(() => dirty.value || ruleDirty.value);

/** 把编辑框拉回服务端那一份 */
function reset() {
  title.value = props.node?.title ?? '';
  description.value = props.node?.description ?? '';
  threshold.value = props.node?.thresholdMinutes ?? 0;
  points.value = props.node?.points ?? 0;
}

/** 统一的出错处理，省得每个动作各写一遍 try */
async function run(fn: () => Promise<any>) {
  if (busy.value) return;
  busy.value = true;
  errorMsg.value = '';
  try {
    await fn();
  } catch (e: any) {
    errorMsg.value = e.message || '操作失败';
  } finally {
    busy.value = false;
  }
}

/**
 * 存下手改的内容
 * @description 底栏只有一颗「保存」，而标题说明与计分规则是两摊字段：
 * 哪摊脏就发哪一发 PATCH，都脏就顺序发两发，后端接口不用改。
 * 计分规则只影响往后的计分，已经记下的分是按当时的规则算出来的，不会被追溯重算
 */
function save() {
  run(async () => {
    if (dirty.value) {
      await props.api(`/life/plan/${props.node.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.value.trim(),
          description: description.value.trim(),
        }),
      });
    }
    if (ruleDirty.value) {
      await props.api(`/life/plan/${props.node.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          thresholdMinutes: threshold.value,
          points: points.value,
        }),
      });
    }
    emit('changed');
  });
}

/** 把这条计划交给全页那个问 AI 弹窗，让它出改写草稿 */
function askAi() {
  emit('ask', { prefix: `改写计划项《${props.node.title}》的标题或描述：` });
}

/** 勾掉或取消勾掉 */
function toggleCheck() {
  run(async () => {
    await props.api(`/life/plan/${props.node.id}/check`, {
      method: isDone.value ? 'DELETE' : 'POST',
    });
    emit('changed');
  });
}

/** 砍掉这一项 */
function drop() {
  run(async () => {
    await props.api(`/life/plan/${props.node.id}/drop`, {
      method: 'POST',
      body: JSON.stringify({ reason: dropReason.value.trim() || '不做了' }),
    });
    emit('changed');
    emit('close');
  });
}
</script>

<template>
  <LifeModal
    :open="!!node"
    :title="node?.title"
    :meta="path"
    @close="emit('close')"
  >
    <template #icons>
      <!-- 指令不在这儿写：交给全页唯一那个对话弹窗，它会出草稿 -->
      <LifeAskButton title="让 AI 改写这条计划" @click="askAi" />
      <button
        data-alt="node-more"
        type="button"
        title="更多"
        aria-label="更多"
        class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
        @click="toggleMenu()"
      >
        <LifeIcon name="more" class="h-4 w-4" />
      </button>

      <!-- 透明底板接住菜单外面的那一下，比挂 document 监听少一套回收 -->
      <div
        v-if="menuOpen"
        data-alt="node-menu-backdrop"
        class="fixed inset-0"
        @click="toggleMenu(false)"
      />

      <!-- 砍掉收在菜单里：它不可逆，不该和保存、标记完成并排摆在手边 -->
      <div
        v-if="menuOpen"
        data-alt="node-menu"
        class="absolute right-0 top-10 z-10 w-44 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <button
          v-if="!isPinned"
          data-alt="drop-start"
          type="button"
          class="w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          @click="startDrop"
        >
          砍掉这条
        </button>
        <!-- 菜单里本来只有砍掉一项，常驻项换成一句话，别留一个空菜单 -->
        <p
          v-else
          data-alt="node-pinned-note"
          class="px-2.5 py-2 text-xs leading-snug text-slate-500 dark:text-slate-400"
        >
          这一项是常驻的，天天排，砍不掉也改不了排期
        </p>
      </div>
    </template>

    <!-- 状态徽标：完成与否、必修选修、哪天做完的 -->
    <p data-alt="node-badges" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span
        class="rounded px-1.5 py-0.5"
        :class="
          isDone
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        "
      >
        {{ isDone ? '已完成' : '未完成' }}
      </span>
      <span
        v-if="isChecklist"
        class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      >
        {{ node.required ? '必修' : '选修' }}
      </span>
      <span v-if="node.doneOn" class="text-slate-400 dark:text-slate-500"
        >{{ node.doneOn }} 完成</span
      >
    </p>

    <!-- 手改 -->
    <div data-alt="modal-edit" class="grid gap-3">
      <label class="grid gap-1">
        <span class="text-xs text-slate-500 dark:text-slate-400">标题</span>
        <input
          v-model="title"
          data-alt="edit-title"
          type="text"
          maxlength="200"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label class="grid gap-1">
        <span class="text-xs text-slate-500 dark:text-slate-400"
          >说明与做完的标准</span
        >
        <textarea
          v-model="description"
          data-alt="edit-desc"
          rows="4"
          maxlength="1000"
          class="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm leading-relaxed text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <!--
        每日项的计分设定。放在这里而不是只让 AI 改：
        一句话说不清的东西交给模型有误判风险，但完全不给入口
        等于把路堵死——使用者连自己的计划参数都调不了
      -->
      <div v-if="isDaily" data-alt="daily-rule" class="grid gap-2">
        <div class="grid grid-cols-2 gap-2">
          <label class="grid gap-1">
            <span class="text-xs text-slate-500 dark:text-slate-400"
              >达标时长（分钟）</span
            >
            <input
              v-model.number="threshold"
              data-alt="edit-threshold"
              type="number"
              min="1"
              max="600"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm tabular-nums text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label class="grid gap-1">
            <span class="text-xs text-slate-500 dark:text-slate-400"
              >达标得分</span
            >
            <input
              v-model.number="points"
              data-alt="edit-points"
              type="number"
              min="1"
              max="20"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm tabular-nums text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <p v-if="ruleDirty" class="text-[11px] leading-snug text-slate-400">
          {{ node.thresholdMinutes }} 分钟 / {{ node.points }} 分 →
          {{ threshold }} 分钟 / {{ points }} 分 · 只改往后的计分，已记的分不动
        </p>
      </div>
    </div>

    <!-- 方向节点才有知识地图；顶层每日项本身也是方向；清单项只有日志 -->
    <LifeKnowledgeMap
      v-if="node.level === 'DIRECTION' || (node.level === 'DAILY' && !node.parentId)"
      ref="knowledgeMap"
      :node-id="node.id"
      :api="api"
    />

    <!-- 学习日志：这一项从开始到现在留下了什么 -->
    <div data-alt="modal-logs">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
          学习日志
        </p>
        <span class="text-[11px] text-slate-400">
          {{ logsLoading ? '读取中…' : logs.length + ' 条' }}
        </span>
      </div>

      <!-- 日志会写成几段，框随内容长高；换行给 Enter，提交给 Ctrl/Cmd+Enter -->
      <LifeAskBar
        v-model="logDraft"
        mode="note"
        :busy="busy"
        placeholder="记一条"
        @submit="addLog"
      />
      <p class="mt-1 text-[11px] text-slate-400">
        一条只记一件事 · Ctrl+Enter 记下
      </p>

      <ul v-if="logs.length" class="mt-2 grid gap-1.5">
        <li
          v-for="l in logs"
          :key="l.id"
          data-alt="log-row"
          class="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700/40"
        >
          <div class="min-w-0">
            <p
              class="whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
            >
              {{ l.text }}
            </p>
            <p class="mt-0.5 text-[11px] text-slate-400">
              {{ l.occurredOn }}
              <!-- 方向汇总时会混进子项的日志，标出来才分得清 -->
              <span v-if="l.nodeId !== node.id"> · {{ l.nodeTitle }}</span>
            </p>
          </div>
          <button
            data-alt="log-remove"
            type="button"
            :disabled="busy"
            title="删掉这条"
            aria-label="删掉这条"
            class="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-300 transition hover:bg-white hover:text-rose-500 disabled:opacity-40 dark:hover:bg-slate-800"
            @click="removeLog(l.id)"
          >
            <LifeIcon name="close" class="h-3 w-3" />
          </button>
        </li>
      </ul>
      <p
        v-else-if="!logsLoading"
        class="mt-2 text-xs text-slate-400 dark:text-slate-500"
      >
        还没记过
      </p>
    </div>

    <!--
      砍掉的原因输入摊在正文底部而不是底栏：底栏只放那一对常规动作，
      不可逆的事要人多滚一段、多写一句，别和「保存」挤在同一行
    -->
    <div
      v-if="dropping"
      data-alt="drop-confirm"
      class="flex gap-2 rounded-xl bg-rose-50 p-2.5 dark:bg-rose-500/10"
    >
      <input
        v-model="dropReason"
        type="text"
        placeholder="为什么不做了"
        class="min-w-0 flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-base sm:text-sm outline-none dark:border-rose-500/40 dark:bg-slate-900"
      />
      <button
        data-alt="drop-confirm-btn"
        type="button"
        :disabled="busy"
        title="确认砍掉"
        aria-label="确认砍掉"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600 disabled:opacity-50"
        @click="drop"
      >
        <LifeIcon name="check" class="h-4 w-4" />
      </button>
      <button
        type="button"
        title="算了，不砍"
        aria-label="算了"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white dark:hover:bg-slate-700"
        @click="dropping = false"
      >
        <LifeIcon name="close" class="h-4 w-4" />
      </button>
    </div>

    <p
      v-if="errorMsg"
      data-alt="modal-error"
      class="text-sm text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>

    <!-- 底栏：右边一颗主按钮，左边一句文字次按钮 -->
    <template v-if="anyDirty || isChecklist" #foot>
      <div class="flex items-center justify-between gap-2">
        <button
          v-if="anyDirty"
          data-alt="discard-edit"
          type="button"
          class="text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          @click="reset"
        >
          放弃改动
        </button>
        <span v-else />

        <button
          v-if="anyDirty"
          data-alt="save-edit"
          type="button"
          :disabled="busy"
          class="h-9 shrink-0 rounded-lg bg-brand-500 px-4 text-sm text-white transition hover:bg-brand-600 disabled:opacity-50"
          @click="save"
        >
          保存
        </button>
        <button
          v-else-if="isChecklist"
          data-alt="toggle-check"
          type="button"
          :disabled="busy"
          class="h-9 shrink-0 rounded-lg bg-brand-500 px-4 text-sm text-white transition hover:bg-brand-600 disabled:opacity-50"
          @click="toggleCheck"
        >
          {{ isDone ? '取消完成' : '标记完成' }}
        </button>
      </div>
    </template>
  </LifeModal>
</template>
