<script setup lang="ts">
/**
 * 一年计划面板
 * @description 按《一年计划·操作手册》的标尺呈现。
 * 日期可前后切换，用于补记前几天；热力图直接呈现"链条是否连续"，
 * 这是手册里比进度更要紧的东西。
 */
import { ref, computed, onMounted, watch } from 'vue';

/** 后端地址写成绝对路径，使本地开发与线上走同一条链路 */
const API = 'https://inksnowhl.cn/api';
/** 本地保存密钥的键名 */
const KEY_STORE = 'life-key';
/** 热力图回看的周数 */
const HEATMAP_WEEKS = 9;

const mounted = ref(false);
const key = ref('');
const unlocked = ref(false);
const loading = ref(false);
const busy = ref(false);
const errorMsg = ref('');

const diagnosis = ref<any>(null);
const ledger = ref<any>(null);
const ideas = ref<any>(null);
const heat = ref<any[]>([]);
/** 当前操作的日期，切到往日即为补记 */
const activeDate = ref('');
const activeDay = ref<any>(null);
const tab = ref<'checklist' | 'ideas' | 'stalled'>('checklist');
const openGroups = ref<Record<string, boolean>>({});

const chatInput = ref('');
const pending = ref<any>(null);
const chatReply = ref('');

/** 带密钥调用后端 */
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
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message || '请求失败 ' + res.status);
  }
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

/** 取某日期是星期几 */
function weekdayOf(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay();
}

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 拉取面板所需数据 */
async function loadAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const to = today();
    const from = shiftDays(to, -(HEATMAP_WEEKS * 7 - 1));
    const [d, l, i, h] = await Promise.all([
      api('/life/diagnosis'),
      api('/life/ledger'),
      api('/life/ideas'),
      api(`/life/settlement/range?from=${from}&to=${to}`),
    ]);
    diagnosis.value = d;
    ledger.value = l;
    ideas.value = i;
    heat.value = h;
    if (!activeDate.value) activeDate.value = to;
    await loadActiveDay();
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

/** 取当前选中日期的结算；选中今天时直接复用诊断里的结果 */
async function loadActiveDay() {
  if (activeDate.value === today() && diagnosis.value) {
    activeDay.value = diagnosis.value.today;
    return;
  }
  activeDay.value = await api(
    `/life/settlement/daily?date=${activeDate.value}`,
  );
}

/** 切换操作日期，不允许切到未来 */
async function moveDate(delta: number) {
  const next = shiftDays(activeDate.value, delta);
  if (next > today()) return;
  activeDate.value = next;
  try {
    await loadActiveDay();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

/** 回到今天 */
async function backToToday() {
  activeDate.value = today();
  await loadActiveDay();
}

/** 清除密钥并回到入口 */
function lock() {
  unlocked.value = false;
  key.value = '';
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {}
}

/**
 * 打卡：给选中日期记一笔投入
 * @param nodeId 每日项ID
 * @param minutes 投入分钟数
 */
async function punch(nodeId: string, minutes: number) {
  if (busy.value || minutes <= 0) return;
  busy.value = true;
  try {
    await api('/life/events', {
      method: 'POST',
      body: JSON.stringify({ nodeId, minutes, occurredOn: activeDate.value }),
    });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 声明选中日期为最小日 */
async function declareMinimal() {
  if (busy.value) return;
  busy.value = true;
  try {
    await api('/life/events', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'MINIMAL_DAY',
        occurredOn: activeDate.value,
        note: '状态差，走最小日',
      }),
    });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 勾掉一个清单项 */
async function checkItem(id: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    await api(`/life/plan/${id}/check`, { method: 'POST' });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 直接记一个想法，不经模型 */
async function captureIdea(content: string) {
  if (busy.value || !content.trim()) return;
  busy.value = true;
  try {
    await api('/life/ideas', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    chatInput.value = '';
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 把一句话交给后端解析，只拿草稿不落库 */
async function send() {
  const text = chatInput.value.trim();
  if (!text || busy.value) return;
  busy.value = true;
  chatReply.value = '';
  pending.value = null;
  try {
    const res = await api('/life/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
    if (res.kind === 'answer') chatReply.value = res.text;
    else pending.value = res;
    chatInput.value = '';
  } catch (e: any) {
    errorMsg.value =
      e.message === '密钥无效' ? e.message : 'AI 暂时不可用：' + e.message;
  } finally {
    busy.value = false;
  }
}

/** 确认后才真正写入 */
async function confirmPending() {
  if (!pending.value || busy.value) return;
  busy.value = true;
  try {
    const p = pending.value;
    if (p.kind === 'record') {
      for (const item of p.items) {
        await api('/life/events', {
          method: 'POST',
          body: JSON.stringify(item),
        });
      }
    } else if (p.kind === 'check') {
      await api(`/life/plan/${p.nodeId}/check`, { method: 'POST' });
    } else if (p.kind === 'idea') {
      await api('/life/ideas', {
        method: 'POST',
        body: JSON.stringify({ content: p.content }),
      });
    }
    pending.value = null;
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 待确认草稿的一句话描述 */
const pendingText = computed(() => {
  const p = pending.value;
  if (!p) return '';
  if (p.kind === 'check') return `勾掉「${p.title}」`;
  if (p.kind === 'idea') return `记下想法：${p.content}`;
  if (p.kind === 'note') return `写下研究笔记：${p.note.question}`;
  return p.items
    .map((i: any) => {
      if (i.kind === 'MINIMAL_DAY') return '声明最小日';
      if (i.kind === 'MISS') return '记一条未完成';
      if (i.kind === 'EXERCISE') return `主动锻炼 ${i.amount} 单位`;
      if (i.kind === 'REPAY') return `还债 ${i.amount} 单位`;
      if (i.kind === 'SPEND') return `花掉 ${i.amount} 元`;
      return `${nodeTitleOf(i.nodeId)} +${i.minutes} 分钟（${i.occurredOn}）`;
    })
    .join('；');
});

/** 按ID找每日项标题 */
function nodeTitleOf(id: string): string {
  const hit = diagnosis.value?.today?.items?.find((i: any) => i.nodeId === id);
  return hit?.title ?? '未归类';
}

/** 选中日期的得分占满分比例 */
const dayRatio = computed(() => {
  const d = activeDay.value;
  if (!d || !d.fullScore) return 0;
  return Math.min(1, d.score / d.fullScore);
});

/** 选中日期是否为今天 */
const isToday = computed(() => activeDate.value === today());

/** 选中日期的显示文本 */
const dateLabel = computed(() => {
  if (!activeDate.value) return '';
  const [, m, d] = activeDate.value.split('-');
  return `${Number(m)}/${Number(d)} 周${WEEK_LABELS[weekdayOf(activeDate.value)]}`;
});

/**
 * 热力图的列，每列一周，从周一排到周日
 * @description 补齐首尾使每列都是完整的一周，空位用 null 占位
 */
const heatColumns = computed(() => {
  if (!heat.value.length) return [];
  const byDate = new Map(heat.value.map((d: any) => [d.date, d]));
  const first = heat.value[0].date;
  // 回退到该周周一，使每一列都从周一开始
  const startOffset = (weekdayOf(first) + 6) % 7;
  const start = shiftDays(first, -startOffset);
  const columns: any[][] = [];
  const last = heat.value[heat.value.length - 1].date;

  let cursor = start;
  while (cursor <= last) {
    const week: any[] = [];
    for (let i = 0; i < 7; i++) {
      const date = shiftDays(cursor, i);
      week.push(date > last || date < first ? null : (byDate.get(date) ?? null));
    }
    columns.push(week);
    cursor = shiftDays(cursor, 7);
  }
  return columns;
});

/**
 * 某格的配色
 * @description 分四档深浅；周末无义务，做了才着色，没做显示为空底
 */
function heatClass(cell: any): string {
  if (!cell) return 'bg-transparent';
  if (cell.score <= 0) {
    return cell.workday
      ? 'bg-slate-100 dark:bg-slate-700'
      : 'bg-transparent border border-dashed border-slate-200 dark:border-slate-700';
  }
  const base = cell.fullScore || 10;
  const ratio = cell.score / base;
  if (ratio >= 1) return 'bg-teal-700 dark:bg-teal-400';
  if (ratio >= 0.6) return 'bg-teal-600/75 dark:bg-teal-400/75';
  if (ratio >= 0.3) return 'bg-teal-600/50 dark:bg-teal-400/50';
  return 'bg-teal-600/25 dark:bg-teal-400/30';
}

/** 鼠标悬停时的说明文本 */
function heatTitle(cell: any): string {
  if (!cell) return '';
  const tag = cell.minimalDay ? '（最小日）' : cell.workday ? '' : '（周末）';
  return `${cell.date} ${cell.score}/${cell.fullScore || 0} 分${tag}`;
}

/** 近九周的连续与断链统计 */
const streak = computed(() => {
  const days = heat.value.filter((d: any) => d.workday);
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].score > 0) current++;
    else break;
  }
  const active = days.filter((d: any) => d.score > 0).length;
  return { current, active, total: days.length };
});

/** 各组接下来该做的一项，平铺到顶层免去逐组展开 */
const nextUps = computed(() => {
  const groups = diagnosis.value?.checklist?.groups ?? [];
  return groups
    .filter((g: any) => g.nextUp.length)
    .map((g: any) => ({ group: g.title, ...g.nextUp[0] }));
});

watch(unlocked, (v) => {
  if (v && !activeDate.value) activeDate.value = today();
});

onMounted(() => {
  mounted.value = true;
  activeDate.value = today();
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
      <p class="m-0 mb-1 text-base font-medium text-slate-800 dark:text-slate-100">
        一年计划
      </p>
      <p class="m-0 mb-4 text-sm text-slate-500 dark:text-slate-400">输入密钥查看</p>
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
      >{{ loading ? '加载中…' : '进入' }}</button>
      <p v-if="errorMsg" class="mb-0 mt-3 text-sm text-rose-600">{{ errorMsg }}</p>
    </div>

    <!-- 面板主体 -->
    <div v-else-if="mounted && diagnosis && activeDay" data-alt="life-content" class="grid gap-4">
      <!-- 日期导航 -->
      <div data-alt="date-nav" class="flex items-center justify-between gap-2">
        <button
          data-alt="prev-day"
          class="cursor-pointer rounded-lg border border-slate-300 bg-transparent px-3 py-1 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
          @click="moveDate(-1)"
        >‹</button>
        <div class="flex items-baseline gap-2">
          <span class="font-mono text-sm font-medium text-slate-800 dark:text-slate-100">{{ dateLabel }}</span>
          <span v-if="!isToday" class="text-[11px] text-amber-600">补记中</span>
        </div>
        <div class="flex gap-1">
          <button
            data-alt="next-day"
            class="cursor-pointer rounded-lg border border-slate-300 bg-transparent px-3 py-1 text-sm text-slate-600 disabled:opacity-30 dark:border-slate-600 dark:text-slate-300"
            :disabled="isToday"
            @click="moveDate(1)"
          >›</button>
          <button
            v-if="!isToday"
            data-alt="back-today"
            class="cursor-pointer rounded-lg border border-slate-300 bg-transparent px-2 py-1 text-xs text-slate-500 dark:border-slate-600"
            @click="backToToday"
          >今天</button>
        </div>
      </div>

      <!-- 当日打卡 -->
      <section
        data-alt="day-card"
        class="rounded-xl border bg-white p-4 dark:bg-slate-800"
        :class="isToday ? 'border-slate-200 dark:border-slate-700' : 'border-amber-300 dark:border-amber-700'"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-2">
            <span
              data-alt="day-score"
              class="font-mono text-3xl font-semibold tabular-nums text-teal-700 dark:text-teal-400"
            >{{ activeDay.score }}</span>
            <span class="font-mono text-sm text-slate-400">/ {{ activeDay.fullScore || 10 }} 分</span>
            <span
              v-if="activeDay.minimalDay"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700"
            >最小日</span>
            <span
              v-else-if="!activeDay.workday"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700"
            >周末不排</span>
          </div>
          <span v-if="activeDay.debt > 0" class="font-mono text-xs text-amber-600">
            欠 {{ activeDay.debt }} 单位
          </span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            class="h-full rounded-full bg-teal-700 transition-all dark:bg-teal-400"
            :style="{ width: dayRatio * 100 + '%' }"
          ></div>
        </div>

        <div data-alt="punch-grid" class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="item in activeDay.items"
            :key="item.nodeId"
            data-alt="punch-item"
            class="rounded-lg border p-3"
            :class="
              item.reached
                ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-900/20'
                : 'border-slate-200 dark:border-slate-600'
            "
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {{ item.title }}
                <span v-if="item.isMainline" class="text-[10px] text-teal-700 dark:text-teal-400">主线</span>
              </span>
              <span class="flex-none font-mono text-xs tabular-nums text-slate-500">
                {{ item.minutes }}/{{ item.thresholdMinutes }}′
              </span>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <span v-if="item.reached" class="text-xs text-teal-700 dark:text-teal-400">
                已达标 +{{ item.points }}
              </span>
              <button
                v-else
                data-alt="punch-full"
                class="cursor-pointer rounded border-0 bg-teal-700 px-2.5 py-1 text-xs text-white disabled:opacity-50"
                :disabled="busy"
                @click="punch(item.nodeId, item.thresholdMinutes - item.minutes)"
              >记满 +{{ item.points }}</button>
              <button
                data-alt="punch-ten"
                class="cursor-pointer rounded border border-slate-300 bg-transparent px-2 py-1 text-xs text-slate-500 disabled:opacity-50 dark:border-slate-600"
                :disabled="busy"
                @click="punch(item.nodeId, 10)"
              >+10′</button>
            </div>
          </div>
        </div>

        <button
          v-if="activeDay.workday && !activeDay.minimalDay"
          data-alt="minimal-day-button"
          class="mt-3 cursor-pointer border-0 bg-transparent p-0 text-xs text-slate-400 underline disabled:opacity-50"
          :disabled="busy"
          @click="declareMinimal"
        >这天状态差，走最小日（不计欠债）</button>
      </section>

      <!-- 连续性热力图 -->
      <section
        data-alt="heatmap"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <span class="text-[11px] uppercase tracking-wider text-slate-400">近九周</span>
          <span class="font-mono text-xs text-slate-500">
            连续 {{ streak.current }} 天 · 工作日覆盖 {{ streak.active }}/{{ streak.total }}
          </span>
        </div>
        <div class="flex gap-1 overflow-x-auto pb-1">
          <div class="mr-0.5 grid flex-none gap-1 pt-0" style="grid-template-rows: repeat(7, 1fr)">
            <span
              v-for="(w, i) in ['一', '', '三', '', '五', '', '日']"
              :key="i"
              class="flex h-3 items-center text-[9px] leading-none text-slate-400"
            >{{ w }}</span>
          </div>
          <div
            v-for="(col, ci) in heatColumns"
            :key="ci"
            data-alt="heat-column"
            class="grid flex-none gap-1"
            style="grid-template-rows: repeat(7, 1fr)"
          >
            <button
              v-for="(cell, ri) in col"
              :key="ri"
              data-alt="heat-cell"
              class="h-3 w-3 rounded-sm border-0 p-0"
              :class="[heatClass(cell), cell ? 'cursor-pointer' : 'cursor-default']"
              :title="heatTitle(cell)"
              :disabled="!cell"
              @click="cell && ((activeDate = cell.date), loadActiveDay())"
            ></button>
          </div>
        </div>
        <p class="m-0 mt-2 text-[11px] leading-relaxed text-slate-400">
          颜色越深当天得分越高，虚线格是周末（不排计划）。点任意一格可跳到那天补记。
        </p>
      </section>

      <!-- 本周与账本 -->
      <section data-alt="week-ledger" class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-[11px] uppercase tracking-wider text-slate-400">本周</div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="font-mono text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {{ diagnosis.week.score }}
            </span>
            <span class="font-mono text-xs text-slate-400">/ 50 分</span>
          </div>
          <div
            class="mt-1 text-xs"
            :class="
              diagnosis.week.mainlineDays >= diagnosis.week.mainlineRequired
                ? 'text-emerald-600'
                : 'text-amber-600'
            "
          >
            主线 {{ diagnosis.week.mainlineDays }}/{{ diagnosis.week.mainlineRequired }} 天
            <span v-if="diagnosis.week.mainlineDebt > 0">· 欠 {{ diagnosis.week.mainlineDebt }} 单位</span>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-[11px] uppercase tracking-wider text-slate-400">额度</div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="font-mono text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {{ ledger?.balance ?? 0 }}
            </span>
            <span class="font-mono text-xs text-slate-400">元可用</span>
          </div>
          <div
            class="mt-1 text-xs"
            :class="
              ledger?.status === 'ALL_FROZEN'
                ? 'text-rose-600'
                : ledger?.status === 'GROWTH_FROZEN'
                  ? 'text-amber-600'
                  : 'text-slate-500'
            "
          >{{ ledger?.statusText }}</div>
          <div v-if="ledger?.exerciseBank > 0" class="mt-0.5 font-mono text-[11px] text-slate-400">
            运动储备 {{ ledger.exerciseBank }}/{{ ledger.exerciseBankCap }}
          </div>
        </div>
      </section>

      <!-- 接下来该做的：平铺，免去逐组展开 -->
      <section
        v-if="nextUps.length"
        data-alt="next-up"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-2 flex items-baseline justify-between">
          <span class="text-[11px] uppercase tracking-wider text-slate-400">接下来该做的</span>
          <span class="font-mono text-xs text-slate-500">
            必修 {{ diagnosis.checklist.requiredDone }}/{{ diagnosis.checklist.required }}
          </span>
        </div>
        <div class="grid gap-1.5">
          <div
            v-for="n in nextUps"
            :key="n.id"
            data-alt="next-item"
            class="flex items-center gap-2"
          >
            <button
              data-alt="quick-check"
              class="flex-none cursor-pointer rounded border border-slate-300 bg-transparent px-2 py-0.5 text-[11px] text-slate-500 disabled:opacity-50 dark:border-slate-600"
              :disabled="busy"
              @click="checkItem(n.id)"
            >勾掉</button>
            <span class="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{{ n.title }}</span>
            <span class="flex-none text-[10px] text-slate-400">{{ n.group.split(' ')[0] }}</span>
          </div>
        </div>
      </section>

      <!-- 判断 -->
      <section
        v-if="diagnosis.verdicts?.length"
        data-alt="verdicts"
        class="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
      >
        <p
          v-for="(v, i) in diagnosis.verdicts"
          :key="i"
          class="m-0 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >{{ v }}</p>
      </section>

      <!-- 分栏 -->
      <div data-alt="tabs" class="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
        <button
          v-for="t in [
            { v: 'checklist', label: '全部清单' },
            { v: 'ideas', label: `想法 ${(ideas?.cooling?.length ?? 0) + (ideas?.started?.length ?? 0)}` },
            { v: 'stalled', label: `停滞 ${diagnosis.stalled?.length ?? 0}` },
          ]"
          :key="t.v"
          data-alt="tab-button"
          class="flex-1 cursor-pointer rounded-md border-0 px-3 py-1.5 text-xs"
          :class="
            tab === t.v
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'bg-transparent text-slate-500 dark:text-slate-300'
          "
          @click="tab = t.v as any"
        >{{ t.label }}</button>
      </div>

      <!-- 全部清单：默认展开进度，点组名看未完成项 -->
      <section v-if="tab === 'checklist'" data-alt="checklist-section" class="grid gap-2">
        <div
          v-for="g in diagnosis.checklist.groups"
          :key="g.id"
          data-alt="checklist-group"
          class="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            class="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
            @click="toggleGroup(g.id)"
          >
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ g.title }}</span>
            <span class="flex-none font-mono text-xs tabular-nums text-slate-500">{{ g.requiredDone }}/{{ g.required }}</span>
            <span class="flex-none text-[10px] text-slate-400">{{ openGroups[g.id] ? '收起' : '展开' }}</span>
          </button>
          <div class="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              class="h-full rounded-full bg-teal-700 dark:bg-teal-400"
              :style="{ width: (g.required ? (g.requiredDone / g.required) * 100 : 0) + '%' }"
            ></div>
          </div>
          <div v-if="openGroups[g.id]" class="mt-2 grid gap-1.5">
            <div v-for="n in g.nextUp" :key="n.id" class="flex items-center gap-2">
              <button
                class="flex-none cursor-pointer rounded border border-slate-300 bg-transparent px-2 py-0.5 text-[11px] text-slate-500 disabled:opacity-50 dark:border-slate-600"
                :disabled="busy"
                @click="checkItem(n.id)"
              >勾掉</button>
              <span class="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">{{ n.title }}</span>
            </div>
            <p v-if="!g.nextUp.length" class="m-0 text-xs text-slate-400">这组已经做完了</p>
          </div>
        </div>
      </section>

      <!-- 想法池 -->
      <section v-else-if="tab === 'ideas'" data-alt="ideas-section" class="grid gap-2">
        <p class="m-0 text-xs text-slate-400">
          想法记下来零成本、不计分，冷却三天还惦记再动手。只有写笔记才有 +15 元
        </p>
        <template
          v-for="group in [
            { label: '冷却中', list: ideas?.cooling ?? [] },
            { label: '已动手', list: ideas?.started ?? [] },
            { label: '已沉底', list: ideas?.sunk ?? [] },
            { label: '已写笔记', list: ideas?.noted ?? [] },
          ]"
          :key="group.label"
        >
          <div v-if="group.list.length" data-alt="idea-group">
            <div class="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
              {{ group.label }} · {{ group.list.length }}
            </div>
            <div
              v-for="idea in group.list"
              :key="idea.id"
              data-alt="idea-row"
              class="mb-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {{ idea.content }}
              <span class="ml-1 font-mono text-[11px] text-slate-400">
                {{ idea.status === 'PENDING' ? '冷却至 ' + idea.coolUntil : idea.createdOn }}
              </span>
            </div>
          </div>
        </template>
        <p
          v-if="!ideas?.cooling?.length && !ideas?.started?.length && !ideas?.sunk?.length && !ideas?.noted?.length"
          class="m-0 rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-600"
        >还没有想法，在下面说一句点「记想法」</p>
      </section>

      <!-- 停滞 -->
      <section v-else data-alt="stalled-section" class="grid gap-2">
        <div
          v-for="s in diagnosis.stalled"
          :key="s.id"
          class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-amber-600"></span>
          <div>
            <div class="text-[11px] text-slate-400">长期未推进</div>
            <div class="text-sm text-slate-600 dark:text-slate-300">
              「{{ s.title }}」已 {{ s.idleDays }} 天未达标
            </div>
          </div>
        </div>
        <p
          v-if="!diagnosis.stalled?.length"
          class="m-0 rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-600"
        >没有停滞的项目</p>
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
          <div class="mb-2 text-xs text-teal-700 dark:text-teal-400">确认这一条吗</div>
          <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {{ pendingText }}
          </div>
          <div class="mt-2 flex gap-2">
            <button
              data-alt="confirm-button"
              class="cursor-pointer rounded-lg border-0 bg-teal-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              :disabled="busy"
              @click="confirmPending"
            >确认</button>
            <button
              data-alt="cancel-button"
              class="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              @click="pending = null"
            >取消</button>
          </div>
        </div>

        <p
          v-if="chatReply"
          data-alt="chat-reply"
          class="m-0 mb-2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >{{ chatReply }}</p>

        <div class="flex gap-2">
          <input
            id="life-chat-input"
            data-alt="chat-input"
            v-model="chatInput"
            type="text"
            placeholder="说一句：昨天英文读了20分钟 / A1搞定了 / 我这周怎么样"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            @keyup.enter="send"
          />
          <button
            data-alt="send-button"
            class="flex-none cursor-pointer rounded-lg border-0 bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="busy || !chatInput"
            @click="send"
          >{{ busy ? '…' : '说' }}</button>
          <button
            data-alt="idea-button"
            class="flex-none cursor-pointer rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-500 disabled:opacity-50 dark:border-slate-600"
            :disabled="busy || !chatInput"
            title="不经 AI，直接记进想法池"
            @click="captureIdea(chatInput)"
          >记想法</button>
        </div>

        <p v-if="errorMsg" class="m-0 mt-2 text-xs text-rose-600">{{ errorMsg }}</p>
        <button
          data-alt="lock-button"
          class="mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs text-slate-400 underline"
          @click="lock"
        >锁定</button>
      </section>
    </div>
  </div>
</template>
