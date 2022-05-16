<template>
  <div>
    <h1>
      博客中使用的代码高亮显示插件为<span class="cite">vue3-highlightjs</span>
    </h1>
    <h2>安装</h2>
    <span class="cite">npm i vue3-highlightjs --save</span>
    <h2>加入vue3</h2>
    <PrismCode :code="codes[0]"></PrismCode>
    <h2>使用</h2>
    <PrismCode :code="codes[1]"></PrismCode>

  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const codes = reactive([
  `
     // 引入插件的东西
    import VueHighlightJS from "vue3-highlightjs";
    // 这里可以引用不同主题 直接去node_module里面找对应文件夹
    import "highlight.js/styles/obsidian.css";
    // 在main.ts里面 使用你的vue实例use它
    const app = createApp(App)
    .use(VueHighlightJS)
    `,
    `
      <pre ></pre>;
          <code v-prism class="language-javascript">;
          // code.....
          </code>;
        </pre>;
    `
])
</script>

<style scoped></style>
