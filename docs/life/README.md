---
# 不设 title，主题的 <h1 v-if="!!title"> 就不渲染，页面顶上不再顶着一个大字
hidden: true
sidebar: false
editLink: false
lastUpdated: false
# 回到顶部那颗圆钮是给长文用的，本页是应用界面，右下角要留给「问 AI」。
# 插件按 frontmatter.backToTop !== false 决定渲不渲染，所以这里一行就够，
# 不必像 .page-info 那样去 DOM 里摘（它滚动过阈值才挂上，摘了还会再回来）
backToTop: false
head:
  - - meta
    - name: robots
      content: noindex, nofollow
---

<lifeBoard />
