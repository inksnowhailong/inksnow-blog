<script setup lang="ts">
/**
 * 问 AI 的统一弹窗
 * @description 全页只有这一个经 AI 的对话外壳：打卡条目、体能债、研究线、
 * 计划节点、右下角悬浮按钮，唤起的都是它，区别只在顶上那行上下文标签。
 *
 * 之前是三套——就地浮层、常驻对话栏、节点弹窗里的 AI 改写条，各自一份输入框
 * 与草稿确认。同一件事有三个入口，人得先想"这句话该往哪个框里写"。
 *
 * 形态按端分：桌面居中对话框，手机贴底抽屉。不再做锚定定位——
 * 锚在点击处只在宽屏站得住，窄屏必然溢出，两套定位换来的只是"贴着那个东西"。
 */
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import LifeIcon from './lifeIcon.vue';
import LifeAskPanel from './lifeAskPanel.vue';

/** 一轮对话，role 与后端历史字段同名 */
interface AskTurn {
  role: 'user' | 'assistant';
  content: string;
}

const props = defineProps<{
  /** 为 false 时不渲染 */
  open: boolean;
  /** 这次在问哪件事，空则是没有上下文的随便问 */
  title: string;
  /** 一行补充说明，通常是换算方式或做完标准 */
  context?: string;
  placeholder?: string;
  /** 不经模型的直接动作，如「直接记为已还」 */
  directLabel?: string;
  busy?: boolean;
  /** 正在吐字的回话，或一句执行结果 */
  reply?: string;
  /** 本次打开期间的多轮记录 */
  log: AskTurn[];
  /** 待确认的草稿描述，非空时必须点头才落库 */
  pendingText?: string;
  /** 草稿卡顶部的额外提醒，如「改错了可以在最近改动里撤销」 */
  pendingNote?: string;
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
const logBox = ref<HTMLElement | null>(null);

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
  document.body.classList.remove('overflow-hidden');
});

/** Esc 关掉，与点遮罩等价 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close');
}

// 抽屉几乎占满屏幕，底下的页面还能滚会让人以为弹窗失灵
watch(
  () => props.open,
  async (v) => {
    document.body.classList.toggle('overflow-hidden', v);
    if (!v) return;
    text.value = '';
    await nextTick();
    box.value?.querySelector('textarea')?.focus();
  },
);

// 新回话要能自己露出来，否则得手动往下滚才看得见模型说了什么
watch(
  () => [props.log.length, props.reply],
  async () => {
    await nextTick();
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
  },
);

function send() {
  if (!text.value.trim() || props.busy) return;
  emit('send', text.value.trim());
  text.value = '';
}
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <div
      v-if="open"
      data-alt="ask-modal-mask"
      class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <div
        ref="box"
        data-alt="ask-modal"
        class="flex max-h-[85vh] w-full flex-col gap-3 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-slate-800 sm:max-w-lg sm:rounded-2xl sm:pb-4 [&_li]:!my-0 [&_p]:!my-0 [&_ul]:!m-0 [&_ul]:!list-none [&_ul]:!p-0"
      >
        <!-- 窄屏给一条抓手，让人一眼看出这是可以划走的抽屉 -->
        <div
          data-alt="ask-modal-grabber"
          class="mx-auto h-1 w-9 shrink-0 rounded-full bg-slate-200 dark:bg-slate-600 sm:hidden"
        />

        <!-- 上下文标签：这一次在问哪件事，没有上下文就明说随便说 -->
        <div
          data-alt="ask-modal-head"
          class="flex shrink-0 items-start justify-between gap-2"
        >
          <div class="min-w-0">
            <span
              data-alt="ask-modal-tag"
              class="inline-block max-w-full truncate rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            >
              {{ title || '随便说' }}
            </span>
            <p
              v-if="context"
              class="mt-1 text-[11px] leading-snug text-slate-400"
            >
              {{ context }}
            </p>
          </div>
          <button
            data-alt="ask-modal-close"
            type="button"
            title="关闭"
            aria-label="关闭"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
            @click="emit('close')"
          >
            <LifeIcon name="close" class="h-4 w-4" />
          </button>
        </div>

        <!-- 多轮记录：只存这一次打开期间的，关掉即清空 -->
        <div
          v-if="log.length || reply"
          ref="logBox"
          data-alt="ask-modal-log"
          class="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
        >
          <p
            v-for="(t, i) in log"
            :key="i"
            data-alt="ask-modal-turn"
            class="whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed"
            :class="
              t.role === 'user'
                ? 'bg-brand-50 text-slate-700 dark:bg-brand-500/15 dark:text-slate-200'
                : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
            "
          >
            {{ t.content }}
          </p>
          <!-- 正在吐的字还没进记录，单独摆一条，出草稿时会被换掉 -->
          <p
            v-if="reply"
            data-alt="ask-modal-reply"
            class="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
          >
            {{ reply }}
          </p>
        </div>

        <!-- 输入条与草稿确认，形态与面板本体一致 -->
        <LifeAskPanel
          v-model="text"
          class="shrink-0"
          :busy="busy"
          :placeholder="placeholder || '说点什么'"
          :pending-text="pendingText"
          :pending-note="pendingNote"
          :pending="pending"
          :destructive="destructive"
          :direct-label="directLabel"
          @submit="send"
          @confirm="emit('confirm')"
          @discard="emit('discard')"
          @direct="emit('direct')"
        />
      </div>
    </div>
  </Teleport>
</template>
