/**
 * AI 草稿的描述与执行
 * @description 模型返回的草稿有十来种，对话栏与就地浮层都要用。
 * 各写一份必然漂移——加一种意图只改了一处、另一处静默失效，
 * 这类 bug 在界面上表现为"说完没反应"，极难察觉。故收成这一份。
 */

/** 会改动计划本身的草稿，比记一笔流水影响大，界面上要区别对待 */
const PLAN_KINDS = ['plan_update', 'plan_create', 'plan_drop'];

/** 会删掉已有数据的草稿 */
const DESTRUCTIVE_KINDS = ['undo', 'plan_drop'];

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
  if (p.kind === 'note')
    return `给「${p.ideaContent}」写研究笔记：${p.note?.question ?? ''}`;
  if (p.kind === 'log') return `给「${p.nodeTitle}」记一条：${p.text}`;
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

  if (p.kind === 'plan_drop') {
    return [
      { label: '砍掉', value: p.nodeTitle },
      { label: '原因', value: p.reason },
    ];
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
  } else if (p.kind === 'note') {
    await api(`/life/ideas/${p.ideaId}/note`, {
      method: 'POST',
      body: JSON.stringify(p.note),
    });
  } else if (p.kind === 'log') {
    await api(`/life/plan/${p.nodeId}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text: p.text }),
    });
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
  } else if (p.kind === 'plan_drop') {
    await api(`/life/plan/${p.nodeId}/drop`, {
      method: 'POST',
      body: JSON.stringify({ reason: p.reason }),
    });
  } else {
    throw new Error(`还不认识这种草稿：${p.kind}`);
  }
}
