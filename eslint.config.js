import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "legacy/",
      "assets/",
      "guide/",
      "native/",
      "dist-electron/",
      "public/",
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
  {
    // Scenario code runs in both apps, so it may only use window.__parity
    // (G and the app hooks of a contract), never the old app's globals.
    files: ["parity/scenarios/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='gDesigner']",
          message: "Use a hook from the area's contract instead of the old app's gDesigner.",
        },
        {
          selector: "MemberExpression[property.name=/^(designer|require)$/][object.name='app']",
          message: "app.designer and app.require exist only in the old app; add a contract hook.",
        },
      ],
    },
  },
);
