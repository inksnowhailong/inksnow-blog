import { defineUserConfig } from "vuepress";
import recoTheme from "vuepress-theme-reco";
import { viteBundler } from "@vuepress/bundler-vite";
import { redirectPlugin } from "@vuepress/plugin-redirect";
// import path from 'path';
export default defineUserConfig({
  base: "/inksnow-blog/",
  title: "海龙的博客",
  description: "海龙的博客",
  bundler: viteBundler(),
  theme: recoTheme({
    // viteBundlerOptions: {
    //   viteOptions:{
    //     base: '/inksnow-blog/',
    //   },
    //   vuePluginOptions: {},
    // },
    primaryColor: "#4d78cc",
    catalogTitle: "目录",
    home: "/HOME.md",
    style: "@vuepress-reco/style-default",
    logo: "/logo.png",
    author: "海龙",
    authorAvatar: "/head.png",
    docsRepo: "https://github.com/inksnowhailong/inksnow-blog",
    docsBranch: "master",
    docsDir: ".",
    lastUpdatedText: "",
    // series 为原 sidebar
    series: {
      "/blogs/reading/": [
        {
          text: "思想",
          children: ["人生十二法则"],
        },
      ],
      "/blogs/codes": [
        {
          text: "第三方库",
          children: ["/js/高德地图.md"],
        },
        {
          text: "JS/TS技巧",
          children: ["/js/js主动触发事件.md"],
        },
      ],
    },
    navbar: [
      { text: "首页", link: "/HOME" },
      { text: "编程", link: "/blogs/codes/index.md" },
      {
        text: "读书",
        link: "/blogs/reading/index.md",
      },
    ],
    // bulletin: {
    //   body: [
    //     {
    //       type: "text",
    //       content: `🎉🎉🎉 reco 主题 2.x 已经接近 Beta 版本，在发布 Latest 版本之前不会再有大的更新，大家可以尽情尝鲜了，并且希望大家在 QQ 群和 GitHub 踊跃反馈使用体验，我会在第一时间响应。`,
    //       style: "font-size: 12px;",
    //     },
    //     {
    //       type: "hr",
    //     },
    //     {
    //       type: "title",
    //       content: "QQ 群",
    //     },
    //     {
    //       type: "text",
    //       content: `
    //       <ul>
    //         <li>QQ群1：1037296104</li>
    //         <li>QQ群2：1061561395</li>
    //         <li>QQ群3：962687802</li>
    //       </ul>`,
    //       style: "font-size: 12px;",
    //     },
    //     {
    //       type: "hr",
    //     },
    //     {
    //       type: "title",
    //       content: "GitHub",
    //     },
    //     {
    //       type: "text",
    //       content: `
    //       <ul>
    //         <li><a href="https://github.com/vuepress-reco/vuepress-theme-reco-next/issues">Issues<a/></li>
    //         <li><a href="https://github.com/vuepress-reco/vuepress-theme-reco-next/discussions/1">Discussions<a/></li>
    //       </ul>`,
    //       style: "font-size: 12px;",
    //     },
    //     {
    //       type: "hr",
    //     },
    //     {
    //       type: "buttongroup",
    //       children: [
    //         {
    //           text: "打赏",
    //           link: "/docs/others/donate.html",
    //         },
    //       ],
    //     },
    //   ],
    // },
    // commentConfig: {
    //   type: 'valine',
    //   // options 与 1.x 的 valineConfig 配置一致
    //   options: {
    //     // appId: 'xxx',
    //     // appKey: 'xxx',
    //     // placeholder: '填写邮箱可以收到回复提醒哦！',
    //     // verify: true, // 验证码服务
    //     // notify: true,
    //     // recordIP: true,
    //     // hideComments: true // 隐藏评论
    //   },
    // },
  }),
  plugins: [
    redirectPlugin({
      config: {
        "/inksnow-blog/": "/HOME.md",
      },
    }),
  ],
  debug: true,
});
