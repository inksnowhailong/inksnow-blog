<template>
  <el-container>
    <el-aside>
    <asideList></asideList>
    </el-aside>
    <el-main>Main</el-main>
  </el-container>
</template>

<script setup lang="ts">
import asideList from './asideList.vue'
</script>

<style scoped lang="scss">
.el-aside{
  width: $asideWidth;
}
</style>
