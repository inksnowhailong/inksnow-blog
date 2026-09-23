<script setup lang="ts">
/**
 * 研究线详情弹窗
 * @description 一条线从冒出来到收尾都在这里：原话、这一路的进展、最后的结论。
 * 状态由后端从结论与最近动静算出，这里只负责显示。
 *
 * 版式按「一条时间线」排：中间是进展流，最后一行固定是它哪天冒出来的，
 * 底栏那条输入栏就接在流的末尾——写一句就多一行，看得见自己在往前推。
 *
 * 壳（遮罩、抽屉、Esc、滚动锁、头部与底栏版式）在 LifeModal 里，与另两个弹窗同一份。
 *
 * 与计划节点分成两个组件而不合并：研究线（原话 → 进展 → 结论）
 * 和计划节点（未完成 → 完成）不是一回事，塞进一个组件只会得到
 * 一堆互斥的 v-if。
 */
import { ref, computed, watch } from 'vue';
import LifeModal from './lifeModal.vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeAskButton from './lifeAskButton.vue';
import LifeIcon from './lifeIcon.vue';
import { shortDate } from './lifeFormat';
import LifeNoteRow from './lifeNoteRow.vue';
import { NOTE_MAX } from './lifeMarkdown';

const props = defineProps<{
  /** 选中的研究线，为 null 时不显示 */
  idea: any;
  /** 带密钥的请求函数，由面板注入 */
  api: (path: string, init?: RequestInit) => Promise<any>;
  /** 一句结论的额度（元） */
  noteYuan: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 数据变了，让面板重新拉；scope 说清波及哪一摊 */
  (e: 'changed', scope: 'ideas' | 'all'): void;
  /** 就这条线问 AI，带上它当上下文 */
  (e: 'ask', payload: { prefix: string }): void;
}>();

const busy = ref(false);
const errorMsg = ref('');

/** 进展流 */
const logs = ref<any[]>([]);
const logsLoading = ref(false);
const logDraft = ref('');

/** 正在写结论 */
const closing = ref(false);
const conclusionDraft = ref('');

/** 更多菜单，删除藏在里面 */
const menuOpen = ref(false);

/**
 * 开关更多菜单
 * @description 收起时把删除确认一起撤掉：菜单再打开时应该回到「删掉这条线」，
 * 而不是停在一个「删/不删」——那等于把确认这一步白问一遍
 */
function toggleMenu(open = !menuOpen.value) {
  menuOpen.value = open;
  if (!open) dropping.value = false;
}

/** 删除前的二次确认 */
const dropping = ref(false);

/** 状态的中文说法，键与后端的 state 一致；配色交给列表的色条，这里只要那个词 */
const STATES: Record<string, string> = {
  OPEN: '在动',
  STALE: '搁着',
  DONE: '已结',
};

const stateText = computed(
  () => STATES[props.idea?.state] ?? props.idea?.state ?? '',
);

/** 已结的线只读 */
const isDone = computed(() => props.idea?.state === 'DONE');

/** 结项按钮上的字把代价写出来，省得点之前还要回想这一下值多少 */
const concludeText = computed(() => `结项 +${props.noteYuan} 元`);

/** 头部那行小字：哪天冒出来的、现在什么状态 */
const metaText = computed(() =>
  props.idea ? `${shortDate(props.idea.createdOn)} · ${stateText.value}` : '',
);

/**
 * 统一跑一次请求，收口忙碌态与报错
 * @param fn 要跑的动作
 * @param scope 这次改动波及哪一摊：默认只动研究线，
 * 写结论和删除会连带改额度，得让面板把那一摊也重拉
 */
async function run(fn: () => Promise<any>, scope: 'ideas' | 'all' = 'ideas') {
  busy.value = true;
  errorMsg.value = '';
  try {
    await fn();
    emit('changed', scope);
  } catch (e: any) {
    errorMsg.value = e.message ?? '操作失败';
  } finally {
    busy.value = false;
  }
}

/** 拉这条线的进展 */
async function loadLogs() {
  if (!props.idea) return;
  logsLoading.value = true;
  try {
    logs.value = await props.api(`/life/ideas/${props.idea.id}/logs`);
  } catch {
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

/** 记一条进展 */
function addLog() {
  const text = logDraft.value.trim();
  if (!text || busy.value) return;
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    logDraft.value = '';
    await loadLogs();
  });
}

/** 删掉一条记错的进展 */
function removeLog(id: string) {
  run(async () => {
    await props.api(`/life/logs/${id}`, { method: 'DELETE' });
    await loadLogs();
  });
}

/** 写结论收尾 */
function conclude() {
  const conclusion = conclusionDraft.value.trim();
  if (!conclusion || busy.value) return;
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}/conclude`, {
      method: 'POST',
      body: JSON.stringify({ conclusion }),
    });
    closing.value = false;
    conclusionDraft.value = '';
    // 不关窗：面板重拉后这条线变 DONE，底栏自然收起、结论显示在头下面，
    // 人能看见自己刚写的那句落下去了。关掉的话只剩一个消失的弹窗
  }, 'all');
}

/**
 * 删掉这条线
 * @description 真删，连进展一起。已结的删掉会把那句结论的额度抹掉，
 * 所以确认那一步把代价写出来——不可逆的操作不该只问一句"确定吗"
 */
function drop() {
  run(async () => {
    await props.api(`/life/ideas/${props.idea.id}`, { method: 'DELETE' });
    emit('close');
  }, 'all');
}

/** 就这条线问 AI，把它的来龙去脉一并带上 */
function ask() {
  const recent = logs.value
    .slice(0, 5)
    .map((l) => `${l.occurredOn} ${l.text}`)
    .join('；');
  emit('ask', {
    prefix: `关于我正在研究的「${props.idea.content}」${
      recent ? `（这一路的进展：${recent}）` : ''
    }：`,
  });
}

/** 换了一条线就把手上的草稿与开着的菜单清掉，免得上一条的字串到这一条 */
watch(
  () => props.idea?.id,
  () => {
    errorMsg.value = '';
    logDraft.value = '';
    conclusionDraft.value = '';
    closing.value = false;
    menuOpen.value = false;
    dropping.value = false;
  },
);

/**
 * 重拉进展
 * @description 盯的是对象不是 id：从这个弹窗唤起 AI 记了一条进展之后，
 * 面板重拉研究线会换上新的那份，但 id 没变——只盯 id 的话这里
 * 还显示改之前的列表
 */
watch(
  () => props.idea,
  (idea) => {
    if (idea) loadLogs();
    else logs.value = [];
  },
  { immediate: true },
);
</script>

<template>
  <LifeModal
    :open="!!idea"
    :title="idea?.content"
    :meta="metaText"
    @close="emit('close')"
  >
    <template #icons>
      <LifeAskButton title="就这条线问 AI" @click="ask" />
      <button
        data-alt="idea-more"
        type="button"
        title="更多"
        aria-label="更多"
        class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
        @click="toggleMenu()"
      >
        <LifeIcon name="more" class="h-4 w-4" />
      </button>

      <!-- 透明底板接住菜单外面的那一下，比挂 document 监听少一套回收 -->
      <div
        v-if="menuOpen"
        data-alt="idea-menu-backdrop"
        class="fixed inset-0"
        @click="toggleMenu(false)"
      />

      <!-- 删除收在菜单里：它不可逆，不该和常用动作并排摆在手边 -->
      <div
        v-if="menuOpen"
        data-alt="idea-menu"
        class="absolute right-0 top-10 z-10 w-56 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <button
          v-if="!dropping"
          data-alt="idea-drop"
          type="button"
          class="min-h-10 w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:min-h-0"
          @click="dropping = true"
        >
          删掉这条线
          <span class="mt-0.5 block text-[11px] leading-snug text-slate-400">
            连 {{ logs.length }} 条进展一起删{{
              isDone ? `，额度少 ${noteYuan} 元` : ''
            }}
          </span>
        </button>
        <div v-else data-alt="idea-drop-confirm" class="p-1.5">
          <p class="text-xs leading-snug text-rose-600 dark:text-rose-400">
            删了找不回来
          </p>
          <div class="mt-2 flex items-center gap-2">
            <button
              data-alt="idea-drop-yes"
              type="button"
              :disabled="busy"
              class="min-h-10 rounded-lg bg-rose-500 px-2.5 py-1 text-xs text-white transition hover:bg-rose-600 disabled:opacity-40 sm:min-h-0"
              @click="drop"
            >
              删
            </button>
            <button
              data-alt="idea-drop-no"
              type="button"
              class="min-h-10 rounded-lg px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:min-h-0"
              @click="dropping = false"
            >
              不删
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 已结的结论：左边一条绿线，和下面的进展流分开 -->
    <div
      v-if="isDone && idea.conclusion"
      data-alt="idea-conclusion"
      class="border-l-2 border-emerald-400 bg-emerald-50/70 py-1.5 pl-2.5 dark:bg-emerald-500/10"
    >
      <p
        class="whitespace-pre-wrap text-sm leading-snug text-slate-700 dark:text-slate-200"
      >
        结论：{{ idea.conclusion }}
      </p>
    </div>

    <!-- 进展流：左栏日期对齐成一列，右栏是当时记的原话 -->
    <ul
      data-alt="idea-logs"
      class="grid content-start gap-0.5 border-t border-slate-100 pt-2 dark:border-slate-700"
    >
      <LifeNoteRow
        v-for="l in logs"
        :key="l.id"
        :text="l.text"
        :date="l.occurredOn"
      >
        <template #actions>
          <!-- 手机上没有 hover，窄屏一直露着；宽屏才收起来等指针过来 -->
          <button
            v-if="!isDone"
            data-alt="idea-log-remove"
            type="button"
            :disabled="busy"
            title="删掉这条"
            aria-label="删掉这条"
            class="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-300 transition hover:text-rose-500 disabled:opacity-40 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
            @click="removeLog(l.id)"
          >
            <LifeIcon name="close" class="h-3 w-3" />
          </button>
        </template>
      </LifeNoteRow>

      <li v-if="logsLoading" data-alt="idea-logs-loading" class="px-1 py-1.5">
        <span class="text-xs text-slate-400">读取中…</span>
      </li>

      <!-- 流的最后一行固定是它哪天冒出来的，那是这条线的起点 -->
      <li data-alt="idea-log-origin" class="flex items-start gap-2 px-1 py-1.5">
        <span
          class="w-14 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
        >
          {{ shortDate(idea.createdOn) }}
        </span>
        <p class="text-sm leading-snug text-slate-400 dark:text-slate-500">记下</p>
      </li>
    </ul>

    <p
      v-if="errorMsg"
      data-alt="idea-modal-error"
      class="text-sm text-rose-600 dark:text-rose-400"
    >
      {{ errorMsg }}
    </p>

    <!-- 底栏：已结的线不再往里写字，整窗转只读 -->
    <template v-if="!isDone" #foot>
      <!-- 收尾与记进展共用同一条输入栏，只换底色、占位与按钮：
           写的都是这条线的下一行字，换个框会让人以为换了地方 -->
      <LifeAskBar
        v-if="closing"
        v-model="conclusionDraft"
        mode="note"
        tone="warn"
        :busy="busy"
        placeholder="一句结论，写下即结项"
        :action-text="concludeText"
        @submit="conclude"
      />
      <!-- 进展可以是一整篇整理稿，所以上限跟日志同一个数；上面那条写的是结论，
           那是另一个字段，仍旧只要一句话 -->
      <LifeAskBar
        v-else
        v-model="logDraft"
        mode="note"
        :busy="busy"
        :maxlength="NOTE_MAX"
        placeholder="记一条进展"
        action-text="记进展"
        @submit="addLog"
      />

      <div class="flex items-center justify-between gap-2">
        <button
          data-alt="idea-conclude-toggle"
          type="button"
          class="min-h-10 shrink-0 px-2 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 sm:min-h-0 sm:px-0"
          @click="closing = !closing"
        >
          {{ closing ? '取消' : '收尾' }}
        </button>
        <p
          class="text-right text-[11px] leading-snug text-slate-400 dark:text-slate-500"
        >
          {{
            closing
              ? '「不成」同样算结论——一次记录在案的失败比一次没记录的成功值钱'
              : '一条只记一件事 · Ctrl+Enter 记下'
          }}
        </p>
      </div>
    </template>
  </LifeModal>
</template>
