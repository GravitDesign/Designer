import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Smaller model features: border scaling, child indexes, page labels,
// paint configuration, OpenType helpers and symbol undo.

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/extras/border-scaling",
    covers: ["ENG-BORDER-006", "ENG-SCENE-011", "ENG-NODE-019"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const s = H.app.scene();
      const out: Record<string, unknown> = {};
      const widthAfterScale = (scaleWithObject: boolean, scale: number) => {
        const r = H.add(H.rect(0, 0, 100, 50));
        const l = H.border(r, H.rgb(0, 0, 0), { _bw: 4, _bs: scaleWithObject });
        r.transform(H.T(scale, 0, 0, scale, 0, 0));
        return l.getProperty("_bw");
      };
      const settings = s.getTransformSettings();
      const saved = { ...settings };
      out.defaults = H.v(saved);
      out.layerFlagOff = widthAfterScale(false, 2);
      out.layerFlagOn = widthAfterScale(true, 2);
      out.layerFlagOnShrink = widthAfterScale(true, 0.5);
      s.setBorderScale(true);
      out.sceneOnLayerOff = widthAfterScale(false, 3);
      s.setBorderScale(false);
      out.sceneOffLayerOn = widthAfterScale(true, 3);
      // Corner radii scale with the shape unless the scene turns it off.
      const corners = () => {
        const r = H.add(H.rect(0, 0, 100, 50));
        r.setProperties(["tl_sx", "tl_sy"], [10, 10]);
        r.transform(H.T(2, 0, 0, 2, 0, 0));
        return H.props(r, ["tl_sx", "tl_sy", "csc"]);
      };
      out.cornersDefault = corners();
      s.setCornersScale(false);
      out.cornersOff = corners();
      s.setBorderScale(saved.borderScale);
      s.setCornersScale(saved.scaleCorners);
      return out;
    }),
  },
  {
    id: "engine-model/extras/child-index-queries",
    covers: ["ENG-NODE-016", "ENG-NODE-012"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const l = H.add(new G.GLayer());
      const names: string[] = [];
      for (let i = 0; i < 30; i++) {
        const r = H.rect((i % 6) * 50, Math.floor(i / 6) * 50, 40, 40);
        r.setProperty("name", "r" + i);
        if (i % 7 === 0) H.border(r, H.rgb(0, 0, 0), { _bw: 30 });
        l.appendChild(r);
        names.push("r" + i);
      }
      const label = (list: { getProperty(n: string): unknown }[] | null) =>
        list ? list.map((n) => n.getProperty("name")) : null;
      const area = new G.GRect(45, 45, 60, 60);
      const out: Record<string, unknown> = {
        geometry: label(l.retrieveChildrenInGeometryBBox(area)),
        paint: label(l.retrieveChildrenInPaintBBox(area)),
      };
      // Moving a child updates the index.
      const moved = l.getFirstChild();
      moved.transform(H.T(1, 0, 0, 1, 60, 60));
      out.afterMove = label(l.retrieveChildrenInGeometryBBox(area));
      l.removeChild(l.getChildByIndex(7));
      out.afterRemove = label(l.retrieveChildrenInGeometryBBox(area));
      out.childrenBBox = H.r(l.getChildrenGeometryBBox());
      return out;
    }),
  },
  {
    id: "engine-model/extras/page-labels-and-paint-config",
    covers: ["ENG-NODE-018", "ENG-SCENE-012", "ENG-SCENE-004", "ENG-NODE-048"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = new G.GScene();
      const p = s.getActivePage();
      p.setProperty("name", "A page with a long label");
      const PC = G.GScenePaintConfiguration;
      const pc = new PC();
      const fields = [
        "paintMode",
        "pixelMode",
        "clipToPage",
        "guides",
        "slices",
        "annotations",
        "elementAnnotations",
        "showResolvedAnnotations",
        "clipArea",
        "ignoreEffects",
        "noWebGL",
        "forceEffectsWhenZoomed",
        "enableFxCache",
        "defaultEffectDetailLevel",
        "sceneBackground",
        "multiPageView",
        "thumbnails",
        "thumbnailSize",
        "pageThumbnails",
        "pageThumbnailSize",
        "paintSharp",
      ];
      const config = Object.fromEntries(fields.map((f) => [f, H.v(pc[f])]));
      pc.paintMode = PC.PaintMode.Outline;
      return {
        labelWidth: H.attempt(() => p.measureLabelWidth()),
        scaleLabel: [H.attempt(() => p.isScaleLabel()), H.attempt(() => p.getScaleLabelFactor())],
        sceneOptions: H.v(G.GSceneOptions),
        paintModes: PC.PaintMode,
        config,
        outline: pc.isOutline(),
        sceneName: G.GNode.getName(s),
        sceneValidates: s.validateInsertion(new G.GScene()),
      };
    }),
  },
  {
    id: "engine-model/extras/opentype-helpers",
    covers: ["ENG-FONT-004", "ENG-TEXT-019", "ENG-TEXT-018", "ENG-FONT-003"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const F = G.GOpenTypeFont;
      const info: Record<string, unknown> = {};
      for (const f of [
        "OpenSans-Regular.ttf",
        "OpenSans-Bold.ttf",
        "OpenSans-SemiBoldItalic.ttf",
        "OpenSans-ExtraBold.ttf",
        "OpenSans-Light.ttf",
        "noto/NotoSansArabic-Regular.ttf",
      ]) {
        const buf = await (await fetch("assets/font/" + f)).arrayBuffer();
        info[f] = H.attempt(() => G.GOpenTypeUtil.getOpenTypeInfo(buf));
      }
      return {
        info,
        nameIds: H.v(G.GOpenTypeUtil.nameId),
        direction: ["abc", "مرحبا", "שלום", "中文", ""].map((x) =>
          H.attempt(() => F.getDirectionForString(x)),
        ),
        script: ["abc", "مرحبا", "שלום", "中文", "Ελληνικά", "Привет", "123"].map((x) =>
          H.attempt(() => F.getScriptForString(x)),
        ),
        bcp47: ["DEU ", "ENG ", "ARA ", "TRK ", "DEU"].map((x) =>
          H.attempt(() => F.openTypeLanguageSystemTagStringToBCP47(x)),
        ),
        scriptTags: ["LATIN", "ARABIC", "HAN", "CYRILLIC", "HEBREW"].map((x) =>
          H.attempt(() => F.scriptNameToOpenTypeScriptTagString(x)),
        ),
      };
    }),
  },
  {
    id: "engine-model/extras/symbol-undo",
    covers: ["ENG-SYMBOL-005", "ENG-SYMBOL-002", "ENG-SCENE-014"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const ed = H.app.editor();
      const a = H.add(H.rect(0, 0, 40, 40));
      const m = G.GSymbol.create([a], H.layer(), "U");
      const i = m.clone();
      H.add(i);
      i.transform(H.T(1, 0, 0, 1, 100, 0));
      const state = () => ({
        master: H.v(a.getProperty("trf")),
        instance: H.v(i.getFirstChild().getProperty("trf")),
        instanceName: i.getFirstChild().getProperty("name"),
        kids: H.kids(i),
      });
      const out: Record<string, unknown> = { start: state() };
      ed.beginTransaction();
      a.setProperty("trf", H.T(10, 0, 0, 10, 10, 10));
      ed.commitTransaction("Master edit");
      out.edited = state();
      ed.undoState();
      out.undone = state();
      ed.redoState();
      out.redone = state();
      ed.beginTransaction();
      m.appendChild(H.ellipse(0, 50, 20, 20));
      ed.commitTransaction("Master insert");
      out.inserted = state();
      ed.undoState();
      out.insertUndone = state();
      ed.beginTransaction();
      i.getFirstChild().setProperty("name", "override");
      ed.commitTransaction("Override");
      out.override = { ...state(), dsb: (i.getProperty("dsb") || []).length };
      ed.undoState();
      out.overrideUndone = { ...state(), dsb: (i.getProperty("dsb") || []).length };
      out.thumbnail = H.attempt(() => typeof m.getSymbolImage());
      return out;
    }),
  },
]);

paritySuite("engine-model extras", scenarios, { newApp: false });
