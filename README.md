# GravitDesign Next

A rewrite of the self-hosted Gravit Designer as a modern TypeScript and React
app. It opens and saves the same `.gvdesign` files and keeps the old editor's
behaviour, which a parity suite checks against the old app.

## Run it

Needs Node.js 22.12 or newer.

```sh
npm ci
npm run build
npm start          # http://localhost:3100
npm run electron   # desktop app
```

## Tests

```sh
npm test           # unit tests
npm run lint
npm run typecheck
npx playwright test --project harness --project parity
```

The parity suite runs the old app from `legacy/` next to the new one and
compares them. Before the first run, install the old app's server
dependencies: `cd legacy && npm install --no-save express@5 ws@8`.

## Layout

- `src/`, `server/`, `electron/`: the app
- `parity/`: the parity suite and its expected output
- `docs/rewrite/`: how the rewrite was planned and what changed
- `legacy/`: the old app, used as the reference and for its assets and
  user guide
- `native/gvthumb/`: the Windows Explorer thumbnail provider

The old app's history up to version 1.0.2 is on the `legacy` branch.
