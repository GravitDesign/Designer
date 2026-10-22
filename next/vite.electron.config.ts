import { builtinModules } from "node:module";
import { defineConfig } from "vite";

/** Builds the Electron main process (with the embedded server) to dist-electron/. */
export default defineConfig({
  build: {
    outDir: "dist-electron",
    emptyOutDir: true,
    target: "node22",
    ssr: "electron/main.ts",
    sourcemap: true,
    rollupOptions: {
      external: ["electron", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: { format: "es", entryFileNames: "main.js" },
    },
  },
  ssr: { noExternal: true },
});
