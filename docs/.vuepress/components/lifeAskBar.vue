<script setup lang="ts">
/**
 * 统一输入条
 * @description life 页所有「写一句话然后提交」的地方都用它。
 *
 * 按钮收在框内，不挂在框外——这是它长这样的唯一原因。
 * 之前按钮是框外的独立方块，无论给它多高都对不齐：给固定高度就比输入框矮一截，
 * 用 items-stretch 撑满又变成 38×58 的竖条，一个 14px 的图标摊在 58px 里。
 * 根子不在高度，在「两个框」——所以改成一个框持边框、按钮绝对定位在右下角，
 * 焦点高亮用 focus-within 作用在整框上，视觉上才是一个控件。
 *
 * 高度改为随内容自动长高：原先的 resize-y 把手正好在右下角，会和框内按钮抢位置；
 * 而且写长指令时本来就该自己撑开，不该要人去拖。
 *
 * 两个模式长得不一样，是为了让人一眼分清这句话会不会经过模型：
 * ask 有边框、按钮是纸飞机；note 无框只有一层底色、按钮直接写着「记下」——
 * 写完就落库，没有第二步。note 的按钮文字与底色可由调用处改（actionText / tone），
 * 因为「记进展」和「结项 +15 元」是同一条输入栏的两种去向，换个框会让人以为换了地方。
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import LifeIcon from './lifeIcon.vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    /** ask=交给 AI，Enter 发送；note=写一条本地记录，Ctrl/Cmd+Enter 记下 */
    mode?: 'ask' | 'note';
    busy?: boolean;
    placeholder?: string;
    /** 字数上限，要和后端保持一致，否则多打的字会被悄悄吃掉 */
    maxlength?: number;
    /** 按钮的 title 与 aria-label，不给则按 mode 取默认文案 */
    label?: string;
    /** note 模式按钮上的文字，不给则「记下」 */
    actionText?: string;
    /** note 模式底色：warn 转琥珀，提示这一条提交下去会改状态（如结项） */
    tone?: 'default' | 'warn';
  }>(),
  {
    mode: 'ask',
    busy: false,
    placeholder: '说点什么',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

const isAsk = computed(() => props.mode === 'ask');
const disabled = computed(() => props.busy || !props.modelValue.trim());
const noteText = computed(() => props.actionText || '记下');
const buttonLabel = computed(
  () => props.label || (isAsk.value ? '交给 AI' : noteText.value)
);

/** 跑着的时候换成横线，让「在等结果」和「可以点」在图标上就分得开 */
const icon = computed(() => (props.busy ? 'flat' : 'send'));

const ta = ref<HTMLTextAreaElement | null>(null);

/** 两行起步，最多长到这么高，再多就自己滚 */
const MAX_H = 180;

/** 先归零再读 scrollHeight，否则删字时高度只增不减 */
function autoGrow() {
  const el = ta.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, MAX_H) + 'px';
}

onMounted(autoGrow);
// 外部清空（提交后）也要把高度收回去，所以盯的是值不是输入事件
watch(() => props.modelValue, () => nextTick(autoGrow));

function submit() {
  if (disabled.value) return;
  emit('submit');
}

/**
 * 把光标放进来
 * @description 给「把人送到某条输入条上」的入口用（如点开一本在读的书就落光标）。
 * 暴露一个方法而不是让调用处自己去 querySelector 里面那个 textarea：
 * 框内结构是这个组件的私事，改了不该连累外面
 */
function focus() {
  ta.value?.focus();
}

defineExpose({ focus });

/**
 * Enter 的处理
 * @description 没有用 @keydown.enter.exact.prevent 这类修饰符写法，因为
 * .prevent 是无条件执行的：note 模式下敲普通 Enter 本该换行，修饰符写法会把
 * 换行一起吃掉。这里先判断这一下要不要提交，不提交就原样放行给浏览器。
 * @param e 键盘事件
 */
function onEnter(e: KeyboardEvent) {
  const wantsSubmit = isAsk.value
    ? !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
    : e.ctrlKey || e.metaKey;
  if (!wantsSubmit) return;
  e.preventDefault();
  submit();
}
</script>

<template>
  <!-- 边框由这一层持有，里面的 textarea 不再自带边框，于是整体只有一个框 -->
  <div
    data-alt="ask-bar"
    class="relative rounded-lg transition"
    :class="
      isAsk
        ? 'border border-slate-200 bg-white focus-within:border-brand-400 dark:border-slate-600 dark:bg-slate-900'
        : tone === 'warn'
        ? 'bg-amber-50 dark:bg-amber-500/10'
        : 'bg-slate-50 dark:bg-slate-700/40'
    "
  >
    <!-- 右侧留出的 pr 是给按钮的空位，否则文字会跑到按钮底下 -->
    <textarea
      ref="ta"
      data-alt="ask-bar-input"
      :value="modelValue"
      rows="2"
      :placeholder="placeholder"
      :maxlength="maxlength"
      class="block w-full resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none dark:text-slate-100 sm:px-2.5 sm:py-2 sm:text-sm"
      :class="isAsk ? 'pr-14 sm:pr-11' : 'pr-[4.5rem] sm:pr-16'"
      @input="
        emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
      @keydown.enter="onEnter"
    />
    <!-- 窄屏 44px 保住触达，宽屏收成 28px 不抢视觉重量 -->
    <button
      data-alt="ask-bar-send"
      type="button"
      :disabled="disabled"
      :title="buttonLabel"
      :aria-label="buttonLabel"
      class="absolute bottom-1.5 right-1.5 rounded-md bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40 sm:bottom-1 sm:right-1"
      :class="
        isAsk
          ? 'grid h-11 w-11 place-items-center sm:h-7 sm:w-7'
          : 'h-11 px-3 text-sm sm:h-7 sm:px-2.5 sm:text-xs'
      "
      @click="submit"
    >
      <LifeIcon
        v-if="isAsk"
        :name="icon"
        class="h-4 w-4 sm:h-3.5 sm:w-3.5"
        :class="busy && 'animate-pulse'"
      />
      <template v-else>{{ busy ? noteText + '…' : noteText }}</template>
    </button>
  </div>
</template>
