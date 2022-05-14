<template>
  <el-scrollbar height="100%" view-style="height:100%">
    <dl class="asideBox">
      <component
        :is="item.is"
        v-text="item.text"
        v-for="(item, index) in list"
        :key="index"
        :class="{ active: activePath === item.comp }"
        @click="fnChangePage(item.comp as string)"
      ></component>
    </dl>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, reactive} from "vue";
import { useRoute, useRouter } from "vue-router";

interface navListInterface {
  [index: number]: {
    is: string;
    text: string;
    comp?: string;
  };
}

// 左侧导航
const list: navListInterface = reactive([
  {
    is: "dt",
    text: "开发本博客遇到的坑",
  },
  {
    is: "dd",
    text: "关于代码高亮",
    comp: "AboutHighlightCode",
  },
  {
    is: "dt",
    text: "项目配置",
  },
  {
    is: "dd",
    text: "tsconfig.json常用配置解析",
    comp: "TSConfigExplain",
  },
]);
// 初始化路由状态时候，找到侧边导航对应的函数
const route = useRoute()
let activePath= ref<string>(route.path.slice(6));

const router = useRouter()
// 切换博客页面
const fnChangePage = (comp: string): void => {
    // 跳转路由
    router.push(comp)
    activePath.value  = comp
};
</script>

<style scoped lang="scss">
.asideBox {
  height: 100%;
  padding: 20px 10px;
  box-sizing: border-box;
  background: $asideBoxColor;
  dt {
    font-size: 18px;
    margin-bottom: 10px;
    cursor: default;
    pointer-events: none;
  }
  dd {
    width: max-content;
    height: 25px;
    font-size: 14px;
    margin-left: 1.5em;
    box-sizing: border-box;
    cursor: pointer;
    &:hover {
      color: $theme;
    }
  }
  .active {
    border-bottom: 2px solid $theme;
  }
}
</style>
