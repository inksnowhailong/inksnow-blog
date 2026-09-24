<script setup lang="ts">
/**
 * 拖着定分钟的打卡钮
 * @description 固定的 +15 / +30 对不上真实投入：做了 25 分钟只能记 15 或 30。
 * 这个钮点一下记默认值，按住左右拖就按 5 分钟一档改数，松手即记；
 * 拖的过程中数字实时跟着变，不用先点开输入框再敲。
 */
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 点一下（没拖）记多少 */
    base?: number;
    /** 拖动的下限与上限 */
    min?: number;
    max?: number;
    /** 每档几分钟 */
    step?: number;
    /** 拖多少像素算一档 */
    pxPerStep?: number;
    disabled?: boolean;
  }>(),
  { base: 15, min: 5, max: 180, step: 5, pxPerStep: 10 },
);

const emit = defineEmits<{
  /** 松手时定下来的分钟数 */
  (e: 'commit', minutes: number): void;
}>();

/** 当前显示的分钟数 */
const value = ref(props.base);
/** 是否正按着 */
const dragging = ref(false);
/** 按下时的横坐标 */
let startX = 0;
/** 这次按下有没有真的拖过——没拖过就是点一下 */
let moved = false;

function clamp(n: number) {
  return Math.min(props.max, Math.max(props.min, n));
}

function onDown(e: PointerEvent) {
  if (props.disabled) return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  dragging.value = true;
  moved = false;
  startX = e.clientX;
  value.value = props.base;
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return;
  const steps = Math.round((e.clientX - startX) / props.pxPerStep);
  if (steps !== 0) moved = true;
  value.value = clamp(props.base + steps * props.step);
}

function onUp(e: PointerEvent) {
  if (!dragging.value) return;
  dragging.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  emit('commit', moved ? value.value : props.base);
  value.value = props.base;
}

/** 键盘也能调：左右改一档，回车记 */
function onKey(e: KeyboardEvent) {
  if (props.disabled) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    value.value = clamp(value.value + props.step);
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    value.value = clamp(value.value - props.step);
    e.preventDefault();
  } else if (e.key === 'Enter' || e.key === ' ') {
    emit('commit', value.value);
    value.value = props.base;
    e.preventDefault();
  }
}
</script>

<template>
  <button
    data-alt="minute-dial"
    type="button"
    :disabled="disabled"
    :title="`点一下记 ${base} 分钟，按住左右拖改数`"
    class="relative inline-flex h-10 cursor-ew-resize select-none touch-none items-center gap-1 rounded-lg border border-dashed px-2.5 text-sm tabular-nums transition disabled:opacity-40 sm:h-auto sm:rounded sm:px-1.5 sm:py-0.5 sm:text-xs"
    :class="
      dragging
        ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-slate-900'
        : 'border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-300 dark:hover:text-brand-300'
    "
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @keydown="onKey"
  >
    <!-- 两侧的小箭头是"能左右拖"的标记，不然它和普通按钮长得一样 -->
    <span aria-hidden="true" class="text-[10px] opacity-60">◂</span>
    +{{ value }}
    <span aria-hidden="true" class="text-[10px] opacity-60">▸</span>
    <!-- 拖的时候在钮上方浮一条提示，告诉人往哪边拖是加 -->
    <span
      v-if="dragging"
      data-alt="dial-hint"
      class="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[11px] text-white dark:bg-slate-100 dark:text-slate-900"
    >
      ← 少 · {{ value }} 分钟 · 多 →
    </span>
  </button>
</template>
