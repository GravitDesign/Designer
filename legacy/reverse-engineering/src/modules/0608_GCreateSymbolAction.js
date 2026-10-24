/**
 * Webpack Module #608
 * Type: class
 * Name: GCreateSymbolAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41), n(32), n(33);
    var o = n(1),
      i = n(15),
      a = n(67),
      r = n(18),
      s = n(106),
      l = n(44);
    function c() {
      c.TOOLTIP_CONFIG = {
        [a.TOOLTIP_AREA.TOOLBAR]: a.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GCreateSymbolAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GCreateSymbolAction", "tooltip-description")
          ),
          learnMore: "",
        }),
      };
    }
    o.GObject.inherit(c, s),
      (c.ID = "modify.createsymbol"),
      (c.TITLE = new o.GLocaleKey("GCreateSymbolAction", "title")),
      (c.SHORTCUT = [i.GKey.Constant.F8]),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return c.TITLE;
      }),
      (c.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_SYMBOL;
      }),
      (c.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (c.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled()
          ? "gravit-icon-create-symbol"
          : "gravit-icon-symbolmaster";
      }),
      (c.prototype.getShortcut = function () {
        return c.SHORTCUT;
      }),
      (c.prototype.isPro = function () {
        if (!gDesigner.isEnabledProFeatures()) {
          const e = gDesigner.getActiveDocument();
          if (e) {
            const t = e.getEditor().getIndividualSelection();
            if (t && t.length)
              return t.filter((e) => e instanceof o.GSymbol).length > 1;
          }
        }
        return !1;
      }),
      (c.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getIndividualSelection();
          if (t && t.length)
            for (
              var n = 0, i = new o.GSymbol(), a = t.length - 1;
              a >= 0;
              --a
            ) {
              var r = t[a];
              if (
                (r instanceof o.GSymbol && !r.getMasterSymbol()) ||
                (r.validateInsertion(i) &&
                  !r.getParent().isLocked() &&
                  i.validateInsertion(r.getParent()) &&
                  !o.GSymbol.containsUnsupportedNodes(r))
              ) {
                if (!(r instanceof o.GSymbol && r.isMaster())) return !0;
                if (++n > 1) return !0;
              }
            }
        }
        return !1;
      }),
      (c.prototype.execute = function () {
        if (!this.isPro() || gDesigner.isEnabledProFeatures()) {
          var e = 1,
            t = o.GLocale.get(
              new o.GLocaleKey(
                "GCreateSymbolAction",
                "createsymbol.defaultname"
              )
            ),
            n = t + " " + e,
            i = gDesigner.getActiveDocument();
          if (i) {
            var a = i.getScene();
            if (a)
              (a.getSymbols() || []).forEach(function (i) {
                i instanceof o.GSymbol &&
                  i.isMaster() &&
                  i.getProperty("name") === n &&
                  (e++, (n = t + " " + e));
              }),
                l.prompt(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCreateSymbolAction",
                      "createsymbol.enternewname"
                    )
                  ),
                  (e) => {
                    if (gDesigner.getActiveDocument() && e) {
                      var t = gDesigner.getActiveDocument().getEditor(),
                        n = o.GNode.order(t.getIndividualSelection().slice());
                      t.beginTransaction();
                      try {
                        for (
                          var i = new o.GSymbol(), a = null, r = n.length - 1;
                          r >= 0;
                          --r
                        ) {
                          var s = n[r];
                          if (s instanceof o.GSymbol && s.convertToMaster(e))
                            n.splice(r, 1);
                          else if (
                            s.validateInsertion(i) &&
                            !o.GSymbol.containsUnsupportedNodes(s)
                          ) {
                            if (
                              !(a = s.getParent()).isLocked() &&
                              i.validateInsertion(a)
                            )
                              break;
                            a = null;
                          }
                        }
                        a && t.updateSelection(!1, [o.GSymbol.create(n, a, e)]);
                      } finally {
                        t.commitTransaction(
                          o.GLocale.get(
                            new o.GLocaleKey("GCreateSymbolAction", "title")
                          )
                        );
                      }
                    }
                  },
                  n
                );
          }
        } else gDesigner.handlePROFeatureInterruption();
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GCreateSymbolAction]";
      }),
      (e.exports = c);
  }