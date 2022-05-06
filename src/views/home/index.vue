<template>
  <div class="common-layout">
    <el-container>
      <el-header>Header</el-header>
      <el-container>
        <el-aside width="200px">Aside</el-aside>
        <el-main>Main</el-main>
      </el-container>
    </el-container>
    <p>name</p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
p{
  color:$red;
}
</style>
