<script setup lang="ts">
/**
 * 读书卡
 * @description 读书在页面上只有这一个地方：记分钟、选当前在读、记读到了什么、
 * 加书、看读完的，全在这张卡里。
 *
 * 之所以整成一张卡而不是继续挂在打卡格上：分钟记在打卡格、内容记在书弹窗，
 * 记一次读书要编辑两个位置，而这两下说的是同一件事。所以那条常驻的每日项
 * 从四格里撤出来，它的分钟/达标/分值搬到这张卡的标题行——打卡格只剩不带
 * 内容的那三项。
 *
 * 卡自己持有当前这本书的笔记（只拉这一本），书目录、分钟与分数仍由面板统一拉，
 * 改完向上报 changed / punch 让面板重拉：一份数据只有一个来源。
 */
import { ref, computed, watch } from 'vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeBookRow from './lifeBookRow.vue';
import LifeIcon from './lifeIcon.vue';
import { shortDate } from './lifeFormat';

const props = defineProps<{
  /** 当日结算里那条常驻的读书每日项；这天没排到时为 null，标题行只剩「读书」 */
  daily: any | null;
  /** /life/books 的返回 `{ reading, done }`，由面板统一拉 */
  books: any;
  /** 选中的是不是今天；翻到往日时那句小字要改口，不然补记像是在说当下 */
  isToday: boolean;
  /** 面板的全局忙碌态，打卡那几颗按钮跟着它禁用 */
  busy: boolean;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
}>();

const emit = defineEmits<{
  /** 记一笔读书分钟，面板去打卡 */
  (e: 'punch', minutes: number): void;
  /** 清掉这一项当天的记录 */
  (e: 'clear'): void;
  /** 书或笔记变了，面板重拉书目录 */
  (e: 'changed'): void;
  /** 就读书整摊问 AI */
  (e: 'ask'): void;
  /** 打开某本书的弹窗，看全部笔记/读完/删书 */
  (e: 'open-book', book: any): void;
}>();

/** 打卡的快捷增量，分钟；与打卡格那几项同一套 */
const QUICK_MINUTES = [15, 30];

/** 当前书记在本地，换一天回来还是手上那本 */
const ACTIVE_STORE = 'life-reading-book';

/** 卡上只摆最近这几条，再往前的去弹窗里看 */
const RECENT_LOGS = 5;

/** 卡里自己那几个请求的忙碌态，与面板的全局忙碌分开算 */
const localBusy = ref(false);
const errorMsg = ref('');

/** 面板在打卡、或卡里正在写，两边任一在跑都不许再点 */
const anyBusy = computed(() => props.busy || localBusy.value);

const readingBooks = computed<any[]>(() => props.books?.reading ?? []);
const doneBooks = computed<any[]>(() => props.books?.done ?? []);

/** 人选中的那本书 */
const pickedId = ref<string>('');

try {
  pickedId.value = localStorage.getItem(ACTIVE_STORE) || '';
} catch {}

/**
 * 当前这本书
 * @description 不直接拿 pickedId 当真相：选中的那本可能被删掉、或读完之后从在读列表里
 * 走掉，那时该自动落到手上还在读的第一本，而不是把卡停在一本不存在的书上
 */
const activeBook = computed<any>(() => {
  const hit = readingBooks.value.find((b) => b.id === pickedId.value);
  return hit ?? readingBooks.value[0] ?? null;
});

/** 点 chip 换当前书 */
function pick(book: any) {
  pickedId.value = book.id;
  try {
    localStorage.setItem(ACTIVE_STORE, book.id);
  } catch {}
}

/** 标题行右侧那句：今天这一项读了多少、达标给几分 */
const dailyText = computed(() => {
  const d = props.daily;
  if (!d) return '';
  const when = props.isToday ? '今天' : '这天';
  return `${when} ${d.minutes}/${d.thresholdMinutes} 分钟 · ${d.points} 分`;
});

/** 还差多少分钟到达标，「补到达标」按这个数记一笔 */
const gapMinutes = computed(() =>
  Math.max(0, (props.daily?.thresholdMinutes ?? 0) - (props.daily?.minutes ?? 0)),
);

/** 当前这本书的笔记，只拉这一本 */
const logs = ref<any[]>([]);
const logsLoading = ref(false);

const recentLogs = computed(() => logs.value.slice(0, RECENT_LOGS));

async function loadLogs() {
  const book = activeBook.value;
  if (!book) {
    logs.value = [];
    return;
  }
  logsLoading.value = true;
  try {
    logs.value = await props.api(`/life/books/${book.id}/logs`);
  } catch {
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

/**
 * 重拉笔记
 * @description 除了换书还盯 logCount：从 AI 那边记了一条笔记之后，面板重拉书目录，
 * 这本书的 id 没变但条数变了，只盯 id 的话这里还是改之前那几行
 */
watch(() => [activeBook.value?.id, activeBook.value?.logCount], loadLogs, {
  immediate: true,
});

/**
 * 统一跑一次写入，收口忙碌态与报错
 * @param fn 要跑的动作
 */
async function run(fn: () => Promise<any>) {
  if (anyBusy.value) return;
  localBusy.value = true;
  errorMsg.value = '';
  try {
    await fn();
    emit('changed');
  } catch (e: any) {
    errorMsg.value = e.message ?? '操作失败';
  } finally {
    localBusy.value = false;
  }
}

/** 笔记输入条 */
const logDraft = ref('');

/** 记一条读到什么，落到当前那本书上 */
function addLog() {
  const text = logDraft.value.trim();
  const book = activeBook.value;
  if (!text || !book) return;
  run(async () => {
    await props.api(`/life/books/${book.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    logDraft.value = '';
  });
}

/** 删掉一条记错的笔记 */
function removeLog(id: string) {
  run(async () => {
    await props.api(`/life/logs/${id}`, { method: 'DELETE' });
  });
}

/** 新书的输入框 */
const bookDraft = ref('');

/**
 * 记下一本在读的书
 * @description 走确定性接口不过模型：书名就是一行字，让模型过一道手只会多一次失败的机会
 */
function captureBook() {
  const title = bookDraft.value.trim();
  if (!title) return;
  run(async () => {
    // 刚记下的这本就是接下来要读的那本，直接选中；
    // 不选的话手上已有书时，笔记还会继续落到上一本
    const created = await props.api('/life/books', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (created?.id) pick(created);
    bookDraft.value = '';
  });
}

/** 读完的书默认折起来：它们是存量，日常要看的是手上这几本 */
const showDone = ref(false);
</script>

<template>
  <section
    data-alt="reading-card"
    class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
  >
    <!-- 标题行：分钟与分值来自那条常驻每日项，它不在打卡格里了 -->
    <div data-alt="reading-head" class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        读书
      </p>
      <span
        data-alt="reading-daily"
        class="flex items-center gap-1 text-xs tabular-nums text-slate-400"
      >
        {{ dailyText }}
        <LifeAskButton title="就读书问 AI" @click="emit('ask')" />
      </span>
    </div>

    <!-- 记分钟：这一项今天做了多久，和原打卡格同一套 -->
    <div
      v-if="daily"
      data-alt="reading-punch"
      class="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <button
        v-for="m in QUICK_MINUTES"
        :key="m"
        data-alt="reading-punch-quick"
        type="button"
        :disabled="anyBusy"
        class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        @click="emit('punch', m)"
      >
        +{{ m }}
      </button>
      <button
        v-if="!daily.reached"
        data-alt="reading-punch-reach"
        type="button"
        :disabled="anyBusy"
        title="一次补到达标"
        class="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:border-brand-400/30 dark:text-brand-300 dark:hover:bg-brand-500/15"
        @click="emit('punch', gapMinutes)"
      >
        <LifeIcon name="target" class="h-3.5 w-3.5" />
        补到达标
      </button>
      <span
        v-else
        data-alt="reading-reached"
        class="rounded-lg bg-brand-50 px-2.5 py-1 text-xs text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
      >
        已达标
      </span>
      <!--
        这一项撤出打卡格之后，记错了只剩这儿能清——
        打卡格那颗清零钮随 pinned 项一起走了
      -->
      <button
        v-if="daily.minutes > 0"
        data-alt="reading-punch-clear"
        type="button"
        :disabled="anyBusy"
        :title="'清掉这天的 ' + daily.minutes + ' 分钟'"
        aria-label="清掉这天的读书记录"
        class="grid h-6 w-6 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
        @click="emit('clear')"
      >
        <LifeIcon name="undo" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- 在读的几本排成一行，点哪本笔记就记到哪本 -->
    <div
      data-alt="reading-picker"
      class="mt-3 flex flex-wrap items-center gap-1.5"
    >
      <span class="shrink-0 text-xs text-slate-400">在读</span>
      <button
        v-for="b in readingBooks"
        :key="b.id"
        data-alt="reading-chip"
        type="button"
        class="max-w-full truncate rounded-lg px-2 py-1 text-xs transition"
        :class="
          b.id === activeBook?.id
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
            : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
        "
        @click="pick(b)"
      >
        <!-- 只有一本时不画实心/空心：那一圈点没有要分辨的对象 -->
        <span v-if="readingBooks.length > 1" class="mr-1">{{
          b.id === activeBook?.id ? '●' : '○'
        }}</span>
        《{{ b.title }}》
      </button>
      <span
        v-if="!readingBooks.length"
        data-alt="reading-empty"
        class="text-xs text-slate-400"
      >
        还没记书
      </span>
    </div>

    <!-- 读到什么，想到什么：落到当前那本书上；没书时先去加一本 -->
    <div class="mt-2">
      <LifeAskBar
        v-if="activeBook"
        v-model="logDraft"
        mode="note"
        :busy="anyBusy"
        :maxlength="1000"
        placeholder="读到什么，想到什么"
        action-text="记下"
        @submit="addLog"
      />
      <p
        v-else
        data-alt="reading-note-hint"
        class="text-xs text-slate-400 dark:text-slate-500"
      >
        先在下面记一本在读的书，才有地方写读到什么
      </p>
    </div>

    <p
      v-if="errorMsg"
      data-alt="reading-error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>

    <!-- 当前这本书最近几条，日期对齐成左栏 -->
    <ul v-if="activeBook" data-alt="reading-logs" class="mt-2 grid content-start">
      <li
        v-for="l in recentLogs"
        :key="l.id"
        data-alt="reading-log-row"
        class="group flex items-start gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
      >
        <span
          class="w-11 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
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
          data-alt="reading-log-remove"
          type="button"
          :disabled="anyBusy"
          title="删掉这条"
          aria-label="删掉这条"
          class="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-300 transition hover:text-rose-500 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
          @click="removeLog(l.id)"
        >
          <LifeIcon name="close" class="h-3 w-3" />
        </button>
      </li>

      <li v-if="logsLoading" data-alt="reading-logs-loading" class="px-1 py-1.5">
        <span class="text-xs text-slate-400">读取中…</span>
      </li>
      <li
        v-else-if="!logs.length"
        data-alt="reading-logs-empty"
        class="px-1 py-1.5"
      >
        <span class="text-xs text-slate-400">这本还没记过</span>
      </li>

      <!-- 摆不下的去弹窗里看，那边还管读完与删书 -->
      <li v-if="logs.length > RECENT_LOGS" class="px-1 pt-1">
        <button
          data-alt="reading-logs-all"
          type="button"
          class="text-[11px] text-slate-400 transition hover:text-brand-500 dark:text-slate-500"
          @click="emit('open-book', activeBook)"
        >
          全部 {{ logs.length }} 条
        </button>
      </li>
    </ul>

    <!-- 卡底：加书与读完那一摊，都是偶尔才用一次的 -->
    <div
      data-alt="reading-foot"
      class="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700"
    >
      <!-- 上限对齐后端的 200，多打的字不该被悄悄吃掉 -->
      <LifeAskBar
        v-model="bookDraft"
        mode="note"
        :busy="anyBusy"
        :maxlength="200"
        placeholder="记一本书"
        label="记下这本书"
        @submit="captureBook"
      />

      <!-- 读完的收起来，点一下才摊开 -->
      <div v-if="doneBooks.length" data-alt="reading-done" class="mt-2">
        <button
          data-alt="reading-done-toggle"
          type="button"
          class="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"
          @click="showDone = !showDone"
        >
          读完 ({{ doneBooks.length }})
          <LifeIcon :name="showDone ? 'up' : 'down'" class="h-3 w-3" />
        </button>
        <ul v-if="showDone" data-alt="reading-done-list" class="mt-1 grid">
          <LifeBookRow
            v-for="b in doneBooks"
            :key="b.id"
            :book="b"
            @click="emit('open-book', b)"
          />
        </ul>
      </div>
    </div>
  </section>
</template>
