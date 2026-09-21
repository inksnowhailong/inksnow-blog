<script setup lang="ts">
/**
 * 计划路线图
 * @description 把计划树画成一条条从上到下的路：方向是路段，清单项是路上的点。
 * 每一项的名字直接可见，不需要点开才知道要做什么——这是它与格子墙的关键差别。
 * 每日项不画进路里，它们每天重复，归打卡区管，两边职能不重叠。
 */
import { computed, ref } from 'vue';
import LifeIcon from './lifeIcon.vue';

const props = defineProps<{
  /** /life/plan 返回的嵌套树 */
  plan: any[];
}>();

const emit = defineEmits<{
  (e: 'select', node: any, path: string): void;
}>();

/** 已完成的组默认折起，它们不再需要注意力 */
const expanded = ref<Record<string, boolean>>({});

const byOrder = (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
const isDone = (n: any) => n.status === 'DONE';
const isDropped = (n: any) => n.status === 'DROPPED';

/**
 * 给一组清单项算出进度与"当前该做的那一个"
 * @description 手册规定清单顺序即依赖顺序，所以当前项不需要挑，
 * 就是第一个还没做完的
 */
function withProgress(group: { id: string; title: string; items: any[] }) {
  const live = group.items.filter((i) => !isDropped(i));
  const done = live.filter(isDone).length;
  const current = live.find((i) => !isDone(i));
  return {
    ...group,
    done,
    total: live.length,
    currentId: current?.id ?? '',
    allDone: live.length > 0 && done === live.length,
  };
}

/**
 * 把树拍平成"路段 → 组 → 项"三层
 * @description 数据里有两种形状：方向下直接挂清单项（数据库），
 * 或方向下先分组再挂项（AI 控制能力）。这里统一成后者，
 * 直挂的情况归入一个无名组，模板便不必再分情况
 */
const sections = computed(() => {
  return (props.plan ?? [])
    .filter((n) => n.level === 'DIRECTION' && !isDropped(n))
    .sort(byOrder)
    .map((dir) => {
      const kids = [...(dir.children ?? [])].sort(byOrder);
      const loose = kids.filter((k) => k.level === 'CHECKLIST' && !isDropped(k));
      const subs = kids.filter((k) => k.level === 'DIRECTION' && !isDropped(k));
      const groups = [
        ...(loose.length
          ? [{ id: dir.id + ':direct', title: '', items: loose }]
          : []),
        ...subs.map((g) => ({
          id: g.id,
          title: g.title,
          items: (g.children ?? [])
            .filter((c: any) => c.level === 'CHECKLIST' && !isDropped(c))
            .sort(byOrder),
        })),
      ].map(withProgress);

      // 组间顺序同样是推进顺序，所以「在这」只落在第一个没做完的组里，
      // 每个方向只有一个当前点——满屏都是「在这」等于没有标记
      const activeGroup = groups.find((g) => !g.allDone);

      return {
        id: dir.id,
        title: dir.title,
        node: dir,
        currentId: activeGroup?.currentId ?? '',
        /** 挂在这个方向下的每日项，只作一行标注 */
        daily: kids.filter((k) => k.level === 'DAILY'),
        groups,
        done: groups.reduce((s, g) => s + g.done, 0),
        total: groups.reduce((s, g) => s + g.total, 0),
      };
    })
    .filter((s) => s.total > 0);
});

/** 组是否展开：做完的默认收起，其余默认展开 */
function isOpen(g: any): boolean {
  return expanded.value[g.id] ?? !g.allDone;
}

function toggle(g: any) {
  expanded.value = { ...expanded.value, [g.id]: !isOpen(g) };
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
          @click="toggle(g)"
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
              :name="isOpen(g) ? 'up' : 'down'"
              class="h-3.5 w-3.5 opacity-60"
            />
          </span>
        </button>

        <ul
          v-if="isOpen(g)"
          data-alt="group-items"
          class="grid gap-x-2 sm:grid-cols-2 xl:grid-cols-3"
        >
          <li v-for="item in g.items" :key="item.id">
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
