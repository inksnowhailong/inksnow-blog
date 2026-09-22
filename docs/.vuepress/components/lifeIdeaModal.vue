<script setup lang="ts">
/**
 * 研究线详情弹窗
 * @description 一条线从冒出来到收尾都在这里：原话、这一路的进展、最后的结论。
 * 状态由后端从结论与最近动静算出，这里只负责显示。
 *
 * 与计划节点分成两个组件而不合并：研究线（原话 → 进展 → 结论）
 * 和计划节点（未完成 → 完成）不是一回事，塞进一个组件只会得到
 * 一堆互斥的 v-if。
 */
import { ref, computed, watch } from 'vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** 选中的研究线，为 null 时不显示 */
  idea: any;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
  /** 一句结论的额度（元） */
  noteYuan: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 数据变了，让面板重新拉 */
  (e: 'changed'): void;
  /** 就这条线问 AI，带上它当上下文 */
  (e: 'ask', payload: { prefix: string }): void;
}>();

const busy = ref(false);
const errorMsg = ref('');

/** 进展流 */
const logs = ref<any[]>([]);
const logsLoading = ref(false);
const logDraft = ref('');

/** 正在写结论 */
const closing = ref(false);
const conclusionDraft = ref('');

/** 删除前的二次确认 */
const dropping = ref(false);

/** 状态的中文说法与配色，键与后端的 state 一致 */
const STATES: Record<string, { label: string; cls: string }> = {
  OPEN: {
    label: '进行中',
    cls: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  },
  STALE: {
    label: '搁着',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  DONE: {
    label: '已结',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
};

const stateText = computed(() => STATES[props.idea?.state]?.label ?? '');
const stateClass = computed(() => STATES[props.idea?.state]?.cls ?? '');

/** 已结的线只读 */
const isDone = computed(() => props.idea?.state === 'DONE');

/** 统一跑一次请求，收口忙碌态与报错 */
async function run(fn: () => Promise<any>) {
  busy.value = true;
  errorMsg.value = '';
  try {
    await fn();
    emit('changed');
  } catch (e: any) {
    errorMsg.value = e.message ?? '操作失败';
  } finally {
    busy.value = false;
  }
}

/** 拉这条线的进展 */
async function loadLogs() {
  if (!props.idea) return;
  logsLoading.value = true;
  try {
    logs.value = await props.api(`/life/ideas/${props.idea.id}/logs`);
  } catch {
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

/** 记一条进展 */
function addLog() {
  const text = logDraft.value.trim();
  if (!text || busy.value) return;
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    logDraft.value = '';
    await loadLogs();
  });
}

/** 删掉一条记错的进展 */
function removeLog(id: string) {
  run(async () => {
    await props.api(`/life/logs/${id}`, { method: 'DELETE' });
    await loadLogs();
  });
}

/** 写结论收尾 */
function conclude() {
  const conclusion = conclusionDraft.value.trim();
  if (!conclusion || busy.value) return;
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/conclude`, {
      method: 'POST',
      body: JSON.stringify({ conclusion }),
    });
    closing.value = false;
    emit('close');
  });
}

/**
 * 删掉这条线
 * @description 真删，连进展一起。已结的删掉会把那句结论的额度抹掉，
 * 所以确认那一步把代价写出来——不可逆的操作不该只问一句"确定吗"
 */
function drop() {
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}`, { method: 'DELETE' });
    emit('close');
  });
}

/** 就这条线问 AI，把它的来龙去脉一并带上 */
function ask() {
  const recent = logs.value
    .slice(0, 5)
    .map((l) => `${l.occurredOn} ${l.text}`)
    .join('；');
  emit('ask', {
    prefix: `关于我正在研究的「${props.idea.content}」${
      recent ? `（这一路的进展：${recent}）` : ''
    }：`,
  });
}

watch(
  () => props.idea?.id,
  (id) => {
    errorMsg.value = '';
    logDraft.value = '';
    conclusionDraft.value = '';
    closing.value = false;
    dropping.value = false;
    if (id) loadLogs();
    else logs.value = [];
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-if="idea"
    data-alt="idea-modal-mask"
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    @click.self="emit('close')"
  >
    <div
      data-alt="idea-modal"
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:rounded-2xl [&_li]:!my-0 [&_p]:!my-0 [&_ul]:!m-0 [&_ul]:!list-none [&_ul]:!p-0"
    >
      <!-- 头：原话与状态 -->
      <div data-alt="idea-modal-head" class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-slate-400 dark:text-slate-500">研究线</p>
          <p
            class="mt-0.5 whitespace-pre-wrap text-lg font-semibold leading-snug text-slate-800 dark:text-slate-100"
          >
            {{ idea.content }}
          </p>
          <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span class="rounded px-1.5 py-0.5" :class="stateClass">{{ stateText }}</span>
            <span class="text-slate-400 dark:text-slate-500">记于 {{ idea.createdOn }}</span>
            <span v-if="idea.concludedOn" class="text-slate-400 dark:text-slate-500"
              >结于 {{ idea.concludedOn }}</span
            >
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            data-alt="idea-ask"
            type="button"
            title="就这条线问 AI"
            aria-label="就这条线问 AI"
            class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-700"
            @click="ask"
          >
            <LifeIcon name="sparkle" class="h-4 w-4" />
          </button>
          <button
            data-alt="idea-modal-close"
            type="button"
            title="关掉"
            aria-label="关掉"
            class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="emit('close')"
          >
            <LifeIcon name="close" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- 已结的结论 -->
      <div
        v-if="isDone"
        data-alt="idea-conclusion"
        class="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10"
      >
        <p class="text-xs text-emerald-700/70 dark:text-emerald-300/70">结论</p>
        <p class="mt-1 whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200">
          {{ idea.conclusion }}
        </p>
      </div>

      <!-- 进展：这一路试过什么 -->
      <div data-alt="idea-logs" class="mt-5">
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-slate-600 dark:text-slate-300">这一路试过什么</p>
          <span class="text-[11px] text-slate-400">
            {{ logsLoading ? '读取中…' : logs.length + ' 条' }}
          </span>
        </div>

        <LifeAskBar
          v-if="!isDone"
          v-model="logDraft"
          mode="note"
          :busy="busy"
          placeholder="记一条进展"
          @submit="addLog"
        />
        <p v-if="!isDone" class="mt-1 text-[11px] text-slate-400">
          一条只记一件事 · Ctrl+Enter 记下
        </p>

        <ul v-if="logs.length" class="mt-2 grid gap-1.5">
          <li
            v-for="l in logs"
            :key="l.id"
            data-alt="idea-log-row"
            class="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700/40"
          >
            <div class="min-w-0">
              <p
                class="whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
              >
                {{ l.text }}
              </p>
              <p class="mt-0.5 text-[11px] text-slate-400">{{ l.occurredOn }}</p>
            </div>
            <button
              v-if="!isDone"
              data-alt="idea-log-remove"
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
        <p v-else-if="!logsLoading" class="mt-2 text-xs text-slate-400 dark:text-slate-500">
          还没记过
        </p>
      </div>

      <!-- 收尾：一句结论，"不成"同样算结论 -->
      <div v-if="!isDone && closing" data-alt="idea-conclude-form" class="mt-5 grid gap-2">
        <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
          写一句结论收尾，拿 {{ noteYuan }} 元
        </p>
        <textarea
          v-model="conclusionDraft"
          data-alt="idea-conclusion-input"
          rows="2"
          placeholder="结论是什么，值不值得继续"
          class="resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base leading-relaxed outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:px-2.5 sm:py-2 sm:text-sm"
        />
        <p class="text-[11px] text-slate-400">
          「不成」同样算结论——一次记录在案的失败比一次没记录的成功值钱
        </p>
      </div>

      <p
        v-if="errorMsg"
        data-alt="idea-modal-error"
        class="mt-3 text-sm text-rose-600 dark:text-rose-400"
      >
        {{ errorMsg }}
      </p>

      <!-- 动作 -->
      <div
        data-alt="idea-modal-actions"
        class="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"
      >
        <button
          v-if="!isDone && !closing"
          data-alt="idea-conclude-open"
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          @click="closing = true"
        >
          收尾
        </button>

        <!-- 删除：不可逆，所以先把代价说清楚再给按钮 -->
        <template v-if="!closing">
          <button
            v-if="!dropping"
            data-alt="idea-drop"
            type="button"
            title="删掉这条线"
            aria-label="删掉这条线"
            class="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            @click="dropping = true"
          >
            <LifeIcon name="trash" class="h-4 w-4" />
          </button>
          <div v-else data-alt="idea-drop-confirm" class="ml-auto flex items-center gap-2">
            <span class="text-xs text-rose-600 dark:text-rose-400">
              连
              {{ logs.length }} 条进展一起删{{
                isDone ? `，额度少 ${noteYuan} 元` : ''
              }}？
            </span>
            <button
              data-alt="idea-drop-yes"
              type="button"
              :disabled="busy"
              class="rounded-lg bg-rose-500 px-2.5 py-1 text-xs text-white transition hover:bg-rose-600 disabled:opacity-40"
              @click="drop"
            >
              删
            </button>
            <button
              data-alt="idea-drop-no"
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              @click="dropping = false"
            >
              不删
            </button>
          </div>
        </template>

        <template v-if="closing">
          <button
            data-alt="idea-conclude-submit"
            type="button"
            :disabled="busy || !conclusionDraft.trim()"
            class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white transition hover:bg-brand-600 disabled:opacity-40"
            @click="conclude"
          >
            结了
          </button>
          <button
            data-alt="idea-conclude-cancel"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="closing = false"
          >
            再想想
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
