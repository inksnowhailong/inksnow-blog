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

    <strong class="error">坑：在我引入这个库的js文件时候</strong>
    <el-tag type="danger">
      无法找到模块“vue3-highlightjs”的声明文件。“/node_modules/vue3-highlightjs/dist/vue3-highlight.js”隐式拥有
      "any" 类型。 尝试使用 `npm i --save-dev @types/vue3-highlightjs`
      (如果存在)，或者添加一个包含 `declare module 'vue3-highlightjs';`
      的新声明(.d.ts)文件
    </el-tag>
    <strong class="success"> 解决办法：1、直接修改了tsconfig.json </strong>
    <pre v-highlightjs>
    <code class="javascript">
    {
      "compilerOptions": {
        // 这里加入这两行配置，就不报红了
        "noImplicitAny": false,
        "allowJs": true,
      }
    }
    </code></pre>
      <strong class="success"> 解决办法：2、按提示所说的，设置d.ts文件 </strong>
  
        <pre v-highlightjs>
    <code class="javascript">
    // 根目录建立一个index.d.ts文件，然后写入这行代码
        declare module "vue3-highlightjs";
    // 然后在tsconfig.json里面的include引用它
      {
          "include": [
          "index.d.ts"
        ],
      }
    </code></pre>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
