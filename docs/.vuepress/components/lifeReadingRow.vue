<script setup lang="ts">
/**
 * 打卡卡里的读书行
 * @description 读书就是那条常驻每日项，跟另外三项一起排在打卡卡里，只是独占第一行：
 * 别的项只要回答「今天做了多久」，读书还要回答「读的是哪本、读到了什么」，
 * 一个半格的格子装不下这两问。
 *
 * 之所以不再是左列那张独立的读书卡：同样是「今天要做的」，一半在打卡卡、
 * 一半在下面另一张卡，眼睛得在两处之间来回找。合回来之后，读书从看进度到
 * 记内容都在这一行上完成。
 *
 * 行里不放任何提示句：没有在读的书时，书那一行就只有一个「＋」。
 * 该写什么已经写在输入框的 placeholder 里，再补一句空态提示只是把行撑高，
 * 而人看完还是得点那个「＋」。
 *
 * 笔记与加书直接打接口，写完向上报 changed 让面板重拉书目录：
 * 书目录、分钟、分数仍旧只有面板这一个来源，行自己不留副本。
 */
import { ref, computed, nextTick } from 'vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeBookRow from './lifeBookRow.vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** 当日结算里那条常驻的读书每日项；这天没排到时为 null，只剩书那部分 */
  daily: any | null;
  /** /life/books 的返回 `{ reading, done }`，由面板统一拉 */
  books: any;
  /** 选中的是不是今天；翻到往日时按钮上那句提示要改口，不然像是在说当下 */
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
  /** 打开某本书的弹窗，看全部笔记 / 读完 / 删书 */
  (e: 'open', book: any): void;
}>();

/** 打卡的快捷增量，分钟；与同一张卡上另外三项同一套 */
const QUICK_MINUTES = [15, 30];

/** 行里自己那几个请求的忙碌态，与面板的全局忙碌分开算 */
const localBusy = ref(false);
const errorMsg = ref('');

/** 面板在打卡、或行里正在写，两边任一在跑都不许再点 */
const anyBusy = computed(() => props.busy || localBusy.value);

/**
 * 在读的书
 * @description 最近记过的排前面：手上正翻的那本要一伸手就够得着，
 * 而久不动的那几本排在后面也不碍事
 */
const readingBooks = computed<any[]>(() =>
  [...(props.books?.reading ?? [])].sort((a: any, b: any) =>
    (b.lastLogOn ?? '').localeCompare(a.lastLogOn ?? ''),
  ),
);

const doneBooks = computed<any[]>(() => props.books?.done ?? []);

/** 还差多少分钟到达标，「补到达标」按这个数记一笔 */
const gapMinutes = computed(() =>
  Math.max(0, (props.daily?.thresholdMinutes ?? 0) - (props.daily?.minutes ?? 0)),
);

/** 展开着输入条的那本书的 id，空串表示这会儿一条都没展开 */
const openId = ref('');

/**
 * 展开着的那本书
 * @description 不直接信 openId：那本可能已经被删掉、或读完之后从在读列表里走掉，
 * 那时该连输入条一起收走，而不是对着一本不在了的书记笔记
 */
const openBook = computed<any>(
  () => readingBooks.value.find((b: any) => b.id === openId.value) ?? null,
);

const noteBar = ref<any>(null);

/**
 * 点一本书
 * @description 同一本再点一下就收起，于是「收起」不必再画一颗按钮；
 * 展开之后光标直接落进输入条，点书本来就是为了写下一句。
 * 收起不清草稿：写了一半的半句再展开还在，只有真记下去了才清
 * @param book 被点的那本
 */
function pick(book: any) {
  const same = openId.value === book.id;
  openId.value = same ? '' : book.id;
  if (!same) nextTick(() => noteBar.value?.focus());
}

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

/** 记一条读到什么，落到展开着的那本书上；记完收起，这一下就算完了 */
function addLog() {
  const text = logDraft.value.trim();
  const book = openBook.value;
  if (!text || !book) return;
  run(async () => {
    await props.api(`/life/books/${book.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    logDraft.value = '';
    openId.value = '';
  });
}

/** 「＋」展开出来的那个书名输入框 */
const adding = ref(false);
const titleDraft = ref('');
const titleInput = ref<HTMLInputElement | null>(null);

function startAdd() {
  adding.value = true;
  titleDraft.value = '';
  nextTick(() => titleInput.value?.focus());
}

/**
 * 收起加书输入框
 * @description 正在提交时不收：Enter 之后输入框还挂着等结果，此时的失焦
 * 不是人要放弃，真放弃时它已经没在跑了
 */
function cancelAdd() {
  if (localBusy.value) return;
  adding.value = false;
  titleDraft.value = '';
}

/**
 * 加书输入框失焦
 * @description 写了书名才走开，多半是以为打完就算数了，那就替他记下；
 * 一个字都没写才当没点过那个「＋」。想反悔走 Esc，那一下明确是「不要了」
 */
function blurAdd() {
  if (titleDraft.value.trim()) submitBook();
  else cancelAdd();
}

/**
 * 记下一本在读的书
 * @description 走确定性接口不过模型：书名就是一行字，让模型过一道手只会多一次失败的机会。
 * 落库之后直接展开它的输入条——加一本书多半是因为刚翻开，接着就要写第一条
 */
function submitBook() {
  const title = titleDraft.value.trim();
  if (!title) {
    cancelAdd();
    return;
  }
  run(async () => {
    const created = await props.api('/life/books', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    adding.value = false;
    titleDraft.value = '';
    if (created?.id) {
      openId.value = created.id;
      nextTick(() => noteBar.value?.focus());
    }
  });
}

/** 读完的书默认收着：它们是存量，日常要点的是手上这几本 */
const showDone = ref(false);
</script>

<template>
  <!-- 边框与达标底色跟同卡另外三项同一套，让它看着就是四项里的一项 -->
  <div
    data-alt="reading-row"
    class="rounded-xl border p-3 transition"
    :class="
      daily?.reached
        ? 'border-brand-200 bg-brand-50/60 dark:border-brand-400/30 dark:bg-brand-500/10'
        : 'border-slate-100 dark:border-slate-700'
    "
  >
    <div data-alt="reading-head" class="flex items-center justify-between gap-2">
      <p
        class="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {{ daily?.title ?? '读书' }}
      </p>
      <span class="flex shrink-0 items-center gap-1 text-xs text-slate-400">
        <template v-if="daily">{{ daily.points }} 分</template>
        <LifeAskButton title="就读书问 AI" @click="emit('ask')" />
      </span>
    </div>

    <!-- 进度条与分钟：这一项今天做了多久，与另外三项同一套记法 -->
    <div
      v-if="daily"
      class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
    >
      <div
        class="h-full rounded-full transition-all"
        :class="
          daily.reached ? 'bg-brand-500 dark:bg-brand-300' : 'bg-brand-500/50'
        "
        :style="{
          width:
            Math.min(100, (daily.minutes / daily.thresholdMinutes) * 100) + '%',
        }"
      />
    </div>
    <div
      v-if="daily"
      data-alt="reading-punch"
      class="mt-1.5 flex items-center justify-between gap-2"
    >
      <span class="text-xs tabular-nums text-slate-500"
        >{{ daily.minutes }}/{{ daily.thresholdMinutes }} 分钟<span
          v-if="daily.minutes > daily.thresholdMinutes"
          class="ml-1 text-slate-400"
          >超 {{ daily.minutes - daily.thresholdMinutes }}</span
        ></span
      >
      <span class="flex gap-1">
        <button
          v-for="m in QUICK_MINUTES"
          :key="m"
          data-alt="reading-punch-quick"
          type="button"
          :disabled="anyBusy"
          class="h-10 rounded-lg px-3 text-sm text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 sm:h-auto sm:rounded sm:px-1.5 sm:py-0.5 sm:text-xs"
          @click="emit('punch', m)"
        >
          +{{ m }}
        </button>
        <button
          v-if="daily.minutes > 0"
          data-alt="reading-punch-clear"
          type="button"
          :disabled="anyBusy"
          :title="`清掉${isToday ? '今天' : '这天'}的 ${daily.minutes} 分钟`"
          aria-label="清零这一项"
          class="grid h-10 w-10 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 sm:h-6 sm:w-6"
          @click="emit('clear')"
        >
          <LifeIcon name="undo" class="h-3.5 w-3.5" />
        </button>
        <button
          v-if="!daily.reached"
          data-alt="reading-punch-reach"
          type="button"
          :disabled="anyBusy"
          title="一次补到达标"
          aria-label="一次补到达标"
          class="grid h-10 w-10 place-items-center rounded text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-500/15 sm:h-6 sm:w-6"
          @click="emit('punch', gapMinutes)"
        >
          <LifeIcon name="target" class="h-4 w-4" />
        </button>
      </span>
    </div>

    <!-- 在读的几本排成一行，点哪本就在哪本下面写；「＋」永远在最后 -->
    <div
      data-alt="reading-books"
      class="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <button
        v-for="b in readingBooks"
        :key="b.id"
        data-alt="reading-chip"
        type="button"
        class="max-w-full truncate rounded-lg px-3 py-2 text-sm transition sm:px-2 sm:py-1 sm:text-xs"
        :class="
          b.id === openId
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
            : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
        "
        @click="pick(b)"
      >
        《{{ b.title }}》
      </button>

      <!-- 加书就地进行：上限对齐后端的 200，多打的字不该被悄悄吃掉 -->
      <input
        v-if="adding"
        ref="titleInput"
        data-alt="reading-add-input"
        v-model="titleDraft"
        type="text"
        maxlength="200"
        placeholder="书名"
        class="w-40 rounded-lg bg-slate-50 px-3 py-1.5 text-base outline-none dark:bg-slate-700/40 dark:text-slate-100 sm:w-32 sm:px-2 sm:py-1 sm:text-xs"
        @keydown.enter.prevent="submitBook"
        @keydown.esc="cancelAdd"
        @blur="blurAdd"
      />
      <button
        v-else
        data-alt="reading-add"
        type="button"
        title="记一本在读的书"
        aria-label="记一本在读的书"
        class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-700 sm:h-6 sm:w-6"
        @click="startAdd"
      >
        ＋
      </button>

      <!-- 读完的不占 chip 位，但也得有个够得着的入口，摊在这一行末尾 -->
      <button
        v-if="doneBooks.length"
        data-alt="reading-done-toggle"
        type="button"
        class="flex min-h-10 items-center gap-0.5 px-2 text-sm text-slate-400 transition hover:text-brand-500 dark:text-slate-500 sm:min-h-0 sm:px-0 sm:text-[11px]"
        @click="showDone = !showDone"
      >
        读完 {{ doneBooks.length }}
        <LifeIcon :name="showDone ? 'up' : 'down'" class="h-3 w-3" />
      </button>
    </div>

    <ul v-if="showDone && doneBooks.length" data-alt="reading-done-list" class="mt-1 grid">
      <LifeBookRow
        v-for="b in doneBooks"
        :key="b.id"
        :book="b"
        @click="emit('open', b)"
      />
    </ul>

    <!-- 点开一本书才出现这一条：写完就收起，不常驻占位 -->
    <div
      v-if="openBook"
      data-alt="reading-note"
      class="mt-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-1.5"
    >
      <!--
        书名带「›」：既说清这一句记到哪本，又是那本书弹窗的入口。
        手机上独占一行：并排时书名标签吃掉固定宽度，输入框只剩一百多像素，
        一句「读到什么」打两个字就换行。宽屏够宽，仍旧并排
      -->
      <button
        data-alt="reading-open"
        type="button"
        :title="`打开《${openBook.title}》`"
        class="flex h-9 max-w-full shrink-0 self-start items-center gap-0.5 rounded-md px-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-brand-500 dark:text-slate-400 dark:hover:bg-slate-700 sm:h-auto sm:max-w-[7rem] sm:px-1 sm:py-1.5 sm:text-xs"
        @click="emit('open', openBook)"
      >
        <span class="truncate">{{ openBook.title }}</span>
        <LifeIcon name="right" class="h-3.5 w-3.5 shrink-0" />
      </button>
      <LifeAskBar
        ref="noteBar"
        v-model="logDraft"
        mode="note"
        class="min-w-0 flex-1"
        :busy="anyBusy"
        :maxlength="1000"
        placeholder="读到什么，想到什么"
        action-text="记下"
        @submit="addLog"
      />
    </div>

    <p
      v-if="errorMsg"
      data-alt="reading-error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>
  </div>
</template>
