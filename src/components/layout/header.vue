<template>
  <div class="box-card">
    <h1 class="logoText" @click="$router.push('/')">InkSnow</h1>
    <el-menu
      :default-active="activeIndex"
      class="el-menu-demo"
      mode="horizontal"
      router
    >
      <el-menu-item index="/">首页</el-menu-item>
      <el-menu-item index="/blog">博客</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useRoute } from "vue-router";
// 获取route
const route = useRoute();

// 设置当前的默认导航

// 通过path得到一级路由path
function getRouteIndex(): string {
  const routePathArr: string[] = route.path.split("/");

  return "/" + routePathArr[1];
}
const activeIndex = ref<string>("");
watchEffect(() => {
  // 页面更改时，同步更新默认导航，以防止一刷新，导航的值就变成默认的'/'
  activeIndex.value = getRouteIndex();
});
</script>
<style scoped lang="scss">
.box-card {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  width: 100%;
  height: 60px;
  line-height: 60px;
  background: $base-bg-color;
  box-shadow: var(--el-box-shadow-light);
}
.el-menu {
  flex: 1;
  background: $base-bg-color;
}
.logoText {
  margin: 0 100px 0 60px;
  color: $theme;
  font-size: 20px;
  cursor: pointer;
}
</style>
