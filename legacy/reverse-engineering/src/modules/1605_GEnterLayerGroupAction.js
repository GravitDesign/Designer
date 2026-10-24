/**
 * Webpack Module #1605
 * Type: class
 * Name: GEnterLayerGroupAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(15),
      a = n(1),
      r = n(198),
      s = o(n(18)),
      l = o(n(31));
    class c extends l.default {
      constructor() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        super(),
          (this._isReverse = e),
          (this._title = new a.GLocaleKey(
            "GEnterLayerGroupAction",
            "title".concat(this._isReverse ? ".reverse" : "")
          ));
      }
      getId() {
        return this._isReverse ? c.ID_REVERSE : c.ID;
      }
      getTitle() {
        return this._title;
      }
      getCategory() {
        return s.default.CATEGORY_VIEW;
      }
      getShortcut() {
        return this._isReverse
          ? [i.GKey.Constant.SHIFT, i.GKey.Constant.ENTER]
          : [i.GKey.Constant.ENTER];
      }
      isVisible() {
        return !1;
      }
      execute() {
        const e = gDesigner
            .getLeftSidebars()
            .getSidebar(r.SidebarsIds.GOutlineSidebar)
            .getLayerPanel(),
          { vtree: t, currentFocus: n } = e.data("glayerpanel");
        if (!n) return;
        let o;
        if (
          (!this._isReverse && n.firstChild
            ? (o = n.firstChild)
            : this._isReverse && n.parent && n.parent.row && (o = n.parent),
          o)
        ) {
          const i = e.gLayerPanel("getItem", n),
            r = e.gLayerPanel("getItem", o);
          i.removeFlag(a.GNode.Flag.Selected),
            r.setFlag(a.GNode.Flag.Selected),
            t.expandAndFocus(r);
        }
      }
      toString() {
        return "[Object GEnterLayerGroupAction]";
      }
    }
    (c.ID = "view.enter-layer-group"),
      (c.ID_REVERSE = "view.enter-layer-group.reverse"),
      (e.exports = c);
  }