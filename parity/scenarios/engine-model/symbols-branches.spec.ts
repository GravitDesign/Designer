/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Symbols, the branches symbols.spec.ts doesn't reach: partial and full
// synchronize, desynchronize, inSync with a node, nested symbols and swaps
// inside instances, the names compared to find overrides, constrained
// content, BLOCK_EDITED and sweeping instances of a removed master. The
// same scenarios run in Node against the port (symbol-scenarios.test.ts).

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/symbols-branches/synchronize-desynchronize",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      // Reference ids of symbols aren't under an id key; name them first.
      const blob = (n: any) => {
        for (const s of H.app.scene().queryAll("symbol") as any[]) {
          H.id(s.getReferenceId());
          H.id(s.getMultireferenceId());
        }
        return H.blob(n);
      };
      const a = H.add(H.rect(0, 0, 50, 50));
      H.fill(a, H.rgb(255, 0, 0));
      const p = new G.GPath();
      for (const [x, y] of [
        [0, 60],
        [40, 60],
        [40, 100],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        p.getAnchorPoints().appendChild(ap);
      }
      H.add(p);
      const img = new G.GImage();
      img.setProperties(["trf", "itrf"], [H.T(10, 0, 0, 10, 80, 10), H.T(1, 0, 0, 1, 0, 0)]);
      H.add(img);
      const m = G.GSymbol.create([a, p, img], H.layer(), "Sync");
      const i = m.clone();
      H.add(i);
      i.transform(H.T(1, 0, 0, 1, 200, 0));
      const kidsOf = (s: any) => s.getChildren() as any[];
      const state = (s: any) => ({
        blob: blob(s),
        disabled: Object.keys(s._disabledSiblingMap).length,
        siblings: Object.keys(s._siblingMap).length,
        inSync: s.inSync(),
        frame: H.v(s.getProperty("frame")),
        trf: H.v(s.getProperty("trf")),
      });
      // Overrides: a fill, one anchor point and the image transform.
      const [ia, ip, iimg] = kidsOf(i);
      ia.getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(0, 255, 0));
      ip.getAnchorPoints().getFirstChild().getNext().setProperty("x", 45);
      iimg.setProperty("itrf", H.T(2, 0, 0, 2, 0, 0));
      out.overridden = state(i);
      const saved = i.getDisabledSiblings();
      out.saved = {
        count: Object.keys(saved).length,
        frame: H.v(saved.SYMBOL_FRAME),
        trf: H.v(saved.SYMBOL_TRF),
      };
      // Only the rectangle's subtree.
      out.partialReturn = H.attempt(() => i.synchronize(ia));
      out.partial = state(i);
      // The path: its anchor point comes back from the master.
      out.pathReturn = H.attempt(() => i.synchronize(ip));
      out.path = state(i);
      // Everything else.
      out.fullReturn = H.attempt(() => i.synchronize());
      out.full = state(i);
      // The saved overrides come back.
      out.desyncReturn = H.attempt(() => i.desynchronize(saved));
      out.desync = state(i);
      // A scaled instance: synchronize brings back the master's scale and
      // keeps the top left.
      i.synchronize();
      i.transform(H.T(2, 0, 0, 3, -200, -10));
      out.scaled = state(i);
      i.synchronize();
      out.scaledSync = state(i);
      // Scale again, then desynchronize back to the scaled state.
      const unscaled = i.getDisabledSiblings();
      i.transform(H.T(0.5, 0, 0, 0.5, 100, 0));
      out.scaledAgain = state(i);
      i.desynchronize(unscaled);
      out.desyncScale = state(i);
      // Only siblings: frame and transform stay.
      i.transform(H.T(2, 0, 0, 2, 0, 0));
      kidsOf(i)[0]
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(1, 2, 3));
      i.synchronize(null, true, true);
      out.onlySiblings = state(i);
      i.synchronize(null, false, true);
      out.keepFrame = state(i);
      // Rebuild the content from the master.
      kidsOf(i)[0].setProperty("name", "renamed");
      out.rebuildReturn = H.attempt(() => i.synchronize(null, true));
      out.rebuild = state(i);
      out.masterAfterRebuild = blob(m);
      // A master and a symbol without master.
      out.masterSync = H.attempt(() => m.synchronize());
      out.masterDesync = H.attempt(() => m.desynchronize({}));
      out.masterInSync = m.inSync();
      // The swap round trip the instance inspector makes: the overrides of
      // the instance swapped away come back with desynchronize.
      const m2 = G.GSymbol.create([H.add(H.ellipse(0, 300, 30, 30))], H.layer(), "Other");
      const j = m.clone();
      H.add(j);
      j.transform(H.T(1, 0, 0, 1, 0, 400));
      const [ja, jp] = kidsOf(j);
      ja.getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(7, 7, 7));
      jp.getAnchorPoints().getFirstChild().setProperties(["x", "y"], [5, 65]);
      j.transform(H.T(1.5, 0, 0, 1.5, 0, 0));
      const overrides = j.getDisabledSiblings();
      const away = j.swapWith(m2);
      const back = away.swapWith(m);
      out.swappedBack = state(back);
      out.swapDesyncReturn = H.attempt(() => back.desynchronize(overrides));
      out.swapDesync = state(back);
      out.swapDesyncMultiref = back.getMultireferenceId() === j.getMultireferenceId();
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/in-sync-node",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const g = new G.GGroup();
      const r1 = H.rect(0, 0, 20, 20);
      H.fill(r1, H.rgb(10, 20, 30));
      g.appendChild(r1);
      g.appendChild(H.rect(30, 0, 20, 20));
      H.add(g);
      const other = H.add(H.ellipse(0, 40, 20, 20));
      H.fill(other, H.rgb(1, 1, 1));
      const m = G.GSymbol.create([g, other], H.layer(), "Deep");
      const i = m.clone();
      H.add(i);
      const [ig, iother] = i.getChildren();
      const ir1 = ig.getFirstChild();
      const report = () => ({
        instance: i.inSync(),
        self: i.inSync(i),
        master: i.inSync(m),
        masterDeep: i.inSync(m, true),
        group: i.inSync(ig),
        groupDeep: i.inSync(ig, true),
        child: i.inSync(ir1),
        childDeep: i.inSync(ir1, true),
        other: i.inSync(iother, true),
        fillLayer: i.inSync(ir1.getPaintLayers().getFirstChild(), true),
      });
      out.start = report();
      ir1
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(200, 0, 0));
      out.fillOverride = report();
      i.synchronize(ig);
      out.groupSynced = report();
      ir1.setProperty("name", "x");
      out.nameOverride = report();
      i.synchronize(ir1);
      out.childSynced = report();
      // An instance with no master in the scene.
      const loose = m.clone();
      if (loose.detach) loose.detach();
      out.loose = H.attempt(() => loose.inSync(loose.getFirstChild(), true));
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/nested-and-swaps",
    covers: ["ENG-SYMBOL-003", "ENG-SYMBOL-004", "ENG-SYMBOL-006"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      // Reference ids of symbols aren't under an id key; name them first.
      const blob = (n: any) => {
        for (const s of H.app.scene().queryAll("symbol") as any[]) {
          H.id(s.getReferenceId());
          H.id(s.getMultireferenceId());
        }
        return H.blob(n);
      };
      const fillOf = (n: any) => H.v(n.getPaintLayers().getFirstChild().getProperty("_pt"));
      const rb = H.add(H.rect(0, 0, 20, 20));
      H.fill(rb, H.rgb(0, 0, 255));
      const mb = G.GSymbol.create([rb], H.layer(), "B");
      const rc = H.add(H.ellipse(0, 0, 30, 10));
      H.fill(rc, H.rgb(0, 255, 255));
      const mc = G.GSymbol.create([rc], H.layer(), "C");
      const ib = mb.clone();
      H.add(ib);
      ib.transform(H.T(1, 0, 0, 1, 100, 0));
      const ra = H.add(H.rect(100, 30, 40, 10));
      H.fill(ra, H.rgb(255, 255, 0));
      const grp = new G.GGroup();
      grp.appendChild(H.rect(100, 50, 10, 10));
      grp.appendChild(H.rect(120, 50, 10, 10));
      H.add(grp);
      const ma = G.GSymbol.create([ib, ra, grp], H.layer(), "A");
      const a1 = ma.clone();
      H.add(a1);
      a1.transform(H.T(1, 0, 0, 1, 0, 200));
      const a2 = ma.clone();
      H.add(a2);
      a2.transform(H.T(1, 0, 0, 1, 200, 200));
      const nested = (a: any) => a.getFirstChild();
      const state = (a: any) => ({
        blob: blob(a),
        swp: H.clean(H.v(a.getProperty("swp"))),
        disabled: Object.keys(a._disabledSiblingMap).length,
        siblings: Object.keys(a._siblingMap).length,
        nestedMaster: nested(a).getMasterSymbol() === mb,
        inSync: a.inSync(),
      });
      out.created = { a1: state(a1), a2: state(a2), master: blob(ma) };
      // Editing B reaches the B instances nested in A's instances.
      rb.getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(9, 8, 7));
      rb.setProperty("trf", H.T(12, 0, 0, 12, 12, 12));
      out.editB = { a1: fillOf(nested(a1).getFirstChild()), a2: blob(a2) };
      // A dependent move of a group inside master A.
      grp.transform(H.T(1, 0, 0, 1, 5, 5));
      out.moveGroup = { a1: blob(a1), a2: blob(a2) };
      // Override inside the nested instance of a1, then synchronize it
      // through the nested instance (redirect to a1).
      nested(a1)
        .getFirstChild()
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(1, 1, 1));
      out.nestedOverride = {
        a1: state(a1),
        nested: Object.keys(nested(a1)._disabledSiblingMap).length,
      };
      a1.getChildren()[1].setProperty("name", "a1 only");
      out.redirectBefore = state(a1);
      out.redirect = H.attempt(() => nested(a1).synchronize(a1.getChildren()[1]));
      out.afterRedirect = state(a1);
      a1.synchronize();
      out.afterSync = state(a1);
      // Swap the nested B instance of a1 for C, then back (a cycle).
      const toC = nested(a1).swapWith(mc);
      out.swapC = {
        a1: state(a1),
        isC: toC.getMasterSymbol() === mc,
        swpori: toC.getProperty("swpori") ? toC.getProperty("swpori").length : null,
        sameMultiref: toC.getMultireferenceId() === nested(a2).getMultireferenceId(),
      };
      rc.getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(5, 5, 5));
      out.editCAfterSwap = state(a1);
      // Moving the swapped instance overrides it; synchronizing it goes
      // through a1 (its master is in a1's swp) and moves it back.
      toC.transform(H.T(1, 0, 0, 1, 15, 25));
      out.movedC = state(a1);
      toC.synchronize();
      out.syncC = state(a1);
      toC.transform(H.T(1, 0, 0, 1, -3, 4));
      a1.synchronize();
      out.syncA1 = state(a1);
      ra.setProperty("name", "named in A");
      out.editAAfterSwap = { a1: state(a1), a2: state(a2) };
      const backToB = nested(a1).swapWith(mb);
      out.swapBack = {
        a1: state(a1),
        isB: backToB.getMasterSymbol() === mb,
        sameMultiref: backToB.getMultireferenceId() === nested(a2).getMultireferenceId(),
      };
      // Swapping for the same master ("Strange swap array").
      const same = nested(a2).swapWith(mb);
      out.swapSame = { a2: state(a2), isB: same.getMasterSymbol() === mb };
      // A twice-swapped chain B -> C -> B in a2 leaves swp empty again.
      nested(a2).swapWith(mc);
      out.swapChain1 = state(a2);
      nested(a2).swapWith(mb);
      out.swapChain2 = state(a2);
      // Swapping a C instance for C again after B -> C: the "same master"
      // repair drops the first pair (B, C) and keeps (C, C).
      nested(a2).swapWith(mc);
      nested(a2).swapWith(mc);
      out.swapSameAfterSwap = state(a2);
      nested(a2).swapWith(mb);
      out.swapSameThenBack = state(a2);
      // An edit inside master A's nested B instance reaches the nested
      // instances of A's instances, not a B instance outside A.
      const ibOutside = mb.clone();
      H.add(ibOutside);
      ib.getFirstChild().setProperty("name", "inside A");
      out.editNestedInMaster = {
        a1: blob(a1),
        a2: blob(a2),
        outside: blob(ibOutside),
      };
      // A top-level swap round trip keeps the original multireference id.
      const top = mc.clone();
      H.add(top);
      const topAway = top.swapWith(mb);
      const topBack = topAway.swapWith(mc);
      out.topSwap = {
        away: topAway.getMultireferenceId() === top.getMultireferenceId(),
        back: topBack.getMultireferenceId() === top.getMultireferenceId(),
        swpori: H.clean(H.v(topBack.getProperty("swpori"))),
      };
      // Save and restore a copy of the page.
      nested(a1).swapWith(mc);
      out.saved = blob(H.page());
      const copy = G.GNode.deserialize(H.ser(H.page()));
      H.app.scene().appendChild(copy);
      out.restored = (copy.queryAll("symbol") as any[]).map((s: any) => ({
        name: s.getProperty("name"),
        isMaster: s.isMaster(),
        dsb: H.v(s.getProperty("dsb")) ? s.getProperty("dsb").length : null,
        sbl: s.getProperty("sbl") ? s.getProperty("sbl").length : null,
        swp: s.getProperty("swp") ? s.getProperty("swp").length : null,
        siblings: s._siblingMap ? Object.keys(s._siblingMap).length : null,
        disabled: s._disabledSiblingMap ? Object.keys(s._disabledSiblingMap).length : null,
      }));
      out.restoredBlob = blob(copy);
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/nested-lookup",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const named = (n: any, name: string) => {
        n.setProperty("name", name);
        return n;
      };
      const br = named(H.rect(0, 0, 20, 20), "b-rect");
      H.fill(br, H.rgb(1, 2, 3));
      const mb = G.GSymbol.create([H.add(br)], H.layer(), "B");
      const ib1 = mb.clone();
      const ib2 = mb.clone();
      H.add(ib1, ib2);
      ib2.transform(H.T(1, 0, 0, 1, 0, 40));
      const grp = new G.GGroup();
      const gr = named(H.rect(50, 0, 10, 10), "g-rect");
      H.fill(gr, H.rgb(5, 6, 7));
      grp.appendChild(gr);
      H.add(grp);
      const ra = H.add(named(H.rect(50, 30, 10, 10), "a-rect"));
      const ma = G.GSymbol.create([ib1, ib2, grp, ra], H.layer(), "A");
      const outside = mb.clone();
      H.add(outside);
      const a1 = ma.clone();
      H.add(a1);
      a1.transform(H.T(1, 0, 0, 1, 100, 0));
      const names = (s: any) =>
        (s.queryAll("rectangle") as any[]).map((r: any) => r.getProperty("name"));
      out.multirefs = {
        nestedShare: ib1.getMultireferenceId() === ib2.getMultireferenceId(),
        masterShare: ib1.getMultireferenceId() === mb.getMultireferenceId(),
        a1Matches: a1.getFirstChild().getMultireferenceId() === ib1.getMultireferenceId(),
      };
      // An edit in the first B instance inside master A.
      ib1.getFirstChild().setProperty("name", "edited in A");
      out.editFirst = { a1: names(a1), outside: names(outside), master: names(ma), b: names(mb) };
      // Lookups of the master's node from the nested instances of a1.
      const [n1, n2] = a1.getChildren();
      const ids: Record<string, string> = {
        bRect: n1.getFirstChild().getMultireferenceId(),
        gRect: a1.getChildren()[2].getFirstChild().getMultireferenceId(),
        aRect: a1.getChildren()[3].getMultireferenceId(),
        n2: n2.getMultireferenceId(),
        unknown: "nope",
      };
      const found = (x: any) =>
        x == null
          ? x
          : x === mb.getFirstChild()
            ? "B master rect"
            : G.GNode.getName(x) + ":" + x.getProperty("name");
      for (const [who, sym] of [
        ["n1", n1],
        ["a1", a1],
        ["ma", ma],
        ["mb", mb],
      ] as const) {
        const row: Record<string, unknown> = {};
        for (const [k, id] of Object.entries(ids)) {
          row[k] = [
            H.attempt(() => found(sym._getMasterSibling(id))),
            H.attempt(() => found(sym._getMasterSibling(id, true))),
            H.attempt(() => found(sym._getMasterSibling(id, false, true))),
          ];
        }
        out[who] = row;
      }
      // inSync of nodes inside a nested instance, with the override held
      // by the nested instance or by a1.
      const syncs = () => {
        const rect = n1.getFirstChild();
        return {
          n1Rect: n1.inSync(rect),
          n1RectDeep: n1.inSync(rect, true),
          a1N1: a1.inSync(n1),
          a1N1Deep: a1.inSync(n1, true),
          a1RectDeep: a1.inSync(rect, true),
          a1Group: a1.inSync(a1.getChildren()[2], true),
          maps: [
            Object.keys(n1._disabledSiblingMap).length,
            Object.keys(a1._disabledSiblingMap).length,
          ],
        };
      };
      out.syncStart = syncs();
      n1.getFirstChild()
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(3, 3, 3));
      out.syncFill = syncs();
      n1.getFirstChild().setProperty("name", "renamed");
      out.syncName = syncs();
      a1.getChildren()[2]
        .getFirstChild()
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(4, 4, 4));
      out.syncGroupFill = syncs();
      return out;
    }),
  },
  {
    // Not run against the new app yet: its parity build has no font
    // providers (app-fonts-ui). symbol-scenarios.test.ts runs it in Node.
    id: "engine-model/symbols-branches/text-merge",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const fm = H.app.scene().getWorkspace().getFontManager();
      const wait = async (...texts: any[]) => {
        for (let i = 0; i < 400; i++) {
          const busy =
            fm.hasPendingFonts() ||
            fm.hasUnresolvedFonts() ||
            texts.some((t) => t.hasFontsToResolve());
          if (!busy) return;
          await new Promise((res) => setTimeout(res, 25));
        }
        throw new Error("fonts did not load");
      };
      // The static helpers on small run arrays.
      const runs = (...list: [string, number][]) =>
        list.map(([text, fontSize]) => ({ text, fontSize }));
      out.changedProperties = {
        same: G.GSymbol._getChangedTextContentProperties(runs(["ab", 1]), runs(["ab", 1])),
        emptyBefore: G.GSymbol._getChangedTextContentProperties([], runs(["ab", 1], ["c", 2])),
        emptyAfter: H.attempt(() =>
          G.GSymbol._getChangedTextContentProperties(runs(["ab", 1]), []),
        ),
        firstRun: G.GSymbol._getChangedTextContentProperties(
          runs(["ab", 1], ["c", 2]),
          runs(["ab", 3], ["c", 3]),
        ),
        laterRun: G.GSymbol._getChangedTextContentProperties(
          runs(["ab", 1], ["c", 2], ["d", 2]),
          runs(["ab", 1], ["c", 5], ["d", 2]),
        ),
        longerAfter: G.GSymbol._getChangedTextContentProperties(
          runs(["ab", 1]),
          runs(["ab", 1], ["c", 2]),
        ),
        longerBefore: G.GSymbol._getChangedTextContentProperties(
          runs(["ab", 1], ["c", 2]),
          runs(["ab", 1]),
        ),
        missingKey: G.GSymbol._getChangedTextContentProperties(
          [{ text: "a" }, { text: "b", fontSize: 2 }],
          [{ text: "a", fontSize: 1 }, { text: "b" }],
        ),
      };
      out.assign = {
        lengths: G.GSymbol._assignChangedTextContentProperties(runs(["a", 1]), [], []),
        same: G.GSymbol._assignChangedTextContentProperties(
          runs(["a", 1]),
          runs(["a", 1]),
          runs(["x", 9]),
        ),
      };
      out.changedText = [
        G.GSymbol._getChangedText("", "abc"),
        G.GSymbol._getChangedText("abc", ""),
        G.GSymbol._getChangedText("aaa", "aa"),
        G.GSymbol._getChangedText("abc", "abc"),
      ];
      // A master text and two instances; the second overrides the text.
      const t = new G.GText();
      t.setProperty("trf", H.T(1, 0, 0, 1, 0, 0));
      H.add(t);
      t.setText("Hello world");
      await wait(t);
      const m = G.GSymbol.create([t], H.layer(), "Texts");
      const i1 = m.clone();
      const i2 = m.clone();
      H.add(i1, i2);
      i2.transform(H.T(1, 0, 0, 1, 0, 100));
      const mt = m.getFirstChild();
      const t1 = i1.getFirstChild();
      const t2 = i2.getFirstChild();
      t2.setProperty("_tfi", 9);
      const content = (x: any) => {
        const runs = JSON.parse(x.getProperty("content")) as any[] | null;
        return runs ? runs.map((run) => [run.text, run.fontSize]) : runs;
      };
      const state = () => ({
        master: content(mt),
        i1: content(t1),
        i2: content(t2),
        disabled: [
          Object.keys(i1._disabledSiblingMap).length,
          Object.keys(i2._disabledSiblingMap).length,
        ],
        plain: [mt.getPlainText(), t1.getPlainText(), t2.getPlainText()],
      });
      out.start = state();
      // Run properties without a selection.
      mt.setProperty("_tfi", 30);
      await wait(mt, t1, t2);
      out.size = state();
      // A text change without a selection.
      mt.setText("Hello there");
      await wait(mt, t1, t2);
      out.text = state();
      // Formatting a selection while the text is edited.
      const core = mt.getTLCore();
      mt.repaint(true);
      core.select(0, 5);
      mt.setProperty("_tfi", 20);
      await wait(mt, t1, t2);
      out.selection = state();
      // The selection spans two sizes now (multiple values).
      core.select(3, 8);
      mt.setProperty("_tfi", 40);
      await wait(mt, t1, t2);
      out.mixed = state();
      // The instance's part now has two sizes (Formatting.multipleValues).
      core.select(1, 9);
      mt.setProperty("_tfi", 50);
      await wait(mt, t1, t2);
      out.multiple = state();
      // A text change with a selection.
      core.select(0, 5);
      mt.setText("Howdy there", true);
      await wait(mt, t1, t2);
      out.selectionText = state();
      mt.repaint(false);
      // The instance's text changes again from the collapsed path.
      core.select(2, 2);
      mt.setText("Howdy all");
      await wait(mt, t1, t2);
      out.collapsedText = state();
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/thumbnail",
    covers: ["ENG-SYMBOL-001"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const wide = G.GSymbol.create([H.add(H.rect(0, 0, 100, 50))], H.layer(), "Wide");
      const tall = G.GSymbol.create([H.add(H.rect(200, 0, 20, 100))], H.layer(), "Tall");
      const size = (c: any) => (c ? [c.getWidth(), c.getHeight()] : c);
      const sizes: unknown[] = [];
      for (const [sym, w, h] of [
        [wide, 64, 64],
        [wide, 64, 20],
        [tall, 64, 64],
        [tall, 5, 64],
      ] as const) {
        let got: unknown = "not called";
        const returned = sym._getSymbolThumbnail(w, h, (c: any) => {
          got = size(c);
        });
        sizes.push([returned === undefined ? "<undefined>" : returned, got]);
      }
      out.sizes = sizes;
      // An empty symbol has no paint area.
      const empty = new G.GSymbol();
      H.add(empty);
      out.empty = H.attempt(() => empty._getSymbolThumbnail(10, 10, () => {}));
      // After a repaint with thumbnails on, the stale thumbnail is
      // rebuilt and AfterThumbnailUpdate comes in a timeout.
      const events: unknown[] = [];
      wide.addEventListener(G.GSymbol.AfterThumbnailUpdate, (e: any) => events.push(size(e.image)));
      wide._shouldRepaintThumbnail = true;
      wide._invalidationFinishedHandler({
        configuration: { thumbnails: false, thumbnailSize: 32 },
      });
      out.offFlag = [wide._shouldRepaintThumbnail, events.length];
      wide._invalidationFinishedHandler({ configuration: { thumbnails: true, thumbnailSize: 32 } });
      out.beforeTimeout = [wide._shouldRepaintThumbnail, events.length, size(wide._cachedImage)];
      await new Promise((res) => setTimeout(res, 0));
      out.afterTimeout = events.slice();
      wide._invalidationFinishedHandler({ configuration: { thumbnails: true, thumbnailSize: 16 } });
      await new Promise((res) => setTimeout(res, 0));
      out.notStale = events.length;
      out.symbolImage = size(wide.getSymbolImage());
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/compared-properties",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const inner = G.GSymbol.create([H.add(H.rect(0, 0, 5, 5))], H.layer(), "Inner");
      const innerInstance = inner.clone();
      H.add(innerInstance);
      const p = new G.GPath();
      for (const [x, y] of [
        [0, 0],
        [10, 0],
        [10, 10],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        p.getAnchorPoints().appendChild(ap);
      }
      const g = new G.GGroup();
      g.appendChild(H.rect(0, 0, 3, 3));
      const img = new G.GImage();
      img.setProperty("trf", H.T(5, 0, 0, 5, 5, 5));
      const nodes: Record<string, any> = {
        rectangle: H.rect(0, 0, 10, 10),
        ellipse: H.ellipse(0, 0, 10, 10),
        path: p,
        text: new G.GText(),
        group: g,
        image: img,
        instance: innerInstance,
        polygon: new G.GPolygon(),
      };
      const names = Object.keys(nodes);
      for (const n of names) if (n !== "instance") H.add(nodes[n]);
      const m = G.GSymbol.create(
        names.map((n) => nodes[n]),
        H.layer(),
        "Compared",
      );
      const i = m.clone();
      H.add(i);
      const masterKids = m.getChildren() as any[];
      const kids = i.getChildren() as any[];
      names.forEach((n, index) => {
        const original = masterKids[index];
        const captured: unknown[] = [];
        const own = original.arePropertiesEqual;
        original.arePropertiesEqual = function (this: any, node: any, list: string[]) {
          captured.push(list.slice());
          return own.call(this, node, list);
        };
        const equal = H.attempt(() => i._comparePropertiesWithMaster(kids[index]));
        const withExtra = H.attempt(() =>
          i._comparePropertiesWithMaster(kids[index], ["name", "trf", "zzz"]),
        );
        original.arePropertiesEqual = own;
        out[n] = { equal, withExtra, names: captured };
      });
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/constrained-and-pretransform",
    covers: ["ENG-SYMBOL-003"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const free = H.add(H.rect(0, 0, 20, 20));
      const pinned = H.add(H.rect(30, 0, 20, 20));
      // A constraint set before the symbol exists is dropped (no Layout
      // parent yet); the one set on the master's child is kept.
      pinned.setProperties(["hacr", "vacr"], [2, 2]);
      const m = G.GSymbol.create([free, pinned], H.layer(), "Anchored");
      out.droppedConstraint = [m.hasAnchors(), m.getLastChild().getProperty("hacr")];
      m.getLastChild().setProperties(["hacr", "vacr"], [3, 3]);
      const i = m.clone();
      H.add(i);
      const kidTrfs = (s: any) =>
        (s.getChildren() as any[]).map((c: any) => H.v(c.getProperty("trf")));
      out.hasAnchors = [m.hasAnchors(), i.hasAnchors()];
      i.dependentUpdate = true;
      i.transform(H.T(2, 0, 0, 1, 10, 0));
      i.dependentUpdate = false;
      out.dependent = {
        trf: H.v(i.getProperty("trf")),
        kids: kidTrfs(i),
        inSync: i.inSync(),
        pinned: H.props(i.getLastChild(), ["hstrf", "vstrf", "habox", "hsbox", "hdl", "hdr"]),
      };
      i.transform(H.T(2, 0, 0, 1, 10, 0), true);
      out.forced = { trf: H.v(i.getProperty("trf")), kids: kidTrfs(i) };
      // preTransform inside a group.
      const g = new G.GGroup();
      const j = m.clone();
      g.appendChild(j);
      H.add(g);
      j.preTransform(H.T(1, 0, 0, 2, 0, 5));
      out.preTransform = {
        trf: H.v(j.getProperty("trf")),
        kids: kidTrfs(j),
        inSync: j.inSync(),
        disabled: Object.keys(j._disabledSiblingMap).length,
      };
      j.preTransform(H.T(0, 1, -1, 0, 3, 4), true);
      out.preTransformForced = { trf: H.v(j.getProperty("trf")), kids: kidTrfs(j) };
      j.preTransform(H.T(1, 0, 0, 1, 0, 0));
      out.identity = H.v(j.getProperty("trf"));
      // A master inside a group, pre-transformed with its parent.
      g.preTransform(H.T(1, 0, 0, 1, 7, 7), true);
      out.groupPreTransform = { trf: H.v(j.getProperty("trf")), kids: kidTrfs(j) };
      m.preTransform(H.T(1, 0, 0, 1, 0, 3));
      out.masterPreTransform = { master: kidTrfs(m), instance: kidTrfs(i), j: kidTrfs(j) };
      return out;
    }),
  },
  {
    id: "engine-model/symbols-branches/block-edited-and-sweep",
    covers: ["ENG-SYMBOL-003", "ENG-SYMBOL-006"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      // Reference ids of symbols aren't under an id key; name them first.
      const blob = (n: any) => {
        for (const s of H.app.scene().queryAll("symbol") as any[]) {
          H.id(s.getReferenceId());
          H.id(s.getMultireferenceId());
        }
        return H.blob(n);
      };
      const a = H.add(H.rect(0, 0, 20, 20));
      H.fill(a, H.rgb(255, 0, 0));
      const b = H.add(H.rect(30, 0, 20, 20));
      const m = G.GSymbol.create([a, b], H.layer(), "Edited");
      const i = m.clone();
      H.add(i);
      const state = () => ({
        blob: blob(i),
        siblings: Object.keys(i._siblingMap).length,
        disabled: Object.keys(i._disabledSiblingMap).length,
      });
      G.GSymbol.BLOCK_EDITED = true;
      try {
        i.getFirstChild()
          .getPaintLayers()
          .getFirstChild()
          .setProperty("_pt", H.rgb(0, 1, 0));
        out.override = state();
        i.getFirstChild()
          .getPaintLayers()
          .getFirstChild()
          .setProperty("_pt", H.rgb(255, 0, 0));
        out.matchAgain = state();
        i.getLastChild().setProperty("name", "x");
        out.nameOverride = state();
        a.setProperty("trf", H.T(5, 0, 0, 5, 5, 5));
        out.masterEdit = state();
        i.synchronize(i.getLastChild());
        out.sync = state();
        i.getLastChild().setProperty("name", "y");
        const saved = H.ser(i);
        const copy = G.GNode.deserialize(saved);
        H.add(copy);
        out.restored = {
          dsb: H.v(copy.getProperty("dsb")),
          sbl: H.v(copy.getProperty("sbl")),
          siblings: copy._siblingMap ? Object.keys(copy._siblingMap).length : null,
          disabled: copy._disabledSiblingMap ? Object.keys(copy._disabledSiblingMap).length : null,
          blob: blob(copy),
        };
        // Nested: a B instance inside master A, overridden in A's instance.
        const rb = H.add(H.rect(0, 200, 10, 10));
        H.fill(rb, H.rgb(0, 0, 200));
        const mb = G.GSymbol.create([rb], H.layer(), "B");
        const ib = mb.clone();
        H.add(ib);
        const ma = G.GSymbol.create([ib, H.add(H.rect(20, 200, 10, 10))], H.layer(), "A");
        const a1 = ma.clone();
        H.add(a1);
        a1.transform(H.T(1, 0, 0, 1, 0, 50));
        a1.getFirstChild().transform(H.T(1, 0, 0, 1, 3, 0));
        out.nestedOverride = {
          blob: blob(a1),
          siblings: Object.keys(a1._siblingMap).length,
          disabled: Object.keys(a1._disabledSiblingMap).length,
        };
        rb.getPaintLayers()
          .getFirstChild()
          .setProperty("_pt", H.rgb(0, 200, 0));
        out.nestedMasterEdit = blob(a1);
        const a1Copy = G.GNode.deserialize(H.ser(a1));
        H.add(a1Copy);
        out.nestedRestored = {
          sbl: H.v(a1Copy.getProperty("sbl")) ? a1Copy.getProperty("sbl").length : null,
          dsb: H.v(a1Copy.getProperty("dsb")) ? a1Copy.getProperty("dsb").length : null,
          siblings: Object.keys(a1Copy._siblingMap).length,
          disabled: Object.keys(a1Copy._disabledSiblingMap).length,
          nestedSiblings: Object.keys(a1Copy.getFirstChild()._siblingMap).length,
        };
      } finally {
        G.GSymbol.BLOCK_EDITED = false;
      }
      // Removing a master with enableSweepInstances unpacks its instances.
      const c = H.add(H.ellipse(0, 100, 20, 20));
      const d = H.add(H.rect(30, 100, 10, 10));
      const m2 = G.GSymbol.create([c, d], H.layer(), "Swept");
      const k1 = m2.clone();
      H.add(k1);
      k1.transform(H.T(1, 0, 0, 1, 100, 0));
      const g = new G.GGroup();
      const k2 = m2.clone();
      g.appendChild(k2);
      H.add(g);
      G.GSymbol.enableSweepInstances = true;
      try {
        m2.getParent().removeChild(m2);
      } finally {
        G.GSymbol.enableSweepInstances = false;
      }
      out.swept = {
        layer: H.kids(H.layer()),
        group: H.kids(g),
        k1Parent: k1.getParent() ? "has parent" : null,
        symbols: (H.app.scene().queryAll("symbol") as any[]).length,
        blob: blob(H.layer()),
      };
      return out;
    }),
  },
]);

paritySuite("engine-model symbols branches", scenarios, { newApp: false });
