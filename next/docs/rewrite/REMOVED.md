# Features the new app removed on purpose

The licence, subscription, account, cloud and analytics parts of the old
app are dropped (port-map.tsv decision `drop`). Most of that leaves no
trace a parity scenario records. Where a scenario does record it, the new
app differs from the old output on purpose, and the scenario gets a
`DROP-NNN` exception: parity/exceptions/DROP-NNN.json lists the scenarios,
and each one has a `<scenario>.fixed.<ext>` expected file with the output
the new app must produce. This works the same way as the `BUG-NNN`
entries of BUGS-FIXED.md (parity/support/exceptions.ts).

Each entry: what was removed, where the old app did it, what the old
output shows, what the new one shows, and which scenarios differ.

## DROP-001 No Pro actions

Old code: designer.browser.dev.js module 1483 (the bootstrap) wrapped
some actions in the cloud action wrapper, module 1626 (dropped with the
cloud, port-map `drop-app-cloud`): Import Fonts, Export, Export PDF and
Save as PDF at 300 dpi among them. The wrapper made `isPro()` return
true, so menus and tooltips showed a Pro badge and the licence decided
whether the action ran.

- Old: the action info the editor-actions scenarios record says
  `pro: true` for those actions.
- New: there is no licence and no Pro action; every action says
  `pro: false` and runs. Nothing else about these actions changes.
- Scenarios: parity/exceptions/DROP-001.json. Each `.fixed.json` equals
  the old expected output except `"pro": false` where it said true.
  Pending there: scenarios that will need a `.fixed` file once their
  other differences are gone (the registry list still misses actions,
  the touch action and the font import dialog aren't ported yet).
