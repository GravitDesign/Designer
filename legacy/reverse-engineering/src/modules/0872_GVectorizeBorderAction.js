/**
 * Webpack Module #872
 * Type: class
 * Name: GVectorizeBorderAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(1),
      i = n(40),
      a = n(67),
      r = n(18),
      s = n(106);
    function l() {
      l.TOOLTIP_CONFIG = {
        [a.TOOLTIP_AREA.TOOLBAR]: a.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GVectorizeBorderAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GVectorizeBorderAction", "tooltip-description")
          ),
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(l, s),
      (l.ID = "modify.vectorize"),
      (l.TITLE = new o.GLocaleKey("GVectorizeBorderAction", "title")),
      (l.TOOLTIP_CONFIG = null),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_PATH;
      }),
      (l.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (l.prototype.getIcon = function () {
        return "gravit-icon-vectorize-border";
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getIndividualSelection()
            : null,
          t = !1;
        if (e)
          for (var n = 0; !t && n < e.length; ++n)
            if (
              !(e[n] instanceof o.GImage) &&
              e[n].hasMixin(o.GVertexSource) &&
              e[n].hasMixin(o.GStylable)
            ) {
              var i = e[n].getPaintLayers(),
                a = i ? i.getBorderLayers(!0) : null;
              t = a && a.length >= 1;
            }
        return t;
      }),
      (l.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t ? t.getEditor() : null,
          a = (t && t.getScene(), n ? n.getIndividualSelection() : null),
          r = [];
        if (a)
          for (var s = 0; s < a.length; ++s) {
            var l = a[s];
            !l.hasMixin(o.GVertexSource) ||
              l instanceof o.GImage ||
              !l.hasMixin(o.GStylable) ||
              r.push(l);
          }
        if (r.length) {
          var c = function (e, t) {
            if (t instanceof o.GPath) e.getPaths().appendChild(t);
            else
              for (
                var n, i = t.cloneSubPaths(), a = i.getFirstChild();
                null !== a;
                a = n
              )
                (n = a.getNext()),
                  i.removeChild(a),
                  e.getPaths().appendChild(a);
          };
          n.beginTransaction();
          try {
            var d,
              u = [],
              p = function (e) {
                var t = e.getProperty("_ba"),
                  n = e.getProperty("_bw");
                n = n || 1;
                var i,
                  a = t == o.GStylable.BorderAlignment.Center ? 0.5 * n : n,
                  r = new o.GVertexOffsetter(
                    o.GPathUtil.makeClockWise(d),
                    a,
                    t != o.GStylable.BorderAlignment.Outside,
                    t != o.GStylable.BorderAlignment.Inside,
                    0,
                    e.getProperty("_blc"),
                    e.getProperty("_bml")
                  );
                if (t == o.GStylable.BorderAlignment.Center)
                  i = o.GPathUtil.createPathFromVertexSource(r);
                else {
                  var s = o.GPathUtil.createPathFromVertexSource(d),
                    l = o.GPathUtil.createPathFromVertexSource(r);
                  s && ((i = new o.GCompoundPath()), c(i, s), l && c(i, l));
                }
                return (
                  i &&
                    (o.GElement.prototype.assignFrom.call(i, d),
                    i.getPaintLayers().clearLayers(),
                    e.$_pt &&
                      i
                        .getPaintLayers()
                        .appendChild(new o.GStylable.FillPaintLayer(e.$_pt))),
                  i
                );
              };
            e = new Set();
            for (s = 0; s < r.length; ++s) {
              var g = r[s].getParent();
              g && e.add(g);
            }
            try {
              (0, i.blockChanges)(n, e);
              for (s = 0; s < r.length; ++s) {
                var h = (d = r[s]).getParent(),
                  f = d.getNext(),
                  m = null,
                  y = d.getPaintLayers().getBorderLayers(!0);
                if (y.length > 1)
                  o.GUtil.each(y, function (e, t) {
                    var n = p(t);
                    n && (m || (m = new o.GGroup()), m.appendChild(n));
                  });
                else if (1 == y.length) {
                  var v = y.pop();
                  m = p(v);
                }
                m
                  ? (h.insertChild(m, f), u.push(m), h.removeChild(d))
                  : u.push(d);
              }
            } finally {
              (0, i.releaseChanges)(n, e), u.length && n.updateSelection(!1, u);
            }
          } finally {
            n.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (l.prototype.getTooltipConfig = function (e) {
        return (e && l.TOOLTIP_CONFIG[e]) || null;
      }),
      (l.prototype.toString = function () {
        return "[Object GVectorizeBorderAction]";
      }),
      (e.exports = l);
  }