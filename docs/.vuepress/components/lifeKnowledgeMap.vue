<script setup lang="ts">
/**
 * 一个方向的知识地图
 * @description 上面一棵树（主干=方向，枝=大纲二级标题，叶=搞懂，枯叶=卡点），
 * 下面是大纲正文与两列清单。树是从大纲结构画出来的，大纲没生成时只画主干和散叶。
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

/**
 * 从大纲里抽枝：二级标题一根枝，标题下的要点数决定枝上叶子数。
 * 没大纲时用一根"未整理"的枝把所有 GOT 挂上
 */
const branches = computed(() => {
  const v = view.value;
  if (!v) return [];
  const outline: string = v.outline ?? '';
  const out: Array<{ title: string; leaves: number }> = [];
  outline.split('\n').forEach((line) => {
    const h = line.match(/^##\s+(.+)/);
    if (h) out.push({ title: h[1].trim(), leaves: 0 });
    else if (/^\s*[-*]\s+/.test(line) && out.length) out[out.length - 1].leaves++;
  });
  if (!out.length) out.push({ title: '未整理', leaves: v.got?.length ?? 0 });
  return out;
});

/** 树的几何：主干竖直，枝左右交替斜出，叶沿枝分布 */
const tree = computed(() => {
  const W = 320;
  const H = 40 + branches.value.length * 34 + 30;
  const trunkX = W / 2;
  const items = branches.value.map((b, i) => {
    const y = H - 30 - i * 34;
    const dir = i % 2 === 0 ? -1 : 1;
    const len = 90 + Math.min(60, b.leaves * 6);
    const x2 = trunkX + dir * len;
    const y2 = y - 22;
    const leaves = Array.from({ length: Math.min(b.leaves, 14) }, (_, k) => {
      const t = (k + 1) / (Math.min(b.leaves, 14) + 1);
      return { x: trunkX + dir * len * t, y: y - 22 * t - 6 - (k % 2) * 6 };
    });
    return { title: b.title, x1: trunkX, y1: y, x2, y2, leaves, dir };
  });
  const stuck = (view.value?.stuck ?? []).slice(0, 8).map((s: any, k: number) => ({
    x: trunkX + (k % 2 ? 1 : -1) * (40 + k * 9),
    y: H - 12,
  }));
  return { W, H, trunkX, items, stuck };
});

/** 大纲正文按行渲染，二级标题加粗 */
const outlineLines = computed(() =>
  String(view.value?.outline ?? '')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => ({ head: /^##\s+/.test(l), text: l.replace(/^##\s+/, '').replace(/^\s*[-*]\s+/, '') })),
);

watch(() => props.nodeId, load, { immediate: true });
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

    <!-- 树 -->
    <svg
      v-if="view"
      data-alt="knowledge-tree"
      :viewBox="`0 0 ${tree.W} ${tree.H}`"
      class="w-full max-w-md rounded-xl bg-slate-50 dark:bg-slate-900/40"
      preserveAspectRatio="xMidYMid meet"
    >
      <line :x1="tree.trunkX" :y1="tree.H - 10" :x2="tree.trunkX" :y2="30" stroke="#8b6b4a" stroke-width="4" stroke-linecap="round" />
      <g v-for="(b, i) in tree.items" :key="i">
        <line :x1="b.x1" :y1="b.y1" :x2="b.x2" :y2="b.y2" stroke="#8b6b4a" stroke-width="2" stroke-linecap="round" />
        <circle v-for="(l, k) in b.leaves" :key="k" :cx="l.x" :cy="l.y" r="3.2" fill="#34d399" />
        <text :x="b.x2 + b.dir * 4" :y="b.y2 - 4" font-size="9" :text-anchor="b.dir < 0 ? 'end' : 'start'" fill="#64748b">{{ b.title }}</text>
      </g>
      <!-- 枯叶：卡点落在根部 -->
      <circle v-for="(s, k) in tree.stuck" :key="'s' + k" :cx="s.x" :cy="s.y" r="2.8" fill="#d6a24a" opacity="0.8" />
      <text :x="tree.trunkX" y="18" font-size="10" text-anchor="middle" fill="#475569">{{ view.title }}</text>
    </svg>

    <!-- 大纲 -->
    <div v-if="view" data-alt="knowledge-outline" class="mt-3">
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
