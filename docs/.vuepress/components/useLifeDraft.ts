/**
 * AI 草稿的描述与执行
 * @description 模型返回的草稿有十来种，对话栏与就地浮层都要用。
 * 各写一份必然漂移——加一种意图只改了一处、另一处静默失效，
 * 这类 bug 在界面上表现为"说完没反应"，极难察觉。故收成这一份。
 */

/** 会改动计划本身的草稿，比记一笔流水影响大，界面上要区别对待 */
const PLAN_KINDS = [
  'plan_update',
  'plan_create',
  'plan_drop',
  'daily_rule',
  'daily_schedule',
];

/** 会删掉已有数据的草稿 */
const DESTRUCTIVE_KINDS = ['undo', 'plan_drop', 'idea_drop'];

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
  if (p.kind === 'idea') return `记下想法：${p.content}`;
  if (p.kind === 'idea_conclude')
    return `给「${p.ideaContent}」写结论收尾：${p.conclusion}`;
  if (p.kind === 'log') return `给「${p.nodeTitle}」记一条：${p.text}`;
  if (p.kind === 'research_log')
    return `给研究「${p.ideaContent}」记一条进展：${p.text}`;
  if (p.kind === 'idea_drop')
    return (
      `删掉想法「${p.ideaContent}」` +
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
    const week = ['日', '一', '二', '三', '四', '五', '六'];
    (p.preview ?? []).forEach((d: any) => {
      out.push({
        label: `${d.date.slice(5)} 周${week[d.weekday]}`,
        value:
          (d.active ? '做' : '不做') +
          ` · 当天 ${d.itemCount} 项 · 满分 ${d.fullScore} · 免债线 ${d.debtFreeScore}`,
      });
    });

    out.push({ label: '影响', value: '只改往后排哪些天，已经记过的分不动' });
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
      body: JSON.stringify({ text: p.text }),
    });
  } else if (p.kind === 'research_log') {
    await api(`/life/ideas/${p.ideaId}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text: p.text }),
    });
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
 * @returns 最终的草稿或回答
 */
export async function askStream(
  base: string,
  key: string,
  message: string,
  onDelta: (text: string) => void,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<any> {
  const res = await fetch(`${base}/life/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-life-key': key },
    body: JSON.stringify({ message, history }),
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
