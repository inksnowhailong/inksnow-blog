<template>
  <el-container>
    <el-aside>
      <blogAsideNav></blogAsideNav>
    </el-aside>
    <el-main>
      <el-scrollbar>
        <div class="page-box">
          <keep-alive>
            <component :is="page"></component>
          </keep-alive>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import blogAsideNav from "./blog-aside-nav.vue";
import { useStore } from "@/store/store";
import { computed, defineAsyncComponent } from "vue";

//  计算属性可以传入一个组件 就不需要注册组件了。
// 异步引入组件   计算属性 里面把依赖的变量分开来，能够解决代码堆在一起时候的找不到正确的依赖问题
const page = computed(() => {
  const pagestr = useStore().state.liPage;
  // 异步引入组件需要这么个函数包裹  实现组件懒加载
  const comp = defineAsyncComponent(
    () => import(`./blog-pages/${pagestr}.vue`)
  );
  return comp;
});
</script>

<style scoped lang="scss">
.el-aside {
  width: $asideWidth;
}
.el-main {
  padding-right: 5px;
}
.el-scrollbar {
  width: 100%;
}
.page-box{
  width: 1000px;
  padding-bottom: 50px;
  margin: 0 auto;
}
</style>
