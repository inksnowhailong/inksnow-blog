import { createApp } from "vue";
import App from "./App.vue";
// 基础样式
import "./assets/style/global.scss";
// 路由
import router from "./router/router";
// vuex
import { store, key } from "./store/store";
// 语法高亮
import Prism from "prismjs";
import { debounce } from "lodash";
const app = createApp(App).use(router).use(store, key);
// 语法高亮的全局指令
const upPlugins = debounce(() => {
  setTimeout(Prism.highlightAll, 0);
});
app.directive("prism", {
  beforeMount(el, binding) {
    // 替换指令内的字符串为处理后的
    const innerCode = el.innerHTML;
    const type: string = binding.value || "javascript";
    el.innerHTML = Prism.highlight(innerCode, Prism.languages[type], type);
    upPlugins();
  },
});
app.mount("#app");
