import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Symbols: masters, instances, synchronization, overrides, detach, swap,
// convertToMaster, removeSymbol and the scene symbol dictionary.

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/symbols/master-instance-sync",
    covers: [
      "ENG-SYMBOL-001",
      "ENG-SYMBOL-002",
      "ENG-SYMBOL-003",
      "ENG-NODE-039",
      "ENG-EVENT-010",
      "ENG-SER-008",
    ],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const steps: Record<string, unknown> = {};
      const a = H.add(H.rect(0, 0, 50, 50));
      H.fill(a, H.rgb(255, 0, 0));
      const b = H.add(H.ellipse(60, 0, 40, 40));
      H.fill(b, H.rgb(0, 0, 255));
      const m = G.GSymbol.create([a, b], H.layer(), "Badge <i>x</i>");
      const sibling: unknown[] = [];
      m.addEventListener(G.GSymbol.AfterSiblingUpdate, (e: { type: unknown; updated: unknown }) =>
        sibling.push(["master", e.type, H.v(e.updated)]),
      );
      const i1 = m.clone();
      H.add(i1);
      i1.transform(H.T(1, 0, 0, 1, 200, 0));
      i1.addEventListener(G.GSymbol.AfterSiblingUpdate, (e: { type: unknown; updated: unknown }) =>
        sibling.push(["instance", e.type, H.v(e.updated)]),
      );
      const i2 = m.clone();
      H.add(i2);
      i2.transform(H.T(1, 0, 0, 1, 0, 200));
      steps.created = {
        master: H.rawBlob(m),
        instance: H.rawBlob(i1),
        isMaster: [m.isMaster(), i1.isMaster()],
        masterOf: [i1.getMasterSymbol() === m, m.getMasterSymbol() === m],
        inSync: i1.inSync(),
        frame: H.r(i1.getFrame()),
        name: m.getProperty("name"),
      };
      // Geometry edit on the master propagates.
      a.setProperty("trf", H.T(30, 0, 0, 30, 25, 25));
      steps.masterGeometry = { i1: H.rawBlob(i1), i2: H.rawBlob(i2) };
      // Overriding a fill on the instance stores the override in dsb.
      i1.getFirstChild()
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(0, 255, 0));
      steps.override = {
        i1: H.rawBlob(i1),
        disabled: H.attempt(() => i1.getDisabledSiblings().length),
      };
      // The master's later fill change does not reach the overridden child.
      a.getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(9, 9, 9));
      steps.masterFill = {
        i1: H.rawBlob(i1),
        i2: H.rawBlob(i2),
        inSync: [i1.inSync(), i2.inSync()],
      };
      // Inserting and removing children in the master.
      const c = H.rect(0, 60, 20, 20);
      m.appendChild(c);
      steps.insert = { i1: H.kids(i1), i2: H.kids(i2) };
      m.removeChild(b);
      steps.remove = { i1: H.kids(i1), i2: H.kids(i2) };
      steps.siblingEvents = sibling;
      steps.scene = H.savedScene();
      return JSON.stringify(steps);
    }),
  },
  {
    id: "engine-model/symbols/instance-operations",
    covers: ["ENG-SYMBOL-004", "ENG-SYMBOL-006", "ENG-SCENE-008"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const steps: Record<string, unknown> = {};
      const m1 = G.GSymbol.create([H.add(H.rect(0, 0, 40, 40))], H.layer(), "One");
      const m2 = G.GSymbol.create([H.add(H.ellipse(100, 0, 60, 30))], H.layer(), "Two");
      steps.masters = { m1: H.rawBlob(m1), m2: H.rawBlob(m2) };
      const inst = m1.clone();
      H.add(inst);
      inst.transform(H.T(1, 0, 0, 1, 0, 100));
      steps.symbols = H.attempt(() =>
        (s.getSymbols() as { getProperty(n: string): unknown }[]).map((x) => x.getProperty("name")),
      );
      steps.linkCounts = [s.linkCount(m1), s.linkCount(m2)];
      // swapWith replaces the instance by an instance of another master.
      const swapped = inst.swapWith(m2);
      steps.swapped = {
        result: H.rawBlob(swapped),
        master: swapped.getMasterSymbol() === m2,
        parentKids: H.kids(H.layer()),
      };
      // detach turns an instance into a plain symbol without a master.
      const inst2 = m1.clone();
      H.add(inst2);
      steps.detach = {
        returned: inst2.detach(),
        blob: H.rawBlob(inst2),
        master: inst2.getMasterSymbol(),
      };
      steps.detachMaster = m1.detach();
      // A detached symbol can become a master of its own.
      steps.convert = {
        returned: inst2.convertToMaster("Three"),
        blob: H.rawBlob(inst2),
        isMaster: inst2.isMaster(),
      };
      // swapWithNew replaces the content.
      const inst3 = m1.clone();
      H.add(inst3);
      const replaced = inst3.swapWithNew(m2);
      steps.swapWithNew = {
        returned: replaced ? G.GNode.getName(replaced) : null,
        blob: H.rawBlob(inst3),
      };
      // Unsupported children are skipped when creating a symbol.
      const pg = H.add(new G.GPathsGraph());
      const m4 = G.GSymbol.create([pg, H.add(H.rect(0, 0, 5, 5))], H.layer(), "Four");
      steps.unsupported = { kids: H.kids(m4), unsupported: G.GSymbol.containsUnsupportedNodes(pg) };
      // removeSymbol deletes the master and every instance.
      const i5 = m2.clone();
      H.add(i5);
      const before = s.queryAll("symbol").length;
      s.removeSymbol(m2);
      steps.removeSymbol = {
        before,
        after: s.queryAll("symbol").length,
        names: (s.queryAll("symbol") as { getProperty(n: string): unknown }[]).map((x) =>
          x.getProperty("name"),
        ),
        symbols: H.attempt(() =>
          (s.getSymbols() as { getProperty(n: string): unknown }[]).map((x) =>
            x.getProperty("name"),
          ),
        ),
      };
      steps.scene = H.savedScene();
      return JSON.stringify(steps);
    }),
  },
  {
    id: "engine-model/symbols/serialize-restore",
    covers: ["ENG-SYMBOL-001", "ENG-SYMBOL-003", "ENG-SYMBOL-006", "ENG-SER-002"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const a = H.add(H.rect(0, 0, 50, 50));
      H.fill(a, H.rgb(255, 0, 0));
      const m = G.GSymbol.create([a], H.layer(), "Saved");
      const i = m.clone();
      H.add(i);
      i.getFirstChild().setProperty("name", "overridden");
      const json = H.app.serialize({ save: true });
      // Restoring a whole scene that holds symbols outside of a workspace
      // throws in the old engine (GSymbol needs the workspace references).
      const sceneRestore = H.attempt(() => {
        G.GNode.deserialize(json);
        return "restored";
      });
      // A copy of the page restored into the live scene.
      const pageCopy = G.GNode.deserialize(H.ser(H.page()));
      H.app.scene().appendChild(pageCopy);
      const restored = pageCopy.queryAll("symbol") as {
        isMaster(): boolean;
        getMasterSymbol(): unknown;
        getProperty(n: string): unknown;
      }[];
      return JSON.stringify({
        saved: H.linksAsEntries(JSON.parse(json)),
        sceneRestore,
        restoredPage: JSON.parse(H.ser(pageCopy)),
        restoredSymbols: restored.map((x) => [
          x.getProperty("name"),
          x.isMaster(),
          x.getMasterSymbol() === m,
          x.getProperty("dsb"),
        ]),
      });
    }),
  },
  {
    id: "engine-model/symbols/render",
    covers: ["ENG-SYMBOL-002", "ENG-SYMBOL-003"],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const a = H.add(H.rect(0, 0, 40, 40));
      H.fill(a, H.rgb(255, 0, 0));
      const b = H.add(H.ellipse(50, 0, 30, 30));
      H.fill(b, H.rgb(0, 0, 255));
      const m = G.GSymbol.create([a, b], H.layer(), "R");
      const i = m.clone();
      H.add(i);
      i.transform(H.T(1, 0, 0, 1, 0, 50));
      i.getFirstChild()
        .getPaintLayers()
        .getFirstChild()
        .setProperty("_pt", H.rgb(0, 200, 0));
      b.setProperty("trf", H.T(10, 0, 0, 10, 60, 10));
      // The instance: overridden first child, synced second child.
      return i.toBitmap(1, 1).toImageDataUrl();
    }),
  },
]);

paritySuite("engine-model symbols", scenarios, { newApp: false });
