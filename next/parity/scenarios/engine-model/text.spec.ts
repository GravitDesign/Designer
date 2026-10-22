import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Text layout and fonts. Every scenario waits until the font manager has
// no pending or unresolved fonts before it measures (H.fonts). Layout is
// recorded as bounding boxes plus a digest of the glyph outlines (vertex
// count, coordinate sums and per-contour bounds), which changes when any
// glyph moves.

interface TextCase {
  /** Text: a string or an array of runs. */
  text: unknown;
  /** Element properties set after the text (they apply to all runs). */
  props?: Record<string, unknown>;
}

const SAMPLE = "The quick brown fox jumps over the lazy dog";

const CASES: Record<string, TextCase> = {
  default: { text: "Hello world" },
  twoLines: { text: "Hello world\nSecond line" },
  size40: { text: "Hello", props: { _tfi: 40 } },
  bold: { text: "Hello", props: { _tfw: 700 } },
  boldItalic: { text: "Hello", props: { _tfw: 700, _tfs: "I" } },
  light: { text: "Hello", props: { _tfw: 300 } },
  semiBoldItalic: { text: "Hello", props: { _tfw: 600, _tfs: "I" } },
  letterSpacing: { text: "Hello", props: { _tcs: 5 } },
  wordSpacing: { text: "a b c d", props: { _tws: 10 } },
  lineHeight: { text: "one\ntwo\nthree", props: { _plh: 2 } },
  paragraphSpacing: { text: "one\ntwo\nthree", props: { _pas: "15" } },
  paragraphIndent: { text: "one\ntwo", props: { _pai: 20 } },
  wrapLeft: { text: SAMPLE, props: { aw: false, w: 150 } },
  wrapCenter: { text: SAMPLE, props: { aw: false, w: 150, _pal: "c" } },
  wrapRight: { text: SAMPLE, props: { aw: false, w: 150, _pal: "r" } },
  wrapJustify: { text: SAMPLE, props: { aw: false, w: 150, _pal: "j" } },
  fixedBoxTop: { text: "Top", props: { aw: false, ah: false, w: 100, h: 80, va: "t" } },
  fixedBoxMiddle: { text: "Middle", props: { aw: false, ah: false, w: 100, h: 80, va: "m" } },
  fixedBoxBottom: { text: "Bottom", props: { aw: false, ah: false, w: 100, h: 80, va: "b" } },
  underline: { text: "Underlined", props: { _tdu: true } },
  strikeout: { text: "Struck", props: { _tds: true } },
  uppercase: { text: "Hello World", props: { _ttrf: "u" } },
  lowercase: { text: "Hello World", props: { _ttrf: "l" } },
  capitalize: { text: "hello world", props: { _ttrf: "c" } },
  smallCaps: { text: "Hello World", props: { _ttrf: "s" } },
  superscript: { text: "x2", props: { _ttsc: "super" } },
  subscript: { text: "H2O", props: { _ttsc: "sub" } },
  ligatures: { text: "office flow", props: { _tlig: "auto" } },
  fractions: { text: "1/2 3/4", props: { _tfrac: true } },
  hebrew: { text: "שלום עולם", props: { _tff: "Noto Sans Hebrew" } },
  arabicRtl: { text: "مرحبا بالعالم", props: { _tff: "Noto Sans Arabic", dir: 1 } },
  richRuns: {
    text: [
      { text: "Small ", fontFamily: "Open Sans", fontSize: 12 },
      { text: "Big ", fontFamily: "Open Sans", fontSize: 36, fontWeight: 700 },
      { text: "italic ", fontFamily: "Open Sans", fontStyle: "italic" },
      { text: "under", fontFamily: "Open Sans", underline: true },
      { text: "\nnext line", fontFamily: "Open Sans", lineSpacing: 1.5, charSpacing: 3 },
    ],
  },
  listBullet: {
    text: [
      { text: "first\nsecond\nthird", fontFamily: "Open Sans", listMarker: "Bullet", listDepth: 1 },
    ],
  },
  listNumber: {
    text: [{ text: "first\nsecond", fontFamily: "Open Sans", listMarker: "Number", listDepth: 1 }],
  },
  listNested: {
    text: [
      { text: "top\n", fontFamily: "Open Sans", listMarker: "Number", listDepth: 1 },
      { text: "inner\n", fontFamily: "Open Sans", listMarker: "RomanDot", listDepth: 2 },
      { text: "check", fontFamily: "Open Sans", listMarker: "Check", listDepth: 2 },
    ],
  },
  listSquareRoman: {
    text: [
      { text: "a\n", fontFamily: "Open Sans", listMarker: "Square", listDepth: 1 },
      { text: "b", fontFamily: "Open Sans", listMarker: "RomanBracket", listDepth: 1 },
    ],
  },
};

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/text/layout-cases",
    covers: [
      "ENG-TEXT-001",
      "ENG-TEXT-003",
      "ENG-TEXT-004",
      "ENG-TEXT-005",
      "ENG-TEXT-006",
      "ENG-TEXT-007",
      "ENG-TEXT-008",
      "ENG-TEXT-009",
      "ENG-TEXT-010",
      "ENG-TEXT-011",
      "ENG-TEXT-013",
      "ENG-TEXT-016",
      "ENG-TEXT-017",
      "ENG-TEXT-018",
      "ENG-TEXT-019",
      "ENG-FONT-002",
      "ENG-FONT-003",
    ],
    kind: "json",
    timeout: 240_000,
    args: CASES,
    inPage: withHelpers(
      async (_p, cases: Record<string, { text: unknown; props?: Record<string, unknown> }>, H) => {
        const out: Record<string, unknown> = {};
        for (const [k, c] of Object.entries(cases)) {
          const t = await H.text(c.text, c.props, 0, 0);
          out[k] = {
            plain: t.getPlainText(),
            boxes: H.boxes(t),
            outline: H.outline(t),
            w: t.getProperty("w"),
            h: t.getProperty("h"),
            blob: H.stable(t),
          };
        }
        return out;
      },
    ),
  },
  {
    id: "engine-model/text/auto-fit-and-sizes",
    covers: ["ENG-TEXT-001", "ENG-TEXT-014", "ENG-TEXT-002"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const out: Record<string, unknown> = {};
      const fresh = new H.G.GText();
      out.constructed = H.props(fresh, ["w", "h", "aw", "ah", "afs", "va", "dir", "_tfi", "_tff"]);
      const t = await H.text("Fit me into the box please", {
        aw: false,
        ah: false,
        w: 100,
        h: 40,
        afs: true,
      });
      out.afs = {
        fontSize: t.getProperty("_tfi"),
        boxes: H.boxes(t),
        runSizes: JSON.parse(t.getProperty("content")).map((r: { fontSize: number }) => r.fontSize),
      };
      t.adaptFontSizeToFitBBox();
      await H.fonts(t);
      out.adapted = {
        fontSize: t.getProperty("_tfi"),
        runSizes: JSON.parse(t.getProperty("content")).map((r: { fontSize: number }) => r.fontSize),
        boxes: H.boxes(t),
      };
      // Switching auto width off keeps the measured width; on again re-measures.
      const u = await H.text("Auto width text");
      out.autoWidth = { w: u.getProperty("w"), boxes: H.boxes(u) };
      u.setProperty("aw", false);
      u.setProperty("w", 50);
      await H.fonts(u);
      out.fixedWidth = { w: u.getProperty("w"), boxes: H.boxes(u), outline: H.outline(u).sumX };
      u.setProperty("aw", true);
      await H.fonts(u);
      out.autoAgain = { w: u.getProperty("w"), boxes: H.boxes(u) };
      out.maxLength = H.G.GText.MAXLENGTH;
      const long = await H.text("x".repeat(9000));
      out.truncated = long.getPlainText().length;
      return out;
    }),
  },
  {
    id: "engine-model/text/text-on-path",
    covers: ["ENG-TEXT-012", "ENG-SCENE-008", "ENG-SER-008"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const variants: Record<string, Record<string, unknown>> = {
        default: {},
        offset: { tptho: 10 },
        inside: { tpths: 1 },
        inwards: { tpthd: 1 },
        distance: { tpthl: 40 },
      };
      for (const [k, props] of Object.entries(variants)) {
        const e = H.add(H.ellipse(0, 0, 200, 200));
        const t = await H.text("Around the circle we go");
        t.attachPath(e);
        H.setAll(t, props);
        await H.fonts(t);
        const blob = H.blob(t);
        out[k] = {
          attached: t.hasPathAttached(),
          boxes: H.boxes(t),
          outline: H.outline(t),
          props: H.props(t, ["tpthd", "tptho", "tpths", "tpthl"]),
          atPath: blob.atPath ? JSON.parse(blob.atPath)["@"] : null,
          hasRefId: "#" in blob,
          pathLinked: H.app.scene().isLinked(e),
        };
      }
      // Moving the path moves the text.
      const p = H.add(H.ellipse(0, 0, 100, 100));
      const t = await H.text("Moving");
      t.attachPath(p);
      await H.fonts(t);
      const before = H.r(t.getGeometryBBox());
      p.transform(H.T(1, 0, 0, 1, 50, 0));
      await H.fonts(t);
      out.follows = { before, after: H.r(t.getGeometryBBox()) };
      // A path with an attached text stores the text reference.
      const path = new G.GPath();
      for (const [x, y] of [
        [0, 100],
        [100, 0],
        [200, 100],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        path.getAnchorPoints().appendChild(ap);
      }
      H.add(path);
      const t2 = await H.text("On an open path");
      t2.attachPath(path);
      await H.fonts(t2);
      out.openPath = {
        boxes: H.boxes(t2),
        outline: H.outline(t2),
        pathHasText: path.hasReferencedText(),
        pathBlobKeys: Object.keys(H.blob(path)),
      };
      return out;
    }),
  },
  {
    id: "engine-model/text/convert-to-shapes",
    covers: ["ENG-TEXT-015", "ENG-TEXT-002"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const t = await H.text("Ab\nCd", { _tfi: 30 }, 10, 20);
      const shapes = t.getTextShapes() as unknown[];
      return {
        count: shapes.length,
        shapes: shapes.map((s) => ({
          name: G.GNode.getName(s),
          outline: H.outline(s),
          paths: H.attempt(() => H.kids((s as { getPaths(): unknown }).getPaths())),
          boxes: H.boxes(s),
          fills: H.attempt(() =>
            (s as { getPaintLayers(): { getLayers(): { getProperty(n: string): unknown }[] } })
              .getPaintLayers()
              .getLayers()
              .map((l) => H.v(l.getProperty("_pt"))),
          ),
        })),
        hasEmbeddedFonts: t.hasEmbeddedFonts(),
        isFakeText: t.isFakeText(),
        dontStorePaths: G.GText.dontStorePaths,
        bkpPathInBlob: "_bkpPath" in H.blob(t),
      };
    }),
  },
  {
    id: "engine-model/text/serialize-restore",
    covers: ["ENG-TEXT-016", "ENG-SER-018", "ENG-SER-002"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const t = await H.text([
        { text: "Red ", fontFamily: "Open Sans", fontColor: H.rgb(255, 0, 0) },
        { text: "bold", fontFamily: "Open Sans", fontWeight: 700 },
      ]);
      H.fill(t, H.rgb(0, 0, 255));
      const json = H.ser(t);
      const blob = JSON.parse(json);
      const back = G.GNode.deserialize(json);
      H.add(back);
      await H.fonts(back);
      return {
        original: H.stable(t),
        ctIsArray: Array.isArray(blob.ct),
        contentIsString: typeof blob.content,
        hasReferenceId: typeof blob["#"],
        restored: H.stable(back),
        sameOutline: JSON.stringify(H.outline(back)) === JSON.stringify(H.outline(t)),
        restoredBoxes: H.boxes(back),
        plain: back.getPlainText(),
      };
    }),
  },
  {
    id: "engine-model/text/legacy-text-migration",
    covers: ["ENG-SER-014", "ENG-FONT-001"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const legacy = {
        "@": "text",
        tlx: 10,
        tly: 20,
        trx: 110,
        try: 20,
        blx: 10,
        bry: 60,
        aw: false,
        _tff: "Open Sans",
        _tfi: 24,
        ct: {
          "@": "txContent",
          $: [
            {
              "@": "txPara",
              $: [
                { "@": "txChr", cnt: "Hello " },
                { "@": "txChr", _tfw: 700, cnt: "bold" },
              ],
            },
            { "@": "txBrk" },
            { "@": "txPara", _tfs: "I", cnt: "World" },
          ],
        },
      };
      const n = G.GNode.deserialize(JSON.stringify(legacy));
      H.add(n);
      await H.fonts(n);
      // Default black fill stored as the old flat key is dropped on load.
      const withFpt = G.GNode.deserialize(
        JSON.stringify({
          "@": "text",
          _fpt: "C#[0,0,0]",
          ct: [{ text: "x" }],
          content: '[{"text":"x"}]',
        }),
      );
      const withRedFpt = G.GNode.deserialize(
        JSON.stringify({
          "@": "text",
          _fpt: "C#[255,0,0]",
          ct: [{ text: "x" }],
          content: '[{"text":"x"}]',
        }),
      );
      H.add(withFpt, withRedFpt);
      await H.fonts(withFpt, withRedFpt);
      return {
        runs: JSON.parse(n.getProperty("content")),
        plain: n.getPlainText(),
        props: H.props(n, ["trf", "w", "h", "aw", "ah"]),
        boxes: H.boxes(n),
        blob: H.stable(n),
        blackFpt: H.stable(withFpt),
        redFpt: H.stable(withRedFpt),
        familyCorrected: [
          G.GFont.getFontFamilyCorrected("Noto Sans CS"),
          G.GFont.getFontFamilyCorrected("Noto Sans CT"),
          G.GFont.getFontFamilyCorrected("Open Sans"),
        ],
      };
    }),
  },
  {
    id: "engine-model/text/font-api",
    covers: ["ENG-FONT-001", "ENG-FONT-002", "ENG-FONT-003", "ENG-FONT-005", "ENG-TEXT-017"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      await H.warmText();
      const G = H.G;
      const fm = H.app.scene().getWorkspace().getFontManager();
      const t = new G.GText();
      H.insert(t);
      t.setText("x");
      t.setProperties(["_tfw", "_tfs"], [600, "N"]);
      await H.fonts(t);
      const font = fm.getFont("Open Sans", "N", 600);
      const regular = fm.getFont("Open Sans", "N", 400);
      const glyphs = (f: typeof font) => ({
        family: [f.getFamily(), f.getStyle(), f.getWeight()],
        resolved: f.isResolved(),
        embedded: f.isEmbedded(),
        failed: f.isFailed(),
        baseline20: f.getGlyphBaseline(20),
        maxHeight20: f.getMaxFontHeight(20),
        advanceA: f.getAdvance(20, "A"),
        advanceVKern: f.getAdvance(20, "A", "V"),
        lsbA: f.getLeftSideBearing(20, "A"),
        bboxA: H.r(f.getGlyphBoundingRect(20, "A")),
        bboxAExact: H.r(f.getGlyphBoundingRect(20, "A", true)),
        outlineA: H.verts(f.getGlyphOutline(20, 0, 0, "A")),
        unicodeA: f.getUnicode("A"),
        strikeout: [f.getStrikeoutPosition(20, 10, 1, 20), f.getStrikeoutWidth(20)],
        features: Object.fromEntries(
          Object.entries(G.GFont.Features as Record<string, string>).map(([k, v]) => [
            k,
            H.attempt(() => f.hasFeature(v)),
          ]),
        ),
        stylisticSets: H.attempt(() => f.getAvailableStylisticSets()),
        languageTags: H.attempt(() => f.getAvailableLanguageSystemTags()),
        scripts: H.attempt(() => f.getAvailableScripts()),
        variants: H.attempt(() => f.getAvailableVariants()),
        css: H.attempt(() => f.toCssProperties()),
      });
      const placeholder = G.GText.DEFAULTFONT;
      return {
        defaultFont: [
          fm.getDefaultFont().getFamily(),
          fm.getDefaultFont().getStyle(),
          fm.getDefaultFont().getWeight(),
        ],
        defaultStyles: fm.getDefaultFontStyles(),
        defaultWeights: fm.getDefaultFontWeights(),
        semiBold: glyphs(font),
        regular: glyphs(regular),
        placeholder: placeholder
          ? [
              placeholder.getFamily(),
              placeholder.getStyle(),
              placeholder.getWeight(),
              placeholder.isResolved(),
            ]
          : null,
        weightNames: G.GFont.WeightName ? Object.keys(G.GFont.WeightName) : null,
        weightNamesItalic: G.GFont.WeightNameItalic ? Object.keys(G.GFont.WeightNameItalic) : null,
        smallCapsMap: G.GFont.SmallCapsUnicodeMap
          ? Object.keys(G.GFont.SmallCapsUnicodeMap).length
          : null,
        equals: [G.GFont.equals(font, font), G.GFont.equals(font, regular)],
        unresolved: fm.hasUnresolvedFonts(),
        pending: fm.hasPendingFonts(),
      };
    }),
  },
  {
    id: "engine-model/text/font-events",
    covers: ["ENG-EVENT-012", "ENG-FONT-002"],
    kind: "json",
    // A font no other scenario loads (Open Sans ExtraBold Italic), so the
    // events fire in this test even on a shared page.
    inPage: withHelpers(async (_p, _a, H) => {
      await H.warmText();
      const G = H.G;
      const fm = H.app.scene().getWorkspace().getFontManager();
      const events: unknown[] = [];
      const FM = G.GFontManager;
      const on = (cls: unknown, label: string) =>
        fm.addEventListener(
          cls,
          (e: { font?: { getFamily(): string; getWeight(): number; getStyle(): string } }) =>
            events.push([
              label,
              e.font ? [e.font.getFamily(), e.font.getStyle(), e.font.getWeight()] : null,
            ]),
        );
      on(FM.FontAvailableEvent, "available");
      on(FM.FontUnavailableEvent, "unavailable");
      on(FM.ResolveFontEvent, "resolve");
      const t = new G.GText();
      H.insert(t);
      t.setText("xb");
      t.setProperties(["_tfw", "_tfs"], [800, "I"]);
      const pendingRightAway = [fm.hasPendingFonts(), !!t.hasFontsToResolve()];
      await H.fonts(t);
      return {
        pendingRightAway,
        events,
        resolved: fm.getFont("Open Sans", "I", 800).isResolved(),
        boxes: H.boxes(t),
      };
    }),
  },
  {
    id: "engine-model/text/render",
    covers: ["ENG-TEXT-008", "ENG-TEXT-009", "ENG-TEXT-011"],
    kind: "png",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      const texts = [
        await H.text("Regular text", {}, 0, 0),
        await H.text("Underlined & struck", { _tdu: true, _tds: true }, 0, 30),
        await H.text(
          [
            {
              text: "item one\nitem two",
              fontFamily: "Open Sans",
              listMarker: "Bullet",
              listDepth: 1,
            },
          ],
          {},
          0,
          60,
        ),
        await H.text("Red bold", { _tfw: 700, _fc: H.rgb(255, 0, 0) }, 0, 120),
      ];
      for (const t of texts) {
        t.getParent().removeChild(t);
        g.appendChild(t);
      }
      H.add(g);
      await H.fonts(...texts);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
]);

paritySuite("engine-model text", scenarios, { newApp: false });
