// Test support: drives GScene and GPage through the link bookkeeping, the
// restore-time link repair, master page assignment, the multi-page hit
// test and collisions, page painting into a recording canvas, thumbnails
// and the VisualProperties leak, and returns plain data. The same function
// runs in the old app's page against the old engine (to record
// __fixtures__/old-scene.json; the TypeScript types are stripped first)
// and against the port in scene-probe.test.ts, so it may only use what it
// is given and no imports.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface SceneProbeApi {
  /** The engine namespace under the old names (GScene, GPage, ...). */
  G: any;
  /** GReferenceEvent (not in the old G barrel). */
  ReferenceEvent: any;
}

export function probeScene(api: SceneProbeApi): Record<string, unknown> {
  const G = api.G;
  const out: Record<string, unknown> = {};

  const attempt = (fn: () => unknown): unknown => {
    try {
      return fn();
    } catch (error) {
      // The class only: messages name minified locals in the old engine.
      return { threw: (error as Error).constructor.name };
    }
  };
  const rect = (x: number, y: number, w: number, h: number) => {
    const r = new G.GRectangle();
    r.setProperty("trf", new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
    return r;
  };
  const box = (b: any) => (b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null);
  const trf = (t: any) => (t ? G.GTransform.serialize(t) : null);

  // Random ids become the names of the nodes that own them.
  const named: [any, string][] = [];
  const tag = <T>(node: T, name: string): T => {
    named.push([node, name]);
    return node;
  };
  const label = (id: unknown): string => {
    for (const [node, name] of named) {
      if (node._referenceId === id) return name + "#";
      if (typeof node.getSceneId === "function" && node.getSceneId() === id) return name;
    }
    if (id === "missing" || id === "nope") return String(id);
    return "?" + typeof id;
  };
  const links = (map: any) => {
    if (!map) return map === undefined ? "undefined" : map;
    const result: Record<string, unknown> = {};
    for (const id of Object.keys(map)) {
      result[label(id)] = Array.isArray(map[id])
        ? map[id].map((entry: any) =>
            typeof entry === "string" ? label(entry) : entry ? label(entry.getSceneId()) : entry,
          )
        : map[id];
    }
    return result;
  };
  const state = (s: any) => ({
    links: links(s.$_links),
    lookup: links(s._linksLookup),
    disabled: links(s._temporarilyDisabledLinks),
    sane: s._linksAreSane,
  });
  const listen = (node: any, log: unknown[]) => {
    node.addEventListener(api.ReferenceEvent, (event: any) => {
      log.push([label(event.reference && event.reference._referenceId), event.linked]);
    });
  };

  // -- Link bookkeeping: ReferenceEvents from _refreshLinks, links of
  // removed nodes set aside and merged back, block reference mode.
  out.refresh = attempt(() => {
    const s = new G.GScene(new G.GWorkspace());
    const a = tag(new G.GText(), "A");
    s.appendChild(a);
    const b = tag(rect(0, 0, 10, 10), "B");
    const c = tag(rect(20, 0, 10, 10), "C");
    s.appendChild(b);
    s.appendChild(c);
    const log: unknown[] = [];
    listen(b, log);
    listen(c, log);
    const steps: Record<string, unknown> = {};
    s.link(a, b);
    steps.link = { events: log.slice(), ...state(s) };
    s._refreshLinks();
    steps.refresh = { events: log.slice(), ...state(s) };
    s.link(a, c);
    s.unlink(a, b);
    steps.unlink = { events: log.slice(), ...state(s) };
    s._refreshLinks();
    steps.refresh2 = { events: log.slice(), ...state(s), refsB: links({ x: b.$refs }) };
    // A linked node leaves the scene: its scene id is set aside, then
    // merged back once it is in the scene again.
    const page = c.getParent();
    page.removeChild(c);
    s._refreshLinks();
    steps.removed = { events: log.slice(), ...state(s) };
    page.appendChild(c);
    s._refreshLinks();
    steps.reinserted = { events: log.slice(), ...state(s), linkCount: s.linkCount(a) };
    // unlink of a set-aside link edits only the copy.
    page.removeChild(c);
    s._refreshLinks();
    s.unlink(a, c);
    steps.unlinkDisabled = state(s);
    return steps;
  });

  out.block = attempt(() => {
    const s = new G.GScene(new G.GWorkspace());
    const a = tag(new G.GText(), "BA");
    s.appendChild(a);
    const b = tag(rect(0, 0, 10, 10), "BB");
    const d = tag(rect(0, 0, 10, 10), "BD");
    s.appendChild(b);
    s.appendChild(d);
    s.link(a, b);
    s._refreshLinks();
    const steps: Record<string, unknown> = {};
    s.startBlockReferenceChanges();
    s.link(a, d);
    s.unlink(a, b);
    steps.blocked = { ...state(s), rb: s.getProperty("rb") };
    // Set aside a link while blocked, then end keeping the disabled links.
    b.getParent().removeChild(b);
    s.endBlockReferenceChanges(true);
    steps.endKeep = state(s);
    s._refreshLinks();
    steps.keep = state(s);
    // The node comes back: the set-aside link is merged into _links again.
    s.getActivePage().appendChild(b);
    s._refreshLinks();
    steps.keepReinserted = state(s);
    s.startBlockReferenceChanges();
    s.endBlockReferenceChanges();
    steps.ended = { ...state(s), rb: s.getProperty("rb") };
    s.link(a, d);
    steps.after = state(s);
    return steps;
  });

  // -- Restore-time repair (_recreateLinksLookup).
  // As GDocument opens a file: GNode.deserializeAsync(json, workspace)
  // makes the scene with the workspace and restores into it.
  const restoreInto = (workspace: any, blob: any) => G.GNode.restore(blob, workspace);
  const findAll = (s: any, name: string) => {
    const found: any[] = [];
    s.acceptChildren((node: any) => {
      if (G.GNode.getName(node) === name) found.push(node);
    });
    return found;
  };

  // A page is the reference: its id is registered with the workspace and
  // saved with it ("#"), and the link is not a style link.
  const pageLinkScene = (workspace: any, prefix: string) => {
    const s = new G.GScene(workspace);
    tag(s.getActivePage(), prefix + "P1");
    const reference = tag(s.insertPage(), prefix + "P2");
    const target = tag(rect(0, 0, 10, 10), prefix + "B");
    s.appendChild(target);
    s.link(reference, target);
    return { s, reference, target };
  };
  const tagPageCopy = (copy: any, prefix: string) => {
    const pages = findAll(copy, "page");
    return {
      first: tag(pages[0], prefix + "P1"),
      reference: tag(pages[1], prefix + "P2"),
      target: tag(findAll(copy, "rectangle")[0], prefix + "B"),
    };
  };

  out.reidentified = attempt(() => {
    const workspace = new G.GWorkspace();
    const { s, reference } = pageLinkScene(workspace, "R");
    const json = G.GNode.serialize(s);
    // The same document again in the same workspace: the page ids are taken.
    const copy = restoreInto(workspace, JSON.parse(json));
    const restored = tagPageCopy(copy, "R2");
    const fresh = restoreInto(new G.GWorkspace(), JSON.parse(json));
    const freshNodes = tagPageCopy(fresh, "R3");
    return {
      oldId: label(restored.reference.getOldReferenceId()),
      newIdDiffers: restored.reference.getReferenceId() !== reference.getReferenceId(),
      ...state(copy),
      linked: copy.isLinked(restored.target, restored.reference),
      // Into a fresh workspace nothing is re-identified.
      fresh: {
        oldId: freshNodes.reference.getOldReferenceId(),
        ...state(fresh),
        linked: fresh.isLinked(freshNodes.target, freshNodes.reference),
      },
    };
  });

  // A path that names texts in `rtxt` (an old file) is linked to them.
  const rtxtScene = (withOtherLink: boolean) => {
    const prefix = withOtherLink ? "T2" : "T";
    const s = withOtherLink
      ? pageLinkScene(new G.GWorkspace(), prefix).s
      : new G.GScene(new G.GWorkspace());
    s.appendChild(new G.GText());
    s.appendChild(new G.GPath());
    const blob = JSON.parse(G.GNode.serialize(s));
    // The text's saved id goes into the path's rtxt list.
    const nodes: any[] = [];
    const visit = (node: any) => {
      nodes.push(node);
      (node.$ || []).forEach(visit);
    };
    visit(blob);
    const textBlob = nodes.filter((node) => node["@"] === "text")[0];
    nodes.filter((node) => node["@"] === "path")[0].rtxt = [textBlob["#"]];
    return attempt(() => {
      const copy = restoreInto(new G.GWorkspace(), blob);
      if (withOtherLink) tagPageCopy(copy, prefix + "b");
      const path = tag(findAll(copy, "path")[0], prefix + "Pb");
      const text = tag(findAll(copy, "text")[0], prefix + "Tb");
      return {
        ...state(copy),
        textId: text.getReferenceId() === textBlob["#"],
        rtxtLeft: path.$rtxt === undefined ? "deleted" : "kept",
      };
    });
  };
  out.rtxt = attempt(() => rtxtScene(false));
  out.rtxtWithLink = attempt(() => rtxtScene(true));

  out.styleRefs = attempt(() => {
    const workspace = new G.GWorkspace();
    const s = new G.GScene(workspace);
    const style = tag(new G.GStyle(), "ST");
    s.getStyles().appendChild(style);
    const a = tag(rect(0, 0, 10, 10), "SA");
    s.appendChild(a);
    a.setProperty("sref", style.getReferenceId());
    const blob = JSON.parse(G.GNode.serialize(s));
    // Again into the same workspace: the style gets a new id and the
    // element's sref is rewritten from the old one.
    const copy = restoreInto(workspace, blob);
    const styles = copy.getStyles().getChildren();
    const style2 = tag(styles[styles.length - 1], "ST2");
    const a2 = tag(findAll(copy, "rectangle")[0], "SA2");
    return {
      oldId: label(style2.getOldReferenceId()),
      sref: label(a2.getProperty("sref")),
      linkCount: copy.linkCount(style2),
      ...state(copy),
    };
  });

  out.badLinks = attempt(() => {
    const { s, reference } = pageLinkScene(new G.GWorkspace(), "X");
    const blob = JSON.parse(G.GNode.serialize(s));
    const id = reference.getReferenceId();
    // A scene id nobody has, and a reference id nothing is registered under.
    blob._links[id] = blob._links[id].concat(["missing"]);
    blob._links["nope"] = [blob._links[id][0]];
    const copy = restoreInto(new G.GWorkspace(), blob);
    tagPageCopy(copy, "X2");
    return state(copy);
  });

  // -- Master pages: odd/even assignment on insert and removal.
  out.masters = attempt(() => {
    const s = new G.GScene(new G.GWorkspace());
    const first = tag(s.getActivePage(), "P1");
    first.setProperties(["w", "h"], [100, 100]);
    const master = (name: string, w: number, h: number) => {
      const page = tag(new G.GPage(), name);
      page.setProperties(["name", "w", "h"], [name, w, h]);
      return page;
    };
    const odd = master("ODD", 300, 200);
    const even = master("EVEN", 400, 250);
    const single = master("ALL", 500, 260);
    const pages = [first];
    const describe = () =>
      pages.map((page) => ({
        name: label(page.getSceneId()),
        inScene: page.getParent() === s,
        masters: [odd, even, single]
          .filter((m) => s.isLinked(page, m))
          .map((m) => label(m.getSceneId())),
        size: [page.getProperty("w"), page.getProperty("h")],
      }));
    const steps: Record<string, unknown> = {};
    s.setProperty("mpg", single);
    pages.push(tag(s.insertPage(), "P2"));
    steps.single = describe();
    s.setProperties(["ompg", "empg"], [odd, even]);
    pages.push(tag(s.insertPage(), "P3"));
    pages.push(tag(s.insertPage(), "P4"));
    steps.evenOdd = describe();
    s.removeChild(first);
    steps.removedFirst = describe();
    // A page locked against edits keeps its master on reassignment.
    const locked = pages[2];
    locked.setProperty("plkt", G.GBlock.ProgramLck.NoEdit);
    s.insertChild(first, pages[1]);
    steps.lockedKept = describe();
    s.setProperty("empg", null);
    s.reassignMasterPages();
    steps.noEven = describe();
    return steps;
  });

  // -- Multi-page hit test and collisions: two fixed pages side by side.
  const twoPages = () => {
    const s = new G.GScene(new G.GWorkspace());
    const left = tag(s.getActivePage(), "HL");
    left.setProperties(["w", "h", "off"], [100, 100, new G.GTransform(1, 0, 0, 1, 0, 0)]);
    const right = tag(s.insertPage(), "HR");
    right.setProperties(["w", "h", "off"], [100, 100, new G.GTransform(1, 0, 0, 1, 200, 0)]);
    const inLeft = tag(rect(10, 10, 20, 20), "HLR");
    left.appendChild(inLeft);
    const inRight = tag(rect(10, 10, 20, 20), "HRR");
    right.appendChild(inRight);
    return { s, left, right };
  };
  const hits = (result: any) =>
    result
      ? result.map((hit: any) =>
          hit && hit.element
            ? { element: label(hit.element.getSceneId()), type: hit.data ? hit.data.type : null }
            : hit instanceof G.GNode
              ? { node: label(hit.getSceneId()) }
              : String(hit),
        )
      : result;
  out.multiPage = attempt(() => {
    const { s, left, right } = twoPages();
    const at = (x: number, y: number, multi: boolean, tolerance = 0, filter: unknown = null) =>
      attempt(() =>
        hits(
          s.hitTest(
            new G.GPoint(x, y),
            null,
            null,
            false,
            -1,
            tolerance,
            false,
            filter,
            null,
            false,
            multi,
            false,
          ),
        ),
      );
    const collide = (x: number, y: number, w: number, h: number, flags: number) =>
      attempt(() =>
        s
          .getCollisions(rect(x, y, w, h), flags, null, null, null, true, false)
          .map((element: any) => label(element.getSceneId())),
      );
    const result: Record<string, unknown> = {
      positions: [left, right].map((page: any) => {
        const p = page.getPosition(true);
        return [p.getX(), p.getY()];
      }),
      sceneBox: box(s.getPaintBBox(true)),
      single: at(220, 20, false),
      rightElement: at(220, 20, true),
      leftElement: at(20, 20, true),
      rightEdge: at(210, 20, true, 2),
      leftEdge: at(10, 20, true, 2),
      nothingHit: at(20, 20, true, 0, () => false),
      emptyRight: at(280, 80, true),
      outside: at(150, 50, true),
      collisionsBoth: collide(0, 0, 300, 100, G.GElement.CollisionFlag.GeometryBBox),
      collisionsRight: collide(205, 5, 30, 30, G.GElement.CollisionFlag.GeometryBBox),
      collisionsPaint: collide(0, 0, 300, 100, G.GElement.CollisionFlag.PaintBBox),
      annotations: attempt(
        () => s.getCollisions(rect(0, 0, 300, 100), 0, null, null, null, true, true).length,
      ),
    };
    const overlap = G.GSceneOptions.pagesCanOverlap;
    G.GSceneOptions.pagesCanOverlap = true;
    try {
      s.setActivePage(right);
      result.overlapRight = at(220, 20, true);
      result.overlapEmpty = at(280, 80, true);
      result.overlapOutside = at(150, 50, true, 4);
      // Move the right page over the left one: the active page wins.
      right.setProperty("off", new G.GTransform(1, 0, 0, 1, 0, 0));
      result.overlapStacked = at(20, 20, true);
      result.overlapStackedEdge = at(10, 20, true, 2);
      s.setActivePage(left);
      result.overlapStackedLeft = at(20, 20, true);
      result.overlapStackedLeftEdge = at(10, 20, true, 2);
      // Nothing inside a page is hit: the first candidate page comes back
      // as it is (a page, not a hit).
      result.overlapNothingHit = at(20, 20, true, 0, () => false);
    } finally {
      G.GSceneOptions.pagesCanOverlap = overlap;
    }
    return result;
  });

  // -- Painting: a recording canvas stands in for GPaintCanvas.
  const recorder = (clip: boolean) => {
    const log: unknown[] = [];
    let transform = new G.GTransform(2, 0, 0, 2, 10, 20);
    let origin = new G.GPoint(0, 0);
    const context2d: Record<string, unknown> = {};
    const shadow = new Proxy(context2d, {
      set(target, key, value) {
        log.push(["ctx." + String(key), value]);
        target[key as string] = value;
        return true;
      },
    });
    const value = (x: any): any => {
      if (x === null || x === undefined) return x;
      if (typeof x === "number" || typeof x === "string" || typeof x === "boolean") return x;
      if (Array.isArray(x)) return x.map(value);
      if (x instanceof G.GTransform) return { trf: trf(x) };
      if (x instanceof G.GRect) return { rect: box(x) };
      if (x instanceof G.GPoint) return { point: [x.getX(), x.getY()] };
      if (x instanceof G.GPattern) return { pattern: G.GPattern.serialize(x) };
      return typeof x;
    };
    const canvas = {
      _canvasContext: shadow,
      resetTransform() {
        log.push(["resetTransform"]);
        const previous = transform;
        transform = new G.GTransform();
        return previous;
      },
      setTransform(next: any) {
        log.push(["setTransform", value(next)]);
        const previous = transform;
        transform = next;
        return previous;
      },
      getTransform(local: unknown) {
        log.push(["getTransform", local]);
        return transform;
      },
      getOrigin() {
        return origin;
      },
      setOrigin(next: any) {
        log.push(["setOrigin", value(next)]);
        origin = next;
      },
      getScale() {
        return 2;
      },
      hasClip() {
        return clip;
      },
      createPatternPaint(pattern: any, area: any, textureTransform: any) {
        log.push(["createPatternPaint", value(pattern), value(area), value(textureTransform)]);
        // A gradient gets a paint transform, like the real canvas gives it.
        return pattern instanceof G.GGradient
          ? { paint: "gradient", transform: new G.GTransform(3, 0, 0, 3, 1, 1) }
          : { paint: "solid", transform: null };
      },
      fillRect(...args: unknown[]) {
        log.push(["fillRect", ...value(args)]);
      },
      strokeRect(...args: unknown[]) {
        log.push(["strokeRect", ...value(args)]);
      },
      clipRect(...args: unknown[]) {
        log.push(["clipRect", ...value(args)]);
      },
      resetClip() {
        log.push(["resetClip"]);
      },
      putVertices(points: unknown, closed: unknown) {
        log.push(["putVertices", value(points), closed]);
      },
      fillVertices(...args: unknown[]) {
        log.push(["fillVertices", ...value(args)]);
      },
    };
    return { canvas, log };
  };
  const paintPage = (
    page: any,
    options: {
      clip?: boolean;
      multiPageView?: boolean;
      clipToPage?: boolean;
      outline?: boolean;
      decoration?: unknown;
      overlap?: boolean;
    },
  ) =>
    attempt(() => {
      const { canvas, log } = recorder(!!options.clip);
      const context = new G.GPaintContext();
      context.canvas = canvas;
      const configuration = new G.GScenePaintConfiguration();
      configuration.sceneBackground = true;
      configuration.multiPageView = !!options.multiPageView;
      if (options.decoration) configuration.pageDecoration = options.decoration;
      configuration.isClipToPage = () => !!options.clipToPage;
      configuration.isOutline = () => !!options.outline;
      context.configuration = configuration;
      // Children are not painted here; their own paint is tested elsewhere.
      const paintChildren = page._paintChildren;
      page._paintChildren = () => {
        log.push(["paintChildren", label(page.getSceneId())]);
      };
      const overlap = G.GSceneOptions.pagesCanOverlap;
      G.GSceneOptions.pagesCanOverlap = !!options.overlap;
      try {
        page._paint(context);
      } finally {
        G.GSceneOptions.pagesCanOverlap = overlap;
        page._paintChildren = paintChildren;
      }
      return log;
    });
  out.paint = attempt(() => {
    const s = new G.GScene(new G.GWorkspace());
    const page = tag(s.getActivePage(), "PP");
    page.setProperties(["w", "h", "x", "y", "bl"], [80, 60, 5, 7, 3]);
    const result: Record<string, unknown> = {};
    page.setProperties(["bck", "bop"], [new G.GRGBColor([255, 0, 0]), 0.5]);
    result.colorNoContent = paintPage(page, { clip: true, clipToPage: true });
    page.appendChild(tag(rect(0, 0, 10, 10), "PPR"));
    result.colorClip = paintPage(page, { clip: true, clipToPage: true });
    result.colorNoClipToPage = paintPage(page, { clip: true });
    result.outline = paintPage(page, { clip: true, outline: true });
    result.multiPage = paintPage(page, { clip: true, clipToPage: true, multiPageView: true });
    // The page shadow reads pageDecoration, which only the editor's
    // configuration has: without it this throws.
    result.overlapNoDecoration = paintPage(page, { multiPageView: true, overlap: true });
    result.overlapShadow = paintPage(page, {
      multiPageView: true,
      overlap: true,
      decoration: { shadow: 4, shadowOffsetY: 2, shadowBackground: "rgba(0,0,0,0.25)" },
    });
    const gradient = new G.GLinearGradient([
      { position: 0, color: new G.GRGBColor([0, 0, 0]), opacity: 1 },
      { position: 1, color: new G.GRGBColor([255, 255, 255]), opacity: 1 },
    ]);
    page.setProperty("bck", gradient);
    result.gradient = paintPage(page, {});
    // An infinite page fills its paint box, with colors only.
    page.setProperties(["w", "h"], [0, 0]);
    result.infiniteGradient = paintPage(page, {});
    page.setProperty("bck", new G.GRGBColor([0, 0, 255]));
    result.infiniteColor = paintPage(page, {});
    page.setProperties(["w", "h"], [80, 60]);
    // A page linked to a master: the master's background and children
    // are painted under the page, clipped to the bleed or the master box.
    const master = tag(new G.GPage(), "PM");
    master.setProperties(["w", "h", "bck", "bop"], [40, 30, new G.GRGBColor([0, 255, 0]), 0.75]);
    s.setProperty("mpg", master);
    s.link(master, page);
    const masterPaint = master._paintChildren;
    master._paintChildren = () => {
      // The recorder of the current paint is not reachable here; mark it on the page.
      page.__masterPainted = (page.__masterPainted || 0) + 1;
    };
    try {
      result.masterClipToPage = paintPage(page, { clip: true, clipToPage: true });
      result.masterClipToMaster = paintPage(page, { clip: true });
      result.masterNoClip = paintPage(page, {});
      page.setProperty("cdr", true, true);
      result.masterHidden = paintPage(page, { clip: true });
      result.masterPainted = page.__masterPainted;
    } finally {
      master._paintChildren = masterPaint;
    }
    return result;
  });

  // The multi-page view paints every page in the dirty area at its
  // position; the dirty matcher is moved from page to page.
  out.paintPages = attempt(() => {
    const { s, left, right } = twoPages();
    const third = tag(s.insertPage(), "H3");
    third.setProperties(["w", "h", "off"], [50, 50, new G.GTransform(1, 0, 0, 1, 50, 300)]);
    const run = (overlap: boolean) => {
      const { canvas, log } = recorder(false);
      const context = new G.GPaintContext();
      context.canvas = canvas;
      const configuration = new G.GScenePaintConfiguration();
      configuration.multiPageView = true;
      context.configuration = configuration;
      context.dirtyMatcher = {
        getDirtyArea: () => new G.GRect(-10, -10, 400, 400),
        transform: (t: any) => log.push(["dirty", trf(t)]),
      };
      const pages = [left, right, third];
      const saved = pages.map((page: any) => page.paint);
      pages.forEach((page: any) => {
        page.paint = () => log.push(["paint", label(page.getSceneId())]);
      });
      const previous = G.GSceneOptions.pagesCanOverlap;
      G.GSceneOptions.pagesCanOverlap = overlap;
      try {
        s._paintChildren(context);
      } finally {
        G.GSceneOptions.pagesCanOverlap = previous;
        pages.forEach((page: any, i: number) => {
          page.paint = saved[i];
        });
      }
      return log;
    };
    s.setActivePage(left);
    const result: Record<string, unknown> = { inOrder: attempt(() => run(false)) };
    result.overlapActiveLast = attempt(() => run(true));
    s.setActivePage(right);
    result.overlapRightActive = attempt(() => run(true));
    return result;
  });

  out.thumbnail = attempt(() => {
    const s = new G.GScene(new G.GWorkspace());
    const page = s.getActivePage();
    page.setProperties(["w", "h"], [800, 600]);
    const sizes: unknown[] = [];
    const run = (w: number, h: number) =>
      attempt(() => {
        let image: any = "no callback";
        const returned = page._getPageThumbnail(w, h, (canvas: any) => {
          image = canvas ? [canvas.getWidth(), canvas.getHeight(), canvas.getScale()] : canvas;
        });
        return { returned: returned === undefined ? "undefined" : returned, image };
      });
    sizes.push(run(100, 100));
    sizes.push(run(100, 50));
    page.setProperties(["w", "h"], [0, 0]);
    sizes.push(run(100, 100));
    return sizes;
  });

  // -- Restoring a scene blob with page properties adds them to the shared
  // GScene.VisualProperties, so every later scene stores them too.
  out.visualLeak = attempt(() => {
    const keys = (withSize: boolean) =>
      attempt(() => {
        const s = new G.GScene(new G.GWorkspace());
        if (withSize) s.getActivePage().setProperties(["w", "bl", "h"], [300, 2, 200]);
        const blob = JSON.parse(G.GNode.serialize(s));
        return {
          stored: ["w", "bl", "h"].map((key) => (key in blob ? blob[key] : "absent")),
          ownFields: ["$w", "$bl", "$h"].filter((key) =>
            Object.prototype.hasOwnProperty.call(s, key),
          ),
        };
      });
    const inTable = () =>
      Object.keys(G.GScene.VisualProperties).filter((k) => ["w", "bl", "h"].indexOf(k) >= 0);
    const result: Record<string, unknown> = {
      tableBefore: inTable(),
      before: keys(false),
      beforeSized: keys(true),
    };
    result.restored = attempt(() => {
      const scene = G.GNode.restore({ "@": "scene", w: 300, bl: 2 }, new G.GWorkspace());
      const blob = JSON.parse(G.GNode.serialize(scene));
      return {
        read: [scene.getProperty("w"), scene.getProperty("bl")],
        stored: ["w", "bl", "h"].map((key) => (key in blob ? blob[key] : "absent")),
      };
    });
    result.table = inTable();
    result.after = keys(false);
    result.afterSized = keys(true);
    return result;
  });

  return out;
}
