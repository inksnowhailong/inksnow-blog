<script setup lang="ts">
/**
 * 高风险草稿的前后对照
 * @description 一句「改了说明」无从判断对错，必须把改前改后摆在一起。
 * 对话栏与就地浮层都要用，故单独成件。
 */
import { computed } from 'vue';
import { draftDetails } from './useLifeDraft';

const props = defineProps<{ draft: any }>();

const details = computed(() => draftDetails(props.draft));
</script>

<template>
  <div
    v-if="details.length"
    data-alt="draft-detail"
    class="mt-2 grid gap-1 rounded-lg bg-white/70 px-2 py-1.5 dark:bg-slate-900/40"
  >
    <div
      v-for="(d, i) in details"
      :key="i"
      data-alt="detail-row"
      class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2"
    >
      <span class="pt-px text-[10px] leading-4 text-slate-400">{{
        d.label
      }}</span>
      <!-- 只有一行内容时直接列出，如要删掉的那几条记录 -->
      <span
        v-if="d.value !== undefined"
        class="text-xs leading-4 text-slate-700 dark:text-slate-200"
      >
        {{ d.value }}
      </span>
      <!-- 前后对照挤在同一列，一眼能比出差别 -->
      <span v-else class="grid gap-0.5">
        <span
          class="text-xs leading-4 text-slate-400 line-through dark:text-slate-500"
          >{{ d.before }}</span
        >
        <span class="text-xs leading-4 text-slate-800 dark:text-slate-100">{{
          d.after
        }}</span>
      </span>
    </div>
  </div>
</template>
