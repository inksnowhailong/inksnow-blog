<script setup lang="ts">
/**
 * 最近改动
 * @description 放开手让 AI 改计划的前提是改错看得见、退得回。
 * 列表默认收起——它是出事时才翻的东西，平时不该占注意力。
 */
import { ref, computed } from 'vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** /life/plan-changes 的结果 */
  changes: any[];
  api: (path: string, init?: RequestInit) => Promise<any>;
}>();

const emit = defineEmits<{ (e: 'changed'): void }>();

const open = ref(false);
const busy = ref('');
const errorMsg = ref('');

/** 能撤的才值得强调，纯记录的淡化处理 */
const revertibleCount = computed(
  () => props.changes.filter((c) => c.revertible).length,
);

/** 来源翻成人话，好分辨是自己点的还是 AI 改的 */
function sourceText(source: string): string {
  return { WEB: '页面', MCP: '本地 AI', SYSTEM: '系统' }[source] ?? source;
}

async function revert(c: any) {
  if (busy.value) return;
  busy.value = c.eventId;
  errorMsg.value = '';
  try {
    await props.api(`/life/plan-changes/${c.eventId}/revert`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    emit('changed');
  } catch (e: any) {
    errorMsg.value = e.message || '撤销失败';
  } finally {
    busy.value = '';
  }
}
</script>

<template>
  <section
    data-alt="recent-changes"
    class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
  >
    <button
      data-alt="changes-toggle"
      type="button"
      class="flex w-full items-center justify-between text-left"
      @click="open = !open"
    >
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >最近改动</span
      >
      <span class="flex items-center gap-1 text-xs text-slate-400">
        {{ changes.length }} 条<span v-if="revertibleCount"
          >，{{ revertibleCount }} 条可撤</span
        >
        <LifeIcon :name="open ? 'up' : 'down'" class="h-3.5 w-3.5" />
      </span>
    </button>

    <div v-if="open" class="mt-3 grid gap-2">
      <p
        v-if="errorMsg"
        class="text-sm text-rose-600 dark:text-rose-400"
      >
        {{ errorMsg }}
      </p>
      <div
        v-for="c in changes"
        :key="c.eventId"
        data-alt="change-row"
        class="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-700/40"
      >
        <div class="min-w-0">
          <p class="text-sm text-slate-700 dark:text-slate-200">
            {{ c.summary }}
          </p>
          <p class="mt-0.5 text-[11px] text-slate-400">
            {{ c.occurredOn }} · {{ sourceText(c.source) }}
            <span v-if="!c.revertible && c.reason"> · {{ c.reason }}</span>
          </p>
        </div>
        <button
          v-if="c.revertible"
          data-alt="revert-btn"
          type="button"
          :disabled="!!busy"
          title="撤销这次改动"
          aria-label="撤销这次改动"
          class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-rose-600 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-rose-400"
          @click="revert(c)"
        >
          <LifeIcon
            name="undo"
            class="h-3.5 w-3.5"
            :class="busy === c.eventId && 'animate-pulse'"
          />
        </button>
      </div>
      <p
        v-if="!changes.length"
        class="text-sm text-slate-400 dark:text-slate-500"
      >
        还没有改过计划
      </p>
    </div>
  </section>
</template>
