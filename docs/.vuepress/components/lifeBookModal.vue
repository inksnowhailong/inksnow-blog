<script setup lang="ts">
/**
 * 一本书的详情弹窗
 * @description 读书的主入口是打卡卡里那行读书，这里是它的次级入口：翻这本书的全部笔记、
 * 把它读完、或者删掉。版式按「一条时间线」排，最后一行固定是哪天开读的。
 *
 * 底栏不再有笔记输入条——记一条读到什么只在那行读书上做。两处都能写的话，
 * 「记读书要编辑哪个位置」这个问题就又回来了，而这正是那一行要消掉的那件事。
 *
 * 壳（遮罩、抽屉、Esc、滚动锁、头部与底栏版式）在 LifeModal 里，与另几个弹窗同一份。
 *
 * 与研究线弹窗分成两个组件而不合并：研究线要写结论收尾、结论要计额度，
 * 读书只是「读完了」这一下，合起来只会得到一堆互斥的 v-if。
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import LifeModal from './lifeModal.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeIcon from './lifeIcon.vue';
import { shortDate } from './lifeFormat';

const props = defineProps<{
  /** 选中的书，为 null 时不显示 */
  book: any;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 书或笔记变了，让面板重新拉 */
  (e: 'changed'): void;
  /** 就这本书问 AI，带上它当上下文 */
  (e: 'ask', payload: { prefix: string }): void;
}>();

const busy = ref(false);
const errorMsg = ref('');

/** 笔记时间线 */
const logs = ref<any[]>([]);
const logsLoading = ref(false);

/** 更多菜单，删除藏在里面 */
const menuOpen = ref(false);

/** 删除前的二次确认 */
const dropping = ref(false);

/**
 * 开关更多菜单
 * @description 收起时把删除确认一起撤掉：菜单再打开时应该回到「删掉这本书」，
 * 而不是停在一个「删/不删」——那等于把确认这一步白问一遍
 */
function toggleMenu(open = !menuOpen.value) {
  menuOpen.value = open;
  if (!open) dropping.value = false;
}

/** 读完的书只读，不再往里写笔记 */
const isDone = computed(() => props.book?.status === 'DONE');

/** 头部那行小字：哪天开读的、现在读完没有 */
const metaText = computed(() => {
  if (!props.book) return '';
  const state = isDone.value
    ? `读完${props.book.finishedOn ? ` ${shortDate(props.book.finishedOn)}` : ''}`
    : '在读';
  return `${shortDate(props.book.startedOn)} 起 · ${state}`;
});

/**
 * 统一跑一次请求，收口忙碌态与报错
 * @param fn 要跑的动作
 */
async function run(fn: () => Promise<any>) {
  if (busy.value) return;
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

/** 拉这本书的笔记 */
async function loadLogs() {
  if (!props.book) return;
  logsLoading.value = true;
  try {
    logs.value = await props.api(`/life/books/${props.book.id}/logs`);
  } catch {
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

/** 删掉一条记错的笔记 */
function removeLog(id: string) {
  run(async () => {
    await props.api(`/life/logs/${id}`, { method: 'DELETE' });
    await loadLogs();
  });
}

/** 确认态自己撤回的时限，毫秒 */
const FINISH_CONFIRM_MS = 3000;

/** 「读完」按下第一下之后的确认态 */
const finishArmed = ref(false);
let finishTimer: ReturnType<typeof setTimeout> | null = null;

/** 撤掉确认态，定时器与那条「点别处」监听一起收干净 */
function disarmFinish() {
  finishArmed.value = false;
  if (finishTimer) clearTimeout(finishTimer);
  finishTimer = null;
  window.removeEventListener('click', disarmFinish);
}

/**
 * 读完这本书
 * @description 接口没有反向操作，误点一下就回不去，所以第一下只把按钮变成
 * 「确定读完？」，3 秒内再点一下才真提交，超时或点别处都复原。
 * 用按钮自己变字而不是弹窗或菜单：这一下不值得打断手上的动作，但也不能一点就走。
 *
 * 不关窗：面板重拉后这本书转成读完，底栏自然收起、头部那行小字换成读完的日期，
 * 人能看见这一下落下去了
 * @param e 这一下点击，要拦住它冒泡到「点别处」那条监听上
 */
function finish(e: MouseEvent) {
  if (busy.value) return;
  // 自己这一下不能让下面那条监听吃到，否则刚进确认态就被自己撤掉
  e.stopPropagation();
  if (!finishArmed.value) {
    finishArmed.value = true;
    finishTimer = setTimeout(disarmFinish, FINISH_CONFIRM_MS);
    window.addEventListener('click', disarmFinish);
    return;
  }
  disarmFinish();
  run(async () => {
    await props.api(`/life/books/${props.book.id}/finish`, { method: 'POST' });
  });
}

// 弹窗拆了还留着 window 上那条监听就是泄漏
onUnmounted(disarmFinish);

/**
 * 删掉这本书
 * @description 真删，连笔记一起。不可逆，所以确认那一步把连带删掉多少条写出来
 */
function drop() {
  run(async () => {
    await props.api(`/life/books/${props.book.id}`, { method: 'DELETE' });
    emit('close');
  });
}

/** 就这本书问 AI，把最近读到的一并带上 */
function ask() {
  const recent = logs.value
    .slice(0, 5)
    .map((l) => `${l.occurredOn} ${l.text}`)
    .join('；');
  emit('ask', {
    prefix: `关于我在读的《${props.book.title}》${
      recent ? `（最近读到：${recent}）` : ''
    }：`,
  });
}

/** 换了一本书就把开着的菜单与半路的确认清掉，免得上一本的状态串到这一本 */
watch(
  () => props.book?.id,
  () => {
    errorMsg.value = '';
    menuOpen.value = false;
    dropping.value = false;
    disarmFinish();
  },
);

/**
 * 重拉笔记
 * @description 除了换书，还盯 logCount：从这个弹窗唤起 AI 记了一条笔记之后，
 * 面板重拉会换上新的那份，但 id 没变——只盯 id 的话这里还显示改之前的列表。
 * 不盯整个对象是因为读完、改书名这类变动与笔记无关，没必要为它们再拉一次
 */
watch(
  () => [props.book?.id, props.book?.logCount],
  () => {
    if (props.book) loadLogs();
    else logs.value = [];
  },
  { immediate: true },
);
</script>

<template>
  <LifeModal
    :open="!!book"
    :title="book?.title"
    :meta="metaText"
    @close="emit('close')"
  >
    <template #icons>
      <LifeAskButton title="就这本书问 AI" @click="ask" />
      <button
        data-alt="book-more"
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
        data-alt="book-menu-backdrop"
        class="fixed inset-0"
        @click="toggleMenu(false)"
      />

      <!-- 删除收在菜单里：它不可逆，不该和常用动作并排摆在手边 -->
      <div
        v-if="menuOpen"
        data-alt="book-menu"
        class="absolute right-0 top-10 z-10 w-56 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <button
          v-if="!dropping"
          data-alt="book-drop"
          type="button"
          class="w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          @click="dropping = true"
        >
          删掉这本书
          <span class="mt-0.5 block text-[11px] leading-snug text-slate-400">
            连 {{ logs.length }} 条笔记一起删
          </span>
        </button>
        <div v-else data-alt="book-drop-confirm" class="p-1.5">
          <p class="text-xs leading-snug text-rose-600 dark:text-rose-400">
            删了找不回来
          </p>
          <div class="mt-2 flex items-center gap-2">
            <button
              data-alt="book-drop-yes"
              type="button"
              :disabled="busy"
              class="rounded-lg bg-rose-500 px-2.5 py-1 text-xs text-white transition hover:bg-rose-600 disabled:opacity-40"
              @click="drop"
            >
              删
            </button>
            <button
              data-alt="book-drop-no"
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              @click="dropping = false"
            >
              不删
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 笔记时间线：左栏日期对齐成一列，右栏是当时记的原话 -->
    <ul data-alt="book-logs" class="grid content-start gap-0.5">
      <li
        v-for="l in logs"
        :key="l.id"
        data-alt="book-log-row"
        class="group flex items-start gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
      >
        <span
          class="w-14 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
        >
          {{ shortDate(l.occurredOn) }}
        </span>
        <p
          class="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
        >
          {{ l.text }}
        </p>
        <!-- 手机上没有 hover，窄屏一直露着；宽屏才收起来等指针过来 -->
        <button
          v-if="!isDone"
          data-alt="book-log-remove"
          type="button"
          :disabled="busy"
          title="删掉这条"
          aria-label="删掉这条"
          class="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-300 transition hover:text-rose-500 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
          @click="removeLog(l.id)"
        >
          <LifeIcon name="close" class="h-3 w-3" />
        </button>
      </li>

      <li v-if="logsLoading" data-alt="book-logs-loading" class="px-1 py-1.5">
        <span class="text-xs text-slate-400">读取中…</span>
      </li>

      <!-- 流的最后一行固定是哪天开读的，那是这本书的起点 -->
      <li data-alt="book-log-origin" class="flex items-start gap-2 px-1 py-1.5">
        <span
          class="w-14 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
        >
          {{ shortDate(book.startedOn) }}
        </span>
        <p class="text-sm leading-snug text-slate-400 dark:text-slate-500">开读</p>
      </li>
    </ul>

    <p
      v-if="errorMsg"
      data-alt="book-modal-error"
      class="text-sm text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>

    <!-- 底栏只剩「读完」；读完的书整窗转只读 -->
    <template v-if="!isDone" #foot>
      <div class="flex items-center justify-between gap-2">
        <button
          data-alt="book-finish"
          type="button"
          :disabled="busy"
          class="shrink-0 text-sm transition disabled:opacity-40"
          :class="
            finishArmed
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
          "
          @click="finish"
        >
          {{ finishArmed ? '确定读完？' : '读完' }}
        </button>
      </div>
    </template>
  </LifeModal>
</template>
