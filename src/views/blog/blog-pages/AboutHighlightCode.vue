<template>
  <div>
    <h1>
      博客中使用的代码高亮显示插件为<span class="cite">vue3-highlightjs</span>
    </h1>
    <h2>安装</h2>
    <span class="cite">npm i vue3-highlightjs --save</span>
    <h2>加入vue3</h2>
    <pre v-highlightjs>
    <code class="javascript">
    // 引入插件的东西
    import VueHighlightJS from "vue3-highlightjs";
    // 这里可以引用不同主题 直接去node_module里面找对应文件夹
    import "highlight.js/styles/obsidian.css";
    // 在main.ts里面 使用你的vue实例use它
    const app = createApp(App)
    .use(VueHighlightJS)
    </code></pre>

    <h2>使用</h2>
    <pre v-highlightjs>
    <code class="javascript">
        &lt;pre v-highlightjs&gt;
          &lt;code class="javascript"&gt;
          // code.....
          &lt;/code&gt;
        &lt;/pre&gt;
    </code>
    </pre>

  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
