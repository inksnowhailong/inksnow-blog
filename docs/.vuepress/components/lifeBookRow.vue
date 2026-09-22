<script setup lang="ts">
/**
 * 读书列表的一行
 * @description 在读与读完长同一个样：左侧一根色条、中间书名、右侧一串小字。
 * 两个状态只差右侧那串（在读报「几条 · 几天前」，读完报起止日期）与色条颜色，
 * DOM 完全一致——拆成两个组件的话，44px 触达、截断、hover 这套公共壳子
 * 要抄两遍，改一处得改两处。与 lifeIdeaRow 同一套写法。
 */
import { computed } from 'vue';
import { daysAgoLabel } from './lifeFormat';

const props = defineProps<{
  /** 一本书，字段来自后端 /life/books */
  book: any;
}>();

const isDone = computed(() => props.book?.status === 'DONE');

/**
 * 右侧那一串
 * @description 在读的书要回答「记了多少、多久没翻了」，读完的书要回答
 * 「读了多长一段日子」——同一个位置，两个问题
 */
const metaText = computed(() => {
  if (isDone.value) {
    return `${shortDate(props.book?.startedOn)} → ${shortDate(
      props.book?.finishedOn,
    )}`;
  }
  const ago = daysAgoLabel(props.book?.lastLogOn);
  return `${props.book?.logCount ?? 0} 条${ago ? ` · ${ago}` : ''}`;
});

/** 只留月日，年份四个字占着行尾反而挤掉书名 */
function shortDate(date?: string): string {
  return date ? date.slice(5) : '';
}
</script>

<template>
  <!-- min-h-[44px] 只留给手机：那一行是要用手指点的 -->
  <li
    data-alt="book-row"
    class="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-r-lg border-l-2 py-2 pl-2.5 pr-1 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 sm:min-h-0"
    :class="isDone ? 'border-emerald-400' : 'border-brand-400'"
  >
    <p
      data-alt="book-row-title"
      class="min-w-0 flex-1 text-sm leading-snug text-slate-700 dark:text-slate-200"
    >
      {{ book.title }}
    </p>
    <span
      data-alt="book-row-meta"
      class="shrink-0 pt-0.5 text-[11px] tabular-nums text-slate-400 dark:text-slate-500"
    >
      {{ metaText }}
    </span>
  </li>
</template>
