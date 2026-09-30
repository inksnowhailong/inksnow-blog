<script setup lang="ts">
/**
 * 可拖动的分钟进度条
 * @description 原先靠「+15 / 拖钮」加分钟，想改小或直接定到某个数得先清零再记。
 * 这条进度条本身就是输入：按住在条上左右拖（横向位移超过 8px 才算拖动，点一下不改值），
 * 横坐标映射到 0..满格 分钟，按 5 分钟吸附，拖的过程中条宽和气泡实时跟着变，
 * 松手才 emit('set')，由面板去把当天分钟「定」到这个数。
 * 已超额时满格取已记值，避免一碰就把超额砍回阈值。
 */
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 当前已记分钟（可能超过阈值） */
    minutes: number;
    /** 达标阈值分钟，也是拖动的上限 */
    threshold: number;
    /** 是否已达标，决定条的颜色深浅 */
    reached?: boolean;
    disabled?: boolean;
    /** 吸附的分钟档 */
    step?: number;
  }>(),
  { reached: false, step: 5 },
);

const emit = defineEmits<{
  /** 松手时定下来的目标分钟数 */
  (e: 'set', minutes: number): void;
}>();

/** 可拖区域（条本身），换算横坐标用 */
const track = ref<HTMLElement | null>(null);
/** 拖动中的目标分钟；null 表示没在拖 */
const dragValue = ref<number | null>(null);
/** 按下时的横坐标；null 表示没按着。位移够了才算拖动，免得一碰就改值 */
const startX = ref<number | null>(null);
/** 位移超过这个像素数才进入拖动 */
const DRAG_THRESHOLD_PX = 8;

/**
 * 条的满格分钟
 * @description 已记的超过阈值时取已记值向上吸附到档位，
 * 这样条不会把超额画爆，也不会一碰就把超额砍回阈值
 */
const scale = computed(() =>
  Math.ceil(Math.max(props.threshold, props.minutes) / props.step) * props.step,
);

/** 条上显示的分钟：拖动中看目标，否则看已记 */
const shown = computed(() => dragValue.value ?? props.minutes);

/** 条宽百分比 */
const pct = computed(() =>
  scale.value > 0 ? Math.min(100, (shown.value / scale.value) * 100) : 0,
);

/** 把指针横坐标换成吸附后的分钟数，0..满格 */
function toMinutes(clientX: number) {
  const rect = track.value!.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const snapped = Math.round((ratio * scale.value) / props.step) * props.step;
  return Math.min(scale.value, snapped);
}

/** 按下只记起点，不改值 */
function onDown(e: PointerEvent) {
  if (props.disabled) return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  startX.value = e.clientX;
}

function onMove(e: PointerEvent) {
  if (startX.value === null) return;
  if (dragValue.value === null && Math.abs(e.clientX - startX.value) <= DRAG_THRESHOLD_PX) return;
  dragValue.value = toMinutes(e.clientX);
}

function onUp(e: PointerEvent) {
  if (startX.value === null) return;
  const target = dragValue.value;
  startX.value = null;
  dragValue.value = null;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  // 没拖过就松手＝什么都不做；拖了但没变也不打扰后端
  if (target !== null && target !== props.minutes) emit('set', target);
}

/** 取消（系统打断，如浏览器接管纵向滚动）不提交 */
function onCancel() {
  startX.value = null;
  dragValue.value = null;
}
</script>

<template>
  <!-- 外层留足触控高度，视觉上的条仍然很细 -->
  <div
    data-alt="minute-bar"
    class="relative flex h-6 touch-pan-y select-none items-center px-1.5"
    :class="disabled ? 'opacity-40' : 'cursor-ew-resize'"
    :title="disabled ? '' : '按住左右拖，定到多少分钟'"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
  >
    <div
      ref="track"
      data-alt="minute-bar-track"
      class="relative h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700"
    >
      <div
        data-alt="minute-bar-fill"
        class="h-full rounded-full"
        :class="[
          dragValue === null ? 'transition-all' : '',
          reached || dragValue !== null
            ? 'bg-brand-500 dark:bg-brand-300'
            : 'bg-brand-500/50',
        ]"
        :style="{ width: pct + '%' }"
      />
      <!-- 末端圆点把手：指示这里能拖 -->
      <span
        data-alt="minute-bar-handle"
        aria-hidden="true"
        class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white shadow-sm dark:border-brand-300 dark:bg-slate-800"
        :class="dragValue === null ? 'transition-all' : ''"
        :style="{ left: pct + '%' }"
      />
      <!-- 拖动时浮在把手上方的目标分钟 -->
      <span
        v-if="dragValue !== null"
        data-alt="minute-bar-bubble"
        class="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[11px] tabular-nums text-white dark:bg-slate-100 dark:text-slate-900"
        :style="{ left: pct + '%' }"
      >
        {{ dragValue }} 分钟
      </span>
    </div>
  </div>
</template>
