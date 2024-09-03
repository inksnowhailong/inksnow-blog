import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
  lang: "zh-CN",
  title: "海龙的博客",
  description: "日复一日，年复一年",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
