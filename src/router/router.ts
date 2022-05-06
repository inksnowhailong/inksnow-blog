import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const routes:Array<RouteRecordRaw> = [
  {
    path: "/",
    component: () => import("views/home/index.vue"),
  },
  {
    path: "/blog",
    component: () => import("views/blog/index.vue"),
  },
];
export default createRouter({
  history: createWebHistory(),
  routes ,
});
