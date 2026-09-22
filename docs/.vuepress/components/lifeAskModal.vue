<script setup lang="ts">
/**
 * 问 AI 的统一弹窗
 * @description 全页只有这一个经 AI 的对话外壳：打卡条目、体能债、研究线、
 * 计划节点、右下角悬浮按钮，唤起的都是它，区别只在顶上那行上下文。
 *
 * 之前是三套——就地浮层、常驻对话栏、节点弹窗里的 AI 改写条，各自一份输入框
 * 与草稿确认。同一件事有三个入口，人得先想"这句话该往哪个框里写"。
 *
 * 遮罩、抽屉形态、Esc 与滚动锁都在 LifeModal 里，这里只管一件事：
 * 这一次在问什么、说到哪儿了。
 */
import { ref, watch, nextTick } from 'vue';
import LifeModal from './lifeModal.vue';
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
const foot = ref<HTMLElement | null>(null);
const logBox = ref<HTMLElement | null>(null);

// 打开就把光标放进输入框：进来就是要说话的，不该再点一下
watch(
  () => props.open,
  async (v) => {
    if (!v) return;
    text.value = '';
    await nextTick();
    foot.value?.querySelector('textarea')?.focus();
  },
);

/**
 * 新回话要能自己露出来
 * @description 会滚的那一层是壳的正文区，不是这里的记录块本身——
 * 所以往上找到壳的正文再滚它，否则手动往下拉才看得见模型说了什么
 */
watch(
  () => [props.log.length, props.reply],
  async () => {
    await nextTick();
    const body = logBox.value?.closest('[data-alt="modal-body"]');
    if (body) body.scrollTop = body.scrollHeight;
  },
);

function send() {
  if (!text.value.trim() || props.busy) return;
  emit('send', text.value.trim());
  text.value = '';
}
</script>

<template>
  <LifeModal
    :open="open"
    :title="title || '随便说'"
    :meta="context"
    top
    @close="emit('close')"
  >
    <!-- 多轮记录：只存这一次打开期间的，关掉即清空 -->
    <div
      v-if="log.length || reply"
      ref="logBox"
      data-alt="ask-modal-log"
      class="grid content-start gap-2"
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

    <!-- 输入条与草稿确认就是这个弹窗的底，形态与面板本体一致 -->
    <template #foot>
      <div ref="foot">
        <LifeAskPanel
          v-model="text"
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
    </template>
  </LifeModal>
</template>
