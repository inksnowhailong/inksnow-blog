<template>
  <div class="box-card">
    <h1 class="logoText">InkSnow</h1>
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
const activeIndex = ref<string>('');

watchEffect(() => {
  // 页面更改时，同步更新默认导航，以防止一刷新，导航的值就变成默认的'/'
  activeIndex.value = route.path
});
</script>

<style scoped lang="scss">
.box-card {
  width: 100%;
  display: flex;
  align-items: center;
  height: 60px;
  line-height: 60px;
  box-shadow: var(--el-box-shadow-light);
}
.el-menu {
  flex: 1;
}
.logoText {
  font-size: 20px;
  color: $theme;
  margin: 0 100px 0 60px;
}
</style>
