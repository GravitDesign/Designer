# Porting conventions

How old modules become TypeScript in `next/src`. Read PORT-PLAN.md for the
cluster you port and port-map.tsv for its modules.

## Goal

Same behaviour, readable code. The parity suite compares the new app with
the old one exactly (numbers, serialized JSON, pixels), so:

- Keep the old algorithm, branch structure and order of floating-point
  operations. Don't reassociate (`a + b + c` stays in that order), don't
  replace `Math.pow` with `**`, `Math.sqrt(x*x+y*y)` with `Math.hypot`,
  loops with array helpers that change evaluation order, or `x | 0` with
  `Math.trunc` where the value can exceed 32 bits.
- Keep the old public class names minus the `G` prefix (`GRect` → `Rect`)
  and the old public method and property names (`getBBox`, `hitTest`,
  `setProperty`, ...). Private fields get clear names; the minified locals
  (`e`, `t`, `i`, ...) get names that say what they hold.
- Keep the serialized property names and node names byte for byte; they
  are the file format.
- Keep quirks. If something looks wrong but is not a crash, data loss,
  wrong output or broken UI, keep it and add an entry to QUESTIONS.md. If
  it is clearly a bug, keep the old behaviour in the port first, then fix
  it in a separate `fix:` commit with a BUGS-FIXED.md entry and a parity
  exception (see parity/support/exceptions.ts).

## Code style

- TypeScript strict. No `any`; where the old code is genuinely dynamic use
  `unknown` and narrow, or a precise union. If `any` is unavoidable, add an
  eslint-disable comment that says why.
- ES classes with `extends` instead of `GObject.inherit`. Mixins
  (`GObject.inheritAndMix`) become TypeScript interfaces plus helper
  functions or small mixin factories; `hasMixin(Stylable)` keeps working
  through the registry in `engine/core/object.ts`.
- One old class per file, file name in kebab case (`vertex-container.ts`),
  named exports only.
- `engine/` and `editor/` import nothing from React, Zustand or the DOM UI.
  Canvas and WebGL are allowed in `engine/paint` and the effects.
- Comments explain why, not what. Note the old module id once at the top
  of each file: `// Old: chunk.vendor.js module 7 (GTransform).`

## Type ids

The old engine numbers every class (`__gtype_id__`) in load order and
saves some of them (`_sdf`). The new engine keeps a table of the old
numbers per class name (`engine/core/type-ids.ts`) so it writes the same
values.

## Wiring into the parity bridge

Each cluster exports its classes under their old names in
`src/parity/g/<cluster>.ts`:

```ts
import { Rect } from "../../engine/math/rect.ts";
export const engineMath = { GRect: Rect, /* ... */ };
```

`src/parity/bridge.ts` merges all of them into `window.__parity.G`. One
file per cluster, so parallel work doesn't collide. App hooks a scenario
area needs (its `contract.ts`) go in `src/parity/app/<area>.ts`.

## Tests

- Unit tests next to the code (`rect.test.ts`, Vitest). Assert behaviour,
  including edge cases the parity scenarios don't reach. Every test must be
  able to fail: break the code it covers, see it fail, restore.
- Parity: list the scenario ids your cluster makes pass in
  `parity/ported/<cluster>.json` (a JSON array). The suites compare the
  new app for every listed id; don't edit the suite files for this, other
  clusters share them. Run them with
  `GD_RUN=<cluster> npx playwright test parity/scenarios/<area> --project parity --workers 2`
  (the new app is built and served on port 3192 automatically; when it is
  already running, rebuild with `npx vite build`, the server serves dist/).
  Never weaken a comparison.
- When other runs work in the same checkout, don't build into dist/ (the
  shared server on 3192 serves it live). Build and serve your own copy on
  your own port and point Playwright at it:

  ```sh
  npx vite build --outDir dist-run-<name>
  GD_CLIENT_ROOT=dist-run-<name> PORT=<port> node server/main.ts &
  GD_NEW_PORT=<port> GD_RUN=<name> npx playwright test parity/scenarios/<area> --project parity --workers 2
  ```

  Rebuild with the first command after every change; stop your server
  when you're done.
- `npm run lint`, `npm run typecheck` and `npm test` must pass.
