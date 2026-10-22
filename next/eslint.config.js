import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "dist/",
      "release/",
      "test-results/",
      "parity/expected/",
      "docs/rewrite/inventory/walkthrough-scripts/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Injected into the old app's page as plain JavaScript.
    files: [
      "parity/support/old-harness.js",
      "parity/scenarios/*/old-hooks.js",
      "parity/corpus/*.js",
    ],
    languageOptions: { globals: { ...globals.browser } },
    // Some of these files also list their globals in a /* global */ comment.
    rules: { "no-redeclare": ["error", { builtinGlobals: false }] },
  },
);
