<script setup lang="ts">
/**
 * 问 AI 的入口钮
 * @description 全页每一个「就这件事问 AI」的入口都是这一颗：同一枚星芒、同一块
 * 命中区，固定摆在所在标题行或所在行的最右。
 *
 * 之前每处各长一个样——打卡项是带下划线的标题文字、节点弹窗是灰底的「让 AI 改写」、
 * 研究线弹窗是裸图标，总览两张卡干脆没有入口。人得先认出"这个也是 AI 入口"，
 * 而认出来的办法只有挨个点一遍。
 *
 * 只发 click 不自带上下文：谁摆这一颗，谁负责把自己那件事塞进 openAsk。
 */
import LifeIcon from './lifeIcon.vue';

defineProps<{
  /** 说清这一颗问的是哪件事，同时作 title 与 aria-label */
  title: string;
}>();

const emit = defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <!-- 窄屏 36px 保住触达，宽屏收成 32px，与弹窗头部的图标钮等高 -->
  <button
    data-alt="ask-button"
    type="button"
    :title="title"
    :aria-label="title"
    class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-700 sm:h-8 sm:w-8"
    @click="emit('click')"
  >
    <LifeIcon name="sparkle" class="h-4 w-4" />
  </button>
</template>
