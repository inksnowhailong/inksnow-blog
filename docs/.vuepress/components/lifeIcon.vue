<script setup lang="ts">
/**
 * 行内图标
 * @description 只画路径不带尺寸，大小与颜色交给调用处的 class 决定。
 * 自己维护一份最小集合，免得为十来个图标引一整个图标库。
 */
defineProps<{
  /** 图标名，取自下面的 PATHS */
  name: keyof typeof PATHS;
}>();

/** 24×24 网格上的描边路径，与 Lucide 同一套画法 */
const PATHS = {
  /** 打勾：完成、保存、采纳 */
  check: ['M20 6 9 17l-5-5'],
  /** 叉：关闭、否定 */
  close: ['M18 6 6 18', 'M6 6l12 12'],
  /** 纸飞机：发送 */
  send: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4z'],
  /** 星芒：交给 AI 处理 */
  sparkle: ['M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5 10.1 7.6z'],
  /** 垃圾桶：砍掉 */
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14'],
  /** 回转箭头：回到今天 */
  undo: ['M3 3v6h6', 'M3.5 13a9 9 0 1 0 2.6-6.4L3 9'],
  /** 靶心：一键补到达标 */
  target: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  ],
  /** 下箭头：展开 */
  down: ['m6 9 6 6 6-6'],
  /** 上箭头：收起 */
  up: ['m18 15-6-6-6 6'],
  /** 左箭头：前一天 */
  left: ['m15 18-6-6 6-6'],
  /** 右箭头：后一天 */
  right: ['m9 18 6-6-6-6'],
  /** 右向箭头：进入 */
  enter: ['M5 12h14', 'm13 6 6 6-6 6'],
  /** 铅笔：手动编辑 */
  pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  /** 上升箭头：比昨天好 */
  rise: ['m4 17 6-6 4 4 6-8', 'M16 7h4v4'],
  /** 下降箭头：比昨天差 */
  fall: ['m4 7 6 6 4-4 6 8', 'M16 17h4v-4'],
  /** 横线：与昨天持平 */
  flat: ['M5 12h14'],
  /** 横排三点：更多操作 */
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
} as const;
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in PATHS[name]" :key="i" :d="d" />
  </svg>
</template>
