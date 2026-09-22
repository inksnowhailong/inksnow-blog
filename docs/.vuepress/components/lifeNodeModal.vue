<script setup lang="ts">
/**
 * 计划节点详情弹窗
 * @description 一条计划的全部信息都在这里看、在这里改。
 * AI 改写走"先出草稿再由人点头"的路子：模型永远不直接写库，
 * 因而也不需要为"撤销 AI 的修改"再造一套机制。
 */
import { ref, computed, watch } from 'vue';
import LifeIcon from './lifeIcon.vue';
import LifeAskBar from './lifeAskBar.vue';
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
}>();

const title = ref('');
const description = ref('');
const instruction = ref('');
const draft = ref<any>(null);
const busy = ref(false);
const errorMsg = ref('');
const dropping = ref(false);
const dropReason = ref('');



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

/**
 * 存下改动后的计分规则
 * @description 只影响往后的计分。已经记下的分是按当时的规则算出来的，
 * 不会被追溯重算——否则改一次规则，过去几个月的账全变了
 */
function saveRule() {
  run(async () => {
    await props.api(`/life/plan/${props.node.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        thresholdMinutes: threshold.value,
        points: points.value,
      }),
    });
    emit('changed');
  });
}
const logs = ref<any[]>([]);
const logDraft = ref('');
const logsLoading = ref(false);
/** 这条日志的性质：不选=普通记录 */
const logTag = ref<'' | 'GOT' | 'STUCK'>('');
const LOG_TAGS: Array<{ value: 'GOT' | 'STUCK'; label: string; cls: string }> = [
  { value: 'GOT', label: '搞懂', cls: 'bg-emerald-500 text-white' },
  { value: 'STUCK', label: '卡点', cls: 'bg-amber-500 text-white' },
];

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
      body: JSON.stringify({ text, ...(logTag.value ? { tag: logTag.value } : {}) }),
    });
    logDraft.value = '';
    logTag.value = '';
    await loadLogs();
    emit('changed');
  });
}

const knowledgeMap = ref<any>(null);
// 搞懂/卡点条数要跟着日志变
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
    title.value = props.node?.title ?? '';
    description.value = props.node?.description ?? '';
    instruction.value = '';
    draft.value = null;
    errorMsg.value = '';
    dropping.value = false;
    dropReason.value = '';
    logDraft.value = '';
    logTag.value = '';
    logs.value = [];
    threshold.value = props.node?.thresholdMinutes ?? 0;
    points.value = props.node?.points ?? 0;
    if (props.node) loadLogs();
  },
  { immediate: true },
);

const isDone = computed(() => props.node?.status === 'DONE');
const isChecklist = computed(() => props.node?.level === 'CHECKLIST');

/** 标题或说明被改过 */
const dirty = computed(
  () =>
    title.value !== (props.node?.title ?? '') ||
    description.value !== (props.node?.description ?? ''),
);

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

/** 存下手改的内容 */
function save() {
  run(async () => {
    await props.api(`/life/plan/${props.node.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: title.value.trim(),
        description: description.value.trim(),
      }),
    });
    emit('changed');
  });
}

/** 让 AI 给个改法，只拿草稿 */
function askAi() {
  if (!instruction.value.trim()) return;
  run(async () => {
    draft.value = await props.api(`/life/plan/${props.node.id}/ai-draft`, {
      method: 'POST',
      body: JSON.stringify({ instruction: instruction.value.trim() }),
    });
  });
}

/** 采纳草稿：只填进输入框，仍要再点一次保存才落库 */
function adopt() {
  if (!draft.value) return;
  title.value = draft.value.after.title;
  description.value = draft.value.after.description;
  draft.value = null;
  instruction.value = '';
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
  <div
    v-if="node"
    data-alt="node-modal-mask"
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    @click.self="emit('close')"
  >
    <div
      data-alt="node-modal"
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:rounded-2xl"
    >
      <!-- 头 -->
      <div data-alt="modal-head" class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-xs text-slate-400 dark:text-slate-500">
            {{ path }}
          </p>
          <p
            class="mt-0.5 text-lg font-semibold text-slate-800 dark:text-slate-100"
          >
            {{ node.title }}
          </p>
          <p class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
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
            <span
              v-if="node.doneOn"
              class="text-slate-400 dark:text-slate-500"
              >{{ node.doneOn }} 完成</span
            >
          </p>
        </div>
        <button
          data-alt="modal-close"
          type="button"
          title="关闭"
          aria-label="关闭"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          @click="emit('close')"
        >
          <LifeIcon name="close" class="h-4 w-4" />
        </button>
      </div>

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
          <div v-if="ruleDirty" class="flex items-center gap-2">
            <button
              data-alt="save-rule"
              type="button"
              :disabled="busy"
              title="保存计分规则"
              aria-label="保存计分规则"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500 text-white transition hover:bg-amber-600 disabled:opacity-50"
              @click="saveRule"
            >
              <LifeIcon name="check" class="h-4 w-4" />
            </button>
            <span class="text-[11px] leading-snug text-slate-400">
              {{ node.thresholdMinutes }} 分钟 / {{ node.points }} 分 →
              {{ threshold }} 分钟 / {{ points }} 分 ·
              只改往后的计分，已记的分不动
            </span>
          </div>
        </div>

        <button
          v-if="dirty"
          data-alt="save-edit"
          type="button"
          :disabled="busy"
          title="保存修改"
          aria-label="保存修改"
          class="grid h-8 w-8 place-items-center justify-self-start rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-50"
          @click="save"
        >
          <LifeIcon name="check" class="h-4 w-4" />
        </button>
      </div>

      <!-- AI 改 -->
      <div
        data-alt="modal-ai"
        class="mt-5 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40"
      >
        <LifeAskBar
          v-model="instruction"
          mode="ask"
          :busy="busy"
          placeholder="怎么改，例如：把做完的标准写具体点"
          label="交给 AI 改写，只出草稿不落库"
          @submit="askAi"
        />

        <!-- 草稿：改前改后摆一起，看清了再采纳 -->
        <div v-if="draft" data-alt="ai-draft" class="mt-3 grid gap-2 text-sm">
          <p v-if="draft.reason" class="text-xs text-slate-500 dark:text-slate-400">
            {{ draft.reason }}
          </p>
          <div
            class="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-900"
          >
            <p class="text-xs text-slate-400 dark:text-slate-500">改后标题</p>
            <p class="text-slate-800 dark:text-slate-100">
              {{ draft.after.title }}
            </p>
            <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
              改后说明
            </p>
            <p class="leading-relaxed text-slate-700 dark:text-slate-200">
              {{ draft.after.description }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              data-alt="ai-adopt"
              type="button"
              title="采纳，填进上面的输入框"
              aria-label="采纳"
              class="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600"
              @click="adopt"
            >
              <LifeIcon name="check" class="h-4 w-4" />
            </button>
            <button
              data-alt="ai-discard"
              type="button"
              title="丢弃这个改法"
              aria-label="丢弃"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              @click="draft = null"
            >
              <LifeIcon name="close" class="h-4 w-4" />
            </button>
          </div>
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
      <div data-alt="modal-logs" class="mt-5">
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
            学习日志
          </p>
          <span class="text-[11px] text-slate-400">
            {{ logsLoading ? '读取中…' : logs.length + ' 条' }}
          </span>
        </div>

        <div data-alt="log-tag-picker" class="mb-1.5 flex gap-1.5">
          <button
            v-for="t in LOG_TAGS"
            :key="t.value"
            data-alt="log-tag"
            type="button"
            class="rounded-full px-2.5 py-0.5 text-xs transition"
            :class="logTag === t.value ? t.cls : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'"
            @click="logTag = logTag === t.value ? '' : t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <!-- 日志会写成几段，框随内容长高；换行给 Enter，提交给 Ctrl/Cmd+Enter -->
        <LifeAskBar
          v-model="logDraft"
          mode="note"
          :busy="busy"
          placeholder="搞懂了什么，或卡在哪"
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
                <span
                  v-if="l.tag"
                  class="ml-1 rounded px-1 py-px text-[10px]"
                  :class="l.tag === 'GOT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'"
                  >{{ l.tag === 'GOT' ? '搞懂' : '卡点' }}</span
                >
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

      <p
        v-if="errorMsg"
        data-alt="modal-error"
        class="mt-3 text-sm text-rose-600 dark:text-rose-400"
      >
        {{ errorMsg }}
      </p>

      <!-- 动作 -->
      <div
        data-alt="modal-actions"
        class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"
      >
        <button
          v-if="isChecklist"
          data-alt="toggle-check"
          type="button"
          :disabled="busy"
          :title="isDone ? '取消完成' : '标记完成'"
          :aria-label="isDone ? '取消完成' : '标记完成'"
          class="grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-50"
          :class="
            isDone
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          "
          @click="toggleCheck"
        >
          <LifeIcon :name="isDone ? 'close' : 'check'" class="h-4 w-4" />
        </button>
        <button
          v-if="!dropping"
          data-alt="drop-start"
          type="button"
          title="砍掉这条"
          aria-label="砍掉这条"
          class="ml-auto grid h-8 w-8 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          @click="dropping = true"
        >
          <LifeIcon name="trash" class="h-4 w-4" />
        </button>
        <div v-else data-alt="drop-confirm" class="flex w-full gap-2">
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
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="dropping = false"
          >
            <LifeIcon name="close" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
