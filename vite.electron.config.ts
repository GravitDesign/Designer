import { builtinModules } from "node:module";
import { defineConfig } from "vite";

/**
 * Builds the Electron main process (with the embedded server, electron-updater
 * and every other dependency bundled in) to dist-electron/main.js, so the
 * packaged app needs no node_modules. The window's preload
 * (electron/preload.cjs) is plain CommonJS and ships as it is.
 */
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
