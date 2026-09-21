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
    class="mt-2 grid gap-1.5 rounded-lg bg-white/70 p-2 dark:bg-slate-900/40"
  >
    <div v-for="(d, i) in details" :key="i" data-alt="detail-row">
      <p class="text-[10px] text-slate-400">{{ d.label }}</p>
      <!-- 只有一行内容时直接列出，如要删掉的那几条记录 -->
      <p
        v-if="d.value !== undefined"
        class="text-xs leading-snug text-slate-700 dark:text-slate-200"
      >
        {{ d.value }}
      </p>
      <template v-else>
        <p
          class="text-xs leading-snug text-slate-400 line-through dark:text-slate-500"
        >
          {{ d.before }}
        </p>
        <p class="text-xs leading-snug text-slate-800 dark:text-slate-100">
          {{ d.after }}
        </p>
      </template>
    </div>
  </div>
</template>
