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

The parity suite runs the old app next to the new one and compares them.
It expects the old app in `legacy/` (ignored by git), checked out from the
`parity-reference` tag, which is what the expected output was recorded
from. A few unit tests read it too.

```sh
git worktree add legacy parity-reference
cd legacy && npm install --no-save --no-package-lock express@5 ws@8
```

## Layout

- `src/`, `server/`, `electron/`: the app
- `parity/`: the parity suite and its expected output
- `docs/rewrite/`: how the rewrite was planned and what changed
- `assets/`, `guide/`: images, fonts and the user guide, taken over from
  the old app
- `native/gvthumb/`: the Windows Explorer thumbnail provider

The old app is on the `legacy` branch.
