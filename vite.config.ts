import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
// 自动引入elemengt plugins
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import prismjs from "vite-plugin-prismjs";
// 性能分析
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command }) => {
  //区分环境改base 否则gitee pages 无法显示内容
  let base = command === "serve" ? "/" : "/inksnow-blog/";
  return {
    base,
    plugins: [
      vue(),
      AutoImport({
        resolvers: [
          ElementPlusResolver({
            importStyle: "sass",
          }),
        ],
      }),
      Components({
        resolvers: [
          ElementPlusResolver({
            importStyle: "sass",
          }),
        ],
      }),
      // 性能分析
      visualizer({ open: true }),
      // 代码高亮
      prismjs({
        languages: ["javascript", "html"],
        plugins: ["line-numbers","copy-to-clipboard"],
        theme: "tomorrow",
        css: true,
      }),
    ],
    server: {
      host: true,
      port: 3003,
    },
    resolve: {
      // 配置路径别名
      alias: {
        "@": path.resolve(__dirname, "src"),
        views: path.resolve(__dirname, "src/views"),
        components: path.resolve(__dirname, "src/components"),
        store: path.resolve(__dirname, "src/store"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/style/index.scss" as *;`,
        },
      },
    },
  };
});
