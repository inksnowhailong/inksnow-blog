<script setup lang="ts">
/**
 * 想法与研究详情弹窗
 * @description 一个研究从冒出念头到结项的全过程都在这里：
 * 它现在走到哪一步、这一路试过什么、最后的结论是什么。
 *
 * 与计划节点分成两个组件而不合并：想法的生命线（冷却 → 动手 → 结项 → 回看）
 * 和计划节点（未完成 → 完成）根本不是一回事，塞进一个组件只会得到
 * 一堆互斥的 v-if。
 */
import { ref, computed, watch } from 'vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** 选中的想法，为 null 时不显示 */
  idea: any;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
  /** 一篇研究笔记的额度（元） */
  noteYuan: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 数据变了，让面板重新拉 */
  (e: 'changed'): void;
  /** 就这个想法问 AI，带上它当上下文 */
  (e: 'ask', payload: { prefix: string; anchor: { x: number; y: number } }): void;
}>();

/** 单条日志的字数上限，与后端一致 */
const LOG_MAX = 120;

const busy = ref(false);
const errorMsg = ref('');

/** 研究日志流 */
const logs = ref<any[]>([]);
const logsLoading = ref(false);
const logDraft = ref('');

/** 结项用的四行笔记 */
const closing = ref(false);
const note = ref({ question: '', did: '', result: '', judgment: '' });

/** 当前状态的中文说法与配色 */
const statusText = computed(
  () =>
    ({
      PENDING: '冷却中',
      SUNK: '沉底',
      STARTED: '在做',
      NOTED: '已结项',
    })[props.idea?.status] ?? '',
);

const statusClass = computed(
  () =>
    ({
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      SUNK: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
      STARTED: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
      NOTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    })[props.idea?.status] ?? '',
);

/** 已经结项的想法不再收进展 */
const isNoted = computed(() => props.idea?.status === 'NOTED');

/** 这条研究走过的时间点，按发生顺序 */
const milestones = computed(() => {
  const i = props.idea;
  if (!i) return [];
  const rows = [{ label: '记下', date: i.createdOn }];
  if (i.status === 'PENDING') rows.push({ label: '冷却到', date: i.coolUntil });
  if (i.startedOn) rows.push({ label: '动手', date: i.startedOn });
  if (i.notedOn) rows.push({ label: '结项', date: i.notedOn });
  return rows;
});

/** 季度回看的三个判断 */
const MARKS = [
  { value: 'DEAD', label: '死了' },
  { value: 'IDLE', label: '还活着' },
  { value: 'UPGRADE', label: '要升级' },
];

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

/** 拉这个想法的研究日志 */
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

/** 结项：写下四行笔记 */
function submitNote() {
  if (!note.value.question.trim() || busy.value) return;
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/note`, {
      method: 'POST',
      body: JSON.stringify({ note: note.value }),
    });
    closing.value = false;
    emit('close');
  });
}

/** 季度回看给个判断 */
function review(mark: string) {
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ mark }),
    });
  });
}

/** 删除前的二次确认 */
const dropping = ref(false);

/**
 * 删掉这个想法
 * @description 真删，连研究日志一起。已结项的删掉会把那篇笔记的额度抹掉，
 * 所以确认那一步把代价写出来——不可逆的操作不该只问一句"确定吗"
 */
function drop() {
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}`, { method: 'DELETE' });
    emit('close');
  });
}

/** 就这个研究问 AI，把它的来龙去脉一并带上 */
function ask(event: MouseEvent) {
  const recent = logs.value
    .slice(0, 5)
    .map((l) => `${l.occurredOn} ${l.text}`)
    .join('；');
  emit('ask', {
    prefix: `关于我正在研究的「${props.idea.content}」${
      recent ? `（这一路的进展：${recent}）` : ''
    }：`,
    anchor: { x: event.clientX, y: event.clientY },
  });
}

watch(
  () => props.idea?.id,
  (id) => {
    errorMsg.value = '';
    logDraft.value = '';
    closing.value = false;
    dropping.value = false;
    note.value = { question: '', did: '', result: '', judgment: '' };
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
      <!-- 头：想法原文与它走到了哪一步 -->
      <div data-alt="idea-modal-head" class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-slate-400 dark:text-slate-500">研究</p>
          <p class="mt-0.5 text-lg font-semibold leading-snug text-slate-800 dark:text-slate-100">
            {{ idea.content }}
          </p>
          <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span class="rounded px-1.5 py-0.5" :class="statusClass">{{ statusText }}</span>
            <span
              v-for="m in milestones"
              :key="m.label"
              class="text-slate-400 dark:text-slate-500"
              >{{ m.label }} {{ m.date }}</span
            >
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            data-alt="idea-ask"
            type="button"
            title="就这个研究问 AI"
            aria-label="就这个研究问 AI"
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

      <!-- 已结项的四行笔记 -->
      <div
        v-if="isNoted && idea.note"
        data-alt="idea-note"
        class="grid gap-2 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10"
      >
        <div
          v-for="row in [
            { k: '想搞清楚', v: idea.note.question },
            { k: '试了什么', v: idea.note.did },
            { k: '结论', v: idea.note.result },
            { k: '值不值得继续', v: idea.note.judgment },
          ]"
          :key="row.k"
          class="grid grid-cols-[5rem_minmax(0,1fr)] gap-2"
        >
          <p class="text-xs text-emerald-700/70 dark:text-emerald-300/70">{{ row.k }}</p>
          <p class="text-sm leading-snug text-slate-700 dark:text-slate-200">
            {{ row.v || '—' }}
          </p>
        </div>
      </div>

      <!-- 季度回看：结项之后过一阵再判断这事还活着没有 -->
      <div v-if="isNoted" data-alt="idea-review" class="mt-3">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          回头看这条<span v-if="idea.reviewedOn" class="text-slate-400">
            · {{ idea.reviewedOn }} 判过</span
          >
        </p>
        <div class="mt-1.5 flex gap-1.5">
          <button
            v-for="m in MARKS"
            :key="m.value"
            data-alt="idea-review-mark"
            type="button"
            :disabled="busy"
            class="rounded-lg px-2.5 py-1 text-xs transition disabled:opacity-40"
            :class="
              idea.quarterMark === m.value
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            "
            @click="review(m.value)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <!-- 研究日志：这一路试过什么 -->
      <div data-alt="idea-logs" class="mt-5">
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-slate-600 dark:text-slate-300">这一路试过什么</p>
          <span class="text-[11px] text-slate-400">
            {{ logsLoading ? '读取中…' : logs.length + ' 条' }}
          </span>
        </div>

        <div v-if="!isNoted" class="flex gap-1.5">
          <input
            v-model="logDraft"
            data-alt="idea-log-input"
            type="text"
            :maxlength="LOG_MAX"
            placeholder="这次试了什么，发现了什么"
            class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:px-2.5 sm:py-1.5 sm:text-sm"
            @keydown.enter.prevent="addLog"
          />
          <button
            data-alt="idea-log-add"
            type="button"
            :disabled="busy || !logDraft.trim()"
            title="记下这一条"
            aria-label="记下这一条"
            class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40 sm:h-auto sm:w-auto sm:px-2.5"
            @click="addLog"
          >
            <LifeIcon name="check" class="h-3.5 w-3.5" />
          </button>
        </div>
        <p v-if="!isNoted" class="mt-1 text-[11px] text-slate-400">
          一条只记一件事，上限 {{ LOG_MAX }} 字 · 已写 {{ logDraft.length }}
          <span v-if="idea.status !== 'STARTED'"> · 记下第一条就算动手了</span>
        </p>

        <ul v-if="logs.length" class="mt-2 grid gap-1.5">
          <li
            v-for="l in logs"
            :key="l.id"
            data-alt="idea-log-row"
            class="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700/40"
          >
            <div class="min-w-0">
              <p class="text-sm leading-snug text-slate-700 dark:text-slate-200">
                {{ l.text }}
              </p>
              <p class="mt-0.5 text-[11px] text-slate-400">{{ l.occurredOn }}</p>
            </div>
            <button
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

      <!-- 结项：四行笔记，结论是"不成"同样算完成 -->
      <div v-if="!isNoted && closing" data-alt="idea-close-form" class="mt-5 grid gap-2">
        <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
          结项 · 写完这四行就算完成，拿 {{ noteYuan }} 元
        </p>
        <input
          v-for="row in [
            { k: 'question', p: '我想搞清楚什么' },
            { k: 'did', p: '试了什么' },
            { k: 'result', p: '成 / 不成 / 不确定' },
            { k: 'judgment', p: '值不值得继续' },
          ]"
          :key="row.k"
          v-model="note[row.k]"
          :data-alt="'idea-note-' + row.k"
          type="text"
          :placeholder="row.p"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:px-2.5 sm:py-1.5 sm:text-sm"
        />
        <p class="text-[11px] text-slate-400">
          结论是「不成」同样算完成——一次记录在案的失败比一次没记录的成功值钱
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
          v-if="!isNoted && !closing"
          data-alt="idea-start-close"
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          @click="closing = true"
        >
          结项
        </button>

        <!-- 删除：不可逆，所以先把代价说清楚再给按钮 -->
        <template v-if="!closing">
          <button
            v-if="!dropping"
            data-alt="idea-drop"
            type="button"
            title="删掉这个想法"
            aria-label="删掉这个想法"
            class="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            @click="dropping = true"
          >
            <LifeIcon name="trash" class="h-4 w-4" />
          </button>
          <div v-else data-alt="idea-drop-confirm" class="ml-auto flex items-center gap-2">
            <span class="text-xs text-rose-600 dark:text-rose-400">
              连
              {{ logs.length }} 条进展一起删{{
                isNoted ? `，额度少 ${noteYuan} 元` : ''
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
            data-alt="idea-note-submit"
            type="button"
            :disabled="busy || !note.question.trim()"
            class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white transition hover:bg-brand-600 disabled:opacity-40"
            @click="submitNote"
          >
            写完了
          </button>
          <button
            data-alt="idea-note-cancel"
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
