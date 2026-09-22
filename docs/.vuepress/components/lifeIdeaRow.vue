<script setup lang="ts">
/**
 * 想法池的一行
 * @description 列表里每条研究线长一个样，只有左侧色条与「已结才有的结论那句」
 * 随状态变，所以一个组件配一张样式表就够——三个状态各拆一个组件的话，
 * 44px 触达、右侧计数、hover 这些公共壳子要抄三遍，改一处得改三处。
 */
import { computed } from 'vue';

const props = defineProps<{
  /** 一条研究线，字段来自后端 /life/ideas */
  idea: any;
}>();

/**
 * 左侧色条
 * @description 状态不再用徽标表达，改成一根线：在动是实的，搁着是虚的，
 * 已结是绿的。扫一列比读一列徽标快
 */
const BARS: Record<string, string> = {
  OPEN: 'border-brand-400',
  STALE: 'border-dashed border-slate-300 dark:border-slate-600',
  DONE: 'border-emerald-400',
};

const barClass = computed(
  () => BARS[props.idea?.state] ?? 'border-rose-400',
);

const isDone = computed(() => props.idea?.state === 'DONE');

/**
 * 距今多久
 * @description 只到「天」这一档：想法池要回答的是「这条线凉了多久」，
 * 精确到小时对这个判断没有帮助
 * @param date YYYY-MM-DD，取不到时返回空串
 */
function daysAgoLabel(date?: string): string {
  if (!date) return '';
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
  const diff = Math.round(
    (Date.parse(today + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) /
      86400000,
  );
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  return `${diff} 天前`;
}
</script>

<template>
  <!--
    min-h-[44px] 只留给手机：那一行是要用手指点的。
    桌面有指针，不需要这个下限，去掉后行高回到内容本身的高度，一屏能多扫几条
  -->
  <li
    data-alt="idea-row"
    class="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-r-lg border-l-2 py-2 pl-2.5 pr-1 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 sm:min-h-0"
    :class="barClass"
  >
    <div class="min-w-0 flex-1">
      <p
        data-alt="idea-row-content"
        class="whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
      >
        {{ idea.content }}
      </p>
      <p
        v-if="isDone && idea.conclusion"
        data-alt="idea-row-conclusion"
        class="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] leading-snug text-slate-400 dark:text-slate-500"
      >
        结论：{{ idea.conclusion }}
      </p>
    </div>
    <span
      data-alt="idea-row-meta"
      class="shrink-0 pt-0.5 text-[11px] tabular-nums text-slate-400 dark:text-slate-500"
    >
      {{ idea.logCount ?? 0 }} 条 · {{ daysAgoLabel(idea.lastActiveOn) }}
    </span>
  </li>
</template>
