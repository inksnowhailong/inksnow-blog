<script setup lang="ts">
/**
 * 就地问 AI 的小浮层
 * @description 页面上任何可操作的东西旁边都能唤起它：
 * 带上这个东西是什么，然后用人话说你想干嘛。
 * 桌面端锚在点击处，窄屏退化成底部抽屉——锚定在手机上必然溢出。
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import LifeIcon from './lifeIcon.vue';
import LifeDraftDetail from './lifeDraftDetail.vue';

const props = defineProps<{
  /** 为 null 时不显示 */
  anchor: { x: number; y: number } | null;
  /** 这次问的是什么，如「还掉 1 个体能债」 */
  title: string;
  /** 一行补充说明，通常是换算方式或做完标准 */
  context?: string;
  placeholder?: string;
  /** 不经模型的直接动作，如「直接记为已还」 */
  directLabel?: string;
  busy?: boolean;
  /** 模型的回话或执行结果 */
  reply?: string;
  /** 待确认的草稿描述，非空时必须点头才落库 */
  pendingText?: string;
  /** 这条草稿是否会删掉已有数据 */
  destructive?: boolean;
  /** 草稿原件，高风险时要摊开前后对照 */
  pending?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'send', text: string): void;
  (e: 'direct'): void;
  (e: 'confirm'): void;
  (e: 'discard'): void;
}>();

const text = ref('');
const box = ref<HTMLElement | null>(null);

/**
 * 挂载后才渲染 Teleport
 * @description 服务端没有 document.body，Teleport 在预渲染阶段留下的占位
 * 与客户端对不上，hydration 失配会让整棵子树渲染失败——表现为整页全白。
 * 开发服务器上看不出来，必须用生产构建验证
 */
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

/** 浮层宽度，定位时要用它算左边界 */
const WIDTH = 288;
/** 距视口边缘留出的空隙 */
const GAP = 8;

/** 内容撑开后的实际高度，定位要据此决定往上翻还是往下挂 */
const boxHeight = ref(0);

/**
 * 锚定位置
 * @description 贴在点击点的右下方；撞到右边就往左收，
 * 下方放不下就翻到点击点上方，仍放不下就贴顶并让内容自己滚。
 * 只夹左边界是不够的——草稿明细一出现高度就翻倍，
 * 确认按钮会被顶到屏幕外点不到
 */
const style = computed(() => {
  if (!props.anchor) return {};
  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
  const left = Math.min(Math.max(GAP, props.anchor.x), vw - WIDTH - GAP);

  const h = boxHeight.value || 160;
  const below = props.anchor.y + GAP;
  const top =
    below + h <= vh - GAP
      ? below
      : // 下面放不下就翻到上方；上方也放不下就贴顶
        Math.max(GAP, Math.min(props.anchor.y - h - GAP, vh - h - GAP));

  return {
    left: `${left}px`,
    top: `${top}px`,
    maxHeight: `${vh - GAP * 2}px`,
  };
});

/** 内容变了就重新量高度，否则翻转判断用的是上一次的尺寸 */
async function measure() {
  await nextTick();
  boxHeight.value = box.value?.offsetHeight ?? 0;
}

watch(
  () => props.anchor,
  async (v) => {
    if (!v) return;
    text.value = '';
    boxHeight.value = 0;
    await nextTick();
    box.value?.querySelector('input')?.focus();
    await measure();
  },
);

// 草稿与回话都会让高度翻倍，变了就重新定位
watch(() => [props.pendingText, props.reply, props.busy], measure);

function send() {
  if (!text.value.trim() || props.busy) return;
  emit('send', text.value.trim());
  text.value = '';
}
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <div
      v-if="anchor"
      data-alt="ask-mask"
      class="fixed inset-0 z-[60]"
      @click.self="emit('close')"
    >
      <div
        ref="box"
        data-alt="ask-box"
        class="fixed bottom-0 left-0 right-0 overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800 sm:bottom-auto sm:right-auto sm:w-72 sm:rounded-xl [&_li]:!my-0 [&_p]:!my-0 [&_ul]:!m-0 [&_ul]:!list-none [&_ul]:!p-0"
        :style="style"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p
              class="truncate text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              {{ title }}
            </p>
            <p
              v-if="context"
              class="mt-0.5 text-[11px] leading-snug text-slate-400"
            >
              {{ context }}
            </p>
          </div>
          <button
            type="button"
            title="关闭"
            aria-label="关闭"
            class="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="emit('close')"
          >
            <LifeIcon name="close" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="flex gap-1.5">
          <input
            v-model="text"
            data-alt="ask-input"
            type="text"
            :placeholder="placeholder || '说点什么'"
            class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            @keydown.enter.prevent="send"
          />
          <button
            data-alt="ask-send"
            type="button"
            :disabled="busy || !text.trim()"
            title="交给 AI"
            aria-label="交给 AI"
            class="grid shrink-0 place-items-center rounded-lg bg-brand-500 px-2.5 text-white transition hover:bg-brand-600 disabled:opacity-40"
            @click="send"
          >
            <LifeIcon
              name="send"
              class="h-3.5 w-3.5"
              :class="busy && 'animate-pulse'"
            />
          </button>
        </div>

        <!-- 等模型回话时给个明确的状态，光靠按钮上的小图标看不出来 -->
        <p
          v-if="busy"
          data-alt="ask-thinking"
          class="mt-2 flex items-center gap-1.5 text-xs text-slate-400"
        >
          <span
            class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400"
          />正在想…
        </p>

        <!-- 待确认：模型的理解摆出来，点了才算 -->
        <div
          v-if="pendingText"
          data-alt="ask-pending"
          class="mt-2 rounded-lg border p-2.5"
          :class="
            destructive
              ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
              : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          "
        >
          <p
            class="text-xs leading-snug"
            :class="
              destructive
                ? 'text-rose-900 dark:text-rose-200'
                : 'text-amber-900 dark:text-amber-200'
            "
          >
            {{ pendingText }}
          </p>
          <LifeDraftDetail :draft="pending" />

          <div class="mt-2 flex gap-1.5">
            <button
              data-alt="ask-confirm"
              type="button"
              :disabled="busy"
              title="确认执行"
              aria-label="确认执行"
              class="grid h-7 w-7 place-items-center rounded-md text-white transition disabled:opacity-50"
              :class="
                destructive
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : 'bg-amber-500 hover:bg-amber-600'
              "
              @click="emit('confirm')"
            >
              <LifeIcon name="check" class="h-3.5 w-3.5" />
            </button>
            <button
              data-alt="ask-discard"
              type="button"
              title="理解错了，丢弃"
              aria-label="丢弃"
              class="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white dark:hover:bg-slate-800"
              @click="emit('discard')"
            >
              <LifeIcon name="close" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button
          v-if="directLabel && !pendingText"
          data-alt="ask-direct"
          type="button"
          :disabled="busy"
          class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 text-xs text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
          @click="emit('direct')"
        >
          <LifeIcon name="check" class="h-3.5 w-3.5" />
          {{ directLabel }}
        </button>

        <p
          v-if="reply"
          data-alt="ask-reply"
          class="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
        >
          {{ reply }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
