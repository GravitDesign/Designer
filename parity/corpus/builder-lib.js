/* global window, document, setTimeout, requestAnimationFrame, Image */
// Helpers for the corpus builder (build.ts). Injected into the old app's
// page after old-harness.js and used by the build functions in
// documents.ts as `window.__cb`. Only the builder uses this file; the
// committed corpus files are the fixed spec, so the helpers may reach into
// the old app wherever its public API is not enough.
(() => {
  const { G, app } = window.__parity;
  const L = {};
  L.G = G;
  L.app = app;
  L.ed = () => app.editor();
  L.scene = () => app.scene();
  L.page = () => app.scene().getActivePage();

  // Colors and patterns
  L.rgb = (r, g, b) => new G.GRGBColor([r, g, b]);
  L.cmyk = (c, m, y, k) => new G.GCMYKColor([c, m, y, k]);
  L.hsv = (h, s, v) => new G.GHSVColor([h, s, v]);
  const color = (c) => (Array.isArray(c) ? L.rgb(c[0], c[1], c[2]) : c);
  L.stops = (list) =>
    list.map(([position, c, opacity]) => ({
      position,
      color: color(c),
      opacity: opacity === undefined ? 1 : opacity,
    }));
  L.linear = (stops, angle, scale, fx, fy) =>
    new G.GLinearGradient(L.stops(stops), scale, angle, fx, fy);
  L.radial = (stops, scale, cx, cy, fx, fy) =>
    new G.GRadialGradient(L.stops(stops), scale, fx, fy, cx, cy);
  L.angular = (stops, a0, scale) =>
    new G.GAngularGradient(L.stops(stops), scale, undefined, undefined, a0);
  L.texture = (url, setup) => {
    const t = new G.GTexturePattern(url);
    if (setup) setup(t);
    return t;
  };
  L.noise = (type, amount) => {
    const n = new G.GNoisePattern(amount === undefined ? 1 : amount);
    if (type) n.setType(type);
    return n;
  };
  L.background = () => new G.GBackground();

  // Element construction
  L.unitTrf = (x, y, w, h) => new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2);
  L.rect = (x, y, w, h, props) => {
    const r = new G.GRectangle();
    r.setProperty("trf", L.unitTrf(x, y, w, h));
    if (props) L.props(r, props);
    return r;
  };
  L.ellipse = (x, y, w, h, props) => {
    const e = new G.GEllipse();
    e.setProperty("trf", L.unitTrf(x, y, w, h));
    if (props) L.props(e, props);
    return e;
  };
  L.polygon = (cx, cy, radius, props) => {
    const p = new G.GPolygon();
    // A regular polygon as the polygon tool draws it: the inner vertices
    // sit halfway between the outer ones.
    const pts = (props && props.pts) || 6;
    p.setProperties(
      ["pts", "cx", "cy", "or", "ir", "oa", "ia"],
      [
        pts,
        cx,
        cy,
        radius,
        radius * Math.cos(Math.PI / pts),
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI / pts,
      ],
    );
    if (props) L.props(p, props);
    return p;
  };
  // points: [x, y] or {x, y, tp, hlx, hly, hrx, hry, ah, cl, cr}
  L.path = (points, closed, props) => {
    const p = new G.GPath();
    const aps = p.getAnchorPoints();
    for (const pt of points) {
      const ap = new G.GPathBase.AnchorPoint();
      const spec = Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt;
      ap.setProperties(Object.keys(spec), Object.values(spec));
      aps.appendChild(ap);
    }
    if (closed) p.setProperty("closed", true);
    if (props) L.props(p, props);
    return p;
  };
  L.text = (x, y, content, props, textProps) => {
    const t = new G.GText();
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    // The content first: element text styles (_tfi, _tff, ...) are applied
    // to the runs that exist when they are set.
    // Runs left without a family or color would use the run defaults
    // (no family, transparent), so they get the app defaults here.
    const runs = Array.isArray(content)
      ? content.map((r) => Object.assign({ fontFamily: "Open Sans", fontColor: L.rgb(0, 0, 0) }, r))
      : content;
    L.later(t, () => t.setText(runs));
    if (props) L.props(t, props);
    if (textProps) L.props(t, textProps);
    return t;
  };
  L.group = (children, props) => {
    const g = new G.GGroup();
    for (const c of children) g.appendChild(c);
    if (props) L.props(g, props);
    return g;
  };
  L.slice = (x, y, w, h, props) => {
    const s = new G.GSlice();
    s.setProperties(["x", "y", "w", "h"], [x, y, w, h]);
    if (props) L.props(s, props);
    return s;
  };
  L.image = (x, y, w, h, url, iw, ih, props) => {
    const i = new G.GImage();
    i.setProperties(["iw", "ih", "url"], [iw, ih, url]);
    const t = new G.GTransform(w / iw, 0, 0, h / ih, x, y);
    i.setProperties(["trf", "itrf"], [t, t]);
    if (props) L.props(i, props);
    return i;
  };
  L.readyShape = (name, x, y, w, h) => {
    const catalogue = app.require(1542);
    const def = catalogue.find((d) => d.name === name);
    if (!def) throw new Error("no ready shape " + name);
    const proc = new G.GParameterizedVertexProcessor(
      def.annotations ? def.annotations.name : null,
      def.annotations ? def.annotations.annotList : null,
      def.parameters,
      def.vertices,
    );
    const pts =
      def.annotations && def.annotations.annotList
        ? def.annotations.annotList.map((a) => new G.GPoint(a.x0, a.y0))
        : null;
    const s = new G.GSimpleShape(proc, pts, w, h, def.name);
    s.transform(new G.GTransform(1, 0, 0, 1, x, y));
    return s;
  };
  // withHandles: only shapes that have annotation handles. Saving a ready
  // shape without handles throws in GSimpleShape (store reads
  // _annotationsParamVals.length of null), so those cannot be in a file.
  L.readyShapeNames = (withHandles) =>
    app
      .require(1542)
      .filter(
        (d) =>
          !withHandles ||
          (d.annotations && d.annotations.annotList && d.annotations.annotList.length),
      )
      .map((d) => d.name);

  // Uniform corners: the same type and radii on all four corners.
  L.corners = (ct, sx, sy) => {
    const out = {};
    for (const c of ["tl", "tr", "br", "bl"]) {
      out[c + "_ct"] = ct;
      out[c + "_sx"] = sx;
      out[c + "_sy"] = sy === undefined ? sx : sy;
      if (sy !== undefined && sy !== sx) out[c + "_uf"] = false;
    }
    return out;
  };
  // Style-set properties of an element (keys starting with "_", like
  // _sbl, _stop, _tfi) are set after L.insert, since inserting applies the
  // default style and would reset them.
  L.props = (node, props) => {
    const now = {};
    const later = {};
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith("_") && node instanceof G.GElement && !(node.getScene && node.getScene()))
        later[k] = v;
      else now[k] = v;
    }
    if (Object.keys(now).length) node.setProperties(Object.keys(now), Object.values(now));
    if (Object.keys(later).length)
      L.later(node, () => node.setProperties(Object.keys(later), Object.values(later)));
    return node;
  };

  // Styles: replace all fill/border layers and effects.
  L.clearStyle = (el) => {
    const pl = el.getPaintLayers();
    while (pl.getFirstChild()) pl.removeChild(pl.getFirstChild());
    const fx = el.getEffects();
    while (fx.getFirstChild()) fx.removeChild(fx.getFirstChild());
    return el;
  };
  L.fill = (el, pattern, layerProps) => {
    const f = new G.GStylable.FillPaintLayer();
    f.setProperty("_pt", color(pattern));
    if (layerProps) L.props(f, layerProps);
    el.getPaintLayers().appendChild(f);
    return f;
  };
  L.border = (el, pattern, layerProps) => {
    const b = new G.GStylable.BorderPaintLayer();
    b.setProperty("_pt", color(pattern));
    if (layerProps) L.props(b, layerProps);
    el.getPaintLayers().appendChild(b);
    return b;
  };
  // Runs fn(el) now when el is in a scene, otherwise right after L.insert
  // put it there: inserting applies the app default style (the style last
  // used for that type), which would replace a style set before.
  L.later = (el, fn) => {
    if (el.getScene && el.getScene()) fn(el);
    else (el.__after || (el.__after = [])).push(fn);
    return el;
  };
  L.style = (el, fills, borders) =>
    L.later(el, () => {
      L.clearStyle(el);
      for (const f of fills || []) {
        if (Array.isArray(f) && f.length === 2 && typeof f[1] === "object" && !Array.isArray(f[1]))
          L.fill(el, f[0], f[1]);
        else L.fill(el, f);
      }
      for (const b of borders || []) {
        if (Array.isArray(b) && b.length === 2 && typeof b[1] === "object" && !Array.isArray(b[1]))
          L.border(el, b[0], b[1]);
        else L.border(el, b);
      }
    });
  // Effect with plain properties, or GL shader params merged into shp.
  L.fx = (el, Cls, props, shp) => {
    const e = new Cls();
    if (props) L.props(e, props);
    if (shp) e.setProperty("shp", Object.assign({}, e.getProperty("shp"), shp));
    L.later(el, () => el.getEffects().appendChild(e));
    return e;
  };

  // Inserting: through the editor, so the app applies its default style and
  // records an undo step, as when the user creates the element.
  L.insert = (els, options) => {
    const list = Array.isArray(els) ? els : [els];
    L.ed().insertElements(list, !!(options && options.noDefaultStyle));
    // Deselect first: the effects inspector throws on effect classes it has
    // no panel for (GGLTrueBlurEffect, GGLBendBlurEffect).
    L.ed().clearSelection();
    for (const el of list) L.flush(el);
    return els;
  };
  // Runs the deferred steps of el and its descendants.
  L.flush = (el) => {
    const visit = (n) => {
      const after = n.__after;
      delete n.__after;
      if (after) for (const fn of after) fn(n);
      if (n.getFirstChild) for (let c = n.getFirstChild(); c; c = c.getNext()) visit(c);
    };
    visit(el);
  };
  // The top-most element of the active layer (or page).
  L.last = () => {
    const scene = L.scene();
    const parent = scene.getActiveLayer() || scene.getActivePage();
    let n = parent.getLastChild();
    while (n && !(n instanceof G.GElement)) n = n.getPrevious();
    return n;
  };
  L.select = (els) => L.ed().updateSelection(false, Array.isArray(els) ? els : [els]);
  L.run = (actionId, args) => {
    if (!app.canExecute(actionId, args)) throw new Error("cannot execute " + actionId);
    app.execute(actionId, args);
    return app.selection();
  };

  // Pages
  L.setPage = (page, props) => L.props(page, props);
  L.fixedPage = (w, h, props) => {
    const p = L.page();
    p.setProperties(["w", "h"], [w, h]);
    if (props) L.props(p, props);
    return p;
  };

  // Requests the fonts [family, style "N"|"I", weight] and waits until none
  // is pending, so text runs that use them can be set.
  L.fonts = async (list) => {
    const fm = L.scene().getWorkspace().getFontManager();
    for (const [family, style, weight] of list) fm.getFont(family, style, weight);
    for (let i = 0; i < 300 && fm.hasPendingFonts(); i++) await L.wait(50);
  };
  // A class registered with GNode by node name (for classes not in G).
  L.nodeClass = (name) => G.GNode._nameToNodeClassMap[name];
  L.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  L.frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  L.loadImage = (url) =>
    new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
  L.doc = document;
  window.__cb = L;
})();
