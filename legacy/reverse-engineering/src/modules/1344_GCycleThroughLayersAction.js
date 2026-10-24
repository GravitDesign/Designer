/**
 * Webpack Module #1344
 * Type: class
 * Name: GCycleThroughLayersAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(15),
      a = n(1),
      r = o(n(18)),
      s = o(n(31)),
      l = n(198);
    class c extends s.default {
      constructor(e) {
        super(),
          (this._type = e),
          (this._title = new a.GLocaleKey(
            "GCycleThroughLayersAction",
            "title.".concat(this._type)
          ));
      }
      getId() {
        return "".concat(c.ID, ".").concat(this._type);
      }
      getTitle() {
        return this._title;
      }
      getCategory() {
        return r.default.CATEGORY_VIEW;
      }
      getShortcut() {
        switch (this._type) {
          case c.Type.Next:
            return [i.GKey.Constant.TAB];
          case c.Type.Previous:
            return [i.GKey.Constant.SHIFT, i.GKey.Constant.TAB];
          default:
            return null;
        }
      }
      isVisible() {
        return !1;
      }
      execute() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : c.Mode.Level;
        const t = gDesigner.getLeftSidebars().getActiveSidebar(),
          n = gDesigner
            .getLeftSidebars()
            .getSidebar(l.SidebarsIds.GOutlineSidebar),
          o = n.getLayerPanel(),
          i = o.gLayerPanel("getCurrentFocusedNode");
        if (!i || t !== n.getId()) return;
        const r = this._getNextNodeInIteration(e, i);
        if (r) {
          const e = o.gLayerPanel("getItem", i),
            t = o.gLayerPanel("getItem", r);
          e.removeFlag(a.GNode.Flag.Selected),
            t.setFlag(a.GNode.Flag.Selected),
            o.gLayerPanel("setCurrentFocusedNode", r),
            o.gLayerPanel("relayout");
        }
      }
      _getNextNodeInIteration(e, t) {
        switch (e) {
          case c.Mode.Level:
            return this._getNextNodeOfCurrentLevel(t);
          case c.Mode.Focus:
            return this._getNextFocusableNode(t);
          default:
            return null;
        }
      }
      _getNextNodeOfCurrentLevel(e) {
        switch (this._type) {
          case c.Type.Next:
            return e.next || e.parent.firstChild;
          case c.Type.Previous:
            return e.previous || e.parent.lastChild;
          default:
            return null;
        }
      }
      _getNextFocusableNode(e) {
        switch (this._type) {
          case c.Type.Next:
            return e.getNextFocusableNode();
          case c.Type.Previous:
            return e.getPreviousFocusableNode();
          default:
            return null;
        }
      }
      toString() {
        return "[Object GCycleThroughLayersAction]";
      }
    }
    (c.ID = "view.cycle-through-layers"),
      (c.Type = { Next: "next", Previous: "previous" }),
      (c.Mode = { Focus: "focus", Level: "level" }),
      (e.exports = c);
  }