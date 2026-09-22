/**
 * AI 草稿的描述与执行
 * @description 模型返回的草稿有十来种，对话栏与就地浮层都要用。
 * 各写一份必然漂移——加一种意图只改了一处、另一处静默失效，
 * 这类 bug 在界面上表现为"说完没反应"，极难察觉。故收成这一份。
 */
import { shortDate } from './lifeFormat';

/** 会改动计划本身的草稿，比记一笔流水影响大，界面上要区别对待 */
const PLAN_KINDS = [
  'plan_update',
  'plan_create',
  'plan_drop',
  'daily_rule',
  'daily_schedule',
];

/**
 * 会删掉已有数据的草稿
 * @description 改日历与改每周默认排休也算在内——它们不删记录，但改哪天休息会
 * 连带改欠债，后者牵连的还是往后每一周，值得同一档的黄色确认
 */
const DESTRUCTIVE_KINDS = [
  'undo',
  'plan_drop',
  'idea_drop',
  'calendar',
  'rest_weekdays',
];

/** 星期编号转中文，0 是周日，与后端 weekdays 一致 */
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** 一天的安排说成两个字 */
function kindText(kind?: string | null): string {
  return kind === 'REST' ? '休息' : kind === 'WORK' ? '上班' : '恢复默认';
}

/** 一串星期编号说成「周六、周日」 */
function weekdaysText(weekdays?: number[]): string {
  const list = (weekdays ?? []).map((w) => `周${WEEK_CN[w]}`).join('、');
  return list || '一天都不';
}

/** 这条草稿是否动计划结构 */
export function touchesPlan(draft: any): boolean {
  return PLAN_KINDS.includes(draft?.kind);
}

/** 这条草稿是否会删掉东西 */
export function isDestructive(draft: any): boolean {
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
  if (p.kind === 'plan_update') {
    const parts = [
      p.title ? `标题改成「${p.title}」` : '',
      p.description ? `说明改成「${p.description}」` : '',
    ].filter(Boolean);
    return `改「${p.nodeTitle}」：${parts.join('，')}`;
  }
  if (p.kind === 'plan_create')
    return `在「${p.parentTitle}」下新增「${p.title}」`;
  if (p.kind === 'plan_drop') return `砍掉「${p.nodeTitle}」：${p.reason}`;
  if (p.kind === 'daily_rule') {
    const parts = [
      p.thresholdMinutes != null ? `达标改成 ${p.thresholdMinutes} 分钟` : '',
      p.points != null ? `分值改成 ${p.points} 分` : '',
    ].filter(Boolean);
    return `改「${p.nodeTitle}」的计分规则：${parts.join('，')}`;
  }
  if (p.kind === 'daily_schedule')
    return `改「${p.nodeTitle}」排哪些天：${p.summary?.before} → ${p.summary?.after}`;
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

  if (p.kind === 'plan_update') {
    const out: DraftDetail[] = [];
    if (p.title)
      out.push({ label: '标题', before: p.before?.title, after: p.title });
    if (p.description)
      out.push({
        label: '说明',
        before: p.before?.description || '（原本是空的）',
        after: p.description,
      });
    return out;
  }

  if (p.kind === 'undo') {
    return (p.events ?? []).map((e: any, i: number) => ({
      label: `第 ${i + 1} 条`,
      value: `${e.minutes} 分钟${e.note ? ` · ${e.note}` : ''}`,
    }));
  }

  if (p.kind === 'daily_rule') {
    const out: DraftDetail[] = [];
    if (p.thresholdMinutes != null)
      out.push({
        label: '达标时长',
        before: `${p.before.thresholdMinutes} 分钟`,
        after: `${p.thresholdMinutes} 分钟`,
      });
    if (p.points != null)
      out.push({
        label: '分值',
        before: `${p.before.points} 分`,
        after: `${p.points} 分`,
      });
    out.push({ label: '影响', value: '只改往后的计分，已经记过的分不动' });
    return out;
  }

  if (p.kind === 'plan_drop') {
    return [
      { label: '砍掉', value: p.nodeTitle },
      { label: '原因', value: p.reason },
    ];
  }

  if (p.kind === 'daily_schedule') {
    const out: DraftDetail[] = [
      { label: '排期', before: p.summary?.before, after: p.summary?.after },
    ];

    // 排期的后果是一张表不是一个数。不把这七天摊开，
    // 「改了排期」这四个字等于没说——人据此判断不了要不要点头
    (p.preview ?? []).forEach((d: any) => {
      out.push({
        label: `${shortDate(d.date)} 周${WEEK_CN[d.weekday]}`,
        // 休息日那行要点明是日历压掉的，否则「不做」会被当成排期本身的意思
        value:
          (d.dayKind === 'REST' ? '休息日 · ' : '') +
          (d.active ? '做' : '不做') +
          ` · 当天 ${d.itemCount} 项 · 满分 ${d.fullScore} · 免债线 ${d.debtFreeScore}`,
      });
    });

    out.push({ label: '影响', value: '只改往后排哪些天，已经记过的分不动' });
    return out;
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
  } else if (p.kind === 'plan_update') {
    await api(`/life/plan/${p.nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(p.title ? { title: p.title } : {}),
        ...(p.description ? { description: p.description } : {}),
      }),
    });
  } else if (p.kind === 'plan_create') {
    await api('/life/plan', {
      method: 'POST',
      body: JSON.stringify({
        parentId: p.parentId,
        title: p.title,
        description: p.description,
        level: 'CHECKLIST',
      }),
    });
  } else if (p.kind === 'daily_rule') {
    await api(`/life/plan/${p.nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(p.thresholdMinutes != null
          ? { thresholdMinutes: p.thresholdMinutes }
          : {}),
        ...(p.points != null ? { points: p.points } : {}),
      }),
    });
  } else if (p.kind === 'daily_schedule') {
    // 后端给的 schedule 是改后的完整排期，整份覆盖即可；
    // 「哪些字段没提要保留原值」已经在出草稿那一步合并过了
    const s = p.schedule ?? {};
    await api(`/life/plan/${p.nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(s.weekdays != null ? { weekdays: s.weekdays } : {}),
        ...(s.startOn ? { startOn: s.startOn } : {}),
        ...(s.endOn ? { endOn: s.endOn } : {}),
        ...(s.exceptDates != null ? { exceptDates: s.exceptDates } : {}),
        ...(s.onlyDates != null ? { onlyDates: s.onlyDates } : {}),
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
  } else if (p.kind === 'plan_drop') {
    await api(`/life/plan/${p.nodeId}/drop`, {
      method: 'POST',
      body: JSON.stringify({ reason: p.reason }),
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
