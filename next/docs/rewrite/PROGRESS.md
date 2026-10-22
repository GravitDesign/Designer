# Rewrite progress

Read this file first when resuming. Then INVENTORY.md, QUESTIONS.md and
BUGS-FIXED.md.

## Ground rules (from the task)

- Worktree: C:\Users\info\worktrees\gravit-designer-rewrite, branch
  `rewrite/modern-stack`. Never commit to main, never push.
- Root node_modules is a junction to the main checkout. Never install there.
  Install only into `next/node_modules`.
- The reference is public/chunk.vendor.js, public/designer.browser.dev.js and
  the CSS in public/. Never run `npm run build` at the root.
- Every commit builds, lints and passes all tests.
- At the very end: `cmd /c rmdir node_modules` first, then remove the worktree.

## Approach

The old engine is a port target, not a design reference. To reach exact
parity (pixels, geometry, serialized JSON) the new engine keeps the old
algorithms and their order of floating-point operations, rewritten as
readable, typed TypeScript with clear names. Class names drop the `G` prefix
inside `next/` but keep a mapping table (docs/rewrite/class-map.md) so tests
can call both sides by the same name.

Navigation aid: docs/rewrite/old-module-index.tsv lists every webpack module
of both bundles with its line range, size and class names.

## Phases

| # | Phase | State |
| - | ----- | ----- |
| 1 | Inventory | done (2311 items) |
| 2 | Parity harness and corpus | not started |
| 3 | Scaffold next/ | not started |
| 4 | Engine core | not started |
| 5 | File format and import/export | not started |
| 6 | Editor | not started |
| 7 | UI | not started |
| 8 | Platform | not started |
| 9 | Cutover | not started |
| 10 | Final check | not started |

## Log

- Phase 1 started: six inventory subagents (engine model, renderer/editor,
  actions/menus, UI, formats/platform, running-app walkthrough).

## Known pixel/parity diffs

None yet.
