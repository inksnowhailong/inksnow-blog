import { createApp } from 'vue'
import App from './App.vue'
import './assets/style/global.scss'
import router from './router/router.js'
createApp(App).use(router).mount('#app')
