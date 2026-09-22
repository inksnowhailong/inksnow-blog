/**
 * life 页的日期工具
 * @description 全是纯函数，没有状态也不碰接口。收在一处是因为它们原先在面板、
 * 研究线行、读书行里各抄了一份——同一套算法散在三个文件里，改一处另两处
 * 静默漂移，而漂移出来的是"日期显示不一样"这种没人会去查的毛病。
 */

/** 页面认的时区，账本以这一条时间线为准 */
const ZONE = 'Asia/Shanghai';

/** 今天的日期 YYYY-MM-DD */
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE }).format(new Date());
}

/**
 * 日期加减天数
 * @param date YYYY-MM-DD
 * @param days 正数往后、负数往前
 */
export function shiftDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 取某日期是星期几
 * @param date YYYY-MM-DD
 * @returns 0 是周日，与后端 weekdays 的编号一致
 */
export function weekdayOf(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay();
}

/**
 * 距今多久
 * @description 只到「天」这一档：列表要回答的是「这条线、这本书搁了多久」，
 * 精确到小时对这个判断没有帮助
 * @param date YYYY-MM-DD，取不到时返回空串
 */
export function daysAgoLabel(date?: string): string {
  if (!date) return '';
  const diff = Math.round(
    (Date.parse(today() + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) /
      86400000,
  );
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  return `${diff} 天前`;
}
