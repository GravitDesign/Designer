import fs from "node:fs";
import { defineConfig } from "@playwright/test";
import { LEGACY_ROOT, NEW_PORT, OLD_PORT } from "./parity/support/env.ts";

// The new app is started once its server exists (phase 3 onwards).
const startNewApp = process.env.GD_SKIP_NEW_APP !== "1" && fs.existsSync("server/dev-entry.ts");

// GD_RUN names the run, so parallel runs keep separate output folders.
const run = process.env.GD_RUN ?? "default";

export default defineConfig({
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["json", { outputFile: `test-results/${run}/playwright.json` }]],
  outputDir: `test-results/${run}/artifacts`,
  use: {
    browserName: "chromium",
    // The same Chromium for both apps, with a fixed device scale factor and
    // fonts, so renders can be compared pixel for pixel.
    deviceScaleFactor: 1,
    viewport: { width: 1600, height: 1000 },
    launchOptions: { args: ["--font-render-hinting=none", "--disable-gpu-rasterization"] },
  },
  projects: [
    { name: "parity", testDir: "parity/scenarios", testMatch: /\.spec\.ts$/ },
    { name: "harness", testDir: "parity/self-test", testMatch: /\.spec\.ts$/ },
    { name: "e2e", testDir: "e2e", testMatch: /\.spec\.ts$/ },
  ],
  webServer: [
    {
      command: "node server.js",
      cwd: LEGACY_ROOT,
      env: { PORT: String(OLD_PORT) },
      url: `http://127.0.0.1:${OLD_PORT}/connection/test`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
    },
    ...(startNewApp
      ? [
          {
            command: "node server/dev-entry.ts",
            env: { PORT: String(NEW_PORT) },
            url: `http://127.0.0.1:${NEW_PORT}/connection/test`,
            reuseExistingServer: !process.env.CI,
            stdout: "ignore" as const,
            stderr: "pipe" as const,
          },
        ]
      : []),
  ],
});
