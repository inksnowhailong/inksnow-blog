<script setup lang="ts">
/**
 * 一年计划面板
 * @description 按《一年计划·操作手册》的标尺呈现，分工是：
 * 打卡区管每天重复的四项，路线图管一次性的清单进度，两者不重叠。
 * 单位只认「分」这一种主货币，元与体能债都是它的换算面。
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import LifePlanTree from './lifePlanTree.vue';
import LifeNodeModal from './lifeNodeModal.vue';
import LifeIdeaModal from './lifeIdeaModal.vue';
import LifeIdeaRow from './lifeIdeaRow.vue';
import LifeBookRow from './lifeBookRow.vue';
import LifeBookModal from './lifeBookModal.vue';
import LifeIcon from './lifeIcon.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeAskModal from './lifeAskModal.vue';
import LifeAskBar from './lifeAskBar.vue';
import { planSections } from './usePlanSections';
import { today, shiftDays, weekdayOf } from './lifeFormat';
import {
  describeDraft,
  applyDraft,
  isDestructive,
  touchesPlan,
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
const books = ref<any>(null);
const heat = ref<any[]>([]);
const plan = ref<any[]>([]);

/** 当前操作的日期，切到往日即为补记 */
const activeDate = ref('');
const activeDay = ref<any>(null);

/** 弹窗里正在看的节点 */
const picked = ref<any>(null);
const pickedPath = ref('');

/** 已结的线默认折起来：它们是存量，日常要看的是还在动的那几条 */
const showDone = ref(false);

/** 手机上默认只看今日卡；点「更多」才展开总览、路线图、读书与研究线 */
const showMore = ref(false);

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

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 打卡与计划这一摊：诊断、账本、热力图、路线图与当日结算
 * @description 它们是同一笔记录的几个侧面——记一次打卡，五个数都会变，
 * 所以要一起拉。研究线不在其中，故单独一个函数
 */
async function loadCore() {
  const to = today();
  const from = shiftDays(to, -(HEATMAP_WEEKS * 7 - 1));
  const [d, l, h, p] = await Promise.all([
    api('/life/diagnosis'),
    api('/life/ledger'),
    api(`/life/settlement/range?from=${from}&to=${to}`),
    api('/life/plan'),
  ]);
  diagnosis.value = d;
  ledger.value = l;
  heat.value = h;
  plan.value = p;
  if (!activeDate.value) activeDate.value = to;
  if (!heatMonth.value) heatMonth.value = to.slice(0, 7);
  await Promise.all([loadActiveDay(), loadMonth()]);
  // 弹窗开着时同步刷新里面那份，否则改完还显示旧内容
  if (picked.value) picked.value = findNode(picked.value.id);
}

/**
 * 研究线
 * @description 与打卡、计划互不相干：记一条研究线不会改分数也不会动额度，
 * 没有理由顺带把上面那五个接口再拉一遍
 */
async function loadIdeas() {
  ideas.value = await api('/life/ideas');
}

/**
 * 读书
 * @description 和研究线同理，自成一摊：记一本书、记一条笔记都不改分数也不动额度
 */
async function loadBooks() {
  books.value = await api('/life/books');
}

/** 开锁时的首次拉取，三摊都要 */
async function loadAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await Promise.all([loadCore(), loadIdeas(), loadBooks()]);
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

/**
 * 动作之后刷新一块数据
 * @description 与开锁那次不一样：那次拿不到要退回密钥页，
 * 这里只是让页面跟上，失败写到错误条上就够了，不该把人踢出去
 * @param load 要重拉的那一块
 */
function refresh(load: () => Promise<void>) {
  load().catch((e: any) => {
    errorMsg.value = e.message || '刷新失败';
  });
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
    await loadCore();
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
    await loadCore();
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
/**
 * 当前这天是不是休息日
 * @description 逐日结算那两份（近九周、当月）带了 dayKind，当日结算接口不一定带，
 * 故以当日结算为先、日历数据兜底，免得后端还没跟上时标题跟格子说的不是一回事
 */
const activeRest = computed(() => {
  const d = activeDay.value;
  if (d?.dayKind) return d.dayKind === 'REST';
  const hit =
    heat.value.find((x: any) => x.date === activeDate.value) ??
    monthHeat.value.find((x: any) => x.date === activeDate.value);
  return hit?.dayKind === 'REST';
});

const dailyTitle = computed(() => {
  // 休息日只排常驻项，先说清「不做也不欠」，报项数反而像是又欠了几样
  if (activeRest.value) return '今天休息 · 做了算白赚';
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

/** 问 AI 弹窗的一次上下文 */
interface AskState {
  open: boolean;
  title: string;
  context: string;
  placeholder: string;
  directLabel: string;
  /** 点「直接记下」时执行什么 */
  direct: (() => Promise<void>) | null;
  /** 交给模型前，在用户原话前面补的一句背景 */
  prefix: string;
  /** 这一次问的是哪一天，空则不限定某天 */
  focusDate: string;
}

/** 这一次打开时的空白状态，openAsk 拿它兜住 patch 没给的字段 */
const BLANK_ASK: AskState = {
  open: false,
  title: '',
  context: '',
  placeholder: '',
  directLabel: '',
  direct: null,
  prefix: '',
  focusDate: '',
};

/**
 * 问 AI 弹窗的状态
 * @description 全页共用一个弹窗：谁唤起它，谁就把自己的上下文塞进来。
 * 这样"AI 能操作的地方"等于"谁调了 openAsk"，不必到处铺输入框
 */
const ask = ref<AskState>({ ...BLANK_ASK });
const askReply = ref('');
const askPending = ref<any>(null);

/**
 * 弹窗这一次打开期间的问答
 * @description 追问要接得上，所以整段历史都留着。
 * 换个地方点开就清空——上一个话题的上下文带到下一个话题上只会帮倒忙
 */
const askLog = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

/**
 * 打开问 AI 弹窗
 * @description 六个入口都从这儿进，清场与赋值收在一处。
 * 清场不挂在 open 的翻转上：弹窗已经开着时再点另一个入口，open 不变，
 * 但话题已经换了，上一轮的记录和草稿必须跟着走
 * @param patch 这一次的上下文，没给的字段回到空值
 */
function openAsk(patch: Partial<Omit<AskState, 'open'>>) {
  askReply.value = '';
  askPending.value = null;
  askLog.value = [];
  ask.value = { ...BLANK_ASK, ...patch, open: true };
}

function closeAsk() {
  ask.value = { ...ask.value, open: false, direct: null };
  askReply.value = '';
  askPending.value = null;
  askLog.value = [];
}

/**
 * 把弹窗里的话交给模型
 * @description 前缀补一句背景说清这是在问哪件事，历史让追问接得上。
 * 拿回来只出草稿不落库：模型永远不直接改数据。
 */
async function askSend(text: string) {
  if (busy.value) return;
  busy.value = true;
  askReply.value = '';
  askPending.value = null;

  // 第一句要带前缀点明话题，后续追问已在上下文里，再带就啰嗦了
  const sent = askLog.value.length ? text : ask.value.prefix + text;
  // 历史要在这句入列之前取，否则这次的问题会在上下文里重复一遍
  const history = askLog.value.slice(-12);
  // 发出就入列：输入框此时已经清空，不先摆上去的话屏幕上只剩 AI 在吐字，
  // 看不见自己刚说了什么
  askLog.value = [...askLog.value, { role: 'user', content: sent }];

  try {
    const res = await askStream(
      API,
      key.value,
      sent,
      // 边吐边显示，让人立刻看到有反应；这段字还没进记录，故单独放
      (delta) => {
        askReply.value += delta;
      },
      history,
      ask.value.focusDate,
    );
    if (res.kind === 'answer') {
      // 说完整了就并进记录，否则同一段话会在记录里和吐字区各显示一遍
      const answer = res.text || askReply.value;
      askReply.value = '';
      askLog.value = [...askLog.value, { role: 'assistant', content: answer }];
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
    // 没问出去的那句要从记录里撤掉，否则下次发送历史会以两句 user 连着结尾，
    // 且第二句不再补前缀
    askLog.value = askLog.value.slice(0, -1);
    askReply.value = 'AI 暂时不可用：' + e.message;
  } finally {
    busy.value = false;
  }
}

/** 弹窗里点头之后才写入 */
async function askConfirm() {
  const p = askPending.value;
  if (!p || busy.value) return;
  busy.value = true;
  try {
    await applyDraft(p, api);
    askPending.value = null;
    askReply.value = '已记下';
    // 草稿什么都可能改，三摊都得重拉。不走 loadAll：那条路是开锁用的，
    // 会重写密钥、把整页推回加载态，还会把刷新失败吞进错误条当成加载失败
    refresh(loadCore);
    refresh(loadIdeas);
    refresh(loadBooks);
  } catch (e: any) {
    askReply.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 草稿的一句话描述，交给弹窗展示 */
const askPendingText = computed(() =>
  askPending.value ? describeDraft(askPending.value, nodeTitleOf) : '',
);

/** 会动计划本身的草稿要多说一句，它改的不是一笔流水而是计划表 */
const askPendingNote = computed(() =>
  touchesPlan(askPending.value)
    ? '这条会动计划本身，确认前看清楚。改错了可以在「最近改动」里撤销'
    : '',
);

/** 点弹窗里的「直接记下」 */
async function askDirect() {
  const fn = ask.value.direct;
  if (!fn || busy.value) return;
  await fn();
  closeAsk();
}

/** 没有上下文的随便问，从右下角悬浮按钮进来 */
function openFreeAsk() {
  openAsk({
    context: '记一笔、问一句、或者让它改计划，都在这儿说',
    placeholder: '例如：主线写了 40 分钟，或问它任何事',
  });
}

/** 总览「战胜内心的批判家」那一卡的入口：今天投了多少、拿了几分 */
function openScoreAsk() {
  openAsk({
    title: '今天的分数',
    prefix: '关于今天的投入和分数：',
  });
}

/** 点某一个体能债方块 */
function openDebtAsk(index: number) {
  openAsk({
    title: `还掉第 ${index + 1} 个体能债`,
    context: debtUnitText.value,
    placeholder: '我刚做了 10 个俯卧撑',
    directLabel: '直接记为已还 1 个',
    direct: () => ledgerAction('REPAY', 1),
    prefix: '关于还体能债：',
  });
}

/** 点运动储备的空位，存一个 */
function openBankAsk() {
  openAsk({
    title: '存 1 个运动储备',
    context: '提前锻炼存起来，以后产生欠债自动抵扣',
    placeholder: '刚做了 20 个深蹲',
    directLabel: '直接记为存 1 个',
    direct: () => ledgerAction('EXERCISE', 1),
    prefix: '关于主动锻炼存运动储备：',
  });
}

/** 路线图那一卡的入口 */
function openRoadmapAsk() {
  openAsk({
    title: '路线图',
    prefix: '关于我的学习路线图：',
  });
}

/** 研究线那一卡的入口，问的是整摊线而不是某一条 */
function openIdeasAsk() {
  openAsk({
    title: '研究线',
    prefix: '关于我的研究线：',
  });
}

/** 读书那一卡的入口，问的是整摊书而不是某一本 */
function openBooksAsk() {
  openAsk({
    title: '读书',
    prefix: '关于我在读的书：',
  });
}

/** 清掉某项某天的记录，不经模型 */
async function clearDay(nodeId: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    await api(`/life/plan/${nodeId}/records?date=${activeDate.value}`, {
      method: 'DELETE',
    });
    await loadCore();
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
function openDailyAsk(item: any) {
  openAsk({
    title: item.title,
    context: `${item.minutes}/${item.thresholdMinutes} 分钟 · 达标得 ${item.points} 分`,
    placeholder: '刚又做了半小时',
    prefix: `关于「${item.title}」这一项，日期 ${activeDate.value}：`,
  });
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

/**
 * 每日项 → 它所属方向当前该做的那条清单项
 * @description 手机上路线图折在「更多」里，打卡的时候看不见今天该学哪一项。
 * 解法不是把整张路线图搬回首屏，而是让每个打卡项自己带上那一条。
 * 算法直接用 planSections，与路线图是同一份——各算一份的话，
 * 做完一项会变成一边跳下一项、另一边还停在原处
 */
const hereByNode = computed(() => {
  const map = new Map<string, { item: any; path: string }>();
  for (const s of planSections(plan.value)) {
    if (!s.currentId) continue;
    const group = s.groups.find((g: any) =>
      g.items.some((i: any) => i.id === s.currentId),
    );
    if (!group) continue;
    const item = group.items.find((i: any) => i.id === s.currentId);
    const path = [s.title, group.title].filter(Boolean).join(' › ');
    // 同一个方向下的每日项指向同一条「在这」
    for (const d of s.daily) map.set(d.id, { item, path });
  }
  return map;
});

/** 打卡项配上它的「在这」，模板里就不必反复查表 */
const punchItems = computed(() =>
  (activeDay.value?.items ?? []).map((i: any) => ({
    ...i,
    here: hereByNode.value.get(i.nodeId) ?? null,
  })),
);

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
 * 三态：有记录的日子、该日无记录、只是为对齐补的空位。
 * 无记录的日子也带上日期——格子要能点开问那天，没有日期就问不了
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
    cells.push(byDate.get(date) ?? { date });
  }
  return cells;
});

/**
 * 这格能不能点开问 AI
 * @description 对齐用的空位没有日期，未来的日子还没发生，都没什么可问
 */
function canAskDay(cell: any): boolean {
  return !!cell?.date && cell.date <= today();
}

/**
 * 点日历格子，问这一天
 * @description 格子只画得出分数高低，答不了「那天到底干了什么」。
 * 带上 focusDate 让后端把那天的结算与全部事件塞进提示，模型才有据可依
 */
function openDayAsk(cell: any) {
  if (!canAskDay(cell)) return;
  const [, m, d] = cell.date.split('-');
  openAsk({
    title: `${Number(m)} 月 ${Number(d)} 日`,
    context: '问这一天做了什么、为什么欠债都行',
    placeholder: '那天做了什么',
    prefix: `关于 ${cell.date} 这一天：`,
    focusDate: cell.date,
  });
}

/** 休息日格子的虚线边框，休不休由后端的 dayKind 说了算 */
const REST_BORDER =
  'border border-dashed border-slate-300 dark:border-slate-600';

/**
 * 某格的配色
 * @description 分四档深浅；休息日与没排计划的日子无义务，做了才着色，没做显示为空底。
 * 休息日额外描一圈虚线边框——调休上班的周末与放假的工作日光看底色分不出来
 */
function heatClass(cell: any): string {
  // undefined 表示该月没有这一天，整格不画；没有 score 表示这天不在统计范围内
  if (cell === undefined) return 'invisible';
  if (cell.score == null) return 'bg-transparent';
  const rest = cell.dayKind === 'REST';
  // 看的是「这天排没排计划」而不是「是不是周末」：出差请假同样是没排
  if (cell.score <= 0) {
    return cell.planned && !rest
      ? 'bg-slate-100 dark:bg-slate-700'
      : `bg-transparent ${REST_BORDER}`;
  }
  // 按达成率着色而非绝对分：每天排几项会变，绝对分之间不再可比
  const ratio = cell.fullScore > 0 ? cell.score / cell.fullScore : 0;
  const tone =
    ratio >= 1
      ? 'bg-brand-500 dark:bg-brand-300'
      : ratio >= 0.6
        ? 'bg-brand-500/75 dark:bg-brand-300/75'
        : ratio >= 0.3
          ? 'bg-brand-500/50 dark:bg-brand-300/50'
          : 'bg-brand-500/25 dark:bg-brand-300/30';
  // 休息日做了事照样着色：白赚的分抹掉了，这天就成了一片空白
  return rest ? `${tone} ${REST_BORDER}` : tone;
}

function heatTitle(cell: any): string {
  if (!cell || cell.score == null) return '';
  // 备注是这天为什么休息的唯一解释，如「国庆」，没有它虚格看着像漏记
  const rest =
    cell.dayKind === 'REST'
      ? ` · 休息${cell.note ? `（${cell.note}）` : ''}`
      : '';
  if (!cell.planned) return `${cell.date} 未排计划${rest}`;
  const pass = cell.debtFreeScore > 0 && cell.score >= cell.debtFreeScore;
  return `${cell.date} ${cell.score}/${cell.fullScore} 分${pass ? ' · 已过免债线' : ''}${rest}`;
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
 * 研究线列表
 * @description 状态是后端从结论与最近动静算出来的，前端不再自己推，
 * 也不再逐条配徽标——状态改由分段标题与行首色条表达
 */
const ideaList = computed<any[]>(() => ideas.value?.threads ?? []);

/** 分段的顺序与中文说法，键与后端的 state 一致 */
const IDEA_SEGMENTS = [
  { key: 'OPEN', label: '在动' },
  { key: 'STALE', label: '搁着' },
  { key: 'DONE', label: '已结' },
];

/**
 * 按状态切成三段
 * @description 认不得的 state 兜到末尾单独一段，不能让它静默消失——
 * 列表按状态分组之后，漏掉的那条在界面上是查无此人
 */
const ideaSegments = computed(() => {
  const known = IDEA_SEGMENTS.map((s) => ({
    ...s,
    items: ideaList.value.filter((t) => t.state === s.key),
  }));
  const rest = ideaList.value.filter(
    (t) => !IDEA_SEGMENTS.some((s) => s.key === t.state),
  );
  return rest.length
    ? [...known, { key: 'OTHER', label: '状态不明', items: rest }]
    : known;
});

/**
 * 标题行右侧的分段计数，如「2 在动 · 1 搁着」
 * @description 空段不占位置；一条都没有时给句固定文案，
 * 否则折叠状态下标题行右边只剩一个箭头，像是没加载出来
 */
const ideaCountText = computed(
  () =>
    ideaSegments.value
      .filter((s) => s.items.length)
      .map((s) => `${s.items.length} ${s.label}`)
      .join(' · ') || '还没有',
);

/** 打开详情的那条研究线 */
const activeIdea = ref<any>(null);

/** 新研究线的输入框 */
const ideaDraft = ref('');

/**
 * 记下一条研究线
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
    await loadIdeas();
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

/**
 * 研究线弹窗改完之后
 * @param scope 这次改动波及哪一摊：记进展只动研究线，
 * 写结论和删除会连带改额度，那一摊也得重拉
 */
function onIdeaChanged(scope: 'ideas' | 'all') {
  refresh(loadIdeas);
  if (scope === 'all') refresh(loadCore);
}

/** 从研究线弹窗里唤起问 AI */
function openIdeaAsk(payload: { prefix: string }) {
  openAsk({
    title: activeIdea.value?.content ?? '研究',
    context: '可以让它帮你理下一步，或者把这次的进展记下来',
    placeholder: '今天试了 xxx，发现 yyy',
    prefix: payload.prefix,
  });
}

/** 在读的书；读完的收在折叠段里 */
const readingBooks = computed<any[]>(() => books.value?.reading ?? []);
const doneBooks = computed<any[]>(() => books.value?.done ?? []);

/**
 * 标题行右侧的计数
 * @description 空的那一段不占位置；一本都没有时给句固定文案，
 * 否则标题行右边只剩一颗星芒，像是没加载出来
 */
const bookCountText = computed(
  () =>
    [
      readingBooks.value.length ? `在读 ${readingBooks.value.length}` : '',
      doneBooks.value.length ? `读完 ${doneBooks.value.length}` : '',
    ]
      .filter(Boolean)
      .join(' · ') || '还没有',
);

/** 读完的书默认折起来：它们是存量，日常要看的是手上这几本 */
const showDoneBooks = ref(false);

/** 新书的输入框 */
const bookDraft = ref('');

/**
 * 记下一本在读的书
 * @description 与记研究线同理走确定性接口：书名就是一行字，
 * 让模型过一道手只会多一次失败的机会
 */
async function captureBook() {
  const title = bookDraft.value.trim();
  if (!title || busy.value) return;
  busy.value = true;
  try {
    await api('/life/books', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    bookDraft.value = '';
    await loadBooks();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}

/** 打开详情的那本书 */
const activeBook = ref<any>(null);

/** 打卡项那行「在读」指向手上第一本书 */
const firstReadingBook = computed<any>(() => readingBooks.value[0] ?? null);

/** 读书卡与卡里那条输入条，打卡项那行「还没记书」要把人送过去 */
const booksSection = ref<HTMLElement | null>(null);
const bookBar = ref<InstanceType<typeof LifeAskBar> | null>(null);

/**
 * 点打卡项下面那行「在读」
 * @description 有书就开书弹窗；一本都没有时不弹空窗，把人送到读书卡的输入条上——
 * 这一行要解决的是「该记一本书了」，光提示没有用
 */
async function openReading() {
  if (firstReadingBook.value) {
    activeBook.value = firstReadingBook.value;
    return;
  }
  // 手机上读书卡折在「更多」里，先展开再滚，否则滚向一个 display:none 的元素
  showMore.value = true;
  await nextTick();
  booksSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  bookBar.value?.focus();
}

// 记笔记或读完之后重新拉数据，弹窗里拿的还是旧对象，
// 得按ID换成新的，否则头部那行小字会停在改之前。
// 找不到说明这本书已经没了（如经 AI 删掉），关掉弹窗——
// 留着它等于对着一本不存在的书记笔记，每一下都只换回一句报错
watch(books, () => {
  if (!activeBook.value) return;
  activeBook.value =
    [...readingBooks.value, ...doneBooks.value].find(
      (b) => b.id === activeBook.value.id,
    ) ?? null;
});

/** 从书弹窗里唤起问 AI */
function openBookAsk(payload: { prefix: string }) {
  openAsk({
    title: activeBook.value?.title ?? '读书',
    context: '可以让它跟你聊这本书，或者把刚读到的记下来',
    placeholder: '今天读了第三章，讲了 xxx',
    prefix: payload.prefix,
  });
}

/** 从节点弹窗里唤起问 AI，让它改写这条计划 */
function openNodeAsk(payload: { prefix: string }) {
  openAsk({
    title: picked.value?.title ?? '计划项',
    context: '说想改成什么样，它出一份草稿，点头才落库',
    placeholder: '把做完的标准写具体点',
    prefix: payload.prefix,
  });
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
        :class="showMore ? '' : 'hidden lg:block'"
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
            <div class="flex items-start justify-between gap-2">
              <p
                class="text-[11px] leading-snug text-brand-600 dark:text-brand-300"
              >
                战胜内心的批判家：和昨天的自己比，别和今天的别人比
              </p>
              <LifeAskButton title="就今天的分数问 AI" @click="openScoreAsk" />
            </div>

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
            <div class="flex items-start justify-between gap-2">
              <p
                class="text-[11px] leading-snug text-brand-600 dark:text-brand-300"
              >
                奖励与惩罚的超级反应倾向
              </p>
              <LifeAskButton title="存一个运动储备" @click="openBankAsk()" />
            </div>

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
                  @click="openDebtAsk(i - 1)"
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
                    @click="openBankAsk()"
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
              <button
                v-for="(cell, i) in monthCells"
                :key="i"
                data-alt="heat-cell"
                type="button"
                :disabled="!canAskDay(cell)"
                :title="heatTitle(cell)"
                :aria-label="cell?.date ? `问 ${cell.date} 这一天` : undefined"
                class="aspect-square w-7 rounded transition enabled:hover:ring-2 enabled:hover:ring-brand-400 enabled:hover:ring-offset-1 dark:enabled:hover:ring-offset-slate-800"
                :class="heatClass(cell)"
                @click="openDayAsk(cell)"
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
          · 虚线格是休息日或没排计划的日子 · 点格子可以问那天
          · 阈值制：达标即得固定分，多做只记录不加分
        </p>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- 左列：打卡与研究线都不高，吸顶跟着右边那条长列滚 -->
        <div
          data-alt="left-column"
          class="order-1 grid gap-4 lg:sticky lg:top-4 lg:self-start"
        >
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
                v-for="it in punchItems"
                :key="it.nodeId"
                data-alt="punch-item"
                class="rounded-xl border p-3 transition"
                :class="
                  it.reached
                    ? 'border-brand-200 bg-brand-50/60 dark:border-brand-400/30 dark:bg-brand-500/10'
                    : 'border-slate-100 dark:border-slate-700'
                "
              >
                <div class="flex items-center justify-between gap-2">
                  <p
                    class="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    {{ it.title }}
                  </p>
                  <span
                    class="flex shrink-0 items-center gap-1 text-xs text-slate-400"
                  >
                    <span
                      v-if="it.isMainline"
                      class="rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      >主线</span
                    >{{ it.points }} 分
                    <LifeAskButton
                      :title="'说一句来补记「' + it.title + '」'"
                      @click="openDailyAsk(it)"
                    />
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

                <!-- 「在这」：这一项属于哪个方向，那个方向现在该学的是哪条 -->
                <button
                  v-if="it.here"
                  data-alt="punch-here"
                  type="button"
                  :title="'打开清单项「' + it.here.item.title + '」'"
                  class="mt-1.5 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  @click="openNode(it.here.item, it.here.path)"
                >
                  <span
                    class="shrink-0 rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    >在这</span
                  >
                  <span
                    class="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300"
                    >{{ it.here.item.title }}</span
                  >
                  <LifeIcon
                    name="right"
                    class="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
                  />
                </button>

                <!--
                  「在读」：常驻的那一项手上正在读哪本书。
                  按 pinned 认而不按标题——标题是可以改的，改完这一行就不见了
                -->
                <button
                  v-if="it.pinned"
                  data-alt="punch-reading"
                  type="button"
                  :title="
                    firstReadingBook
                      ? '打开《' + firstReadingBook.title + '》'
                      : '去记一本在读的书'
                  "
                  class="mt-1.5 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  @click="openReading"
                >
                  <span
                    class="shrink-0 rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    >在读</span
                  >
                  <span
                    class="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300"
                    >{{
                      firstReadingBook
                        ? '《' + firstReadingBook.title + '》'
                        : '还没记书'
                    }}</span
                  >
                  <LifeIcon
                    name="right"
                    class="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
                  />
                </button>
              </div>
            </div>

          </section>

          <!--
            读书排在研究线上面：读书是每天都排、砍不掉的那一项，
            研究线是想起来才记一句的地方——天天要看的那摊摆在手边
          -->
          <section
            ref="booksSection"
            data-alt="books-section"
            :class="showMore ? '' : 'hidden lg:block'"
            class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                读书
              </p>
              <span
                data-alt="books-counts"
                class="flex items-center gap-1 text-xs text-slate-400"
              >
                {{ bookCountText }}
                <LifeAskButton title="就读书问 AI" @click="openBooksAsk" />
              </span>
            </div>
            <div class="mt-3">
              <!-- 上限对齐后端的 200，多打的字不该被悄悄吃掉 -->
              <LifeAskBar
                ref="bookBar"
                v-model="bookDraft"
                mode="note"
                :busy="busy"
                :maxlength="200"
                placeholder="记一本书"
                label="记下这本书"
                @submit="captureBook"
              />

              <ul
                v-if="readingBooks.length"
                data-alt="book-list"
                class="mt-3 grid"
              >
                <LifeBookRow
                  v-for="b in readingBooks"
                  :key="b.id"
                  :book="b"
                  @click="activeBook = b"
                />
              </ul>
              <p v-else class="mt-2 text-sm text-slate-400 dark:text-slate-500">
                还没在读的书
              </p>

              <!-- 读完的收起来，点一下才摊开 -->
              <div v-if="doneBooks.length" data-alt="books-done" class="mt-2">
                <button
                  data-alt="books-done-toggle"
                  type="button"
                  class="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"
                  @click="showDoneBooks = !showDoneBooks"
                >
                  读完 ({{ doneBooks.length }})
                  <LifeIcon
                    :name="showDoneBooks ? 'up' : 'down'"
                    class="h-3 w-3"
                  />
                </button>
                <ul v-if="showDoneBooks" data-alt="book-done-list" class="mt-1 grid">
                  <LifeBookRow
                    v-for="b in doneBooks"
                    :key="b.id"
                    :book="b"
                    @click="activeBook = b"
                  />
                </ul>
              </div>
            </div>
          </section>

          <section
            data-alt="ideas-section"
            :class="showMore ? '' : 'hidden lg:block'"
            class="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <!--
              这一摊不再折叠：折起来的东西等于不存在，而研究线本来就是
              想起来才记一句的地方——要先点开才看得见，就永远想不起来。
              在动那一段给个高度封顶自己滚，长了也不会把下面的路线图顶走
            -->
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                研究线
              </p>
              <span
                data-alt="ideas-counts"
                class="flex items-center gap-1 text-xs text-slate-400"
              >
                {{ ideaCountText }}
                <LifeAskButton title="就研究线问 AI" @click="openIdeasAsk" />
              </span>
            </div>
            <div class="mt-3">
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
                placeholder="记一条研究线"
                label="记下这条研究线"
                @submit="captureIdea"
              />

              <!-- 按状态分段；空段连标题一起不渲染，免得一排「暂无」占着地方 -->
              <div v-if="ideaList.length" class="mt-3 grid gap-1.5">
                <template v-for="seg in ideaSegments" :key="seg.key">
                  <div v-if="seg.items.length" data-alt="idea-segment">
                    <button
                      v-if="seg.key === 'DONE'"
                      data-alt="idea-done-toggle"
                      type="button"
                      class="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"
                      @click="showDone = !showDone"
                    >
                      {{ seg.label }} ({{ seg.items.length }})
                      <LifeIcon :name="showDone ? 'up' : 'down'" class="h-3 w-3" />
                    </button>
                    <p
                      v-else
                      data-alt="idea-segment-title"
                      class="text-[11px] text-slate-400 dark:text-slate-500"
                    >
                      {{ seg.label }}
                    </p>
                    <ul
                      v-if="seg.key !== 'DONE' || showDone"
                      data-alt="idea-list"
                      class="mt-1 grid"
                      :class="
                        seg.key === 'OPEN' ? 'max-h-64 overflow-y-auto' : ''
                      "
                    >
                      <LifeIdeaRow
                        v-for="it in seg.items"
                        :key="it.id"
                        :idea="it"
                        @click="activeIdea = it"
                      />
                    </ul>
                  </div>
                </template>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400 dark:text-slate-500">
                还没有研究线。冒出什么念头先记一行，有进展就往里追一句
              </p>

              <p
                v-if="ideas?.noteYuan"
                class="mt-2 text-[11px] text-slate-400 dark:text-slate-500"
              >
                已结项的研究累计 {{ ideas.noteYuan }} 元
              </p>
            </div>
          </section>
        </div>

        <!-- 右列：路线图。四十多项拉得很长，单独占一列 -->
        <section
          data-alt="roadmap"
          :class="showMore ? '' : 'hidden lg:block'"
          class="order-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="mb-4 flex items-center justify-between gap-2">
            <p
              class="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              路线图
            </p>
            <span
              class="flex items-center gap-1 text-xs tabular-nums text-slate-400"
            >
              必修 {{ diagnosis.checklist.requiredDone }}/{{
                diagnosis.checklist.required
              }}
              <LifeAskButton title="就路线图问 AI" @click="openRoadmapAsk" />
            </span>
          </div>
          <LifePlanTree :plan="plan" @select="openNode" />
        </section>

        <button
          data-alt="show-more"
          type="button"
          class="order-3 lg:hidden rounded-2xl border border-dashed border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="showMore = !showMore"
        >
          {{ showMore ? '收起' : '更多：总览 · 路线图 · 读书 · 研究线' }}
        </button>
      </div>

      <p
        v-if="errorMsg"
        data-alt="board-error"
        class="text-sm text-rose-600 dark:text-rose-400"
      >
        {{ errorMsg }}
      </p>

      <!--
        常驻入口：没有上下文的随便问从这里进。
        mb 而不是 pb 撑安全区——按钮是 fixed 定位的，加内边距只会把它撑大，
        要的是整体往上抬开 iPhone 底部那条横杠
      -->
      <!--
        右下角这一带本来被主题的「回到顶部」按钮占着，现已由本页 frontmatter 的
        backToTop: false 关掉，所以这颗可以回到角落里。z 仍留在主题那层之上
        （它是 z-index:100），万一哪天又被打开也不会盖住这颗
      -->
      <button
        data-alt="ask-fab"
        type="button"
        title="问 AI"
        aria-label="问 AI"
        class="fixed bottom-5 right-5 z-[101] mb-[env(safe-area-inset-bottom)] grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-600 sm:h-12 sm:w-12"
        @click="openFreeAsk"
      >
        <LifeIcon name="send" class="h-5 w-5" />
      </button>
    </div>

    <!-- 全页唯一的经 AI 对话外壳 -->
    <LifeAskModal
      :open="ask.open"
      :title="ask.title"
      :context="ask.context"
      :placeholder="ask.placeholder"
      :direct-label="ask.directLabel"
      :busy="busy"
      :reply="askReply"
      :log="askLog"
      :pending-text="askPendingText"
      :pending-note="askPendingNote"
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
      @changed="onIdeaChanged"
      @ask="openIdeaAsk"
    />

    <!-- 书详情 -->
    <LifeBookModal
      :book="activeBook"
      :api="api"
      @close="activeBook = null"
      @changed="refresh(loadBooks)"
      @ask="openBookAsk"
    />

    <!-- 节点详情 -->
    <LifeNodeModal
      :node="picked"
      :path="pickedPath"
      :api="api"
      @close="picked = null"
      @changed="refresh(loadCore)"
      @ask="openNodeAsk"
    />
  </div>
</template>
