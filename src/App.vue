<template>
  <el-container>
    <el-header>
      <Header></Header>
    </el-header>
    <router-view></router-view>
  </el-container>
</template>

<script setup lang="ts">
import Header from "components/layout/header.vue";

</script>

<style lang="scss">
.el-header {
  padding: 0;
}
.el-container{
  height: 100%;
  overflow: hidden;
}
</style>
