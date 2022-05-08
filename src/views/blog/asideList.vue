<template>
  <el-scrollbar height="100%" view-style="height:100%">
    <dl class="asideBox">
      <component
        :is="item.is"
        v-text="item.text"
        v-for="(item, index) in list"
        :key="index"
        :class="{ active: activeIndex === index }"
      ></component>
    </dl>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
const list = reactive([
  {
    is: "dt",
    text: "开发本博客遇到的坑",
  },
  {
    is: "dd",
    text: "关于代码高亮",
  },
]);
const activeIndex = ref(1);
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
  }
  dd {
    width: max-content;
    font-size: 14px;
    margin-left: 1.5em;
    cursor: pointer;
    &:hover {
      color: $theme;
    }
  }
  .active {
    border-bottom: 2px solid $vcolor;
  }
}
</style>
