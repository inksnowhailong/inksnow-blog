<script setup lang="ts">
/**
 * 日志预览块
 * @description 三个小弹窗里原先各自铺一整列日志，长稿在 sm:max-w-lg 里读着太窄。
 * 现在小弹窗只露最近 3 条的日期 + 首句，全文与书写都进日志大弹窗。
 * 点某条 → 抛出它的 id，定位到那条；点入口 → 抛出 null，由调用方打开大弹窗。
 */
import { computed } from 'vue';
import { shortDate } from './lifeFormat';
import { firstParagraph } from './lifeMarkdown';

const props = defineProps<{
  /** 最新在前 */
  logs: { id: string; text: string; occurredOn?: string; meta?: string }[];
  loading?: boolean;
  /** 能写则入口叫「写日志」，否则只是「全部」 */
  canWrite?: boolean;
  /** 区块标题，如「学习日志」 */
  label: string;
}>();

const emit = defineEmits<{ (e: 'open', id: string | null): void }>();

/** 预览只给最近这几条 */
const RECENT = 3;

const recent = computed(() => props.logs.slice(0, RECENT));
</script>

<template>
  <div data-alt="log-preview" class="min-w-0">
    <div class="mb-1.5 flex items-baseline justify-between gap-2">
      <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
        {{ label }}
      </p>
      <button
        data-alt="log-preview-open"
        type="button"
        class="text-xs text-brand-600 transition hover:text-brand-500 dark:text-brand-300"
        @click="emit('open', null)"
      >
        {{ loading ? '读取中…' : `全部 ${logs.length} 条` }}{{ canWrite ? ' / 写日志' : '' }}
      </button>
    </div>

    <ul v-if="recent.length" class="grid min-w-0 gap-0.5">
      <li v-for="l in recent" :key="l.id">
        <button
          data-alt="log-preview-item"
          type="button"
          class="flex w-full min-w-0 items-start gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
          @click="emit('open', l.id)"
        >
          <span
            class="w-14 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
          >
            {{ shortDate(l.occurredOn) }}
          </span>
          <span class="min-w-0 flex-1">
            <span
              class="line-clamp-1 block break-words text-sm leading-snug text-slate-700 dark:text-slate-200"
            >
              {{ firstParagraph(l.text, 80) }}
            </span>
            <span
              v-if="l.meta"
              class="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500"
            >
              {{ l.meta }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="!loading" class="text-xs text-slate-400 dark:text-slate-500">
      还没记过
    </p>
  </div>
</template>
