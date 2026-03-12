import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

export default defineConfig(({ mode }) => {
  const isDesktopBuild = mode === "desktop" || process.env.TAURI_ENV_PLATFORM;

  return {
    plugins: [
      vue(),
      Components({
        dts: false,
        resolvers: [
          ElementPlusResolver({
            importStyle: "css",
          }),
        ],
      }),
    ],
    base: isDesktopBuild ? "./" : process.env.NODE_ENV === "production" ? "/ClashRelay/" : "/",
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/element-plus/es")) {
              return "element-plus";
            }
            if (id.includes("node_modules/@element-plus/icons-vue")) {
              return "element-plus-icons";
            }
            if (id.includes("node_modules/vue")) {
              return "vue-vendor";
            }
            if (id.includes("node_modules/js-yaml")) {
              return "yaml";
            }
          },
        },
      },
    },
  };
});
