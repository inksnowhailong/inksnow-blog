/**
 * AI 草稿的描述与执行
 * @description 模型返回的草稿有十来种，对话栏与就地浮层都要用。
 * 各写一份必然漂移——加一种意图只改了一处、另一处静默失效，
 * 这类 bug 在界面上表现为"说完没反应"，极难察觉。故收成这一份。
 */
import { shortDate } from './lifeFormat';

/**
 * 会改动计划本身的草稿，比记一笔流水影响大，界面上要区别对待
 * @description 改计划的活已经收到通用补丁那条路上去了，这里只剩新增一种；
 * 补丁要不要提醒看它自己的 risk，不在这张表里
 */
const PLAN_KINDS = ['plan_create'];

/**
 * 会删掉已有数据的草稿
 * @description 改日历与改每周默认排休也算在内——它们不删记录，但改哪天休息会
 * 连带改欠债，后者牵连的还是往后每一周，值得同一档的黄色确认
 */
const DESTRUCTIVE_KINDS = [
  'undo',
  'idea_drop',
  'calendar',
  'rest_weekdays',
];

/** 星期编号转中文，0 是周日，与后端 weekdays 一致 */
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 通用补丁里的一处改动
 * @description 值本身（before/after）只用来判断改成了什么（如砍掉），
 * 给人看的一律用后端按字段说明书格式化好的 beforeText/afterText——
 * 周几、状态、挂靠这些怎么说成人话是后端说明书的事，前端不重复一遍
 */
interface PatchChange {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
  beforeText: string;
  afterText: string;
}

/** 取补丁里某个字段的改动 */
function changeOf(draft: any, field: string): PatchChange | undefined {
  return (draft?.changes ?? []).find((c: PatchChange) => c.field === field);
}

/** 一天的安排说成两个字 */
function kindText(kind?: string | null): string {
  return kind === 'REST' ? '休息' : kind === 'WORK' ? '上班' : '恢复默认';
}

/** 一串星期编号说成「周六、周日」 */
function weekdaysText(weekdays?: number[]): string {
  const list = (weekdays ?? []).map((w) => `周${WEEK_CN[w]}`).join('、');
  return list || '一天都不';
}

/**
 * 这条草稿是否动计划结构
 * @description 通用补丁改的是什么、有多要紧，由后端字段说明书算成 risk 给过来，
 * 前端不认字段名——认了就等于把说明书抄一份在这儿，加个字段两边都要改
 */
export function touchesPlan(draft: any): boolean {
  if (draft?.kind === 'entity_patch') return draft.risk !== 'LOW';
  return PLAN_KINDS.includes(draft?.kind);
}

/** 这条草稿是否会删掉东西 */
export function isDestructive(draft: any): boolean {
  if (draft?.kind === 'entity_patch') return draft.risk === 'HIGH';
  return DESTRUCTIVE_KINDS.includes(draft?.kind);
}

/**
 * 把草稿说成一句人能核对的话
 * @param draft 模型返回的草稿
 * @param nodeTitleOf 按ID取每日项标题
 */
export function describeDraft(
  draft: any,
  nodeTitleOf: (id: string) => string,
): string {
  const p = draft;
  if (!p) return '';
  if (p.kind === 'check') return `勾掉「${p.title}」`;
  if (p.kind === 'idea') return `记下研究线：${p.content}`;
  if (p.kind === 'idea_conclude')
    return `给「${p.ideaContent}」写结论收尾：${p.conclusion}`;
  if (p.kind === 'log') {
    const head = p.tag === 'GOT' ? '记一条搞懂' : p.tag === 'STUCK' ? '记一条卡点' : '记一条';
    return `给「${p.nodeTitle}」${head}：${p.text}`;
  }
  if (p.kind === 'research_log')
    return `给研究「${p.ideaContent}」记一条进展：${p.text}`;
  if (p.kind === 'book_add') return `记下在读的书：《${p.title}》`;
  if (p.kind === 'reading_log')
    return `给《${p.bookTitle}》记一条笔记：${p.text}`;
  if (p.kind === 'book_finish') return `把《${p.bookTitle}》记成读完`;
  if (p.kind === 'idea_drop')
    return (
      `删掉研究线「${p.ideaContent}」` +
      (p.logCount ? `，连同 ${p.logCount} 条研究日志` : '') +
      (p.yuanLost ? `，额度少 ${p.yuanLost} 元` : '')
    );
  if (p.kind === 'undo')
    return `删掉「${p.nodeTitle}」${p.occurredOn} 的 ${p.events.length} 条记录，共 ${p.totalMinutes} 分钟`;
  if (p.kind === 'entity_patch') {
    // 砍掉得单说一句。逐字段念成「状态 进行中 → 砍掉；砍掉的原因 空 → 太散」，
    // 没人听得出这是在砍一整项，而这恰恰是最该看清的那一种
    if (changeOf(p, 'status')?.after === 'DROPPED')
      return `砍掉「${p.title}」：${changeOf(p, 'droppedReason')?.afterText ?? ''}`;
    const parts = (p.changes ?? []).map(
      (c: PatchChange) => `${c.label} ${c.beforeText} → ${c.afterText}`,
    );
    return `改「${p.title}」：${parts.join('；')}`;
  }
  if (p.kind === 'plan_create')
    return `在「${p.parentTitle}」下新增「${p.title}」`;
  if (p.kind === 'calendar') {
    const days: any[] = p.days ?? [];
    if (!days.length) return '日历不动';
    // 放假往往是连着的一段，逐日念一遍谁也核对不动，说成首尾两头
    const dates = days.map((d) => d.date).sort();
    const span =
      dates.length === 1
        ? shortDate(dates[0])
        : `${shortDate(dates[0])}～${shortDate(dates[dates.length - 1])}`;
    const kinds = new Set(days.map((d) => d.kind ?? null));
    const only = kinds.size === 1 ? [...kinds][0] : undefined;
    const what =
      only === 'REST'
        ? '设为休息'
        : only === 'WORK'
          ? '设为上班'
          : only === null
            ? '恢复成默认排休'
            : '重新排休';
    const note = days.find((d) => d.note)?.note;
    return `把 ${span} ${what}${note ? `（${note}）` : ''}`;
  }
  if (p.kind === 'rest_weekdays') return `以后${weekdaysText(p.weekdays)}休息`;
  return (p.items ?? [])
    .map((i: any) => {
      if (i.kind === 'MISS') return `记一条未完成：${nodeTitleOf(i.nodeId)}`;
      if (i.kind === 'EXERCISE') return `主动锻炼，存 ${i.amount} 个储备`;
      if (i.kind === 'REPAY') return `还掉 ${i.amount} 个体能债`;
      if (i.kind === 'SPEND') return `花掉 ${i.amount} 元`;
      return `${nodeTitleOf(i.nodeId)} +${i.minutes} 分钟（${i.occurredOn}）`;
    })
    .join('；');
}

/**
 * 未来七天摊开成逐日的明细
 * @description 排期的后果是一张表不是一个数。不把这七天摊开，
 * 「改了排期」这四个字等于没说——人据此判断不了要不要点头
 */
function previewDetails(preview: any[]): DraftDetail[] {
  return (preview ?? []).map((d: any) => ({
    label: `${shortDate(d.date)} 周${WEEK_CN[d.weekday]}`,
    // 休息日那行要点明是日历压掉的，否则「不做」会被当成排期本身的意思
    value:
      (d.dayKind === 'REST' ? '休息日 · ' : '') +
      (d.active ? '做' : '不做') +
      ` · 当天 ${d.itemCount} 项 · 满分 ${d.fullScore} · 免债线 ${d.debtFreeScore}`,
  }));
}

/**
 * 砍掉一项牵连到什么，摊成几行
 * @description 砍掉是不可逆的一刀，只说「砍掉 X」看不出这一刀连着多少东西——
 * 子项会一并失效、投入的时间作废、上级方向可能就此空掉，都得摆在点头之前
 */
function impactDetails(impact: any): DraftDetail[] {
  if (!impact) return [];
  const out: DraftDetail[] = [];
  const kids: any[] = impact.descendants ?? [];
  if (kids.length)
    out.push({
      label: '连带',
      value: `${kids.length} 项一并失效：${kids.map((k) => k.title).join('、')}`,
    });
  if (impact.investedMinutes)
    out.push({
      label: '已投入',
      value:
        `${impact.investedMinutes} 分钟` +
        (impact.lastActivityOn ? ` · 最后动手 ${impact.lastActivityOn}` : ''),
    });
  (impact.ancestors ?? []).forEach((a: any) => {
    out.push({
      label: '上级',
      value: `「${a.title}」砍完只剩 ${a.remainingActiveChildren} 项在做`,
    });
  });
  return out;
}

/** 高风险草稿的一行明细 */
export interface DraftDetail {
  label: string;
  before?: string;
  after?: string;
  /** 只有一行内容、无前后之分时用 */
  value?: string;
}

/**
 * 高风险草稿要摊开的明细
 * @description 低风险草稿一句话说清就够，但删记录、覆盖内容这类
 * 光看一句"改了说明"根本无从判断对错——必须把改前改后摆在一起。
 * 低风险返回空数组，界面据此决定要不要展开
 */
export function draftDetails(draft: any): DraftDetail[] {
  const p = draft;
  if (!p) return [];

  if (p.kind === 'entity_patch') {
    // 逐字段摆前后：哪条改对了、哪条是模型自作主张，只有并排才看得出来
    const out: DraftDetail[] = (p.changes ?? []).map((c: PatchChange) => ({
      label: c.label,
      before: c.beforeText,
      after: c.afterText,
    }));
    // 路径是这一项在计划树里的位置，同名的两项只能靠它分辨
    if (p.path) out.push({ label: '位置', value: p.path });
    if (p.preview?.length) {
      out.push(...previewDetails(p.preview));
      out.push({ label: '影响', value: '只改往后排哪些天，已经记过的分不动' });
    }
    out.push(...impactDetails(p.impact));
    return out;
  }

  if (p.kind === 'undo') {
    return (p.events ?? []).map((e: any, i: number) => ({
      label: `第 ${i + 1} 条`,
      value: `${e.minutes} 分钟${e.note ? ` · ${e.note}` : ''}`,
    }));
  }

  if (p.kind === 'calendar') {
    // 哪天休息直接决定那天欠不欠债，一句「改了日历」核对不了对错，
    // 必须逐日摆出来——模型把 10-08 也当成假期这种错，只有列出来才看得见
    const out: DraftDetail[] = (p.days ?? []).map((d: any) => ({
      label: shortDate(d.date),
      value: kindText(d.kind) + (d.note ? ` · ${d.note}` : ''),
    }));
    out.push({
      label: '影响',
      value: '休息日不排非常驻项，也不欠债；做了照得分',
    });
    return out;
  }

  if (p.kind === 'rest_weekdays') {
    const out: DraftDetail[] = [
      p.before?.weekdays
        ? {
            label: '每周休',
            before: weekdaysText(p.before.weekdays),
            after: weekdaysText(p.weekdays),
          }
        : { label: '每周休', value: weekdaysText(p.weekdays) },
    ];
    out.push({
      label: '影响',
      value: '只改往后哪些天默认休息，单独设过的那几天不动',
    });
    return out;
  }

  return [];
}

/**
 * 把草稿真正写进去
 * @description 只在使用者点头之后调用。这里不做二次判断，
 * 该拦的在出草稿那一步就该拦住
 * @param draft 模型返回的草稿
 * @param api 带密钥的请求函数
 */
export async function applyDraft(
  draft: any,
  api: (path: string, init?: RequestInit) => Promise<any>,
): Promise<void> {
  const p = draft;
  if (p.kind === 'record') {
    for (const item of p.items) {
      await api('/life/events', { method: 'POST', body: JSON.stringify(item) });
    }
  } else if (p.kind === 'undo') {
    for (const e of p.events) {
      await api(`/life/events/${e.id}`, { method: 'DELETE' });
    }
  } else if (p.kind === 'check') {
    await api(`/life/plan/${p.nodeId}/check`, { method: 'POST' });
  } else if (p.kind === 'idea') {
    await api('/life/ideas', {
      method: 'POST',
      body: JSON.stringify({ content: p.content }),
    });
  } else if (p.kind === 'idea_conclude') {
    await api(`/life/ideas/${p.ideaId}/conclude`, {
      method: 'POST',
      body: JSON.stringify({ conclusion: p.conclusion }),
    });
  } else if (p.kind === 'log') {
    await api(`/life/plan/${p.nodeId}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text: p.text, ...(p.tag ? { tag: p.tag } : {}) }),
    });
  } else if (p.kind === 'research_log') {
    await api(`/life/ideas/${p.ideaId}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text: p.text }),
    });
  } else if (p.kind === 'book_add') {
    await api('/life/books', {
      method: 'POST',
      body: JSON.stringify({ title: p.title }),
    });
  } else if (p.kind === 'reading_log') {
    await api(`/life/books/${p.bookId}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text: p.text }),
    });
  } else if (p.kind === 'book_finish') {
    await api(`/life/books/${p.bookId}/finish`, { method: 'POST' });
  } else if (p.kind === 'idea_drop') {
    await api(`/life/ideas/${p.ideaId}`, { method: 'DELETE' });
  } else if (p.kind === 'entity_patch') {
    // 改哪个实体、哪个字段、改成什么，全在后端出草稿那一步定死了，
    // 这里原样转发。前端一旦按字段拆一次，等于把校验与白名单抄了第二份，
    // 后端加个可改字段就得记得回来同步——通用的意义正在于不必记得
    await api(p.apply.path, {
      method: p.apply.method,
      body: JSON.stringify(p.apply.body),
    });
  } else if (p.kind === 'plan_create') {
    // 落在哪一位是出草稿那一步算好的：新项的 sortOrder 加上被它挤开的兄弟们的新序号。
    // 两者必须同一发写进去，分两次发会出现中途重号的顺序
    await api('/life/plan', {
      method: 'POST',
      body: JSON.stringify({
        parentId: p.parentId,
        title: p.title,
        description: p.description,
        level: 'CHECKLIST',
        ...(p.sortOrder != null ? { sortOrder: p.sortOrder } : {}),
        ...(p.siblingsReorder ? { siblingsReorder: p.siblingsReorder } : {}),
      }),
    });
  } else if (p.kind === 'calendar') {
    // 整批一次写：几天的假期是一个决定，逐日发请求会出现改了一半的日历
    await api('/life/calendar', {
      method: 'PUT',
      body: JSON.stringify({ days: p.days }),
    });
  } else if (p.kind === 'rest_weekdays') {
    await api('/life/settings/rest-weekdays', {
      method: 'PUT',
      body: JSON.stringify({ weekdays: p.weekdays }),
    });
  } else {
    throw new Error(`还不认识这种草稿：${p.kind}`);
  }
}

/**
 * 流式问一句
 * @description 用 POST + 手动读流而不是 EventSource：后者只能发 GET、
 * 带不了请求头，密钥就只能塞进查询串落进访问日志。
 * 工具调用的结果是结构化的没什么可流，值得流的是纯提问时的回答
 * @param api 仅用来取基地址与密钥，实际请求在这里自己发
 * @param base 接口基地址
 * @param key 访问密钥
 * @param message 用户原话
 * @param onDelta 每收到一段文字就回调
 * @param history 之前几轮对话，让模型接得上上文
 * @param focusDate 被问到的那一天 YYYY-MM-DD，后端据此把那天的结算与事件塞进提示
 * @returns 最终的草稿或回答
 */
export async function askStream(
  base: string,
  key: string,
  message: string,
  onDelta: (text: string) => void,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  focusDate?: string,
): Promise<any> {
  const res = await fetch(`${base}/life/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-life-key': key },
    body: JSON.stringify({ message, history, ...(focusDate ? { focusDate } : {}) }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message || `请求失败 ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: any = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE 以空行分隔事件，最后一段可能不完整，留到下一轮
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const event = part.match(/^event: (.+)$/m)?.[1];
      const data = part.match(/^data: (.+)$/m)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === 'delta') onDelta(payload.text);
      else if (event === 'result') result = payload;
      else if (event === 'error') throw new Error(payload.message);
    }
  }
  if (!result) throw new Error('没拿到结果');
  return result;
}
