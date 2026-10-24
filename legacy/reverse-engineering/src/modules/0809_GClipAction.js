/**
 * Webpack Module #809
 * Type: class
 * Name: GClipAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(67),
      s = n(10),
      l = n(18),
      c = n(106);
    function d() {
      d.TOOLTIP_CONFIG = {
        [r.TOOLTIP_AREA.TOOLBAR]: r.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GClipAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GClipAction", "tooltip-description")
          ),
          video: s.gApi.getRichTooltipVideoURL("Clip.mp4"),
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(d, c),
      (d.ID = "modify.clip"),
      (d.TITLE = new o.GLocaleKey("GClipAction", "title")),
      (d.TOOLTIP_CONFIG = null),
      (d.prototype.getId = function () {
        return d.ID;
      }),
      (d.prototype.getTitle = function () {
        return d.TITLE;
      }),
      (d.prototype.getIcon = function () {
        return "gravit-icon-clip-circle";
      }),
      (d.prototype.getCategory = function () {
        return l.CATEGORY_MODIFY;
      }),
      (d.prototype.getGroup = function () {
        return "structure-group";
      }),
      (d.prototype.isEnabled = function () {
        if (!c.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getIndividualSelection();
          return t && t.length > 1;
        }
        return !1;
      }),
      (d.prototype.getShortcut = function () {
        return [i.GKey.Constant.OPTION, i.GKey.Constant.META, "M"];
      }),
      (d.prototype.execute = function (e, t) {
        var n = gDesigner.getActiveDocument().getEditor(),
          i = gDesigner.getActiveDocument().getScene(),
          r = o.GNode.order(n.getIndividualSelection().slice(), e),
          s = r.shift();
        if (!s.isLocked()) {
          var l,
            c = s.getPaintBBox();
          t || n.beginTransaction();
          try {
            l = new Set();
            for (var d = 0; d < r.length; ++d) l.add(r[d].getParent());
            try {
              (0, a.blockChanges)(n, l, i, s);
              for (d = 0; d < r.length; ++d) {
                var u = r[d];
                u.validateInsertion(s) &&
                  u.getPaintBBox() &&
                  c &&
                  u.getPaintBBox().intersectsRect(c) &&
                  (u.getParent().removeChild(u), s.appendChild(u));
              }
            } finally {
              (0, a.releaseChanges)(n, l, i, s), n.updateSelection(!1, [s]);
            }
          } finally {
            t ||
              n.commitTransaction(
                o.GLocale.get(
                  new o.GLocaleKey("GClipAction", "text.clip-selecion")
                )
              );
          }
        }
      }),
      (d.prototype.getTooltipConfig = function (e) {
        return e && d.TOOLTIP_CONFIG[e];
      }),
      (d.prototype.toString = function () {
        return "[Object GClipAction]";
      }),
      (e.exports = d);
  }