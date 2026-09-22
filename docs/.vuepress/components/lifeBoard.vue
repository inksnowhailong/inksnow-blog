<script setup lang="ts">
/**
 * 一年计划面板
 * @description 按《一年计划·操作手册》的标尺呈现，分工是：
 * 打卡区管每天重复的四项，路线图管一次性的清单进度，两者不重叠。
 * 单位只认「分」这一种主货币，元与体能债都是它的换算面。
 */
import { ref, computed, onMounted, watch } from 'vue';
import LifePlanTree from './lifePlanTree.vue';
import LifeNodeModal from './lifeNodeModal.vue';
import LifeIdeaModal from './lifeIdeaModal.vue';
import LifeChat from './lifeChat.vue';
import LifeIcon from './lifeIcon.vue';
import LifeAsk from './lifeAsk.vue';
import LifeAskBar from './lifeAskBar.vue';
import {
  describeDraft,
  applyDraft,
  isDestructive,
  askStream,
} from './useLifeDraft';

/** 后端地址写成绝对路径，使本地开发与线上走同一条链路 */
const API = 'https://inksnowhl.cn/api';
const KEY_STORE = 'life-key';
/** 热力图回看的周数 */
const HEATMAP_WEEKS = 9;
/** 打卡的快捷增量，分钟 */
const QUICK_MINUTES = [15, 30];

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
const plan = ref<any[]>([]);

/** 当前操作的日期，切到往日即为补记 */
const activeDate = ref('');
const activeDay = ref<any>(null);

/** 弹窗里正在看的节点 */
const picked = ref<any>(null);
const pickedPath = ref('');
const showIdeas = ref(false);

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
    const [d, l, i, h, p] = await Promise.all([
      api('/life/diagnosis'),
      api('/life/ledger'),
      api('/life/ideas'),
      api(`/life/settlement/range?from=${from}&to=${to}`),
      api('/life/plan'),
    ]);
    diagnosis.value = d;
    ledger.value = l;
    ideas.value = i;
    heat.value = h;
    plan.value = p;
    if (!activeDate.value) activeDate.value = to;
    if (!heatMonth.value) heatMonth.value = to.slice(0, 7);
    await Promise.all([loadActiveDay(), loadMonth()]);
    // 弹窗开着时同步刷新里面那份，否则改完还显示旧内容
    if (picked.value) picked.value = findNode(picked.value.id);
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
  activeDay.value = await api(`/life/settlement/daily?date=${activeDate.value}`);
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

/** 一键补到刚好达标，省得自己算还差几分钟 */
function punchToThreshold(item: any) {
  punch(item.nodeId, Math.max(0, item.thresholdMinutes - item.minutes));
}

/**
 * 记一笔账本动作
 * @param kind REPAY 还债 / EXERCISE 存运动储备
 * @param amount 单位数
 */
async function ledgerAction(kind: 'REPAY' | 'EXERCISE', amount: number) {
  if (busy.value || amount <= 0) return;
  busy.value = true;
  try {
    await api('/life/events', {
      method: 'POST',
      body: JSON.stringify({ kind, amount, occurredOn: today() }),
    });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/**
 * 打卡区的标题
 * @description 原先写死「每日四项」，但排期上线后每天排几项是会变的，
 * 写死的数字迟早和列表对不上。没排到项的日子直接说清楚，
 * 免得看见一个空列表以为是加载失败
 */
const dailyTitle = computed(() => {
  const n = activeDay.value?.items?.length ?? 0;
  if (!n) return '今天没排计划';
  const cn = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return `每日${cn[n] ?? n}项`;
});

/** 当日进度占免债线的比例，用于画进度条 */
const debtFreeProgress = computed(() => {
  const d = activeDay.value;
  if (!d?.debtFreeScore) return 0;
  return Math.min(100, (d.score / d.debtFreeScore) * 100);
});

/**
 * 体能债的一句说明
 * @description 字段来自后端下发的规则。后端升级与页面刷新之间存在时间差，
 * 那一小段时间里字段会缺，必须兜底，否则界面上会出现 undefined
 */
const debtUnitText = computed(() => {
  const r = diagnosis.value?.rules;
  if (!r?.debtUnit) return '';
  return `目标${r.fitnessGoal ?? ''} · 1 个 ≈ ${r.debtUnit}`;
});

/** 当月真正动过的天数 */
const monthActiveDays = computed(
  () => monthHeat.value.filter((d: any) => d.score > 0).length,
);

/** 超出阈值的投入，只记录不加分 */
const overMinutes = computed(() => {
  const items = activeDay.value?.items ?? [];
  return items.reduce(
    (sum: number, i: any) => sum + Math.max(0, i.minutes - i.thresholdMinutes),
    0,
  );
});

/**
 * 就地问 AI 的浮层状态
 * @description 全页共用一个浮层：谁唤起它，谁就把自己的上下文塞进来。
 * 这样"AI 能操作的地方"等于"哪里挂了这个组件"，不必到处铺输入框
 */
const ask = ref<{
  anchor: { x: number; y: number } | null;
  title: string;
  context: string;
  placeholder: string;
  directLabel: string;
  /** 点「直接记下」时执行什么 */
  direct: (() => Promise<void>) | null;
  /** 交给模型前，在用户原话前面补的一句背景 */
  prefix: string;
}>({
  anchor: null,
  title: '',
  context: '',
  placeholder: '',
  directLabel: '',
  direct: null,
  prefix: '',
});
const askReply = ref('');
const askPending = ref<any>(null);

/** 从点击事件里取锚点坐标 */
function anchorOf(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.bottom };
}

function closeAsk() {
  ask.value = { ...ask.value, anchor: null, direct: null };
  askReply.value = '';
  askPending.value = null;
}

/**
 * 浮层这一次打开期间的问答
 * @description 浮层上只显示最后一条回答，但追问要接得上，
 * 所以这条历史照存不显示。换个地方点开就清空——
 * 上一个话题的上下文带到下一个话题上只会帮倒忙
 */
const askLog = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

// 浮层一开一关都算换了话题。盯 anchor 而不是在每个入口各清一次，
// 是因为打开浮层的地方有五处，靠记得逐个加迟早会漏一个
watch(
  () => ask.value.anchor,
  () => {
    askLog.value = [];
  },
);

/**
 * 把浮层里的话交给模型
 * @description 前缀补一句背景说清这是在问哪件事，历史让追问接得上。
 * 拿回来只出草稿不落库，与对话栏同一套规矩：模型永远不直接改数据。
 */
async function askSend(text: string) {
  if (busy.value) return;
  busy.value = true;
  askReply.value = '';
  askPending.value = null;

  // 第一句要带前缀点明话题，后续追问已在上下文里，再带就啰嗦了
  const sent = askLog.value.length ? text : ask.value.prefix + text;
  const history = askLog.value.slice(-12);

  try {
    const res = await askStream(
      API,
      key.value,
      sent,
      // 浮层空间小，只把正在吐的字显示出来，出草稿时会被替换掉
      (delta) => {
        askReply.value += delta;
      },
      history,
    );
    askLog.value = [...askLog.value, { role: 'user', content: sent }];
    if (res.kind === 'answer') {
      askReply.value = res.text || askReply.value;
      askLog.value = [
        ...askLog.value,
        { role: 'assistant', content: askReply.value },
      ];
    } else {
      askReply.value = '';
      askPending.value = res;
      // 草稿本身也是一轮回应，记下来追问"那改成 40 分钟呢"才接得住
      askLog.value = [
        ...askLog.value,
        { role: 'assistant', content: describeDraft(res, nodeTitleOf) },
      ];
    }
  } catch (e: any) {
    askReply.value = 'AI 暂时不可用：' + e.message;
  } finally {
    busy.value = false;
  }
}

/** 浮层里点头之后才写入 */
async function askConfirm() {
  const p = askPending.value;
  if (!p || busy.value) return;
  busy.value = true;
  try {
    await applyDraft(p, api);
    askPending.value = null;
    askReply.value = '已记下';
    await loadAll();
  } catch (e: any) {
    askReply.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 草稿的一句话描述，交给浮层展示 */
const askPendingText = computed(() =>
  askPending.value ? describeDraft(askPending.value, nodeTitleOf) : '',
);

/** 点浮层里的「直接记下」 */
async function askDirect() {
  const fn = ask.value.direct;
  if (!fn || busy.value) return;
  await fn();
  closeAsk();
}

/** 点某一个体能债方块 */
function openDebtAsk(e: MouseEvent, index: number) {
  ask.value = {
    anchor: anchorOf(e),
    title: `还掉第 ${index + 1} 个体能债`,
    context: debtUnitText.value,
    placeholder: '我刚做了 10 个俯卧撑',
    directLabel: '直接记为已还 1 个',
    direct: () => ledgerAction('REPAY', 1),
    prefix: '关于还体能债：',
  };
  askReply.value = '';
  askPending.value = null;
}

/** 点运动储备的空位，存一个 */
function openBankAsk(e: MouseEvent) {
  ask.value = {
    anchor: anchorOf(e),
    title: '存 1 个运动储备',
    context: '提前锻炼存起来，以后产生欠债自动抵扣',
    placeholder: '刚做了 20 个深蹲',
    directLabel: '直接记为存 1 个',
    direct: () => ledgerAction('EXERCISE', 1),
    prefix: '关于主动锻炼存运动储备：',
  };
  askReply.value = '';
  askPending.value = null;
}

/** 清掉某项某天的记录，不经模型 */
async function clearDay(nodeId: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    await api(`/life/plan/${nodeId}/records?date=${activeDate.value}`, {
      method: 'DELETE',
    });
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/**
 * 点每日项，用说话的方式补记
 * @description 前缀只说是哪一项哪一天，不报已投入多少分钟——
 * 实测把分钟数写进上下文会把模型带偏，它会照着那个数再记一笔
 */
function openDailyAsk(e: MouseEvent, item: any) {
  ask.value = {
    anchor: anchorOf(e),
    title: item.title,
    context: `${item.minutes}/${item.thresholdMinutes} 分钟 · 达标得 ${item.points} 分`,
    placeholder: '刚又做了半小时',
    directLabel: '',
    direct: null,
    prefix: `关于「${item.title}」这一项，日期 ${activeDate.value}：`,
  };
  askReply.value = '';
  askPending.value = null;
}

/** 在计划树里按ID找节点，弹窗刷新后要用 */
function findNode(id: string): any {
  const walk = (nodes: any[]): any => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = walk(n.children ?? []);
      if (hit) return hit;
    }
    return null;
  };
  return walk(plan.value);
}

/** 按ID找每日项标题，交给对话栏把草稿说成人话 */
function nodeTitleOf(id: string): string {
  const hit = diagnosis.value?.today?.items?.find((i: any) => i.nodeId === id);
  return hit?.title ?? findNode(id)?.title ?? '未归类';
}

function openNode(node: any, path: string) {
  picked.value = node;
  pickedPath.value = path;
}

const isToday = computed(() => activeDate.value === today());

/**
 * 与昨天的差额
 * @description 《人生十二法则》规则四的落地：唯一该比的对象是昨天的自己。
 * 昨天没记录时返回 null，不拿 0 分当基准去制造虚假的进步
 */
const vsYesterday = computed(() => {
  if (!activeDay.value) return null;
  const prev = heat.value.find(
    (d: any) => d.date === shiftDays(activeDate.value, -1),
  );
  if (!prev) return null;
  return activeDay.value.score - prev.score;
});

const dateLabel = computed(() => {
  if (!activeDate.value) return '';
  const [, m, d] = activeDate.value.split('-');
  return `${Number(m)}/${Number(d)} 周${WEEK_LABELS[weekdayOf(activeDate.value)]}`;
});

/** 日历表头，周一起排 */
const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

/** 正在查看的月份 YYYY-MM */
const heatMonth = ref('');
/** 该月的逐日结算 */
const monthHeat = ref<any[]>([]);

/** 取某月的逐日结算，切月份时调用 */
async function loadMonth() {
  const [y, m] = heatMonth.value.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  monthHeat.value = await api(
    `/life/settlement/range?from=${heatMonth.value}-01&to=${heatMonth.value}-${days}`,
  );
}

/** 切月份，不允许翻到未来 */
async function moveMonth(delta: number) {
  const [y, m] = heatMonth.value.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const next = d.toISOString().slice(0, 7);
  if (next > today().slice(0, 7)) return;
  heatMonth.value = next;
  try {
    await loadMonth();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

/** 已经看到最新的一个月 */
const atLatestMonth = computed(
  () => heatMonth.value >= today().slice(0, 7),
);

const monthLabel = computed(() => {
  if (!heatMonth.value) return '';
  const [y, m] = heatMonth.value.split('-').map(Number);
  // 跨年时才带上年份，平时只写月份
  return y === Number(today().slice(0, 4)) ? `${m} 月` : `${y} 年 ${m} 月`;
});

/**
 * 当月日历的格子
 * @description 周一起排，月初补空位使星期列对齐。
 * 三态：有记录的日子、该日无记录、只是为对齐补的空位
 */
const monthCells = computed(() => {
  if (!heatMonth.value) return [];
  const [y, m] = heatMonth.value.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (weekdayOf(`${heatMonth.value}-01`) + 6) % 7;
  const byDate = new Map(monthHeat.value.map((d: any) => [d.date, d]));

  const cells: any[] = Array(lead).fill(undefined);
  for (let d = 1; d <= days; d++) {
    const date = `${heatMonth.value}-${String(d).padStart(2, '0')}`;
    cells.push(byDate.get(date) ?? null);
  }
  return cells;
});

/**
 * 某格的配色
 * @description 分四档深浅；周末无义务，做了才着色，没做显示为空底
 */
function heatClass(cell: any): string {
  // undefined 表示该月没有这一天，整格不画；null 表示这天不在统计范围内
  if (cell === undefined) return 'invisible';
  if (!cell) return 'bg-transparent';
  // 看的是「这天排没排计划」而不是「是不是周末」：出差请假同样是没排
  if (cell.score <= 0) {
    return cell.planned
      ? 'bg-slate-100 dark:bg-slate-700'
      : 'bg-transparent border border-dashed border-slate-200 dark:border-slate-700';
  }
  // 按达成率着色而非绝对分：每天排几项会变，绝对分之间不再可比
  const ratio = cell.fullScore > 0 ? cell.score / cell.fullScore : 0;
  if (ratio >= 1) return 'bg-brand-500 dark:bg-brand-300';
  if (ratio >= 0.6) return 'bg-brand-500/75 dark:bg-brand-300/75';
  if (ratio >= 0.3) return 'bg-brand-500/50 dark:bg-brand-300/50';
  return 'bg-brand-500/25 dark:bg-brand-300/30';
}

function heatTitle(cell: any): string {
  if (!cell) return '';
  if (!cell.planned) return `${cell.date} 未排计划`;
  const pass = cell.debtFreeScore > 0 && cell.score >= cell.debtFreeScore;
  return `${cell.date} ${cell.score}/${cell.fullScore} 分${pass ? ' · 已过免债线' : ''}`;
}

/**
 * 近九周的连续与断链统计
 * @description 排了计划的日子才算数；判定用「过没过免债线」而不是「有没有得分」——
 * 每天排几项不一样之后，得 1 分在四项的日子是断链，在一项的日子可能已经满分
 */
const streak = computed(() => {
  const days = heat.value.filter((d: any) => d.planned);
  const passed = (d: any) => d.debtFreeScore > 0 && d.score >= d.debtFreeScore;
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (passed(days[i])) current++;
    else break;
  }
  return {
    current,
    active: days.filter(passed).length,
    total: days.length,
  };
});

/**
 * 想法池列表
 * @description 后端已按「进行中 → 搁着 → 已结」排好，这里只配徽标文案与配色。
 * 状态是后端从结论与最近动静算出来的，前端不再自己推
 */
const IDEA_STATES: Record<string, { label: string; cls: string }> = {
  OPEN: {
    label: '进行中',
    cls: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  },
  STALE: {
    label: '搁着',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  DONE: {
    label: '已结',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
};
const ideaList = computed(() =>
  (ideas.value?.threads ?? []).map((t: any) => ({ ...t, ...IDEA_STATES[t.state] })),
);

/** 想法总条数 */
const ideaCount = computed(() => ideaList.value.length);

/** 打开详情的那个想法 */
const activeIdea = ref<any>(null);

/** 新想法的输入框 */
const ideaDraft = ref('');

/**
 * 记下一个想法
 * @description 走确定性接口不经模型：记一行字这件事没有任何需要判断的地方，
 * 让模型过一道手只会多一次失败的机会
 */
async function captureIdea() {
  const content = ideaDraft.value.trim();
  if (!content || busy.value) return;
  busy.value = true;
  try {
    await api('/life/ideas', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    ideaDraft.value = '';
    await loadAll();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

// 记进展或写结论后重新拉数据，弹窗里拿的还是旧对象，
// 得按ID换成新的，否则状态显示会停在改之前
watch(ideas, () => {
  if (!activeIdea.value) return;
  const fresh = ideaList.value.find((i) => i.id === activeIdea.value.id);
  if (fresh) activeIdea.value = fresh;
});

/** 从想法弹窗里唤起问 AI 的浮层 */
function openIdeaAsk(payload: { prefix: string; anchor: { x: number; y: number } }) {
  ask.value = {
    anchor: payload.anchor,
    title: activeIdea.value?.content ?? '研究',
    context: '可以让它帮你理下一步，或者把这次的进展记下来',
    placeholder: '今天试了 xxx，发现 yyy',
    directLabel: '',
    direct: null,
    prefix: payload.prefix,
  };
  askReply.value = '';
  askPending.value = null;
}

onMounted(() => {
  mounted.value = true;
  activeDate.value = today();
  // 主题的作者/日期信息栏是给博文用的，本页是个应用界面不需要。
  // 它由主题全局的 author 配置渲染，frontmatter 里关不掉
  //（写 author: '' 会被 || 回退到全局值），只能在这里摘掉
  document.querySelector('.page-info')?.classList.add('hidden');
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
  <!--
    [&_p]:!my-0 是在压主题的 markdown 正文样式：它给内容区每个 p 加了
    24px 上下边距，而本页的 p 全是界面标签不是段落。标题同理不能用 h1~h6，
    主题给它们挂了锚点偏移（负 margin + 大 padding），会把文字顶出卡片
  -->
  <div data-alt="life-board" class="my-6 [&_p]:!my-0">
    <!-- 密钥入口 -->
    <form
      v-if="mounted && !unlocked"
      data-alt="life-unlock"
      class="mx-auto flex max-w-sm flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      @submit.prevent="loadAll"
    >
      <p class="text-sm text-slate-500 dark:text-slate-400">输入密钥查看</p>
      <input
        v-model="key"
        data-alt="key-input"
        type="password"
        autocomplete="current-password"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        data-alt="unlock-button"
        type="submit"
        :disabled="loading || !key"
        class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white transition hover:bg-brand-600 disabled:opacity-40"
      >
        <span class="flex items-center justify-center gap-1.5">
          {{ loading ? '加载中…' : '打开' }}
          <LifeIcon v-if="!loading" name="enter" class="h-4 w-4" />
        </span>
      </button>
      <p v-if="errorMsg" class="text-sm text-rose-600 dark:text-rose-400">
        {{ errorMsg }}
      </p>
    </form>

    <!-- 面板主体 -->
    <div
      v-else-if="mounted && diagnosis && activeDay"
      data-alt="life-content"
      class="grid gap-4"
    >
      <!--
        总览条：四个数字、几句判断、连续性热力图并作一块。
        数字回答「现在什么状况」，热力图回答「这状况是不是常态」，
        两者要对着看才有意义，分成两张卡反而割裂
      -->
      <section
        data-alt="overview"
        class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <!-- 纵向比较：今天对昨天，本周对要求 -->
          <div
            data-alt="kpi-group-self"
            class="grid content-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/30"
          >
            <p
              class="text-[11px] leading-snug text-brand-600 dark:text-brand-300"
            >
              战胜内心的批判家：和昨天的自己比，别和今天的别人比
            </p>

            <div data-alt="kpi-today">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-slate-500 dark:text-slate-400">{{
                  isToday ? '今日' : dateLabel
                }}</span>
                <span
                  v-if="vsYesterday !== null"
                  data-alt="vs-yesterday"
                  class="flex items-center gap-0.5 text-[11px]"
                  :class="
                    vsYesterday > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : vsYesterday < 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-slate-400'
                  "
                >
                  <LifeIcon
                    :name="
                      vsYesterday > 0
                        ? 'rise'
                        : vsYesterday < 0
                          ? 'fall'
                          : 'flat'
                    "
                    class="h-3.5 w-3.5"
                  />
                  <span v-if="vsYesterday !== 0"
                    >比昨天{{ vsYesterday > 0 ? '多' : '少' }}
                    {{ Math.abs(vsYesterday) }} 分</span
                  >
                  <span v-else>与昨天持平</span>
                </span>
              </div>
              <p
                class="text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100"
              >
                {{ activeDay.score
                }}<span class="text-sm font-normal text-slate-400"
                  >/{{ activeDay.fullScore || 10 }} 分</span
                >
              </p>
              <!-- 进度条满格是免债线而非满分，那才是当天真正的及格线 -->
              <div
                class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600"
              >
                <div
                  class="h-full rounded-full transition-all"
                  :class="
                    activeDay.debt > 0
                      ? 'bg-amber-400'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  "
                  :style="{ width: debtFreeProgress + '%' }"
                />
              </div>
              <p class="mt-1 text-[11px] leading-snug text-slate-400">
                免债线 {{ activeDay.debtFreeScore }} 分（满分的
                {{ Math.round(diagnosis.rules.debtFreeRatio * 100) }}%）<span
                  v-if="overMinutes > 0"
                  class="text-slate-500 dark:text-slate-400"
                >
                  · 超额投入 {{ overMinutes }} 分钟，只记录不加分</span
                >
              </p>
            </div>

            <div data-alt="kpi-mainline">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-slate-500 dark:text-slate-400"
                  >本周主线</span
                >
                <span
                  class="text-sm font-semibold tabular-nums"
                  :class="
                    diagnosis.week.mainlineDays >=
                    diagnosis.week.mainlineRequired
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-200'
                  "
                  >{{ diagnosis.week.mainlineDays }}/{{
                    diagnosis.week.mainlineRequired
                  }}
                  天</span
                >
              </div>
              <div class="mt-1.5 flex gap-1">
                <span
                  v-for="i in diagnosis.week.mainlineRequired"
                  :key="i"
                  class="h-1.5 flex-1 rounded-full"
                  :class="
                    i <= diagnosis.week.mainlineDays
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-600'
                  "
                />
              </div>
            </div>
          </div>

          <!-- 奖惩两端：额度是奖，体能债是罚，都能就地操作 -->
          <div
            data-alt="kpi-group-incentive"
            class="grid content-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/30"
          >
            <p
              class="text-[11px] leading-snug text-brand-600 dark:text-brand-300"
            >
              奖励与惩罚的超级反应倾向
            </p>

            <div data-alt="kpi-balance">
              <span class="text-xs text-slate-500 dark:text-slate-400"
                >可动用额度</span
              >
              <p
                class="text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100"
              >
                ¥{{ ledger.balance }}
              </p>
              <p class="mt-0.5 text-[11px] leading-snug text-slate-400">
                {{ ledger.statusText }}
              </p>
            </div>

            <div
              data-alt="kpi-debt"
              class="border-t border-slate-200 pt-2.5 dark:border-slate-600"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-slate-500 dark:text-slate-400"
                  >体能债</span
                >
                <span
                  class="text-sm font-semibold tabular-nums"
                  :class="
                    ledger.debt > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  "
                  >{{ ledger.debt }} 个</span
                >
              </div>
              <!--
                一个债一个块，点哪块就问哪块怎么还。
                用块而不是「还 1 / 还 3」的按钮，是因为债是可数的实体，
                看见六个方块比看见数字 6 更有还掉它的冲动
              -->
              <div
                v-if="ledger.debt > 0"
                data-alt="debt-blocks"
                class="mt-1.5 flex flex-wrap gap-1"
              >
                <button
                  v-for="i in ledger.debt"
                  :key="i"
                  data-alt="debt-block"
                  type="button"
                  :disabled="busy"
                  :title="'点开说说这一个怎么还'"
                  class="h-6 w-6 rounded bg-rose-400 transition hover:bg-rose-500 hover:ring-2 hover:ring-rose-200 disabled:opacity-40 dark:bg-rose-500/70 dark:hover:ring-rose-500/30"
                  @click="openDebtAsk($event, i - 1)"
                />
              </div>
              <p
                v-else
                class="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
              >
                没有欠债
              </p>
              <p
                v-if="debtUnitText"
                class="mt-1.5 text-[11px] leading-relaxed text-slate-400"
              >
                {{ debtUnitText }}
              </p>

              <div data-alt="exercise-bank" class="mt-2">
                <span class="text-[11px] leading-snug text-slate-400"
                  >运动储备 {{ ledger.exerciseBank }}/{{
                    ledger.exerciseBankCap
                  }}
                  个，自动抵未来欠债</span
                >
                <div class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="i in ledger.exerciseBank"
                    :key="'bank' + i"
                    class="h-4 w-4 rounded bg-emerald-400 dark:bg-emerald-500/70"
                  />
                  <button
                    data-alt="exercise-btn"
                    type="button"
                    :disabled="
                      busy || ledger.exerciseBank >= ledger.exerciseBankCap
                    "
                    title="主动锻炼，存一个储备"
                    aria-label="存运动储备"
                    class="grid h-4 w-4 place-items-center rounded border border-dashed border-emerald-400 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                    @click="openBankAsk($event)"
                  >
                    <LifeIcon name="rise" class="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 当月日历，翻月回看 -->
          <div
            data-alt="heatmap"
            class="grid content-between gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/30"
          >
            <div class="flex items-center justify-between gap-3">
              <button
                data-alt="prev-month"
                type="button"
                title="上个月"
                aria-label="上个月"
                class="grid h-7 w-7 place-items-center rounded text-slate-400 transition hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800"
                @click="moveMonth(-1)"
              >
                <LifeIcon name="left" class="h-4 w-4" />
              </button>
              <span
                class="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200"
                >{{ monthLabel }}</span
              >
              <button
                data-alt="next-month"
                type="button"
                :disabled="atLatestMonth"
                title="下个月"
                aria-label="下个月"
                class="grid h-7 w-7 place-items-center rounded text-slate-400 transition hover:bg-white hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-800"
                @click="moveMonth(1)"
              >
                <LifeIcon name="right" class="h-4 w-4" />
              </button>
            </div>
            <div data-alt="heat-head" class="grid grid-cols-7 gap-1.5">
              <span
                v-for="w in WEEK_HEAD"
                :key="w"
                class="text-center text-[11px] leading-none text-slate-400"
                >{{ w }}</span
              >
            </div>
            <div data-alt="heat-grid" class="grid grid-cols-7 gap-1.5">
              <div
                v-for="(cell, i) in monthCells"
                :key="i"
                data-alt="heat-cell"
                class="aspect-square w-7 rounded"
                :class="heatClass(cell)"
                :title="heatTitle(cell)"
              />
            </div>
            <p class="text-[11px] tabular-nums leading-snug text-slate-400">
              已连 {{ streak.current }} 天 · 本月做了 {{ monthActiveDays }} 天
            </p>
          </div>
        </div>

        <ul
          v-if="diagnosis.verdicts.length"
          data-alt="verdicts"
          class="mt-3 grid gap-0.5"
        >
          <li
            v-for="(v, i) in diagnosis.verdicts"
            :key="i"
            class="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300"
          >
            {{ v }}
          </li>
        </ul>

        <p
          data-alt="kpi-footnote"
          class="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500"
        >
          1 分 = {{ diagnosis.rules.yuanPerPoint }} 元，每月最多兑
          {{ diagnosis.rules.monthlyPointCap }} 分 · 日历格子越深表示当天得分越高
          · 阈值制：达标即得固定分，多做只记录不加分
        </p>
      </section>

      <div class="grid gap-4 lg:grid-cols-3">
        <!-- AI 栏：手机上排在最前，桌面上收到右侧常驻 -->
        <aside
          data-alt="ai-column"
          class="grid gap-4 lg:sticky lg:top-4 lg:order-2 lg:col-span-1 lg:self-start"
        >
          <LifeChat
            :api="api"
            :api-base="API"
            :api-key="key"
            :node-title-of="nodeTitleOf"
            @changed="loadAll"
          />

          <section
            data-alt="ideas-section"
            class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              data-alt="ideas-toggle"
              type="button"
              class="flex w-full items-center justify-between text-left"
              @click="showIdeas = !showIdeas"
            >
              <span
                class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >想法池</span
              >
              <span class="flex items-center gap-1 text-xs text-slate-400">
                {{ ideaCount }} 条
                <LifeIcon :name="showIdeas ? 'up' : 'down'" class="h-3.5 w-3.5" />
              </span>
            </button>
            <div v-if="showIdeas" class="mt-3">
              <!-- 捕获不受限：记一行字零成本、不计分 -->
              <!--
                上限对齐后端的 500：之前前端卡在 200，多打的字会被悄悄吃掉，
                而后端其实收得下
              -->
              <LifeAskBar
                v-model="ideaDraft"
                mode="note"
                :busy="busy"
                :maxlength="500"
                placeholder="想试试什么"
                label="记下这个想法"
                @submit="captureIdea"
              />

              <ul v-if="ideaList.length" class="mt-2 grid gap-1.5">
                <li
                  v-for="it in ideaList"
                  :key="it.id"
                  data-alt="idea-row"
                  class="cursor-pointer rounded-lg bg-slate-50 px-2.5 py-2 transition hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700"
                  @click="activeIdea = it"
                >
                  <p
                    class="whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
                  >
                    {{ it.content }}
                  </p>
                  <p class="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span class="rounded px-1.5 py-0.5" :class="it.cls">{{ it.label }}</span>
                    <span class="text-slate-400">{{ it.createdOn }}</span>
                  </p>
                </li>
              </ul>
              <p v-else class="mt-2 text-sm text-slate-400 dark:text-slate-500">
                还没有想法。冒出什么念头先记一行，有进展就往里追一句
              </p>

              <p
                v-if="ideas?.noteYuan"
                class="mt-2 text-[11px] text-slate-400 dark:text-slate-500"
              >
                已结项的研究累计 {{ ideas.noteYuan }} 元
              </p>
            </div>
          </section>
        </aside>

        <!-- 主内容 -->
        <div data-alt="main-column" class="grid gap-4 lg:order-1 lg:col-span-2">
          <!-- 打卡：每天重复的四项 -->
          <section
            data-alt="punch-card"
            class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div
              data-alt="date-nav"
              class="mb-3 flex items-center justify-between gap-2"
            >
              <!-- 项数会随排期逐日变化，标题不能写死 -->
              <p
                class="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {{ dailyTitle }}
              </p>
              <div class="flex items-center gap-1">
                <button
                  data-alt="prev-day"
                  type="button"
                  title="前一天"
                  aria-label="前一天"
                  class="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                  @click="moveDate(-1)"
                >
                  <LifeIcon name="left" class="h-4 w-4" />
                </button>
                <span
                  class="min-w-[4.5rem] text-center text-sm tabular-nums text-slate-600 dark:text-slate-300"
                  >{{ dateLabel }}</span
                >
                <button
                  data-alt="next-day"
                  type="button"
                  :disabled="isToday"
                  title="后一天"
                  aria-label="后一天"
                  class="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
                  @click="moveDate(1)"
                >
                  <LifeIcon name="right" class="h-4 w-4" />
                </button>
                <button
                  v-if="!isToday"
                  data-alt="back-today"
                  type="button"
                  title="回到今天"
                  aria-label="回到今天"
                  class="ml-1 grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                  @click="backToToday"
                >
                  <LifeIcon name="undo" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div data-alt="punch-grid" class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="it in activeDay.items"
                :key="it.nodeId"
                data-alt="punch-item"
                class="rounded-xl border p-3 transition"
                :class="
                  it.reached
                    ? 'border-brand-200 bg-brand-50/60 dark:border-brand-400/30 dark:bg-brand-500/10'
                    : 'border-slate-100 dark:border-slate-700'
                "
              >
                <div class="flex items-baseline justify-between gap-2">
                  <button
                    data-alt="daily-ask"
                    type="button"
                    :title="'说一句来补记「' + it.title + '」'"
                    class="text-left text-sm font-medium text-slate-700 underline-offset-2 transition hover:text-brand-600 hover:underline dark:text-slate-200 dark:hover:text-brand-300"
                    @click="openDailyAsk($event, it)"
                  >
                    {{ it.title }}
                  </button>
                  <span class="shrink-0 text-xs text-slate-400">
                    <span
                      v-if="it.isMainline"
                      class="mr-1 rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      >主线</span
                    >{{ it.points }} 分
                  </span>
                </div>
                <div
                  class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                >
                  <div
                    class="h-full rounded-full transition-all"
                    :class="
                      it.reached
                        ? 'bg-brand-500 dark:bg-brand-300'
                        : 'bg-brand-500/50'
                    "
                    :style="{
                      width:
                        Math.min(
                          100,
                          (it.minutes / it.thresholdMinutes) * 100,
                        ) + '%',
                    }"
                  />
                </div>
                <div class="mt-1.5 flex items-center justify-between gap-2">
                  <span class="text-xs tabular-nums text-slate-500"
                    >{{ it.minutes }}/{{ it.thresholdMinutes }} 分钟<span
                      v-if="it.minutes > it.thresholdMinutes"
                      class="ml-1 text-slate-400"
                      >超 {{ it.minutes - it.thresholdMinutes }}</span
                    ></span
                  >
                  <span class="flex gap-1">
                    <button
                      v-for="m in QUICK_MINUTES"
                      :key="m"
                      data-alt="punch-quick"
                      type="button"
                      :disabled="busy"
                      class="rounded px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                      @click="punch(it.nodeId, m)"
                    >
                      +{{ m }}
                    </button>
                    <button
                      v-if="it.minutes > 0"
                      data-alt="punch-clear"
                      type="button"
                      :disabled="busy"
                      :title="`清掉这一项今天的 ${it.minutes} 分钟`"
                      aria-label="清零这一项"
                      class="grid h-6 w-6 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                      @click="clearDay(it.nodeId)"
                    >
                      <LifeIcon name="undo" class="h-3.5 w-3.5" />
                    </button>
                    <button
                      v-if="!it.reached"
                      data-alt="punch-reach"
                      type="button"
                      :disabled="busy"
                      title="一次补到达标"
                      aria-label="一次补到达标"
                      class="grid h-6 w-6 place-items-center rounded text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-500/15"
                      @click="punchToThreshold(it)"
                    >
                      <LifeIcon name="target" class="h-4 w-4" />
                    </button>
                  </span>
                </div>
              </div>
            </div>

          </section>

          <!-- 路线图 -->
          <section
            data-alt="roadmap"
            class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="mb-4 flex items-baseline justify-between gap-2">
              <p
                class="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                路线图
              </p>
              <span class="text-xs tabular-nums text-slate-400"
                >必修 {{ diagnosis.checklist.requiredDone }}/{{
                  diagnosis.checklist.required
                }}</span
              >
            </div>
            <LifePlanTree :plan="plan" @select="openNode" />
          </section>
        </div>
      </div>

      <p
        v-if="errorMsg"
        data-alt="board-error"
        class="text-sm text-rose-600 dark:text-rose-400"
      >
        {{ errorMsg }}
      </p>
    </div>

    <!-- 全页共用的就地问 AI 浮层 -->
    <LifeAsk
      :anchor="ask.anchor"
      :title="ask.title"
      :context="ask.context"
      :placeholder="ask.placeholder"
      :direct-label="ask.directLabel"
      :busy="busy"
      :reply="askReply"
      :pending-text="askPendingText"
      :destructive="isDestructive(askPending)"
      :pending="askPending"
      @close="closeAsk"
      @send="askSend"
      @direct="askDirect"
      @confirm="askConfirm"
      @discard="askPending = null"
    />

    <!-- 研究详情 -->
    <LifeIdeaModal
      :idea="activeIdea"
      :api="api"
      :note-yuan="diagnosis?.rules?.researchNoteYuan ?? 15"
      @close="activeIdea = null"
      @changed="loadAll"
      @ask="openIdeaAsk"
    />

    <!-- 节点详情 -->
    <LifeNodeModal
      :node="picked"
      :path="pickedPath"
      :api="api"
      @close="picked = null"
      @changed="loadAll"
    />
  </div>
</template>
