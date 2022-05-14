import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  {
    path: '/inksnow-blog/',
    redirect:'/'
  },
  {
    path: "/",
    name: "",
    component: () => import("views/home/index.vue"),
  },
  {
    path: "/blog",
    name: "blog",
    component: () => import("views/blog/index.vue"),
    redirect:'/blog/AboutHighlightCode',
    children: [
      {
        path: 'AboutHighlightCode',
        component:()=>import('views/blog/blog-pages/AboutHighlightCode.vue')
      },
      {
        path: 'TSConfigExplain',
        component:()=>import('views/blog/blog-pages/TSConfigExplain.vue')
      },
    ]
  },
];
export default createRouter({
  history: createWebHistory(),
  routes ,
});
