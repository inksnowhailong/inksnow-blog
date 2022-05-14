<template>
  <div class="home">
    <h1 class="title">
      <strong>InkSnow</strong>
      的
      <span> 个人博客 </span>
    </h1>
    <h3 class="title2">日复一日，年复一年</h3>
    <el-button type="primary" @click="$router.replace('/blog')">
      开 始<el-icon class="el-icon--SwitchButton"><SwitchButton /></el-icon>
    </el-button>
    <el-divider />
  </div>
</template>

<script setup lang="ts">
import { SwitchButton } from "@element-plus/icons-vue";
</script>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: calc(100vh - 60px);
  padding-bottom: 40px;
  background: $baseBgColor;
  box-sizing: border-box;
  .title {
    font-size: 400%;
    letter-spacing: 0.2em;
    strong {
      color: $theme;
    }
    span {
      color: $vcolor;
    }
  }
  .title2 {
    font-size: 300%;
    margin-top: 20px;
  }
  .el-icon--SwitchButton{
    margin-left: 10px;
  }
  .el-button{
    font-size: 200%;
    padding: 30px 45px;
    margin-top: 20px;
  }
  .el-divider{
    width: 50%;
  } 
}
</style>
