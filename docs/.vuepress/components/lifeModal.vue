<script lang="ts">
/**
 * 同时开着的弹窗层数
 * @description 问 AI 弹窗可以叠在研究线/节点弹窗之上，关掉上面那层时底下那层还开着，
 * 若各自无条件开关 body 的滚动锁，上层一关底层就能滚了——所以按层数记账，
 * 归零才解锁。模块级变量，三个弹窗共用同一个计数
 */
let openLayers = 0;

/**
 * 开关页面滚动锁
 * @param on 这一层是开还是关
 */
function lockScroll(on: boolean) {
  openLayers = Math.max(0, openLayers + (on ? 1 : -1));
  document.body.classList.toggle('overflow-hidden', openLayers > 0);
}
</script>

<script setup lang="ts">
/**
 * 弹窗外壳
 * @description 全页三个弹窗（问 AI、研究线、节点）共用这一份壳：遮罩、抽屉形态、
 * Esc 与遮罩点击关闭、body 滚动锁、头部与底栏的版式。
 *
 * 之前这些逻辑在三个弹窗里各写一遍，于是三处的关闭钮不在同一个位置、
 * 头部图标行不等高、底栏一个用灰按钮一个用实心钮——同一个壳长出三张脸。
 *
 * 版式只有一种：手机贴底抽屉（抓手 + 安全区 + 85vh 封顶），桌面居中对话框。
 * 正文是唯一的滚动区，头部与底栏固定在两端。
 */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** 为 false 时整个弹窗不渲染 */
  open: boolean;
  /** 头部主文案，研究线的原话可能换行，故按多行排版 */
  title?: string;
  /** 标题下一行小字，如面包屑或「09-22 · 在动」 */
  meta?: string;
  /**
   * 这一层可能叠在别的弹窗之上
   * @description 为 true 时 Esc 先标记 defaultPrevented，底下那层看到标记就不动，
   * 一下 Esc 只关最上面一层；为 false 的层则反过来，见到标记就跳过
   */
  top?: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

/**
 * 挂载后才渲染 Teleport
 * @description 服务端没有 document.body，Teleport 在预渲染阶段留下的占位
 * 与客户端对不上，hydration 失配会让整棵子树渲染失败——表现为整页全白。
 * 开发服务器上看不出来，必须用生产构建验证
 */
const mounted = ref(false);

onMounted(() => {
  mounted.value = true;
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  if (props.open) lockScroll(false);
});

/** Esc 关掉，与点遮罩等价；叠层时谁在上面谁先吃掉这一下 */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !props.open) return;
  if (props.top) e.preventDefault();
  else if (e.defaultPrevented) return;
  emit('close');
}

// 抽屉几乎占满屏幕，底下的页面还能滚会让人以为弹窗失灵
watch(
  () => props.open,
  (v) => lockScroll(v),
);
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <!--
      z 抬到 110：主题的「回到顶部」按钮是 z-index:100 的固定元素，
      弹窗低于它会被它盖住——手机上它正好压在底栏按钮上
    -->
    <div
      v-if="open"
      data-alt="modal-mask"
      class="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <!-- 手机上是贴底抽屉，底部留出安全区，否则底栏会压在小白条底下 -->
      <div
        data-alt="modal"
        class="flex max-h-[85vh] w-full flex-col gap-3 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-slate-800 sm:max-w-lg sm:rounded-2xl sm:pb-4 [&_li]:!my-0 [&_p]:!my-0 [&_ul]:!m-0 [&_ul]:!list-none [&_ul]:!p-0"
      >
        <!-- 窄屏给一条抓手，让人一眼看出这是可以划走的抽屉 -->
        <div
          data-alt="modal-grabber"
          class="mx-auto h-1 w-9 shrink-0 rounded-full bg-slate-200 dark:bg-slate-600 sm:hidden"
        />

        <div
          data-alt="modal-head"
          class="flex shrink-0 items-start justify-between gap-2"
        >
          <div class="min-w-0">
            <p
              data-alt="modal-title"
              class="whitespace-pre-wrap text-base font-semibold leading-snug text-slate-800 dark:text-slate-100"
            >
              {{ title }}
            </p>
            <p
              v-if="meta"
              data-alt="modal-meta"
              class="mt-1 truncate text-xs leading-snug text-slate-400 dark:text-slate-500"
            >
              {{ meta }}
            </p>
          </div>

          <!-- relative 是给 icons 里的下拉菜单定位用的，菜单挂在这一行下面 -->
          <div class="relative flex shrink-0 items-center gap-0.5">
            <slot name="icons" />
            <button
              data-alt="modal-close"
              type="button"
              title="关闭"
              aria-label="关闭"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
              @click="emit('close')"
            >
              <LifeIcon name="close" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- 正文：整个弹窗里唯一会滚的一段 -->
        <div
          data-alt="modal-body"
          class="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto"
        >
          <slot />
        </div>

        <!--
          底栏：一条横线把「看」和「做」分开。
          约定是右侧一个实心主按钮、左侧文字次按钮；研究线还要在按钮行上面
          摆一条输入栏，故这里按纵向排，每一行由调用处自己横排
        -->
        <div
          v-if="$slots.foot"
          data-alt="modal-foot"
          class="grid shrink-0 gap-2 border-t border-slate-100 pt-3 dark:border-slate-700"
        >
          <slot name="foot" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
