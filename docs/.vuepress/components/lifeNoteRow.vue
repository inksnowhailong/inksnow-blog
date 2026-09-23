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
import { firstParagraph, plainText, renderMarkdown } from './lifeMarkdown';

const props = withDefaults(
  defineProps<{
    /** 日志正文，可能是一句话，也可能是一篇几千字的整理稿 */
    text: string;
    /** 这条记在哪天，YYYY-MM-DD；左栏只显示月日 */
    date?: string;
    /** 正文下面那行补充小字，如方向汇总时这条日志属于哪个子项 */
    meta?: string;
    /** 这一行的 data-alt；三处日志各有各的名字，出问题时一眼看出是哪一摊的 */
    alt?: string;
  }>(),
  { alt: 'note-row' },
);

const expanded = ref(false);

/** 折叠时显示的首段纯文本 */
const brief = computed(() => firstParagraph(props.text));

/**
 * 折叠态看不出来的那几样：代码块、行内代码、链接、表格
 * @description 它们即便只有一行也值得展开——折叠给的是纯文字，
 * 链接点不动、表格挤成一串竖线，都得渲染出来才算数
 */
const RICH = /```|`[^`]+`|\[[^\]\n]+\]\([^()\s]+\)|https?:\/\/|^\s*\|.*\|\s*$/m;

/**
 * 正文是不是不止首段这么多
 * @description 比的是「整篇抹平标记后的字数」和「首段」：两边同一套抹法，
 * 于是换行、缩进、多打的空格这些看不见的差别不会被误判成还有下文。
 * 一句白话日志两边一样长，于是箭头是灰的
 */
const hasMore = computed(() => {
  const raw = String(props.text ?? '');
  if (RICH.test(raw)) return true;
  return plainText(raw).length > brief.value.length;
});

/** 展开后的正文 HTML，唯一允许进 v-html 的来源 */
const html = computed(() => renderMarkdown(props.text));
</script>

<template>
  <li
    :data-alt="alt"
    class="group flex min-w-0 items-start gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
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
        浏览器默认边距在这儿反而更碍事，不如把要的几条直接点明。

        `!` 不是随手加的：LifeModal 的壳上有一串 `[&_p]:!my-0 [&_ul]:!list-none
        [&_ul]:!p-0` 的 Markdown 重置，它和这里的选择器同级，不带 `!` 的一律被
        压掉——列表会变成没点、没缩进的一坨。

        点为什么落在 li 而不是跟着重置去改 ul：两边都带 `!`、选择器又同级时，
        谁赢只看 Tailwind 生成的先后，而它按类名排序，disc 恰好排在 none
        前面，于是在 ul 上怎么写都稳定地输。选到 li 多一层选择器，靠的是
        优先级而不是生成顺序——标记本来就是按 li 自己的 list-style-type 画的

        `min-w-0 max-w-full` 与 pre、表格上的 overflow：弹窗正文是 grid，
        grid 子项默认 `min-width:auto`，一段长代码或一张宽表会把整个弹窗顶宽，
        于是段落右边被裁掉、整页横着滚。宽的那两样各自滚，行本身不跟着长
      -->
      <div
        v-if="expanded"
        data-alt="note-row-full"
        class="min-w-0 max-w-full break-words text-sm leading-snug text-slate-700 dark:text-slate-200 [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:!my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-2.5 [&_blockquote]:text-slate-500 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.85em] [&_h1]:!mb-1 [&_h1]:!mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:!mb-1 [&_h2]:!mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:!mb-0.5 [&_h3]:!mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_li]:!my-0.5 [&_ol]:!my-1.5 [&_ol]:!pl-4 [&_ol>li]:!list-decimal [&_p]:!my-1.5 [&_pre]:!my-1.5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-2 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_ul]:!my-1.5 [&_ul]:!pl-4 [&_ul>li]:!list-disc [&_li>ol]:!my-0 [&_li>ul]:!my-0 [&_.note-table]:!my-1.5 [&_.note-table]:max-w-full [&_.note-table]:overflow-x-auto dark:[&_a]:text-brand-300 dark:[&_blockquote]:border-slate-600 dark:[&_blockquote]:text-slate-400 dark:[&_code]:bg-slate-800 dark:[&_pre]:bg-slate-800 dark:[&_td]:border-slate-600 dark:[&_th]:border-slate-600 dark:[&_th]:bg-slate-700/50 [&>:first-child]:!mt-0 [&>:last-child]:!mb-0"
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

    <!--
      窄屏 36px 保住触达，宽屏收成 24px，与旁边那颗删除叉同一套尺寸。
      没有下文时不是不渲染而是隐形占位：整列日志里一句话的和长稿的混着排，
      真撤掉这颗，旁边的删除叉就会在两种行之间左右跳
    -->
    <button
      data-alt="note-toggle"
      type="button"
      :disabled="!hasMore"
      :aria-hidden="!hasMore"
      :tabindex="hasMore ? undefined : -1"
      :title="expanded ? '收起' : '展开全文'"
      :aria-label="expanded ? '收起' : '展开全文'"
      :aria-expanded="expanded"
      class="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-300 transition hover:text-brand-500 dark:text-slate-500 sm:h-6 sm:w-6"
      :class="hasMore || 'invisible'"
      @click="expanded = !expanded"
    >
      <LifeIcon :name="expanded ? 'up' : 'down'" class="h-3.5 w-3.5" />
    </button>

    <!-- 删除叉由调用处放：三处的禁用条件和确认口径都不一样，不该收进来 -->
    <slot name="actions" />
  </li>
</template>
