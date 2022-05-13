import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
// 自动引入elemengt plugins
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
export default defineConfig(({ command }) => {
  let base = command === "serve" ? "/" : "/inksnow-blog/";
  // console.log(base);
  
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
