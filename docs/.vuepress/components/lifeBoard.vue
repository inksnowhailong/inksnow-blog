<script setup lang="ts">
/**
 * 人生规划面板
 * @description 数据来自 hlNestServer 的 /life 接口，凭一个共享密钥访问。
 * 密钥存在浏览器本地，换设备需重新输入一次。
 */
import { ref, computed, onMounted } from 'vue';

/** 后端地址写成绝对路径，使本地开发与线上走同一条链路 */
const API = 'https://inksnowhl.cn/api';
/** 本地保存密钥的键名 */
const KEY_STORE = 'life-key';

type Scale = 'day' | 'week' | 'month' | 'year';

const mounted = ref(false);
const key = ref('');
const unlocked = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const plan = ref<any[]>([]);
const timeline = ref<any>(null);
const diagnosis = ref<any>(null);
const events = ref<any[]>([]);
const scale = ref<Scale>('day');
const expanded = ref<Record<string, boolean>>({});

const chatInput = ref('');
const chatBusy = ref(false);
/** AI 解析出的待确认记录，确认后才真正写入 */
const pending = ref<any>(null);
const chatReply = ref('');

const scales: Array<{ v: Scale; label: string }> = [
  { v: 'day', label: '日' },
  { v: 'week', label: '周' },
  { v: 'month', label: '月' },
  { v: 'year', label: '年' },
];

/**
 * 带密钥调用后端
 * @param path 接口路径
 * @param init fetch 配置
 */
async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-life-key': key.value,
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    lock();
    throw new Error('密钥无效');
  }
  if (!res.ok) throw new Error('请求失败 ' + res.status);
  return await res.json();
}

/** 今天的日期 YYYY-MM-DD，按本地时区 */
function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(
    new Date(),
  );
}

/** 日期加减天数 */
function shiftDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 拉取面板所需的全部数据 */
async function loadAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [p, t, d] = await Promise.all([
      api('/life/plan'),
      api('/life/timeline?scale=' + scale.value),
      api('/life/diagnosis'),
    ]);
    plan.value = p;
    timeline.value = t;
    diagnosis.value = d;
    events.value = await api(
      `/life/events?from=${shiftDays(today(), -30)}&to=${today()}`,
    );
    unlocked.value = true;
    try {
      localStorage.setItem(KEY_STORE, key.value);
    } catch {}
  } catch (e: any) {
    errorMsg.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

/** 只刷新趋势数据，用于切换时间尺度 */
async function reloadTimeline(next: Scale) {
  scale.value = next;
  try {
    timeline.value = await api('/life/timeline?scale=' + next);
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

/** 清除密钥并回到入口 */
function lock() {
  unlocked.value = false;
  key.value = '';
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {}
}

/** 趋势图的绘制参数，随数据变化重算 */
const chart = computed(() => {
  const buckets = timeline.value?.buckets ?? [];
  const W = 720;
  const H = 200;
  const padL = 38;
  const padR = 14;
  const padT = 12;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const values = buckets.map((b: any) => b.minutes);
  const max = Math.max(...values, 1);
  const top = Math.ceil(max / 30) * 30 || 30;
  const n = buckets.length;
  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => padT + ih - (v / top) * ih;

  const sorted = [...values].sort((a: number, b: number) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const baseline = !sorted.length
    ? 0
    : sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  const line = buckets
    .map((b: any, i: number) => (i ? 'L' : 'M') + x(i) + ' ' + y(b.minutes))
    .join(' ');

  return {
    W,
    H,
    padL,
    padR,
    n,
    line,
    area: n ? `${line} L${x(n - 1)} ${padT + ih} L${x(0)} ${padT + ih} Z` : '',
    baselineY: y(baseline),
    ticks: [0, top / 2, top].map((v) => ({ v, y: y(v) })),
    labelStep: n > 8 ? Math.ceil(n / 7) : 1,
    points: buckets.map((b: any, i: number) => ({
      x: x(i),
      y: y(b.minutes),
      label: b.bucket,
      value: b.minutes,
      last: i === n - 1,
    })),
  };
});

const hover = ref<{ x: number; y: number; text: string } | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

/** 跟随指针定位数值提示 */
function onMove(ev: MouseEvent | TouchEvent) {
  const svg = svgRef.value;
  const c = chart.value;
  if (!svg || !c.n) return;
  const rect = svg.getBoundingClientRect();
  const clientX =
    'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
  const px = ((clientX - rect.left) / rect.width) * c.W;
  const span = (c.W - c.padL - c.padR) / Math.max(c.n - 1, 1);
  let i = Math.round((px - c.padL) / span);
  i = Math.max(0, Math.min(c.n - 1, i));
  const p = c.points[i];
  hover.value = {
    x: (p.x / c.W) * rect.width,
    y: (p.y / c.H) * rect.height,
    text: `${p.label} · ${p.value} 分钟`,
  };
}

/** 收集某节点子树的全部 id */
function collectIds(node: any): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectIds)];
}

/** 某节点在当前区间内的投入分钟 */
function minutesOf(nodeId: string): number {
  const hit = (timeline.value?.byNode ?? []).find(
    (s: any) => s.nodeId === nodeId,
  );
  return hit ? hit.minutes : 0;
}

/** 顶层节点及其子树合计投入 */
const treeRows = computed(() =>
  plan.value.map((node: any) => ({
    ...node,
    totalMins: collectIds(node).reduce((sum, id) => sum + minutesOf(id), 0),
  })),
);

function toggle(id: string) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] };
}

/** 进步指数保留两位，无基线时按有无动作显示 */
const indexText = computed(() => {
  const p = diagnosis.value?.progress;
  if (!p) return '—';
  if (p.baseline > 0) return p.index.toFixed(2);
  return p.todayScore > 0 ? '1.00' : '0';
});

/** 按 id 找节点标题 */
function nodeTitle(id: string): string {
  const walk = (list: any[]): any => {
    for (const n of list) {
      if (n.id === id) return n;
      const hit = walk(n.children ?? []);
      if (hit) return hit;
    }
    return null;
  };
  return walk(plan.value)?.title ?? '未归类';
}

/**
 * 把一句话交给后端解析
 * @description 后端调用模型，只负责把话翻译成结构或把数据翻译成人话，
 * 所有数字仍由后端计算，模型不参与运算
 */
async function send() {
  const text = chatInput.value.trim();
  if (!text || chatBusy.value) return;
  chatBusy.value = true;
  chatReply.value = '';
  pending.value = null;
  try {
    const res = await api('/life/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
    if (res.kind === 'record') pending.value = res;
    else chatReply.value = res.text;
    chatInput.value = '';
  } catch (e: any) {
    errorMsg.value =
      e.message === '密钥无效' ? e.message : 'AI 暂时不可用：' + e.message;
  } finally {
    chatBusy.value = false;
  }
}

/** 确认后才真正写入事件 */
async function confirmPending() {
  if (!pending.value) return;
  chatBusy.value = true;
  try {
    for (const item of pending.value.items) {
      await api('/life/events', { method: 'POST', body: JSON.stringify(item) });
    }
    pending.value = null;
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    chatBusy.value = false;
  }
}

onMounted(() => {
  mounted.value = true;
  try {
    const saved = localStorage.getItem(KEY_STORE);
    if (saved) {
      key.value = saved;
      loadAll();
    }
  } catch {}
});
</script>

<template>
  <div data-alt="life-board" class="my-6">
    <!-- 密钥入口 -->
    <div
      v-if="mounted && !unlocked"
      data-alt="life-unlock"
      class="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
    >
      <p data-alt="unlock-title" class="m-0 mb-1 text-base font-medium text-slate-800 dark:text-slate-100">
        日拱一卒
      </p>
      <p data-alt="unlock-hint" class="m-0 mb-4 text-sm text-slate-500 dark:text-slate-400">
        输入密钥查看你的规划数据
      </p>
      <input
        id="life-key-input"
        data-alt="key-input"
        v-model="key"
        type="password"
        placeholder="访问密钥"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-teal-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        @keyup.enter="loadAll"
      />
      <button
        data-alt="unlock-button"
        class="mt-3 w-full cursor-pointer rounded-lg border-0 bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        :disabled="loading || !key"
        @click="loadAll"
      >
        {{ loading ? '加载中…' : '进入' }}
      </button>
      <p v-if="errorMsg" data-alt="unlock-error" class="mb-0 mt-3 text-sm text-rose-600">
        {{ errorMsg }}
      </p>
    </div>

    <!-- 面板主体 -->
    <div v-else-if="mounted" data-alt="life-content" class="grid gap-5">
      <!-- 今日状态 -->
      <section
        data-alt="today-card"
        class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <div data-alt="today-top" class="flex flex-wrap items-end gap-4">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-slate-400">
              今天 vs 近七日基线
            </div>
            <div class="flex items-end gap-1">
              <span
                data-alt="progress-index"
                class="font-mono text-4xl font-semibold leading-none tabular-nums text-teal-700 dark:text-teal-400"
              >{{ indexText }}</span>
              <span class="text-sm text-slate-400">×</span>
            </div>
          </div>
          <p data-alt="verdict" class="m-0 min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
            {{ diagnosis?.progress?.verdict || '—' }}
          </p>
        </div>
        <div
          data-alt="today-meta"
          class="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>今日得分 <b class="font-mono tabular-nums text-slate-700 dark:text-slate-200">{{ diagnosis?.progress?.todayScore ?? 0 }}</b></span>
          <span>基线 <b class="font-mono tabular-nums text-slate-700 dark:text-slate-200">{{ Math.round(diagnosis?.progress?.baseline ?? 0) }}</b></span>
          <span>有记录 <b class="font-mono tabular-nums text-slate-700 dark:text-slate-200">{{ timeline?.activeDays ?? 0 }}</b> 天</span>
        </div>
      </section>

      <!-- 趋势 -->
      <section data-alt="trend-section">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="m-0 text-sm font-semibold text-slate-700 dark:text-slate-200">投入趋势</h2>
          <div data-alt="scale-switch" class="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
            <button
              v-for="s in scales"
              :key="s.v"
              data-alt="scale-button"
              class="cursor-pointer rounded-md border-0 px-3 py-1 text-xs"
              :class="
                scale === s.v
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'bg-transparent text-slate-500 dark:text-slate-300'
              "
              @click="reloadTimeline(s.v)"
            >{{ s.label }}</button>
          </div>
        </div>
        <div
          data-alt="chart-card"
          class="relative rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <p
            v-if="!chart.n"
            data-alt="chart-empty"
            class="m-0 py-10 text-center text-sm text-slate-400"
          >这段时间还没有记录</p>
          <svg
            v-else
            ref="svgRef"
            data-alt="trend-chart"
            :viewBox="`0 0 ${chart.W} ${chart.H}`"
            class="block w-full text-teal-700 dark:text-teal-400"
            @mousemove="onMove"
            @touchmove.passive="onMove"
            @mouseleave="hover = null"
          >
            <defs>
              <linearGradient id="lifeArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            <g v-for="t in chart.ticks" :key="'t' + t.v">
              <line
                :x1="chart.padL"
                :y1="t.y"
                :x2="chart.W - chart.padR"
                :y2="t.y"
                stroke="currentColor"
                stroke-width="1"
                fill="none"
                opacity="0.14"
              />
              <text
                :x="chart.padL - 7"
                :y="t.y + 4"
                text-anchor="end"
                font-size="11"
                fill="currentColor"
                opacity="0.5"
              >{{ t.v }}</text>
            </g>
            <path :d="chart.area" fill="url(#lifeArea)" stroke="none" />
            <line
              :x1="chart.padL"
              :y1="chart.baselineY"
              :x2="chart.W - chart.padR"
              :y2="chart.baselineY"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="4 4"
              opacity="0.4"
              fill="none"
            />
            <path
              :d="chart.line"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in chart.points"
              :key="'p' + i"
              :cx="p.x"
              :cy="p.y"
              :r="p.last ? 5 : 3"
              :fill="p.last ? 'currentColor' : '#ffffff'"
              stroke="currentColor"
              stroke-width="2"
            />
            <text
              v-for="(p, i) in chart.points"
              :key="'l' + i"
              v-show="i % chart.labelStep === 0 || i === chart.n - 1"
              :x="p.x"
              :y="chart.H - 6"
              text-anchor="middle"
              font-size="11"
              fill="currentColor"
              opacity="0.5"
            >{{ p.label }}</text>
          </svg>
          <div
            v-if="hover"
            data-alt="chart-tooltip"
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-800 px-2 py-1 text-xs text-white"
            :style="{ left: hover.x + 'px', top: hover.y + 'px' }"
          >{{ hover.text }}</div>
        </div>
      </section>

      <!-- 目标树 -->
      <section data-alt="tree-section">
        <h2 class="m-0 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">目标树</h2>
        <p
          v-if="!treeRows.length"
          data-alt="tree-empty"
          class="m-0 rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400 dark:border-slate-600"
        >还没有目标，在下面对我说一句就能建</p>
        <div v-else class="grid gap-2">
          <div
            v-for="node in treeRows"
            :key="node.id"
            data-alt="tree-node"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              data-alt="node-toggle"
              class="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-3 text-left"
              @click="toggle(node.id)"
            >
              <span
                class="text-[10px] text-slate-400"
                :class="expanded[node.id] ? 'rotate-90' : ''"
              >▶</span>
              <span class="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{{ node.title }}</span>
              <span class="flex-none font-mono text-xs tabular-nums text-slate-500">{{ node.totalMins }} 分</span>
            </button>
            <div
              v-if="expanded[node.id]"
              data-alt="node-children"
              class="grid gap-2 px-3 pb-3 pl-9"
            >
              <div v-for="kid in node.children" :key="kid.id" data-alt="child-node">
                <div class="flex items-center gap-2 text-sm">
                  <span class="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{{ kid.title }}</span>
                  <span
                    v-if="kid.dailyMinutes"
                    class="flex-none rounded bg-slate-100 px-1.5 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                  >每日 {{ kid.dailyMinutes }} 分</span>
                  <span class="flex-none font-mono text-xs tabular-nums text-slate-500">{{ minutesOf(kid.id) }} 分</span>
                </div>
                <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    class="h-full rounded-full bg-teal-700 dark:bg-teal-400"
                    :style="{
                      width:
                        (node.totalMins
                          ? Math.round((minutesOf(kid.id) / node.totalMins) * 100)
                          : 0) + '%',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 诊断 -->
      <section v-if="diagnosis" data-alt="diagnosis-section">
        <h2 class="m-0 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">诊断</h2>
        <div class="grid gap-2">
          <div
            v-for="d in [
              { label: '执行力趋势', text: diagnosis.trend.verdict, warn: false },
              {
                label: '计划负载',
                text: diagnosis.overload.verdict,
                warn: diagnosis.overload.ratio >= 1.5,
              },
            ]"
            :key="d.label"
            data-alt="diagnosis-item"
            class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <span
              class="mt-1.5 h-2 w-2 flex-none rounded-full"
              :class="d.warn ? 'bg-amber-600' : 'bg-emerald-600'"
            ></span>
            <div>
              <div class="text-[11px] text-slate-400">{{ d.label }}</div>
              <div class="text-sm text-slate-600 dark:text-slate-300">{{ d.text }}</div>
            </div>
          </div>
          <div
            v-for="z in diagnosis.zombies"
            :key="z.id"
            data-alt="zombie-item"
            class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-amber-600"></span>
            <div>
              <div class="text-[11px] text-slate-400">停滞的计划</div>
              <div class="text-sm text-slate-600 dark:text-slate-300">
                「{{ z.title }}」已 {{ z.idleDays }} 天零进展
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 最近记录：未完成用中性灰呈现，不做警示 -->
      <section v-if="events.length" data-alt="log-section">
        <h2 class="m-0 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">最近记录</h2>
        <div class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <div
            v-for="ev in events.slice(0, 12)"
            :key="ev.id"
            data-alt="log-row"
            class="flex items-baseline gap-3 border-b border-slate-100 bg-white px-3 py-2 text-sm last:border-0 dark:border-slate-700 dark:bg-slate-800"
          >
            <span class="w-12 flex-none font-mono text-xs text-slate-400">{{ ev.occurredOn.slice(5) }}</span>
            <span class="min-w-0 flex-1">
              <span
                v-if="ev.kind === 'MISS'"
                class="mr-1.5 rounded bg-slate-100 px-1.5 text-[10px] text-slate-500 dark:bg-slate-700"
              >未完成</span>
              <span
                :class="
                  ev.kind === 'MISS'
                    ? 'text-slate-400'
                    : 'text-slate-600 dark:text-slate-300'
                "
              >{{ ev.nodeId ? nodeTitle(ev.nodeId) : '随手记' }}</span>
              <span v-if="ev.note" class="text-xs text-slate-400"> · {{ ev.note }}</span>
            </span>
            <span class="flex-none font-mono text-xs tabular-nums text-slate-500">
              {{ ev.kind === 'MISS' ? '—' : ev.minutes + ' 分' }}
            </span>
          </div>
        </div>
      </section>

      <!-- 对话 -->
      <section
        data-alt="chat-section"
        class="sticky bottom-0 bg-white/90 py-3 backdrop-blur dark:bg-slate-900/90"
      >
        <div
          v-if="pending"
          data-alt="pending-card"
          class="mb-2 rounded-xl border border-teal-600 bg-white p-3 dark:bg-slate-800"
        >
          <div class="mb-2 text-xs text-teal-700 dark:text-teal-400">我准备记这一条，确认吗</div>
          <div class="grid gap-1.5">
            <div
              v-for="(it, i) in pending.items"
              :key="i"
              class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700"
            >
              <span class="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{{ it.nodeId ? nodeTitle(it.nodeId) : '随手记' }}</span>
              <span class="flex-none font-mono text-xs text-slate-500">
                {{ it.kind === 'MISS' ? '未完成' : '+' + it.minutes + ' 分' }}
              </span>
            </div>
          </div>
          <div class="mt-2 flex gap-2">
            <button
              data-alt="confirm-button"
              class="cursor-pointer rounded-lg border-0 bg-teal-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              :disabled="chatBusy"
              @click="confirmPending"
            >确认记录</button>
            <button
              data-alt="cancel-button"
              class="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              @click="pending = null"
            >改一下</button>
          </div>
        </div>

        <p
          v-if="chatReply"
          data-alt="chat-reply"
          class="m-0 mb-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >{{ chatReply }}</p>

        <div class="flex gap-2">
          <input
            id="life-chat-input"
            data-alt="chat-input"
            v-model="chatInput"
            type="text"
            placeholder="今天做了什么？"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-teal-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            @keyup.enter="send"
          />
          <button
            data-alt="send-button"
            class="flex-none cursor-pointer rounded-lg border-0 bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-50"
            :disabled="chatBusy || !chatInput"
            @click="send"
          >{{ chatBusy ? '…' : '记一笔' }}</button>
        </div>

        <p v-if="errorMsg" data-alt="board-error" class="m-0 mt-2 text-xs text-rose-600">{{ errorMsg }}</p>
        <button
          data-alt="lock-button"
          class="mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs text-slate-400 underline"
          @click="lock"
        >锁定</button>
      </section>
    </div>
  </div>
</template>
