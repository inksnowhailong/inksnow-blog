<script setup lang="ts">
/**
 * 问 AI 的面板本体
 * @description life 页 AI 对话的统一外壳。它只管「输入 → 等待 → 摆出草稿 → 确认」
 * 这条链，不管自己被摆在哪里——外面套什么由调用方决定，于是同一套标记有两个态：
 *   锚定态  lifeAsk 把它塞进浮层，贴着点击的东西弹出
 *   常驻态  lifeChat 把它铺在卡片里，一直摆着
 * 抽出来的原因和 lifeAskBar 一样：这段原先在两处各抄了一份，
 * 草稿确认按钮抄歪成了 h-11/sm:h-7 与 h-8 两种，后者在手机上够不到 44px。
 */
import LifeIcon from './lifeIcon.vue';
import LifeAskBar from './lifeAskBar.vue';
import LifeDraftDetail from './lifeDraftDetail.vue';

withDefaults(
  defineProps<{
    modelValue: string;
    busy?: boolean;
    placeholder?: string;
    /** 发送按钮的无障碍文案 */
    label?: string;
    /** 待确认草稿的人话描述，非空时必须点头才落库 */
    pendingText?: string;
    /** 草稿原件，摊开给人做前后对照 */
    pending?: any;
    /** 这条草稿会动计划本身或删已有数据，配色转红并显示警示语 */
    destructive?: boolean;
    /** 草稿卡顶部的额外提醒，如「改错了可以在最近改动里撤销」 */
    pendingNote?: string;
    /** 不经模型的直接动作，如「直接记为已还」 */
    directLabel?: string;
    /** 出错时的红字 */
    errorMsg?: string;
  }>(),
  {
    busy: false,
    placeholder: '说点什么',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
  (e: 'confirm'): void;
  (e: 'discard'): void;
  (e: 'direct'): void;
}>();
</script>

<template>
  <div data-alt="ask-panel" class="flex flex-col gap-2">
    <LifeAskBar
      :model-value="modelValue"
      mode="ask"
      :busy="busy"
      :placeholder="placeholder"
      :label="label"
      @update:model-value="emit('update:modelValue', $event)"
      @submit="emit('submit')"
    />

    <!-- 等模型回话时给个明确的状态，光靠按钮上的小图标看不出来 -->
    <p
      v-if="busy"
      data-alt="ask-thinking"
      class="flex items-center gap-1.5 text-xs text-slate-400"
    >
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />正在想…
    </p>

    <!-- 待确认：模型的理解摆出来，点了才算 -->
    <div
      v-if="pendingText"
      data-alt="ask-pending"
      class="rounded-lg border p-2.5"
      :class="
        destructive
          ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
      "
    >
      <p
        v-if="pendingNote"
        class="mb-1 text-[11px] leading-snug"
        :class="
          destructive
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-amber-700 dark:text-amber-400'
        "
      >
        {{ pendingNote }}
      </p>
      <p
        class="text-sm leading-snug sm:text-xs"
        :class="
          destructive
            ? 'text-rose-900 dark:text-rose-200'
            : 'text-amber-900 dark:text-amber-200'
        "
      >
        {{ pendingText }}
      </p>
      <LifeDraftDetail :draft="pending" />

      <!-- 手机上保住 44px 触达，桌面收小；两处原先一个有一个没有 -->
      <div class="mt-2 flex gap-2 sm:gap-1.5">
        <button
          data-alt="ask-confirm"
          type="button"
          :disabled="busy"
          title="确认执行"
          aria-label="确认执行"
          class="grid h-11 w-11 place-items-center rounded-lg text-white transition disabled:opacity-50 sm:h-7 sm:w-7 sm:rounded-md"
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
          aria-label="理解错了，丢弃"
          class="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-white dark:hover:bg-slate-800 sm:h-7 sm:w-7 sm:rounded-md"
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
      class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-3 text-sm text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 sm:py-1.5 sm:text-xs"
      @click="emit('direct')"
    >
      <LifeIcon name="check" class="h-3.5 w-3.5" />
      {{ directLabel }}
    </button>

    <p
      v-if="errorMsg"
      data-alt="ask-error"
      class="text-sm text-rose-600 dark:text-rose-400 sm:text-xs"
    >
      {{ errorMsg }}
    </p>

    <!-- 回话区：锚定态放单条回复，常驻态放多轮记录，形态不同故交给调用方 -->
    <slot />
  </div>
</template>
