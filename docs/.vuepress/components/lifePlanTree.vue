<script setup lang="ts">
/**
 * 计划路线图
 * @description 把计划树画成一条条从上到下的路：方向是路段，清单项是路上的点。
 * 每一项的名字直接可见，不需要点开才知道要做什么——这是它与格子墙的关键差别。
 * 每日项不画进路里，它们每天重复，归打卡区管，两边职能不重叠。
 */
import { computed, ref } from 'vue';
import LifeIcon from './lifeIcon.vue';
import { planSections } from './usePlanSections';

const props = defineProps<{
  /** /life/plan 返回的嵌套树 */
  plan: any[];
}>();

const emit = defineEmits<{
  (e: 'select', node: any, path: string): void;
}>();

/** 组的展开状态，键是组 id；没记录的按默认规则 */
const expanded = ref<Record<string, boolean>>({});

/** 组里"已完成 N 项"那一折是否摊开，键是组 id */
const doneShown = ref<Record<string, boolean>>({});

/** 路段与当前项的算法与打卡卡共用，见 usePlanSections */
const sections = computed(() => planSections(props.plan));

/**
 * 当前重点：各方向里标了 ★ 且还没做完的项，带面包屑
 * @description 这是路线图最上面那一块——几十项里现在先学谁。
 * 标记由 AI 按使用者的工作场景挑，使用者一句话就能改，页面只负责把它们提出来
 */
const focusList = computed(() =>
  sections.value.flatMap((s) =>
    s.groups.flatMap((g) =>
      g.items
        .filter((i: any) => i.focused && i.status !== 'DONE')
        .map((i: any) => ({
          item: i,
          section: s,
          group: g,
          path: [s.title, g.title].filter(Boolean).join(' › '),
        })),
    ),
  ),
);

/**
 * 组是否展开
 * @description 默认只展开「在这」所在的那一组：其余组折成一行，
 * 组多了整棵树也只有一处是摊开的；点过的按点过的记
 */
function isOpen(g: any, s: any): boolean {
  return expanded.value[g.id] ?? g.items.some((i: any) => i.id === s.currentId);
}

function toggle(g: any, s: any) {
  expanded.value = { ...expanded.value, [g.id]: !isOpen(g, s) };
}

/** 组内还没做完的项，做完的折进一行计数 */
function pending(g: any) {
  return g.items.filter((i: any) => i.status !== 'DONE');
}

function finished(g: any) {
  return g.items.filter((i: any) => i.status === 'DONE');
}

function toggleDone(g: any) {
  doneShown.value = { ...doneShown.value, [g.id]: !doneShown.value[g.id] };
}

/** 说明里剥掉那句所有条目共用的判定标准，列表里说一遍就够 */
function brief(description: string): string {
  return String(description || '').split('。判定：')[0];
}

/** 点一项，把面包屑一起带出去，弹窗要用 */
function pick(item: any, section: any, group: any) {
  const path = [section.title, group.title].filter(Boolean).join(' › ');
  emit('select', item, path);
}
</script>

<template>
  <!--
    主题把这里当文章正文排版，会给 ul 加项目符号和缩进、给 p 加上下边距，
    所以在根上一次性压掉，免得每个列表各写一遍
  -->
  <div
    data-alt="plan-tree"
    class="grid gap-5 [&_li]:!my-0 [&_ul]:!m-0 [&_ul]:!list-none [&_ul]:!p-0"
  >
    <!-- 当前重点：几十项里现在先学谁。空着就提示去问 AI，标记不靠手点 -->
    <section
      data-alt="focus-list"
      class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <p class="mb-1.5 flex items-baseline justify-between gap-2">
        <span class="text-sm font-semibold text-amber-800 dark:text-amber-200"
          >当前重点</span
        >
        <span class="text-xs tabular-nums text-amber-700/70 dark:text-amber-300/70"
          >{{ focusList.length }} 项</span
        >
      </p>
      <ul v-if="focusList.length" class="grid gap-x-2 sm:grid-cols-2">
        <li v-for="f in focusList" :key="f.item.id">
          <button
            data-alt="focus-item"
            type="button"
            class="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-amber-100/70 dark:hover:bg-amber-500/15"
            @click="pick(f.item, f.section, f.group)"
          >
            <span class="mt-px text-amber-500 dark:text-amber-300">★</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm text-slate-800 dark:text-slate-100">{{
                f.item.title
              }}</span>
              <span class="block truncate text-[11px] text-slate-500 dark:text-slate-400">{{
                f.path
              }}</span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/80">
        还没定重点。点右上角问 AI：「按我平时的工作，帮我挑几项先学」，
        或直接说「这周先学时序图」。
      </p>
    </section>

    <section
      v-for="s in sections"
      :key="s.id"
      data-alt="tree-section"
      class="grid gap-3"
    >
      <!-- 路段标题 -->
      <header data-alt="section-head" class="grid gap-1.5">
        <div class="flex items-baseline justify-between gap-3">
          <p
            class="text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            {{ s.title }}
          </p>
          <span
            class="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400"
          >
            {{ s.done }}/{{ s.total }}
          </span>
        </div>
        <div
          class="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        >
          <div
            class="h-full rounded-full bg-brand-500 transition-all dark:bg-brand-300"
            :style="{ width: (s.total ? (s.done / s.total) * 100 : 0) + '%' }"
          />
        </div>
        <!-- 每日项在这里只作一行标注，打卡在上面的打卡区做 -->
        <p
          v-for="d in s.daily"
          :key="d.id"
          data-alt="section-daily"
          class="text-xs text-slate-500 dark:text-slate-400"
        >
          每日 · {{ d.title }}
          <span class="tabular-nums"
            >{{ d.thresholdMinutes }} 分钟 → {{ d.points }} 分</span
          >
          <span
            v-if="d.isMainline"
            class="ml-1 rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            >主线</span
          >
        </p>
      </header>

      <!-- 组 -->
      <div
        v-for="g in s.groups"
        :key="g.id"
        data-alt="tree-group"
        class="border-l-2 border-slate-100 pl-2.5 dark:border-slate-700"
      >
        <button
          v-if="g.title"
          data-alt="group-head"
          type="button"
          class="flex w-full items-baseline justify-between gap-3 py-1 text-left"
          @click="toggle(g, s)"
        >
          <span
            class="text-sm font-medium"
            :class="
              g.allDone
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-700 dark:text-slate-200'
            "
          >
            {{ g.title }}
          </span>
          <span
            class="flex shrink-0 items-center gap-1 text-xs tabular-nums"
            :class="
              g.allDone
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
            "
          >
            {{ g.done }}/{{ g.total }}
            <LifeIcon
              :name="isOpen(g, s) ? 'up' : 'down'"
              class="h-3.5 w-3.5 opacity-60"
            />
          </span>
        </button>

        <ul
          v-if="isOpen(g, s)"
          data-alt="group-items"
          class="grid gap-x-2 sm:grid-cols-2 xl:grid-cols-3"
        >
          <!-- 没做完的照常列；做完的折成一行计数，点开才摊 -->
          <li
            v-for="item in doneShown[g.id] ? g.items : pending(g)"
            :key="item.id"
          >
            <button
              data-alt="tree-item"
              type="button"
              class="flex h-full w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
              @click="pick(item, s, g)"
            >
              <!-- 状态点：做完 / 当前 / 未做 -->
              <span
                data-alt="item-dot"
                class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 text-[10px] leading-none"
                :class="
                  item.status === 'DONE'
                    ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-slate-900'
                    : item.id === s.currentId
                      ? 'border-amber-500 bg-amber-500/15 dark:border-amber-400'
                      : 'border-slate-300 dark:border-slate-600'
                "
              >
                <template v-if="item.status === 'DONE'">✓</template>
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    class="text-sm"
                    :class="
                      item.status === 'DONE'
                        ? 'text-slate-400 line-through dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                    "
                  >
                    {{ item.title }}
                  </span>
                  <span
                    v-if="item.focused && item.status !== 'DONE'"
                    data-alt="item-focus"
                    class="text-xs text-amber-500 dark:text-amber-300"
                    >★</span
                  >
                  <span
                    v-if="item.id === s.currentId"
                    class="rounded bg-amber-100 px-1 py-px text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    >在这</span
                  >
                  <span
                    v-if="!item.required"
                    class="rounded bg-slate-100 px-1 py-px text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    >选修</span
                  >
                </span>
                <!-- 当前项把说明摊开，其余留给弹窗 -->
                <span
                  v-if="item.id === s.currentId && brief(item.description)"
                  class="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500 dark:text-slate-400"
                >
                  {{ brief(item.description) }}
                </span>
              </span>
            </button>
          </li>
          <li
            v-if="finished(g).length"
            class="sm:col-span-2 xl:col-span-3"
          >
            <button
              data-alt="done-fold"
              type="button"
              class="px-2 py-1 text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              @click="toggleDone(g)"
            >
              {{ doneShown[g.id] ? '收起已完成' : `已完成 ${finished(g).length} 项` }}
            </button>
          </li>
        </ul>
      </div>
    </section>

    <p
      v-if="!sections.length"
      class="text-sm text-slate-500 dark:text-slate-400"
    >
      还没有清单项
    </p>
  </div>
</template>
