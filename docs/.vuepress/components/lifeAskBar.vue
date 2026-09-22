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
const buttonLabel = computed(
  () => props.label || (isAsk.value ? '交给 AI' : '记下这一条')
);

/** 跑着的时候换成横线，让「在等结果」和「可以点」在图标上就分得开 */
const icon = computed(() => {
  if (props.busy) return 'flat';
  return isAsk.value ? 'send' : 'check';
});

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
    class="relative rounded-lg border border-slate-200 bg-white transition focus-within:border-brand-400 dark:border-slate-600 dark:bg-slate-900"
  >
    <!-- 右侧留出的 pr 是给按钮的空位，否则文字会跑到按钮底下 -->
    <textarea
      ref="ta"
      data-alt="ask-bar-input"
      :value="modelValue"
      rows="2"
      :placeholder="placeholder"
      :maxlength="maxlength"
      class="block w-full resize-none overflow-y-auto bg-transparent px-3 py-2.5 pr-14 text-base leading-relaxed outline-none dark:text-slate-100 sm:px-2.5 sm:py-2 sm:pr-11 sm:text-sm"
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
      class="absolute bottom-1.5 right-1.5 grid h-11 w-11 place-items-center rounded-md bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40 sm:bottom-1 sm:right-1 sm:h-7 sm:w-7"
      @click="submit"
    >
      <LifeIcon
        :name="icon"
        class="h-4 w-4 sm:h-3.5 sm:w-3.5"
        :class="busy && 'animate-pulse'"
      />
    </button>
  </div>
</template>
