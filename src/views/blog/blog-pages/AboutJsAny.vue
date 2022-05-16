<template>
    <div>

    <strong class="error">坑：在我引入这个代码高亮库的js文件时候</strong>
    <el-alert type="error" :closable="false">
      <span slot="title"  >
        无法找到模块“vue3-highlightjs”的声明文件。“/node_modules/vue3-highlightjs/dist/vue3-highlight.js”隐式拥有
        "any" 类型。 尝试使用 `npm i --save-dev @types/vue3-highlightjs`
        (如果存在)，或者添加一个包含 `declare module 'vue3-highlightjs';`
        的新声明(.d.ts)文件
      </span>
    </el-alert>
    <strong class="success"> 解决办法：1、直接修改了tsconfig.json </strong>
    <pre  class="line-numbers">
    <code v-prism class="language-javascript">
    {
      "compilerOptions": {
        // 这里加入这两行配置，就不报红了
        "noImplicitAny": false,
        "allowJs": true,
      }
    }
    </code></pre>
    <strong class="success"> 解决办法：2、按提示所说的，设置d.ts文件，然后在ts.config中引入 </strong>

    <pre  class="line-numbers">
    <code v-prism class="language-javascript">
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

<script setup lang="ts">

</script>

<style lang="scss" scoped>

</style>