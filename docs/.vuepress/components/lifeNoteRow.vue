<script setup lang="ts">
/**
 * 一条日志行
 * @description 学习日志、研究线进展、读书笔记——三处记的都是同一种东西
 * （一条 NOTE），原先在三个弹窗里各写了一份 DOM：日期左栏、正文、删除叉，
 * 一模一样抄三遍。日志改成可以写长文之后，「折叠首段 / 展开全文 / 渲染
 * Markdown」这套还要再抄三遍，所以先收成一个组件。
 *
 * 折叠态与展开态是两条不同的路：折叠给的是 firstParagraph 的纯文本，走
 * 插值，Vue 自己转义；展开给的是 renderMarkdown 的产物，走 v-html。
 * v-html 只接这一个来源，别的任何字符串都不许进这个口子。
 *
 * 展开箭头只在正文确实不止这一段时才出现——一句话的日志占着一个永远点不出
 * 东西的箭头，是在骗人这里还有下文。
 */
import { computed, ref } from 'vue';
import LifeIcon from './lifeIcon.vue';
import { shortDate } from './lifeFormat';
import { firstParagraph, renderMarkdown } from './lifeMarkdown';

const props = defineProps<{
  /** 日志正文，可能是一句话，也可能是一篇几千字的整理稿 */
  text: string;
  /** 这条记在哪天，YYYY-MM-DD；左栏只显示月日 */
  date?: string;
  /** 正文下面那行补充小字，如方向汇总时这条日志属于哪个子项 */
  meta?: string;
}>();

const expanded = ref(false);

/** 折叠时显示的首段纯文本 */
const brief = computed(() => firstParagraph(props.text));

/**
 * 正文是不是不止首段这么多
 * @description 判据就是「折叠后还是不是原样」：首段被截断、后面还有段落、
 * 或者带了 Markdown 标记，三种情况下 brief 都会和原文对不上。
 * 一句白话日志则完全相等，于是不长箭头
 */
const hasMore = computed(() => brief.value !== String(props.text ?? '').trim());

/** 展开后的正文 HTML，唯一允许进 v-html 的来源 */
const html = computed(() => renderMarkdown(props.text));
</script>

<template>
  <li
    data-alt="note-row"
    class="group flex items-start gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
  >
    <span
      data-alt="note-row-date"
      class="w-14 shrink-0 pt-px text-xs tabular-nums text-slate-400 dark:text-slate-500"
    >
      {{ shortDate(date) }}
    </span>

    <!-- min-w-0 是长 URL 和代码块不把整行撑宽的前提，手机上少了它就横向滚 -->
    <div class="min-w-0 flex-1">
      <!--
        展开态的排版全写在这一串任意变体里：项目没装 typography 插件，
        为几个标签装一个插件不值当，而且 preflight 是关的、标签自带的
        浏览器默认边距在这儿反而更碍事，不如把要的几条直接点明
      -->
      <div
        v-if="expanded"
        data-alt="note-row-full"
        class="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200 [&_a]:text-brand-600 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.85em] [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-0.5 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-2 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li>ol]:my-0 [&_li>ul]:my-0 dark:[&_a]:text-brand-300 dark:[&_code]:bg-slate-800 dark:[&_pre]:bg-slate-800 [&_:first-child]:mt-0 [&_:last-child]:mb-0"
        v-html="html"
      />
      <p
        v-else
        data-alt="note-row-brief"
        class="whitespace-pre-wrap break-words text-sm leading-snug text-slate-700 dark:text-slate-200"
      >
        {{ brief }}
      </p>

      <p
        v-if="meta"
        data-alt="note-row-meta"
        class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500"
      >
        {{ meta }}
      </p>
    </div>

    <!-- 窄屏 36px 保住触达，宽屏收成 24px，与旁边那颗删除叉同一套尺寸 -->
    <button
      v-if="hasMore"
      data-alt="note-toggle"
      type="button"
      :title="expanded ? '收起' : '展开全文'"
      :aria-label="expanded ? '收起' : '展开全文'"
      :aria-expanded="expanded"
      class="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-300 transition hover:text-brand-500 dark:text-slate-500 sm:h-6 sm:w-6"
      @click="expanded = !expanded"
    >
      <LifeIcon :name="expanded ? 'up' : 'down'" class="h-3.5 w-3.5" />
    </button>

    <!-- 删除叉由调用处放：三处的禁用条件和确认口径都不一样，不该收进来 -->
    <slot name="actions" />
  </li>
</template>
