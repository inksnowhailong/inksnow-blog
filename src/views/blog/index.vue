<template>
  <el-container>
    <el-aside>
    <asideList></asideList>
    </el-aside>
    <el-main>
      <pre v-highlightjs><code class="javascript">const s = new Date().toString()</code></pre>
    </el-main>
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
