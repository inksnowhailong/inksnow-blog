<script setup lang="ts">
/**
 * 一年计划面板
 * @description 按《一年计划·操作手册》的标尺呈现：当日 x/10、本周 x/50、
 * 主线 x/3 天、欠债档位与清单进度。数据来自 hlNestServer，凭共享密钥访问。
 */
import { ref, computed, onMounted } from 'vue';

/** 后端地址写成绝对路径，使本地开发与线上走同一条链路 */
const API = 'https://inksnowhl.cn/api';
/** 本地保存密钥的键名 */
const KEY_STORE = 'life-key';

const mounted = ref(false);
const key = ref('');
const unlocked = ref(false);
const loading = ref(false);
const busy = ref(false);
const errorMsg = ref('');

const diagnosis = ref<any>(null);
const ledger = ref<any>(null);
const ideas = ref<any>(null);
const tab = ref<'today' | 'checklist' | 'ideas'>('today');
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

/** 拉取面板所需数据 */
async function loadAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [d, l, i] = await Promise.all([
      api('/life/diagnosis'),
      api('/life/ledger'),
      api('/life/ideas'),
    ]);
    diagnosis.value = d;
    ledger.value = l;
    ideas.value = i;
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

/** 清除密钥并回到入口 */
function lock() {
  unlocked.value = false;
  key.value = '';
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {}
}

/**
 * 打卡：记一笔投入
 * @param nodeId 每日项ID
 * @param minutes 投入分钟数
 */
async function punch(nodeId: string, minutes: number) {
  if (busy.value) return;
  busy.value = true;
  try {
    await api('/life/events', {
      method: 'POST',
      body: JSON.stringify({ nodeId, minutes }),
    });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 声明今天是最小日，当天不计欠债 */
async function declareMinimal() {
  if (busy.value) return;
  busy.value = true;
  try {
    await api('/life/events', {
      method: 'POST',
      body: JSON.stringify({ kind: 'MINIMAL_DAY', note: '状态差，走最小日' }),
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

/** 记一个想法进想法池 */
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
      if (i.kind === 'MINIMAL_DAY') return '声明今天是最小日';
      if (i.kind === 'MISS') return '记一条未完成';
      if (i.kind === 'EXERCISE') return `主动锻炼 ${i.amount} 单位`;
      if (i.kind === 'REPAY') return `还债 ${i.amount} 单位`;
      if (i.kind === 'SPEND') return `花掉 ${i.amount} 元额度`;
      const title = nodeTitleOf(i.nodeId);
      return `${title} +${i.minutes} 分钟`;
    })
    .join('；');
});

/** 按ID找每日项标题 */
function nodeTitleOf(id: string): string {
  const hit = diagnosis.value?.today?.items?.find((i: any) => i.nodeId === id);
  return hit?.title ?? '未归类';
}

/** 今日得分占满分的比例，用于进度条 */
const todayRatio = computed(() => {
  const t = diagnosis.value?.today;
  if (!t || !t.fullScore) return 0;
  return Math.min(1, t.score / t.fullScore);
});

/** 欠债状态对应的配色 */
const debtTone = computed(() => {
  const s = ledger.value?.status;
  if (s === 'ALL_FROZEN') return 'text-rose-600';
  if (s === 'GROWTH_FROZEN') return 'text-amber-600';
  return 'text-slate-600 dark:text-slate-300';
});

function toggleGroup(id: string) {
  openGroups.value = { ...openGroups.value, [id]: !openGroups.value[id] };
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
      <p class="m-0 mb-1 text-base font-medium text-slate-800 dark:text-slate-100">
        一年计划
      </p>
      <p class="m-0 mb-4 text-sm text-slate-500 dark:text-slate-400">
        输入密钥查看
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
      <p v-if="errorMsg" class="mb-0 mt-3 text-sm text-rose-600">{{ errorMsg }}</p>
    </div>

    <!-- 面板主体 -->
    <div v-else-if="mounted && diagnosis" data-alt="life-content" class="grid gap-4">
      <!-- 今日总览 -->
      <section
        data-alt="today-card"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-2">
            <span
              data-alt="today-score"
              class="font-mono text-3xl font-semibold tabular-nums text-teal-700 dark:text-teal-400"
            >{{ diagnosis.today.score }}</span>
            <span class="font-mono text-sm text-slate-400">/ {{ diagnosis.today.fullScore || 10 }} 分</span>
            <span
              v-if="diagnosis.today.minimalDay"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700"
            >最小日</span>
            <span
              v-else-if="!diagnosis.today.workday"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700"
            >周末</span>
          </div>
          <span
            v-if="diagnosis.today.debt > 0"
            data-alt="today-debt"
            class="font-mono text-xs text-amber-600"
          >就此收工欠 {{ diagnosis.today.debt }} 单位</span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            class="h-full rounded-full bg-teal-700 transition-all dark:bg-teal-400"
            :style="{ width: todayRatio * 100 + '%' }"
          ></div>
        </div>

        <!-- 四个打卡格 -->
        <div data-alt="punch-grid" class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="item in diagnosis.today.items"
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
              <span
                v-if="item.reached"
                class="text-xs text-teal-700 dark:text-teal-400"
              >已达标 +{{ item.points }}</span>
              <button
                v-else
                data-alt="punch-button"
                class="cursor-pointer rounded border-0 bg-teal-700 px-2.5 py-1 text-xs text-white disabled:opacity-50"
                :disabled="busy"
                @click="punch(item.nodeId, item.thresholdMinutes - item.minutes)"
              >记满 +{{ item.points }} 分</button>
              <button
                data-alt="punch-half"
                class="cursor-pointer rounded border border-slate-300 bg-transparent px-2 py-1 text-xs text-slate-500 disabled:opacity-50 dark:border-slate-600"
                :disabled="busy"
                @click="punch(item.nodeId, 10)"
              >+10′</button>
            </div>
          </div>
        </div>

        <button
          v-if="diagnosis.today.workday && !diagnosis.today.minimalDay"
          data-alt="minimal-day-button"
          class="mt-3 cursor-pointer border-0 bg-transparent p-0 text-xs text-slate-400 underline disabled:opacity-50"
          :disabled="busy"
          @click="declareMinimal"
        >今天状态差，走最小日（不计欠债）</button>
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
          <div class="mt-1 text-xs" :class="debtTone">{{ ledger?.statusText }}</div>
          <div
            v-if="ledger?.exerciseBank > 0"
            class="mt-0.5 font-mono text-[11px] text-slate-400"
          >运动储备 {{ ledger.exerciseBank }}/{{ ledger.exerciseBankCap }}</div>
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
            { v: 'today', label: '最近' },
            { v: 'checklist', label: `清单 ${diagnosis.checklist.requiredDone}/${diagnosis.checklist.required}` },
            { v: 'ideas', label: `想法 ${(ideas?.cooling?.length ?? 0) + (ideas?.started?.length ?? 0)}` },
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

      <!-- 清单 -->
      <section v-if="tab === 'checklist'" data-alt="checklist-section" class="grid gap-2">
        <div
          v-for="g in diagnosis.checklist.groups"
          :key="g.id"
          data-alt="checklist-group"
          class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            class="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-3 text-left"
            @click="toggleGroup(g.id)"
          >
            <span class="text-[10px] text-slate-400">{{ openGroups[g.id] ? '▼' : '▶' }}</span>
            <span class="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{{ g.title }}</span>
            <span class="flex-none font-mono text-xs tabular-nums text-slate-500">
              {{ g.requiredDone }}/{{ g.required }}
            </span>
          </button>
          <div v-if="!openGroups[g.id] && g.nextUp.length" class="px-3 pb-3 pl-9">
            <span class="text-xs text-slate-400">接下来：</span>
            <span class="text-xs text-slate-600 dark:text-slate-300">{{ g.nextUp[0].title }}</span>
          </div>
          <div v-if="openGroups[g.id]" class="px-3 pb-3 pl-9">
            <p class="m-0 mb-2 text-[11px] text-slate-400">
              判定：能不看资料讲清楚「这是什么 / 什么时候用 / 有什么坑」，且动手验证过一次
            </p>
            <div
              v-for="n in g.nextUp"
              :key="n.id"
              data-alt="checklist-next"
              class="mb-1.5 flex items-center gap-2"
            >
              <button
                data-alt="check-button"
                class="flex-none cursor-pointer rounded border border-slate-300 bg-transparent px-2 py-0.5 text-[11px] text-slate-500 disabled:opacity-50 dark:border-slate-600"
                :disabled="busy"
                @click="checkItem(n.id)"
              >勾掉</button>
              <span class="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">{{ n.title }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 想法池 -->
      <section v-else-if="tab === 'ideas'" data-alt="ideas-section" class="grid gap-2">
        <p class="m-0 text-xs text-slate-400">
          想法记下来零成本、不计分，冷却三天还惦记再动手。只有写笔记才有 +15 元
        </p>
        <div
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
        </div>
        <p
          v-if="!ideas?.cooling?.length && !ideas?.started?.length && !ideas?.sunk?.length && !ideas?.noted?.length"
          class="m-0 rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-600"
        >还没有想法，在下面说一句就能记</p>
      </section>

      <!-- 停滞提醒 -->
      <section
        v-else-if="diagnosis.stalled?.length"
        data-alt="stalled-section"
        class="grid gap-2"
      >
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
      </section>
      <p
        v-else
        class="m-0 rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-600"
      >没有停滞的项目</p>

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
            placeholder="说一句：今天英文读了20分钟 / A1搞定了 / 我这周怎么样"
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
