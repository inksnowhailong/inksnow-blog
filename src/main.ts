import { createApp } from 'vue'
import App from './App.vue'
// 基础样式
import './assets/style/global.scss'
// 路由
import router from './router/router.js'
// 语法高亮
import VueHighlightJS from 'vue3-highlightjs'
import 'highlight.js/styles/solarized-light.css'
createApp(App).use(router).use(VueHighlightJS).mount('#app')
