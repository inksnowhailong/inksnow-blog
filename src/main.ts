import { createApp } from "vue";
import App from "./App.vue";
// 基础样式
import "./assets/style/global.scss";
// 路由
import router from "./router/router";
// vuex
import { store } from "./store/store";
// 语法高亮
import VueHighlightJS from "vue3-highlightjs";
import "highlight.js/styles/solarized-light.css";
const app = createApp(App)
    .use(router)
    .use(VueHighlightJS)
    .use(store);
app.mount("#app");
