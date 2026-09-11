import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "src-tauri",
      "engine",
      "src/lib/gen",
      "coverage",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      // 组件库唯一出口：业务代码只允许 from "@/ui"，见 docs/FRONTEND.md §3.2
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@radix-ui/*"],
              message: "Radix 只允许在 src/ui/primitives 内使用，业务代码请从 @/ui 引入。",
            },
            {
              group: ["@/ui/primitives/*", "@/ui/composed/*", "@/ui/patterns/*"],
              message: "禁止深路径引入组件库，请使用唯一出口 @/ui。",
            },
          ],
        },
      ],
      // 禁写死颜色：颜色必须来自 tokens.css 的语义 token
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: "禁止写死颜色值，请使用 tokens.css 中的语义 token。",
        },
      ],
    },
  },
  {
    // 组件库内部是 token 与 Radix 的合法使用点
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Node 脚本环境
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
);
