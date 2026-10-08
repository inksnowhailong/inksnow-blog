<script setup lang="ts">
/**
 * 日志大弹窗
 * @description 学习日志、研究线进展、读书笔记三处共用的阅读与书写面：
 * 小弹窗（sm:max-w-lg）看不下一篇几千字的整理稿，所以日志改到这里读。
 *
 * 纯展示 + 交互：数据怎么取、写与删怎么落库都由调用方负责，这里只收 logs，
 * 把 create / remove 抛回去。三处出处不同、字段相同（id、text、occurredOn，
 * 可选 meta），于是一个组件够用。
 *
 * 电脑端左侧列表与输入、右侧正文；没有日志时收成单栏，不保留空阅读区。
 * 手机端全屏，先列表、点一条进正文，左右滑切上下条。
 * 键盘：↑/↓ 或 j/k 切条，Esc 关闭（输入框里打字时不抢键）。
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import LifeIcon from './lifeIcon.vue';
import LifeAskBar from './lifeAskBar.vue';
import { shortDate } from './lifeFormat';
import { NOTE_MAX, firstParagraph, renderMarkdown } from './lifeMarkdown';

/** 一条日志；meta 是列表里的补充小字，如方向汇总时这条属于哪个子项 */
interface ViewerLog {
  id: string;
  text: string;
  occurredOn?: string;
  meta?: string;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** 头部标题，如「学习日志 · 节点名」 */
    title: string;
    /** 最新在前 */
    logs: ViewerLog[];
    /** 打开时选中哪一条；空则选最新一条并把光标落进输入框 */
    initialId?: string | null;
    loading?: boolean;
    /** 能不能写新日志；不能时不渲染输入框 */
    canWrite?: boolean;
    /** 能不能删；只读的出处（已结的线、读完的书）关掉 */
    canRemove?: boolean;
    /** 调用方正在落库（写或删） */
    busy?: boolean;
    /** 调用方的报错，写失败时草稿要留着，靠它判断这一下成没成 */
    error?: string;
    placeholder?: string;
  }>(),
  {
    initialId: null,
    canWrite: true,
    canRemove: true,
    placeholder: '记一条，也可以粘一篇整理稿',
  },
);

const emit = defineEmits<{
  (e: 'create', text: string): void;
  (e: 'remove', id: string): void;
  (e: 'close'): void;
}>();

/** 挂载后才渲染 Teleport，理由同 LifeModal：预渲染阶段没有 document.body */
const mounted = ref(false);

/** 当前选中的日志 id */
const selectedId = ref<string | null>(null);

/** 手机端当前是不是在正文页；电脑端两栏并排，这个值无关 */
const mobileDetail = ref(false);

const draft = ref('');
/** 已经点了提交、等调用方落库；落库成功才清草稿 */
const pending = ref(false);

/** 删除的二次确认，换条时撤掉 */
const removing = ref(false);

const bar = ref<InstanceType<typeof LifeAskBar> | null>(null);
const scroller = ref<HTMLElement | null>(null);

const current = computed(
  () => props.logs.find((l) => l.id === selectedId.value) ?? null,
);
const index = computed(() =>
  props.logs.findIndex((l) => l.id === selectedId.value),
);

/**
 * 面板尺寸随信息量分档
 * @description 少量日志若也占 76vh，正文下面只剩大片空白；日志多时再逐档放大。
 * 手机始终全屏，分档只作用于 sm 以上视口。
 */
const panelSizeClass = computed(() => {
  if (!props.logs.length) {
    return 'mt-auto max-h-[92dvh] rounded-t-2xl sm:mt-0 sm:h-auto sm:max-w-xl sm:rounded-2xl';
  }
  if (props.logs.length <= 2) {
    return 'h-full sm:h-96 sm:max-w-5xl sm:rounded-2xl';
  }
  if (props.logs.length <= 5) {
    return 'h-full sm:h-[30rem] sm:max-w-5xl sm:rounded-2xl';
  }
  return 'h-full sm:h-[min(68vh,40rem)] sm:max-w-6xl sm:rounded-2xl';
});

/** 正文 HTML，v-html 只接这一个来源 */
const html = computed(() =>
  current.value ? renderMarkdown(current.value.text) : '',
);

/** 选一条；手机端顺带切到正文页 */
function select(id: string, toDetail = true) {
  selectedId.value = id;
  removing.value = false;
  if (toDetail) mobileDetail.value = true;
  nextTick(() => {
    scroller.value?.scrollTo?.({ top: 0 });
    document
      .querySelector(`[data-log-id="${id}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  });
}

/** 按偏移切条，越界不动 */
function step(delta: number) {
  const next = props.logs[index.value + delta];
  if (next) select(next.id, mobileDetail.value);
}

/**
 * 每次打开重置：选中、页面（草稿保留到提交成功）
 * @description 指定了 initialId 就定位过去（手机直接进正文）；
 * 没指定则选最新一条，手机停在列表，电脑端光标落输入框
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    // 草稿不在这里清：关掉再开要还在，只有提交成功才清
    pending.value = false;
    removing.value = false;
    selectedId.value = props.initialId ?? props.logs[0]?.id ?? null;
    mobileDetail.value = !!props.initialId;
    if (!props.initialId && props.canWrite) nextTick(() => bar.value?.focus());
  },
  { immediate: true },
);

/** logs 是异步拉的：打开时可能还空着，来了之后补选；选中的被删了则落到相邻一条 */
watch(
  () => props.logs,
  (logs, old) => {
    if (!props.open) return;
    if (selectedId.value && logs.some((l) => l.id === selectedId.value)) return;
    const oldIdx = old?.findIndex((l) => l.id === selectedId.value) ?? -1;
    const fallback = logs[Math.min(Math.max(oldIdx, 0), logs.length - 1)];
    selectedId.value = fallback?.id ?? null;
    if (!selectedId.value) mobileDetail.value = false;
  },
);

/** 提交：草稿先留着，等调用方落库结束且没报错再清 */
function submit() {
  const text = draft.value.trim();
  if (!text || props.busy) return;
  pending.value = true;
  emit('create', text);
}

watch(
  () => props.busy,
  (busy) => {
    if (busy || !pending.value) return;
    pending.value = false;
    if (props.error) return;
    draft.value = '';
    // 新写的在最前面，选中它让人看见这一下落下去了
    if (props.logs[0]) select(props.logs[0].id, false);
  },
);

/** 删除：第一下变「确定删除」，第二下才抛出去 */
function remove() {
  if (!current.value || props.busy) return;
  if (!removing.value) {
    removing.value = true;
    return;
  }
  removing.value = false;
  emit('remove', current.value.id);
}

/** 在输入框里打字时，j/k 与方向键不能被抢走 */
function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return (
    !!t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)
  );
}

/**
 * 键盘：捕获阶段监听
 * @description 底下还有一层 LifeModal 也听 Esc，要抢在它前面吃掉这一下，
 * 否则一下 Esc 会把两层一起关掉
 */
function onKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    // 输入框里有草稿时第一下 Esc 只是退出输入，免得误触丢字；再按一下才关
    if (typing(e) && draft.value.trim()) {
      (e.target as HTMLElement).blur();
      return;
    }
    emit('close');
    return;
  }
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    step(1);
  } else if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    step(-1);
  }
}

onMounted(() => {
  mounted.value = true;
  window.addEventListener('keydown', onKeydown, true);
});
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true));

/** 滑动起点 */
let touch: { x: number; y: number } | null = null;

/**
 * 手势起点是不是落在自己会横向滚的元素里（代码块、表格）
 * @description 在这些地方左右划是在看被截断的内容，不是要翻页
 */
function inHorizontalScroller(target: EventTarget | null) {
  let el = target as HTMLElement | null;
  while (el && el !== scroller.value) {
    if (el.matches?.('pre, table')) return true;
    if (el.scrollWidth > el.clientWidth) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

function onTouchStart(e: TouchEvent) {
  if (inHorizontalScroller(e.target)) {
    touch = null;
    return;
  }
  const t = e.touches[0];
  touch = { x: t.clientX, y: t.clientY };
}

/** 横向位移 > 60px 且大于纵向才算翻页；向左滑看下一条 */
function onTouchEnd(e: TouchEvent) {
  if (!touch) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
}

/**
 * 正文排版
 * @description 弹窗 Teleport 在 body 上，不在 LifeModal 的 Markdown 重置之下，
 * 所以这里不用 `!`。preflight 关着，标签自带的默认边距要自己点明。
 * pre 与表格各自横向滚，不把整栏顶宽
 */
const PROSE =
  'min-w-0 max-w-full break-words text-[15px] leading-7 text-slate-700 dark:text-slate-200 [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.875em] [&_h1]:mb-2 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-medium [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:text-[13px] [&_pre]:leading-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-slate-200 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li>ol]:my-0 [&_li>ul]:my-0 [&_.note-table]:my-3 [&_.note-table]:max-w-full [&_.note-table]:overflow-x-auto dark:[&_a]:text-brand-300 dark:[&_blockquote]:border-slate-600 dark:[&_blockquote]:text-slate-400 dark:[&_code]:bg-slate-800 dark:[&_pre]:bg-slate-800 dark:[&_td]:border-slate-600 dark:[&_th]:border-slate-600 dark:[&_th]:bg-slate-700/50 [&>:first-child]:mt-0 [&>:last-child]:mb-0';
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <div
      v-if="open"
      data-alt="log-viewer"
      class="fixed inset-0 z-[130] flex items-stretch justify-center bg-slate-900/50 sm:items-center sm:p-6"
      @click.self="emit('close')"
    >
      <div
        data-alt="log-viewer-panel"
        role="dialog"
        aria-modal="true"
        class="flex w-full min-w-0 flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-800 [&_p]:!m-0"
        :class="panelSizeClass"
      >
        <!-- 头部：手机在正文页时左上角是返回列表 -->
        <header
          data-alt="log-viewer-head"
          class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-700 sm:px-4"
        >
          <button
            v-if="mobileDetail"
            data-alt="log-viewer-back"
            type="button"
            title="返回列表"
            aria-label="返回列表"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:hidden"
            @click="mobileDetail = false"
          >
            <LifeIcon name="left" class="h-4 w-4" />
          </button>
          <p
            data-alt="log-viewer-title"
            class="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-100"
          >
            {{ title }}
            <span class="ml-1 text-xs font-normal text-slate-400">
              {{ loading ? '读取中…' : logs.length + ' 条' }}
            </span>
          </p>
          <button
            data-alt="log-viewer-close"
            type="button"
            title="关闭"
            aria-label="关闭"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
            @click="emit('close')"
          >
            <LifeIcon name="close" class="h-4 w-4" />
          </button>
        </header>

        <div class="flex min-h-0" :class="logs.length && 'flex-1'">
          <!-- 左栏：列表 + 输入框。手机在正文页时整栏收起 -->
          <aside
            data-alt="log-viewer-list"
            class="min-h-0 min-w-0 flex-1 flex-col border-slate-100 dark:border-slate-700"
            :class="[
              mobileDetail ? 'hidden sm:flex' : 'flex',
              logs.length
                ? 'sm:w-[21rem] sm:flex-none sm:border-r'
                : 'sm:w-full sm:flex-none',
            ]"
          >
            <ul
              v-if="logs.length"
              data-alt="log-viewer-items"
              class="!m-0 min-h-0 flex-1 !list-none overflow-y-auto !p-1.5"
            >
              <li v-for="l in logs" :key="l.id" :data-log-id="l.id">
                <button
                  data-alt="log-viewer-item"
                  type="button"
                  class="block w-full min-w-0 rounded-lg px-2.5 py-1.5 text-left transition"
                  :class="
                    l.id === selectedId
                      ? 'bg-brand-50 dark:bg-brand-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  "
                  @click="select(l.id)"
                >
                  <span class="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {{ shortDate(l.occurredOn) }}
                  </span>
                  <span
                    class="mt-0.5 line-clamp-2 block break-words text-sm leading-snug text-slate-700 dark:text-slate-200"
                  >
                    {{ firstParagraph(l.text, 80) }}
                  </span>
                  <span
                    v-if="l.meta"
                    data-alt="log-viewer-item-meta"
                    class="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500"
                  >
                    {{ l.meta }}
                  </span>
                </button>
              </li>
            </ul>
            <p
              v-else-if="!loading"
              data-alt="log-viewer-empty"
              class="px-4 pb-1 pt-4 text-sm text-slate-400 dark:text-slate-500"
            >
              还没有记录，写下第一条就从这里开始。
            </p>

            <div
              v-if="canWrite"
              data-alt="log-viewer-composer"
              class="shrink-0 border-t border-slate-100 p-2 dark:border-slate-700"
              :class="!logs.length && 'mt-2 border-t-0 px-4 pb-4'"
            >
              <LifeAskBar
                ref="bar"
                v-model="draft"
                mode="note"
                :busy="busy"
                :maxlength="NOTE_MAX"
                :placeholder="placeholder"
                @submit="submit"
              />
              <div
                class="mt-1.5 flex min-h-4 items-start justify-between gap-2 text-[11px]"
              >
                <p
                  v-if="error"
                  data-alt="log-viewer-error"
                  class="text-rose-600 dark:text-rose-400"
                >
                  {{ error }}
                </p>
                <p v-else class="text-slate-400">
                  Ctrl+Enter 记下 · Esc 关闭
                </p>
                <span
                  v-if="draft.length"
                  class="shrink-0 tabular-nums text-slate-400"
                >
                  {{ draft.length }}/{{ NOTE_MAX }}
                </span>
              </div>
            </div>
          </aside>

          <!-- 右栏：正文。手机在列表页时收起 -->
          <section
            v-if="logs.length"
            data-alt="log-viewer-reader"
            class="min-h-0 min-w-0 flex-1 flex-col"
            :class="mobileDetail ? 'flex' : 'hidden sm:flex'"
          >
            <template v-if="current">
              <div
                data-alt="log-viewer-reader-bar"
                class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-700 sm:px-6"
              >
                <span class="text-xs tabular-nums text-slate-400">
                  {{ current.occurredOn }}
                </span>
                <span
                  v-if="current.meta"
                  class="min-w-0 truncate text-xs text-slate-400"
                >
                  · {{ current.meta }}
                </span>
                <span class="flex-1" />
                <button
                  v-if="canRemove"
                  data-alt="log-viewer-remove"
                  type="button"
                  :disabled="busy"
                  class="min-h-9 rounded-lg px-2.5 text-xs transition disabled:opacity-40 sm:min-h-0 sm:py-1"
                  :class="
                    removing
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10'
                  "
                  @click="remove"
                  @blur="removing = false"
                >
                  {{ removing ? '确定删除' : '删除' }}
                </button>
              </div>

              <!-- 滑动只挂在正文区：列表里的横向手势不该翻页 -->
              <div
                ref="scroller"
                data-alt="log-viewer-body"
                class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6"
                @touchstart.passive="onTouchStart"
                @touchend.passive="onTouchEnd"
              >
                <!-- v-html 只接 renderMarkdown 的产物 -->
                <div
                  data-alt="log-viewer-prose"
                  :class="PROSE"
                  class="mx-auto max-w-3xl"
                  v-html="html"
                />
              </div>
            </template>
            <p
              v-else
              data-alt="log-viewer-placeholder"
              class="m-auto text-sm text-slate-400 dark:text-slate-500"
            >
              选一条日志来读
            </p>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
