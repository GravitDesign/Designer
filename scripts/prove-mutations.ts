// Proves the parity scenarios depend on the features they cover: for each
// mutation in parity/mutations/*.json, runs its scenarios with the feature
// broken (GD_MUTATION) and checks that every one of them fails.
//
//   node scripts/prove-mutations.ts                 all mutations, old app
//   node scripts/prove-mutations.ts --app new       against the new app
//   node scripts/prove-mutations.ts <mutation id>   only these
//   node scripts/prove-mutations.ts --workers 2     Playwright workers
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadMutations } from "../parity/support/mutations.ts";

const args = process.argv.slice(2);
/** Removes "--name value" from args and returns the value. */
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
}
const app = option("--app") ?? "old";
const workers = option("--workers");
const only = args;
const mutations = loadMutations().filter((m) => only.length === 0 || only.includes(m.id));
if (mutations.length === 0) {
  console.error("No mutations to run.");
  process.exit(1);
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const run = process.env.GD_RUN ?? "mutations";
let problems = 0;

interface JsonSpec {
  title: string;
  tests: { results: { status: string }[] }[];
}
interface JsonSuite {
  title: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}

for (const mutation of mutations) {
  if (!mutation.patch[app as "old" | "new"]) {
    console.log(`${mutation.id}: no ${app} patch, skipped`);
    continue;
  }
  const report = path.resolve("test-results", run, `mutation-${mutation.id}.json`);
  fs.mkdirSync(path.dirname(report), { recursive: true });
  const grep = `${app} app (${mutation.scenarios.map(escape).join("|")})$`;
  spawnSync(
    process.execPath,
    [
      path.resolve("node_modules", "@playwright", "test", "cli.js"),
      "test",
      "--project",
      "parity",
      "--reporter",
      "json",
      "--grep",
      grep,
      ...(workers ? ["--workers", workers] : []),
    ],
    {
      env: {
        ...process.env,
        GD_MUTATION: mutation.id,
        GD_RUN: run,
        PLAYWRIGHT_JSON_OUTPUT_NAME: report,
      },
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  const data = JSON.parse(fs.readFileSync(report, "utf8")) as { suites: JsonSuite[] };
  const status = new Map<string, string>();
  const visit = (suite: JsonSuite): void => {
    for (const spec of suite.specs ?? [])
      status.set(spec.title, spec.tests[0]?.results.at(-1)?.status ?? "none");
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of data.suites) visit(suite);
  const survived = mutation.scenarios.filter((id) => status.get(id) === "passed");
  const missing = mutation.scenarios.filter((id) => !status.has(id));
  if (survived.length > 0 || missing.length > 0) {
    problems++;
    if (survived.length > 0)
      console.error(
        `${mutation.id}: these scenarios still pass with the feature broken: ${survived.join(", ")}`,
      );
    if (missing.length > 0)
      console.error(`${mutation.id}: these scenarios didn't run: ${missing.join(", ")}`);
  } else {
    console.log(
      `${mutation.id}: all ${mutation.scenarios.length} scenarios failed, as they should`,
    );
  }
}
process.exit(problems > 0 ? 1 : 0);
