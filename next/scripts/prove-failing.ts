// Proves the parity tests can fail: runs them with GD_PARITY_SABOTAGE=1,
// which changes every output before comparing, and checks that every test
// that ran failed. Extra arguments are passed to Playwright, for example
// `npm run parity:prove -- parity/scenarios/engine`.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const report = path.resolve("test-results", process.env.GD_RUN ?? "default", "prove-failing.json");
fs.mkdirSync(path.dirname(report), { recursive: true });

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["playwright", "test", "--project", "parity", "--reporter", "json", ...process.argv.slice(2)],
  {
    env: { ...process.env, GD_PARITY_SABOTAGE: "1", PLAYWRIGHT_JSON_OUTPUT_NAME: report },
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
  },
);
if (result.error) throw result.error;

interface JsonTest {
  results: { status: string }[];
}
interface JsonSpec {
  title: string;
  file: string;
  tests: JsonTest[];
}
interface JsonSuite {
  title: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}

const data = JSON.parse(fs.readFileSync(report, "utf8")) as { suites: JsonSuite[] };
const passed: string[] = [];
let failed = 0;
const visit = (suite: JsonSuite, trail: string): void => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const last = t.results.at(-1)?.status;
      if (last === "passed") passed.push(`${trail} > ${spec.title}`);
      else if (last === "failed" || last === "timedOut") failed++;
    }
  }
  for (const child of suite.suites ?? []) visit(child, `${trail} > ${child.title}`);
};
for (const suite of data.suites) visit(suite, suite.title);

if (passed.length > 0) {
  console.error(`${passed.length} parity tests passed with sabotaged output, so they can't fail:`);
  for (const p of passed) console.error(`  ${p}`);
  process.exit(1);
}
if (failed === 0) {
  console.error("No parity tests ran.");
  process.exit(1);
}
console.log(`All ${failed} parity tests failed with sabotaged output, as they should.`);
