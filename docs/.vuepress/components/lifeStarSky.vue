<script setup lang="ts">
/**
 * 星图
 * @description 每个方向一个星座，每条「搞懂 / 卡点」一颗星。
 * 这是"总体在变好"的那一眼：它只会越来越满，任何一天都不会掉下来。
 * 布局是确定性的（同样的数据画出同样的图），星的位置由所在星座与序号决定，
 * 不用力导向——每次打开都变样会让人失去"这是我的天"的感觉。
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  /** /life/learning/sky 的返回 */
  sky: any;
}>();

const emit = defineEmits<{
  /** 点了某个星座 */
  (e: 'select', directionId: string): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const wrap = ref<HTMLDivElement | null>(null);

/** 最近几天内的新星带光晕 */
const GLOW_DAYS = 7;

/** 每个星座在画布上的中心与半径，按索引环形铺开 */
interface Placed {
  id: string;
  title: string;
  cx: number;
  cy: number;
  r: number;
  stars: Array<{ x: number; y: number; tag: string; recent: boolean }>;
}

/** 简单确定性伪随机，让星在星座内散开但每次一样 */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function daysAgo(date: string): number {
  return Math.round((Date.now() - Date.parse(`${date}T00:00:00+08:00`)) / 86400000);
}

/** 算出全部星座与星的坐标 */
function layout(w: number, h: number): Placed[] {
  const dirs: any[] = props.sky?.directions ?? [];
  if (!dirs.length) return [];
  const n = dirs.length;
  const cx0 = w / 2;
  const cy0 = h / 2;
  // 半径预算 R + r + 标签 必须 ≤ h/2，否则最下面的星座画到画布外
  const R = Math.min(w, h) * (n === 1 ? 0 : 0.26);
  const r = Math.min(w, h) * (n === 1 ? 0.34 : Math.min(0.17, 0.7 / n));
  return dirs.map((d, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cx = cx0 + R * Math.cos(a);
    const cy = cy0 + R * Math.sin(a);
    const stars = (d.stars ?? []).map((s: any, k: number) => {
      // 从中心向外螺旋：越早的越靠里，新的长在外圈
      const t = k + 1;
      const rad = r * Math.min(1, Math.sqrt(t / Math.max(8, (d.stars ?? []).length + 2)));
      const ang = t * 2.399963 + hash01(s.id) * 0.6; // 黄金角
      return {
        x: cx + rad * Math.cos(ang),
        y: cy + rad * Math.sin(ang),
        tag: s.tag,
        recent: daysAgo(s.occurredOn) <= GLOW_DAYS,
      };
    });
    return { id: d.id, title: d.title, cx, cy, r, stars };
  });
}

let placed: Placed[] = [];

/** 画一遍 */
function draw() {
  const el = canvas.value;
  const box = wrap.value;
  if (!el || !box) return;
  const dpr = window.devicePixelRatio || 1;
  const w = box.clientWidth;
  const h = Math.max(220, Math.round(w * 0.55));
  el.width = w * dpr;
  el.height = h * dpr;
  el.style.height = h + 'px';
  const ctx = el.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 夜空底
  const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, '#111a2e');
  g.addColorStop(1, '#070b14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 背景微尘，固定种子
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 90; i++) {
    const x = hash01('dx' + i) * w;
    const y = hash01('dy' + i) * h;
    ctx.fillRect(x, y, 1, 1);
  }

  placed = layout(w, h);
  placed.forEach((c) => {
    // 星座轮廓：把星按顺序连一条淡线
    if (c.stars.length > 1) {
      ctx.strokeStyle = 'rgba(148,163,184,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      c.stars.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
      ctx.stroke();
    }
    // 星
    c.stars.forEach((s) => {
      const dim = s.tag === 'STUCK';
      const size = dim ? 1.6 : 2.4;
      if (s.recent && !dim) {
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 12);
        glow.addColorStop(0, 'rgba(147,197,253,0.55)');
        glow.addColorStop(1, 'rgba(147,197,253,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = dim ? 'rgba(148,163,184,0.45)' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    // 星座名
    ctx.fillStyle = 'rgba(203,213,225,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${c.title} · ${c.stars.length}`, c.cx, c.cy + c.r + 12);
  });

  if (!placed.length) {
    ctx.fillStyle = 'rgba(203,213,225,0.6)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('还没有星。搞懂一个点，这里就亮一颗', w / 2, h / 2);
  }
}

/** 点击落在哪个星座 */
function onClick(e: MouseEvent) {
  const el = canvas.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const hit = placed.find((c) => Math.hypot(x - c.cx, y - c.cy) <= c.r + 18);
  if (hit) emit('select', hit.id);
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  draw();
  ro = new ResizeObserver(() => draw());
  if (wrap.value) ro.observe(wrap.value);
});
onBeforeUnmount(() => ro?.disconnect());
watch(() => props.sky, () => draw(), { deep: true });

/** 汇总行 */
const totals = computed(() => props.sky?.totals ?? { stars: 0, hours: 0, weekStreak: 0 });
</script>

<template>
  <div data-alt="star-sky" ref="wrap" class="w-full">
    <canvas
      ref="canvas"
      data-alt="star-sky-canvas"
      class="block w-full cursor-pointer rounded-2xl"
      @click="onClick"
    />
    <p
      data-alt="star-sky-totals"
      class="mt-2 text-center text-[11px] tabular-nums text-slate-500 dark:text-slate-400"
    >
      至今 {{ totals.stars }} 颗星 · 投入 {{ totals.hours }} 小时 · 连续 {{ totals.weekStreak }} 周有新星
    </p>
  </div>
</template>
