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
import { ref } from "vue";

const activeIndex = ref<string>('/');
</script>

<style scoped lang="scss">
.box-card {
  width: 100%;
  display: flex;
  align-items: center;
  line-height: 60px;
  box-shadow: var(--el-box-shadow);
}
.el-menu{
  flex: 1;
}
.logoText {
  font-size: 20px;
  color: $theme;
  margin: 0 100px 0 60px;
}
</style>
