# Parity harness

The old app is the spec. Every parity test runs a scenario in the old app,
records its output under `parity/expected/`, and checks that the new app
produces exactly the same output.

## Layout

- `support/`: shared harness code. Don't change it from an area; ask for
  a change instead.
  - `apps.ts` opens either app in a page (`openApp(page, "old" | "new", options)`).
  - `old-harness.js` is injected into the old app and defines
    `window.__parity = { G, app }`. The new app defines the same object in
    its parity build.
  - `scenario.ts` defines a scenario, `runner.ts` runs one and compares
    its output, `suite.ts` turns a list of scenarios into tests.
  - `normalize.ts` renames random ids in serialized documents, `compare.ts`
    diffs JSON and PNGs with zero tolerance.
  - `exceptions.ts` lists the scenarios where the new app deliberately
    differs because it fixes a bug (BUGS-FIXED.md) or a feature was
    removed (REMOVED.md).
  - `removed.ts` checks that a removed feature's `.fixed` file differs
    from the old output only in the removed part (removed.test.ts runs
    it over every DROP entry); `old-variants.ts` serves the old app with
    one of its own switches off, for the "old app variants" tests.
- `scenarios/<area>/`: one folder per area. Each `*.spec.ts` calls
  `paritySuite(name, scenarios, { newApp })`.
- `scenarios/<area>/old-hooks.js` (optional): plain JavaScript injected
  into the old app after `old-harness.js`. It adds helpers for that area to
  `window.__parity.app.<area>`. The matching TypeScript interface goes in
  `scenarios/<area>/contract.ts`; the new app implements it.
- `expected/<scenario id>.<ext>`: output recorded from the old app.
  `<id>.fixed.<ext>` holds the correct output where a bug is fixed.
- `self-test/`: Playwright tests of the harness itself.

## Scenarios

```ts
paritySuite(
  "engine geometry",
  defineScenarios([
    {
      id: "engine/geometry/rect-union", // expected/engine/geometry/rect-union.json
      covers: ["ENG-GEOM-002"], // INVENTORY.md ids
      kind: "json", // json | document | png | text | bytes
      inPage: ({ G }, args) => {
        // runs in the page, in both apps
        const a = new G.GRect(0, 0, 10, 10);
        return a.united(new G.GRect(5, 5, 10, 10)).toString();
      },
    },
  ]),
  { newApp: false },
);
```

- `inPage` runs inside the page and gets `window.__parity`. It is sent as
  source text, so it can't use imports or variables from its module. Pass
  data through `args`.
- `driver` runs in Node with `{ page, kind }` and drives real input
  (`page.mouse`, `page.keyboard`, `page.touchscreen`) and screenshots. Use
  only DOM selectors the old app has (the new app keeps the old class names)
  and `window.__parity.app` hooks from a contract.
- `G` is the engine namespace with the old class names. The new engine
  keeps the old public method names, so the same scenario code runs in both.
- Return JSON for `json`, a serialized scene string for `document`, a PNG
  data URL or Buffer for `png`, base64 or a Buffer for `bytes`.
- `open` sets theme, language, settings or the file picker API; scenarios
  without `open` and without `driver` share one page and get a fresh
  document each.

- `removedInNewApp` is for features the rewrite removes on purpose
  (license, subscription, cloud). The old app is recorded as usual; for
  the new app the function runs instead of the comparison and throws if
  the feature is still there.

## Commands

```sh
npm run parity:record              # record expected output from the old app
npm run parity                     # old app vs expected, and new app vs expected where enabled
npm run parity:prove               # sabotage every output; every test must fail
npx playwright test parity/scenarios/engine --project parity   # one area
```

The old server starts automatically on port 3190 (`node server.js` in the
old app's folder), the new one on 3192 once it exists.

## Rules

- Outputs must be deterministic. After recording, run the area three times
  without `GD_RECORD`; all three must pass. Find and remove the source of
  any flakiness (async rendering, fonts still loading, timers) instead of
  loosening a comparison.
- Never raise a tolerance, weaken an assertion or skip a test. If the old
  app itself varies between runs, fix the harness (wait for the right
  event, normalize a documented volatile field in `normalize.ts`).
- Every scenario names the INVENTORY.md items it covers.
- Keep expected files small: PNGs at the size needed, not full screens,
  unless the full screen is the point.
- Scenario code uses only `window.__parity` (`G` and contract hooks). The
  old app's globals (`gDesigner`, `app.designer`, `app.require`) are
  banned by lint outside `old-hooks.js`.
- Every browser context uses `PARITY_CONTEXT` (en-US, UTC, light colour
  scheme, device scale 1). Spread it into any `browser.newContext()` call.
  WebGL runs on SwiftShader (playwright.config.ts).
- Shared pages are reset between scenarios (`app.resetState()`: documents,
  clipboard, settings, localStorage, tool). If the reset can't restore
  something, the page is replaced. Scenarios must still not depend on
  what ran before them.
- `json` outputs keep -0, NaN, ±Infinity and undefined as tagged strings
  (`"<-0>"`, ...), so don't convert them yourself.
- A scenario that loads a file sets `keepIdsOf` to that file, so ids that
  come from the file must survive unchanged instead of being renamed.
- Don't round recorded numbers unless the old app itself rounds them.

## Proving scenarios can fail

- `npm run parity:prove -- <path>` changes every output and checks every
  test fails. That only proves the comparison runs.
- `npm run parity:mutations` proves the outputs depend on the features:
  each entry in `parity/mutations/<area>.json` breaks one feature in the
  page (`patch.old`, later `patch.new`) and lists the scenarios that must
  then fail. Add a mutation for every feature whose scenario could pass
  while recording nothing useful (a "no error" result, a screenshot of the
  wrong surface).
