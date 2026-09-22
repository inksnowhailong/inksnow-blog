<script setup lang="ts">
/**
 * 一个方向的知识地图
 * @description 两块内容：AI 整理出的大纲正文，以及还卡着的那些点。
 * 原先顶上还画了一棵树，删了——它只是把大纲的结构换个形状再说一遍。
 */
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  nodeId: string;
  api: (path: string, init?: RequestInit) => Promise<any>;
}>();

const view = ref<any>(null);
const loading = ref(false);
const refreshing = ref(false);
const errorMsg = ref('');

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    view.value = await props.api(`/life/plan/${props.nodeId}/knowledge-map`);
  } catch (e: any) {
    errorMsg.value = e.message ?? '读取失败';
  } finally {
    loading.value = false;
  }
}

/** 让 AI 重新整理大纲 */
async function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  errorMsg.value = '';
  try {
    view.value = await props.api(`/life/plan/${props.nodeId}/knowledge-map/refresh`, { method: 'POST' });
  } catch (e: any) {
    errorMsg.value = e.message ?? '整理失败';
  } finally {
    refreshing.value = false;
  }
}

/** 大纲正文按行渲染，二级标题加粗 */
const outlineLines = computed(() =>
  String(view.value?.outline ?? '')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => ({ head: /^##\s+/.test(l), text: l.replace(/^##\s+/, '').replace(/^\s*[-*]\s+/, '') })),
);

watch(() => props.nodeId, load, { immediate: true });
defineExpose({ load });
</script>

<template>
  <div data-alt="knowledge-map" class="mt-4">
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <p class="text-xs font-medium text-slate-600 dark:text-slate-300">知识地图</p>
      <span class="text-[11px] text-slate-400">
        <template v-if="view">搞懂 {{ view.got.length }} · 卡点 {{ view.stuck.length }}</template>
        <template v-else-if="loading">读取中…</template>
      </span>
    </div>

    <!-- 大纲 -->
    <div v-if="view" data-alt="knowledge-outline">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] text-slate-400">
          <template v-if="view.outline">基于 {{ view.basedOn }} 条 · {{ view.generatedOn }}<span v-if="view.pending"> · 又新增 {{ view.pending }} 条未整理</span></template>
          <template v-else>还没整理过</template>
        </p>
        <button
          data-alt="knowledge-refresh"
          type="button"
          :disabled="refreshing || !view.got.length"
          class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
          @click="refresh"
        >
          {{ refreshing ? '整理中…' : view.outline ? '重新整理' : '整理成大纲' }}
        </button>
      </div>
      <div v-if="outlineLines.length" class="mt-2 grid gap-1 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
        <p v-for="(l, i) in outlineLines" :key="i" :class="l.head ? 'font-medium text-slate-800 dark:text-slate-100' : 'pl-3 text-slate-700 dark:text-slate-200'">{{ l.text }}</p>
      </div>
    </div>

    <!-- 卡点 -->
    <div v-if="view?.stuck?.length" data-alt="knowledge-stuck" class="mt-3">
      <p class="text-[11px] text-amber-700 dark:text-amber-300">卡在这</p>
      <ul class="mt-1 grid gap-1">
        <li v-for="s in view.stuck" :key="s.id" class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-slate-700 dark:bg-amber-500/10 dark:text-slate-200">
          {{ s.text }}<span class="ml-1 text-[11px] text-slate-400">{{ s.occurredOn }}</span>
        </li>
      </ul>
    </div>

    <p v-if="errorMsg" data-alt="knowledge-error" class="mt-2 text-sm text-rose-600 dark:text-rose-400">{{ errorMsg }}</p>
  </div>
</template>
