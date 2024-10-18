import { defineUserConfig } from "vuepress";
import recoTheme from "vuepress-theme-reco";
import { viteBundler } from "@vuepress/bundler-vite";
import { getAllMdFilesSync, mdPathFormat } from "./util";
import * as path from "node:path";
import mdit from "markdown-it-plantuml";
import { readingTimePlugin } from "@vuepress/plugin-reading-time";
import { googleAnalyticsPlugin } from "@vuepress/plugin-google-analytics";

/**读书 */
const reading = mdPathFormat(
  getAllMdFilesSync(path.resolve("__dirname", "../docs/blogs/reading")),
  "reading/"
);
/**第三方服务的使用 */
const threeService = mdPathFormat(
  getAllMdFilesSync(
    path.resolve("__dirname", "../docs/blogs/codes/threeService")
  ),
  "codes/"
);
/**jsTs技巧博客 */
const jsTsTip = mdPathFormat(
  getAllMdFilesSync(path.resolve("__dirname", "../docs/blogs/codes/js")),
  "codes/"
);
/**实验博客路径 */
const tryPaths = mdPathFormat(
  getAllMdFilesSync(path.resolve("__dirname", "../docs/blogs/codes/try")),
  "codes/"
);

export default defineUserConfig({
  base: process.env.NODE_ENV == "netlify" ? "/" : "/inksnow-blog/",
  title: "海龙的博客",
  description: "海龙的博客",
  lang: "zh-CN",
  bundler: viteBundler(),
  theme: recoTheme({
    commentConfig: {
      type: "valine",
      options: {
        appId: "jyNBwYQNyCPnnLSSRJnvfQfM-gzGzoHsz", // your appId
        appKey: "CTnjOhJbUp57wOdShiziBs03", // your appKey
        // hideComments: true, // 全局隐藏评论，默认 false
        visitor: true,
        // 设置Bilibili表情包地址
        emojiCDN: "//i0.hdslb.com/bfs/emote/",
        // 表情title和图片映射
        emojiMaps: {
          tv_doge: "6ea59c827c414b4a2955fe79e0f6fd3dcd515e24.png",
          tv_亲亲: "a8111ad55953ef5e3be3327ef94eb4a39d535d06.png",
          tv_偷笑: "bb690d4107620f1c15cff29509db529a73aee261.png",
          tv_再见: "180129b8ea851044ce71caf55cc8ce44bd4a4fc8.png",
          tv_冷漠: "b9cbc755c2b3ee43be07ca13de84e5b699a3f101.png",
          tv_发怒: "34ba3cd204d5b05fec70ce08fa9fa0dd612409ff.png",
          tv_发财: "34db290afd2963723c6eb3c4560667db7253a21a.png",
          tv_可爱: "9e55fd9b500ac4b96613539f1ce2f9499e314ed9.png",
          tv_吐血: "09dd16a7aa59b77baa1155d47484409624470c77.png",
          tv_呆: "fe1179ebaa191569b0d31cecafe7a2cd1c951c9d.png",
          tv_呕吐: "9f996894a39e282ccf5e66856af49483f81870f3.png",
          tv_困: "241ee304e44c0af029adceb294399391e4737ef2.png",
          tv_坏笑: "1f0b87f731a671079842116e0991c91c2c88645a.png",
          tv_大佬: "093c1e2c490161aca397afc45573c877cdead616.png",
          tv_大哭: "23269aeb35f99daee28dda129676f6e9ea87934f.png",
          tv_委屈: "d04dba7b5465779e9755d2ab6f0a897b9b33bb77.png",
          tv_害羞: "a37683fb5642fa3ddfc7f4e5525fd13e42a2bdb1.png",
          tv_尴尬: "7cfa62dafc59798a3d3fb262d421eeeff166cfa4.png",
          tv_微笑: "70dc5c7b56f93eb61bddba11e28fb1d18fddcd4c.png",
          tv_思考: "90cf159733e558137ed20aa04d09964436f618a1.png",
          tv_惊吓: "0d15c7e2ee58e935adc6a7193ee042388adc22af.png",
          // ... 更多表情
        },
      },
    },
    viteBundlerOptions: {
      viteOptions: {
        assetsInclude: ["**/*.glb"],
      },
    },
    primaryColor: "#4d78cc",
    catalogTitle: "目录",
    // home: "/",
    style: "@vuepress-reco/style-default",
    logo: "/logo.png",
    author: "海龙",
    authorAvatar: "/head.png",
    docsRepo: "https://github.com/inksnowhailong/inksnow-blog",
    docsBranch: "master",
    docsDir: "/docs",
    lastUpdatedText: "最后更新日期",
    // series 为原 sidebar
    series: {
      "/blogs/reading/": [
        {
          text: "思想",
          children: reading,
        },
      ],
      "/blogs/codes/": [
        {
          text: "第三方库",
          children: threeService,
        },
        {
          text: "JS/TS技巧",
          children: jsTsTip,
        },
        {
          text: "实验性",
          children: tryPaths,
        },
      ],
    },
    navbar: [
      { text: "首页", link: "/" },
      { text: "编程", link: "/blogs/codes/编程.md" },
      {
        text: "读书",
        link: "/blogs/reading/读书笔记记录.md",
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
  extendsMarkdown: (md) => {
    md.set({ breaks: true });
    md.use(mdit);
  },
  plugins: [
    readingTimePlugin({}),
    googleAnalyticsPlugin({
      id: "G-P3B0T91Z9B",
    }),
    // redirectPlugin({
    //   config: {
    //     defaultBehavior: "homepage",
    //     "/": "/HOME.html",
    //     "/inksnow-blog/": "/inksnow-blog/HOME.html"
    //   },
    // }),
  ],
  debug: true,
});
