/**
 * 路线图的分段与「当前该做哪一项」
 * @description 从 lifePlanTree 抽出来，因为打卡卡上的「在这」问的是同一个问题。
 * 两处各算一份迟早会对不上——改完一项，一边跳到下一项另一边还停在原处，
 * 而这种不一致没有任何报错，只会让人照着错的那一处做事。
 */

/** 清单顺序即推进顺序，排序字段缺了当 0 处理 */
const byOrder = (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
const isDone = (n: any) => n.status === 'DONE';
const isDropped = (n: any) => n.status === 'DROPPED';

/**
 * 给一组清单项算出进度与"当前该做的那一个"
 * @description 手册规定清单顺序即依赖顺序，所以当前项不需要挑，
 * 就是第一个还没做完的
 */
function withProgress(group: { id: string; title: string; items: any[] }) {
  const live = group.items.filter((i) => !isDropped(i));
  const done = live.filter(isDone).length;
  const current = live.find((i) => !isDone(i));
  return {
    ...group,
    done,
    total: live.length,
    currentId: current?.id ?? '',
    allDone: live.length > 0 && done === live.length,
  };
}

/**
 * 把计划树拍平成"路段 → 组 → 项"三层
 * @description 数据里有两种形状：方向下直接挂清单项（数据库），
 * 或方向下先分组再挂项（AI 控制能力）。这里统一成后者，
 * 直挂的情况归入一个无名组，调用处便不必再分情况
 * @param plan /life/plan 返回的嵌套树
 * @returns 每个方向一段，带当前项 currentId、挂在它下面的每日项 daily 与总进度；
 * 没有清单项的方向不出现在结果里
 */
export function planSections(plan: any[]) {
  return (plan ?? [])
    .filter((n) => n.level === 'DIRECTION' && !isDropped(n))
    .sort(byOrder)
    .map((dir) => {
      const kids = [...(dir.children ?? [])].sort(byOrder);
      const loose = kids.filter((k) => k.level === 'CHECKLIST' && !isDropped(k));
      const subs = kids.filter((k) => k.level === 'DIRECTION' && !isDropped(k));
      const groups = [
        ...(loose.length
          ? [{ id: dir.id + ':direct', title: '', items: loose }]
          : []),
        ...subs.map((g) => ({
          id: g.id,
          title: g.title,
          items: (g.children ?? [])
            .filter((c: any) => c.level === 'CHECKLIST' && !isDropped(c))
            .sort(byOrder),
        })),
      ].map(withProgress);

      // 组间顺序同样是推进顺序，所以「在这」只落在第一个没做完的组里，
      // 每个方向只有一个当前点——满屏都是「在这」等于没有标记
      const activeGroup = groups.find((g) => !g.allDone);

      return {
        id: dir.id,
        title: dir.title,
        node: dir,
        currentId: activeGroup?.currentId ?? '',
        /** 挂在这个方向下的每日项，只作一行标注 */
        daily: kids.filter((k) => k.level === 'DAILY'),
        groups,
        done: groups.reduce((s, g) => s + g.done, 0),
        total: groups.reduce((s, g) => s + g.total, 0),
      };
    })
    .filter((s) => s.total > 0);
}
