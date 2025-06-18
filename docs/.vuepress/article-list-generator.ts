import { App, Plugin } from "vuepress/core";
import fs from "fs/promises";
import path from "path";

/**
 * 生成文章列表插件
 */
export default (): Plugin => ({
  name: "vuepress-article-list-generator",

  async onInitialized(app) {
    console.log("article-list-generator 插件正在执行");
    try {
      articleListGenerator(app);
    } catch (error) {
      console.error("生成文章列表失败:", error);
    }
  },
});

/**
 * 生成代码类博客的文章列表和内容映射文件
 * @param app VuePress 应用实例
 * @returns Promise<void>
 */
async function articleListGenerator(app: App) {
  /**
   * 代码类博客页面列表
   * @type {Array<{title: string; path: string; date: string;}>}
   *   title: 标题
   *   path: 路径
   *   date: 日期
   */
  const codePages = app.pages.filter((page) =>
    page.path.startsWith("/blogs/codes/")
  );
  /**
   * 文章路径与元信息列表
   * @type {Array<{title: string; path: string; date: string;}>}
   */
  const pathList: {
    /** 标题 */
    title: string;
    /** 路径 */
    path: string;
    /** 日期 */
    date: string;
  }[] = [];
  /**
   * 文章内容映射表
   * @type {Record<string, string>}
   *   key: 路径
   *   value: 内容
   */
  const contentMap: { [key: string]: string } = {};
  codePages.forEach((page) => {
    pathList.push({
      title: page.title,
      path: page.htmlFilePath,
      date: page.date,
    });
    contentMap[page.htmlFilePath] = page.content;
  });
  /** 输出路径列表文件 */
  const outPath = path.resolve(app.dir.dest(), "pathList.json");
  /** 输出内容映射文件 */
  const outPath2 = path.resolve(app.dir.dest(), "contentMap.json");

  fs.writeFile(outPath, JSON.stringify(pathList, null, 2), "utf-8");
  fs.writeFile(outPath2, JSON.stringify(contentMap, null, 2), "utf-8");
}
