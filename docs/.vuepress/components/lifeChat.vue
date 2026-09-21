<script setup lang="ts">
/**
 * AI 对话栏
 * @description 记录的主入口。说一句人话，后端让模型翻成结构化动作，
 * 拿回来先摆出来给人看，点了确认才落库——模型不直接改数据。
 * 所有数字都由后端算好，模型只负责两端的翻译。
 */
import { ref, computed, nextTick } from 'vue';
import {
  describeDraft,
  applyDraft,
  touchesPlan as draftTouchesPlan,
  askStream,
} from './useLifeDraft';
import LifeIcon from './lifeIcon.vue';
import LifeDraftDetail from './lifeDraftDetail.vue';

const props = defineProps<{
  api: (path: string, init?: RequestInit) => Promise<any>;
  /** 流式请求要自己发，故需要基地址与密钥 */
  apiBase: string;
  apiKey: string;
  /** 按ID取每日项标题，用于把草稿说成人话 */
  nodeTitleOf: (id: string) => string;
}>();

const emit = defineEmits<{ (e: 'changed'): void }>();

/** 一条对话记录 */
interface Turn {
  role: 'me' | 'ai';
  text: string;
}

const log = ref<Turn[]>([]);
const input = ref('');
const pending = ref<any>(null);
const busy = ref(false);
const errorMsg = ref('');
const logBox = ref<HTMLElement | null>(null);

/** 这条草稿是否会改动计划本身，而不只是记一笔流水 */
const touchesPlan = computed(() => draftTouchesPlan(pending.value));

async function scrollToEnd() {
  await nextTick();
  if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
}

/** 把草稿说成一句人能核对的话 */
function describe(p: any): string {
  return describeDraft(p, props.nodeTitleOf);
}

async function send() {
  const text = input.value.trim();
  if (!text || busy.value) return;
  busy.value = true;
  errorMsg.value = '';
  pending.value = null;

  // 之前几轮原样带上去，模型才接得住「那这个呢」「改成 30 分钟」这类话。
  // 必须在把当前这句压进 log 之前取，否则问题会重复一遍
  const history = log.value
    .map((t) => ({
      role: (t.role === 'me' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: t.text,
    }))
    .filter((t) => t.content.trim())
    .slice(-12);

  log.value = [...log.value, { role: 'me', text }];
  input.value = '';
  await scrollToEnd();

  // 先占一条空的回话，模型每吐一段就往里追加，使用者立刻看到有反应
  const slot = log.value.length;
  log.value = [...log.value, { role: 'ai', text: '' }];

  try {
    const res = await askStream(
      props.apiBase,
      props.apiKey,
      text,
      (delta) => {
        const next = [...log.value];
        next[slot] = { role: 'ai', text: next[slot].text + delta };
        log.value = next;
        scrollToEnd();
      },
      history,
    );

    if (res.kind === 'answer') {
      // 流下来的正文与最终结果一致时不必覆盖，避免闪一下
      const next = [...log.value];
      next[slot] = { role: 'ai', text: res.text || next[slot].text };
      log.value = next;
    } else {
      // 出草稿时那段思考文字没有保留价值，撤掉占位改用草稿卡片
      log.value = log.value.filter((_, i) => i !== slot);
      pending.value = res;
    }
    await scrollToEnd();
  } catch (e: any) {
    log.value = log.value.filter((_, i) => i !== slot);
    errorMsg.value =
      e.message === '密钥无效' ? e.message : 'AI 暂时不可用：' + e.message;
  } finally {
    busy.value = false;
  }
}

/** 确认后才真正写入 */
async function confirm() {
  const p = pending.value;
  if (!p || busy.value) return;
  busy.value = true;
  errorMsg.value = '';
  try {
    await applyDraft(p, props.api);
    log.value = [...log.value, { role: 'ai', text: '已记下：' + describe(p) }];
    pending.value = null;
    emit('changed');
    await scrollToEnd();
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section
    data-alt="life-chat"
    class="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
  >
    <!-- 输入放在最上面：它是这个页面用得最多的东西 -->
    <div data-alt="chat-input-row" class="flex gap-2">
      <input
        v-model="input"
        data-alt="chat-input"
        type="text"
        placeholder="今天主线写了 40 分钟"
        class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:py-2 sm:text-sm"
        @keydown.enter.prevent="send"
      />
      <button
        data-alt="chat-send"
        type="button"
        :disabled="busy || !input.trim()"
        title="发送"
        aria-label="发送"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40 sm:h-auto sm:w-auto sm:px-3"
        @click="send"
      >
        <LifeIcon
          :name="busy ? 'flat' : 'send'"
          class="h-4 w-4"
          :class="busy && 'animate-pulse'"
        />
      </button>
    </div>

    <!-- 待确认：模型的理解摆出来，点了才算 -->
    <div
      v-if="pending"
      data-alt="chat-pending"
      class="rounded-xl border p-3"
      :class="
        touchesPlan
          ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
      "
    >
      <p
        v-if="touchesPlan"
        class="mb-1 text-[11px] text-rose-600 dark:text-rose-400"
      >
        这条会动计划本身，确认前看清楚。改错了可以在「最近改动」里撤销
      </p>
      <p
        class="text-sm"
        :class="
          touchesPlan
            ? 'text-rose-900 dark:text-rose-200'
            : 'text-amber-900 dark:text-amber-200'
        "
      >
        {{ describe(pending) }}
      </p>
      <LifeDraftDetail :draft="pending" />

      <div class="mt-2 flex gap-2">
        <button
          data-alt="pending-confirm"
          type="button"
          :disabled="busy"
          title="确认记下"
          aria-label="确认记下"
          class="grid h-8 w-8 place-items-center rounded-lg text-white transition disabled:opacity-50"
          :class="
            touchesPlan
              ? 'bg-rose-500 hover:bg-rose-600'
              : 'bg-amber-500 hover:bg-amber-600'
          "
          @click="confirm"
        >
          <LifeIcon name="check" class="h-4 w-4" />
        </button>
        <button
          data-alt="pending-cancel"
          type="button"
          title="理解错了，丢弃"
          aria-label="理解错了，丢弃"
          class="grid h-8 w-8 place-items-center rounded-lg text-amber-800 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20"
          @click="pending = null"
        >
          <LifeIcon name="close" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <p
      v-if="errorMsg"
      data-alt="chat-error"
      class="text-sm text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>

    <!-- 对话记录：手机上压矮，桌面上留足高度 -->
    <div
      v-if="log.length"
      ref="logBox"
      data-alt="chat-log"
      class="grid max-h-48 gap-2 overflow-y-auto lg:max-h-[26rem]"
    >
      <p
        v-for="(t, i) in log"
        :key="i"
        data-alt="chat-turn"
        class="whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed"
        :class="
          t.role === 'me'
            ? 'bg-brand-50 text-slate-700 dark:bg-brand-500/15 dark:text-slate-200'
            : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
        "
      >
        {{ t.text }}
      </p>
    </div>

  </section>
</template>
