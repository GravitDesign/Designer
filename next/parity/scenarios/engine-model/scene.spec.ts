import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Scene: meta properties, grid, pages and layers, master pages, links,
// constraints, clipping, transform settings, units and saving.

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/scene/meta-and-grid",
    covers: ["ENG-SCENE-001", "ENG-SCENE-002", "ENG-SCENE-003", "ENG-SCENE-004", "ENG-SCENE-011"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const S = G.GScene;
      const s = new S();
      const meta = [
        "v",
        "ut",
        "ur",
        "gx",
        "gy",
        "gm",
        "lgm",
        "gaw",
        "gah",
        "ga1",
        "ga2",
        "hgl",
        "vgl",
        "name",
        "rb",
        "cst",
        "dpi",
        "pi",
        "cm",
        "pgx",
        "mp",
        "lbs",
        "lbp",
        "lbc",
        "mve",
        "mpg",
        "ompg",
        "empg",
        "cid",
        "cfs",
        "can",
        "asec",
      ];
      const out: Record<string, unknown> = {
        defaults: H.props(s, meta),
        constants: {
          axono1: S.AXONO_ANGLE1,
          axono2: S.AXONO_ANGLE2,
          axonoGX: S.AXONO_GX,
          minGrid: S.MIN_GRID_SIZE,
          gridMode: S.GridMode,
        },
        hasGrid: s.hasGrid(),
        fixedSized: s.isFixedSized(),
        transformSettings: H.v(s.getTransformSettings()),
        pagesKids: H.kids(s),
      };
      s.setProperties(["gx", "gy"], [20, 25]);
      out.boxGrid = H.props(s, ["gx", "gy", "gm", "gah"]);
      s.setProperty("gm", S.GridMode.Axonometric);
      out.axoGrid = H.props(s, ["gm", "lgm", "gaw", "gah", "ga1", "ga2"]);
      s.setProperties(["gaw", "ga1", "ga2"], [30, Math.PI / 4, -Math.PI / 8]);
      out.axoChanged = H.props(s, ["gaw", "gah", "ga1", "ga2"]);
      s.setProperty("gm", S.GridMode.Boxed);
      out.backToBox = H.props(s, ["gm", "lgm"]);
      s.setProperties(["hgl", "vgl"], [[10, 20.5], [5]]);
      out.guides = H.props(s, ["hgl", "vgl"]);
      s.setBorderScale(true);
      s.setCornersScale(false);
      out.transformSettingsChanged = H.v(s.getTransformSettings());
      out.blob = H.blob(s);
      out.blobSave = H.blob(s, { save: true });
      return out;
    }),
  },
  {
    id: "engine-model/scene/pages-and-layers",
    covers: ["ENG-SCENE-004", "ENG-SCENE-005", "ENG-SCENE-007", "ENG-NODE-037", "ENG-NODE-038"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = new G.GScene();
      const pages = () =>
        (s.getChildren() as { getProperty(n: string): unknown }[]).map((p) =>
          H.props(p, ["name", "w", "h", "x", "y", "off", "ml", "mt", "bck"]),
        );
      const out: Record<string, unknown> = { start: pages() };
      const first = s.getActivePage();
      first.setProperties(
        ["w", "h", "ml", "mt", "mr", "mb", "bl", "bck"],
        [400, 300, 10, 20, 30, 40, 5, H.rgb(250, 250, 250)],
      );
      const p2 = s.insertPage();
      const p3 = s.insertPage();
      const p4 = s.insertPage();
      out.inserted = pages();
      out.activeAfterInsert = s.getActivePage().getProperty("name");
      s.setProperty("pgx", 3);
      out.threePerRow = pages();
      p2.setProperty("w", 1200);
      out.resized = pages();
      s.setActivePage(p3);
      out.active = s.getActivePage() === p3;
      out.successor = H.attempt(() => s.getSuccessorActivePage().getProperty("name"));
      const iterated: unknown[] = [];
      s.iteratePages((p: { getProperty(n: string): unknown }) => {
        iterated.push(p.getProperty("name"));
      });
      out.iterated = iterated;
      // Bounding boxes of a page with margins and bleed.
      out.firstBoxes = {
        geometry: H.r(first.getGeometryBBox()),
        paint: H.r(first.getPaintBBox()),
        margin: H.r(first.getMarginBBox()),
        clip: H.r(first.getClipBBox()),
        position: H.attempt(() => first.getPosition()),
      };
      // renameClone numbering.
      const named = (n: string) => {
        const a = new G.GPage();
        a.setProperty("name", n);
        const b = new G.GPage();
        s.renameClone(a, b);
        return b.getProperty("name");
      };
      out.renameClone = ["Page", "Page 1", "Page 1.2", "Page 1.2.3", "Card 9", ""].map(named);
      // Layers inside a page.
      const l1 = new G.GLayer();
      l1.setProperty("name", "L1");
      const l2 = new G.GLayer();
      l2.setProperty("name", "L2");
      const sub = new G.GLayer();
      sub.setProperty("name", "Sub");
      p3.appendChild(l1);
      p3.appendChild(l2);
      l2.appendChild(sub);
      p3.setActiveLayer(l2);
      out.layers = {
        active: p3.getActiveLayer().getProperty("name"),
        sceneActive: H.attempt(() => s.getActiveLayer().getProperty("name")),
        successor: H.attempt(() => p3.getSuccessorActiveLayer().getProperty("name")),
        blob: H.blob(l2, { copy: true }),
      };
      p3.deleteActiveLayer();
      out.afterDeleteLayer = {
        kids: H.kids(p3),
        active: H.attempt(() => p3.getActiveLayer().getProperty("name")),
      };
      s.deleteActivePage();
      out.afterDeletePage = { pages: pages(), active: s.getActivePage().getProperty("name") };
      p4.setProperties(["w", "h"], [0, 0]);
      out.unbounded = { fixed: H.attempt(() => p4.isFixedSized()), boxes: H.boxes(p4) };
      out.trim = H.attempt(() => {
        const r = H.rect(50, 60, 70, 80);
        first.appendChild(r);
        first.trimToContent();
        return H.props(first, ["w", "h", "off"]);
      });
      out.blob = H.blob(s, { save: true });
      return out;
    }),
  },
  {
    id: "engine-model/scene/master-pages",
    covers: ["ENG-SCENE-006", "ENG-SCENE-008"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const s = H.app.scene();
      const master = s.getActivePage();
      master.setProperty("name", "Master");
      master.appendChild(H.rect(0, 0, 50, 50));
      const slave = s.insertPage();
      slave.setProperty("refs", [master.getReferenceId()]);
      const other = s.insertPage();
      const names = (list: { getProperty(n: string): unknown }[] | null) =>
        list ? list.map((p) => p.getProperty("name")) : null;
      const out: Record<string, unknown> = {
        masters: names(slave.getMasterPages()),
        slaves: names(master.getSlavePages()),
        otherMasters: names(other.getMasterPages()),
        linked: s.isLinked(master),
        refCount: s.refCount(master),
      };
      // Scene-wide master page for all pages.
      const setMpg = H.attempt(() => {
        s.setProperty("mpg", master);
        s.reassignMasterPages();
        return (s.getChildren() as { getProperty(n: string): unknown }[]).map((p) => [
          p.getProperty("name"),
          (p.getProperty("refs") as unknown[] | null)?.length ?? null,
        ]);
      });
      out.mpg = setMpg;
      out.singleMasterContent = H.attempt(() => other.isSingleMasterBackgroundContent());
      out.blobHasRefs = "refs" in H.blob(slave);
      return out;
    }),
  },
  {
    id: "engine-model/scene/links-and-references",
    covers: ["ENG-SCENE-008", "ENG-NODE-006", "ENG-NODE-011", "ENG-SCENE-013"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const s = H.app.scene();
      const ws = s.getWorkspace();
      // The link source must have a reference id (Reference mixin): a text.
      const a = H.add(new H.G.GText());
      const b = H.add(H.ellipse(0, 0, 10, 10));
      const c = H.add(H.rect(20, 0, 10, 10));
      const out: Record<string, unknown> = {
        refIdLength: a.getReferenceId().length,
        sceneIdLength: a.getSceneId().length,
        sceneIdsDiffer: a.getSceneId() !== a.getReferenceId(),
        reference: ws.getReference(a.getReferenceId()) === a,
      };
      s.link(a, b);
      s.link(a, c);
      out.afterLink = {
        isLinked: [s.isLinked(a), s.isLinked(b), s.isLinked(b, a), s.isLinked(c, a)],
        hasLinks: s.hasLinks(a),
        hasReferences: s.hasReferences(b),
        linkCount: s.linkCount(a),
        refCount: [s.refCount(b), s.refCount(a)],
      };
      const visited: string[] = [];
      s.visitLinks(a, (n: unknown) => {
        visited.push(H.G.GNode.getName(n));
      });
      out.visitLinks = visited;
      const refs: string[] = [];
      s.visitReferences(b, (n: unknown) => {
        refs.push(H.G.GNode.getName(n));
      });
      out.visitReferences = refs;
      s.unlink(a, b);
      out.afterUnlink = { linkCount: s.linkCount(a), isLinked: s.isLinked(b, a) };
      // Removing a linked node from the scene drops its link.
      c.getParent().removeChild(c);
      out.afterRemove = { linkCount: s.linkCount(a) };
      out.linksShape = Object.values(s.getProperty("_links") || {}).map((v) =>
        Array.isArray(v) ? v.length : typeof v,
      );
      return out;
    }),
  },
  {
    id: "engine-model/scene/constraints",
    covers: ["ENG-SCENE-009", "ENG-NODE-015", "ENG-NODE-020", "ENG-NODE-036"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      out.anchorTypes = H.attempt(() => G.GElement.Anchor.Type ?? Object.keys(G.GElement.Anchor));
      for (const [k, h, v] of [
        ["start", 1, 1],
        ["middle", 2, 2],
        ["end", 3, 3],
        ["stretch", 4, 4],
      ] as const) {
        const g = new G.GGroup();
        const child = H.rect(20, 20, 20, 20);
        g.appendChild(child);
        g.appendChild(H.rect(0, 0, 100, 100));
        g.setProperty("frm", new G.GRect(0, 0, 100, 100));
        child.setProperties(["hacr", "vacr"], [h, v]);
        g.transform(H.T(2, 0, 0, 1.5, 0, 0));
        out[k] = { child: H.r(child.getGeometryBBox()), group: H.r(g.getGeometryBBox()) };
      }
      // Shapes with scc=false give their children start anchors.
      const shape = H.rect(0, 0, 100, 100);
      const inner = H.ellipse(10, 10, 20, 20);
      shape.appendChild(inner);
      shape.setProperty("scc", false);
      shape.transform(H.T(2, 0, 0, 2, 0, 0));
      out.sccFalse = { inner: H.r(inner.getGeometryBBox()), hacr: inner.getProperty("hacr") };
      const shape2 = H.rect(0, 0, 100, 100);
      const inner2 = H.ellipse(10, 10, 20, 20);
      shape2.appendChild(inner2);
      shape2.transform(H.T(2, 0, 0, 2, 0, 0));
      out.sccTrue = { inner: H.r(inner2.getGeometryBBox()) };
      // setFrame on a group assigns start anchors.
      const g2 = new G.GGroup();
      const c2 = H.rect(0, 0, 10, 10);
      g2.appendChild(c2);
      H.attempt(() => g2.setFrame && g2.setFrame(new G.GRect(0, 0, 50, 50)));
      out.setFrame = { frm: H.v(g2.getProperty("frm")), anchors: H.props(c2, ["hacr", "vacr"]) };
      return out;
    }),
  },
  {
    id: "engine-model/scene/clipping-render",
    covers: ["ENG-SCENE-010", "ENG-NODE-020", "ENG-FILL-002"],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      // A shape clips its children.
      const clip = H.ellipse(0, 0, 80, 80);
      H.fill(clip, H.rgb(220, 220, 220));
      const kid = H.rect(40, 40, 80, 80);
      H.fill(kid, H.rgb(255, 0, 0));
      clip.appendChild(kid);
      g.appendChild(clip);
      // Boolean compound shape: subtract.
      const cs = new G.GCompoundShape();
      const base = H.rect(100, 0, 80, 80);
      const hole = H.ellipse(120, 20, 40, 40);
      hole.setProperty("bool", 4);
      cs.appendChild(base);
      cs.appendChild(hole);
      H.fill(cs, H.rgb(0, 0, 255));
      g.appendChild(cs);
      H.add(g);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
  {
    id: "engine-model/scene/units",
    covers: ["ENG-SCENE-018", "ENG-SCENE-001"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = new G.GScene();
      const out: Record<string, unknown> = {};
      for (const unit of ["px", "pt", "mm", "cm", "in", "pc"]) {
        s.setProperty("ut", unit);
        out[unit] = {
          parsed: ["10", "10mm", "1in", "2 * 3", "5cm + 2mm", "abc"].map((x) =>
            H.attempt(() => {
              const l = s.stringToLength(x);
              return l ? [l.toPoint(), s.lengthToString(l)] : null;
            }),
          ),
          point: s.pointToString(12.3456),
          stringToPoint: H.attempt(() => s.stringToPoint("3")),
          decimals: s.getOptimalDecimalsCount(),
          increment: s.getIncrementValue(),
        };
      }
      return out;
    }),
  },
  {
    id: "engine-model/scene/saved-document",
    covers: [
      "ENG-SER-009",
      "ENG-SER-010",
      "ENG-SER-001",
      "ENG-SER-003",
      "ENG-SCENE-001",
      "ENG-FONT-006",
    ],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const r = H.insert(H.rect(10, 10, 100, 50));
      H.insert(H.ellipse(150, 10, 50, 50));
      s.setProperties(
        ["name", "cid", "cfs", "cst", "hgl"],
        ["Doc", "cloud-id", true, ["My Font"], [5]],
      );
      r.setFlag(G.GNode.Flag.Selected);
      const save = H.linksAsEntries(JSON.parse(G.GNode.serialize(s, { save: true })));
      const plain = H.linksAsEntries(JSON.parse(G.GNode.serialize(s)));
      const singleton = H.attempt(() =>
        H.linksAsEntries(JSON.parse(G.GNode.serialize(s, { save: true, singleton: true }))),
      );
      const keys = (b: Record<string, unknown> | string) =>
        typeof b === "string" ? b : Object.keys(b);
      return JSON.stringify({
        save,
        saveKeys: keys(save),
        plainKeys: keys(plain),
        singletonKeys: H.attempt(() => keys(singleton)),
        lmdIsNumber: typeof save.lmd,
        plainLmd: plain.lmd ?? "<absent>",
      });
    }),
    // `_sdf` is the runtime type id of the element class (load-order dependent).
    dropKeys: ["_sdf"],
  },
]);

paritySuite("engine-model scene", scenarios, { newApp: false });
