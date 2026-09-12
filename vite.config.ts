import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri 开发约定：固定端口 + 严格端口占用，见 docs/ARCHITECTURE.md
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // 显式绑定 IPv4 回环：本机 localhost 可能解析到 ::1 导致预览不可达
    host: "127.0.0.1",
    port: 43191,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      // Exclude generated JSON-schema outputs, entry shells that only wire routers,
      // and pure type/re-export barrels — they inflate surface without behavior under test.
      // Keep src/lib/gen/** out: codegen overwrites those files.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/gen/**",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/router.tsx",
        "src/ui/index.ts",
        "src/lib/bridge/types.ts",
        "src/lib/commands/types.ts",
        "src/lib/i18n/en.ts",
        "src/lib/i18n/zh-CN.ts",
        // Real Tauri invoke wrapper; jsdom uses mock bridge instead.
        "src/lib/bridge/tauri.ts",
      ],
      reporter: ["text", "text-summary", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
