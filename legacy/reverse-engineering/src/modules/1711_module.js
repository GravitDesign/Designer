/**
 * Webpack Module #1711
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(26);
    n(53);
    var o = n(1),
      i = (n(15), n(40), n(67), n(1351)),
      a = n(451).GVirtualTree,
      r = (n(451).GVirtualTreeNode, n(451).GVirtualTreeNodeNamed),
      { VTREE_FREE_HEIGHT: s } = n(10);
    n(173), n(450);
    function l() {}
    function c(e) {
      var t = $(this).data("gselectedpanel"),
        n = $(this).data("gselectedpanel").vtree;
      if (t.options.clickCallback) {
        var o = g.call(this, e.id);
        t.options.clickCallback(o);
      }
      n.requestInvalidation();
    }
    function d(e) {
      var t = g.call(this, e.id);
      t &&
        (e.expanded
          ? t.setFlag(o.GNode.Flag.Expanded)
          : t.removeFlag(o.GNode.Flag.Expanded));
    }
    function u(e, t) {
      var n = $(this).data("gselectedpanel");
      n.options.renderer && n.options.renderer(e.id, e.expanded, t);
    }
    function p(e) {
      var t = $(this);
      e.id === a.COLLAPSE_ID
        ? $(e).addClass(t.data("gselectedpanel").options.collapseStyle)
        : e.id === a.EXPAND_ID &&
          $(e).addClass(t.data("gselectedpanel").options.expandStyle);
    }
    function g(e) {
      var t = h.call(this, e);
      return t ? t.node : null;
    }
    function h(e) {
      return $(this).data("gselectedpanel").layersTreeNodeMap[e];
    }
    function f(e, t, n) {
      $(this).data("glayerpanel");
      var o = h.call(this, e),
        a = o ? o.node : null;
      if (a) {
        var { hasSelection: r } = (0, i.getLayerOrItemStatus)(a),
          { titleGroup: s } = (0, i.buildLayerItemContainer)(n, a, r, t);
        o.element = s;
      }
    }
    function m(e, t, n) {
      var { newNode: o, vtree: i } = y.call(this, e, n);
      return i.appendNode(t, o), o;
    }
    function y(e, t) {
      return {
        newNode: new r(e, t),
        vtree: $(this).data("gselectedpanel").vtree,
      };
    }
    function v() {
      var e = $(this).data("gselectedpanel"),
        t = e.vtree;
      t.beginUpdate();
      for (
        var {
            elementHits: n,
            filteredElementHits: i,
            submenus: a,
          } = e.selections,
          r = (t, n, o) => {
            (e.layersTreeNodeMap[o] = { element: null, node: n, treeNode: t }),
              e.layersTreeNodeMapByNodes.set(n, {
                element: null,
                treeNode: t,
                treeId: o,
              });
          },
          s = 0;
        s < i.length;
        s++
      ) {
        var l = o.GUtil.uuid(),
          c = i[s].element,
          d =
            (c instanceof o.GBlock ? c.getLabel() : c.getNodeNameTranslated(),
            "temp-" + n.indexOf(i[s]));
        if (a[d]) {
          r((p = m.call(this, l, null, !0)), c, l);
          for (let e = 0; e < a[d].length; e++) {
            var u = o.GUtil.uuid();
            r(m.call(this, u, p, !1), a[d][e], u);
          }
        } else {
          var p;
          r((p = m.call(this, l, null, !1)), c, l);
        }
      }
      t.endUpdate();
    }
    function _() {
      var e = $(this).data("gselectedpanel");
      e.vtree.clean(),
        (e.layersTreeNodeMap = {}),
        (e.layersTreeNodeMapByNodes = new Map());
    }
    o.GObject.inheritAndMix(l, o.GObject);
    var b = {
      init: function (e) {
        return (
          (e = $.extend(
            {
              nodeStyle: "selected-row",
              expandStyle: "selected-arrow gravit-icon-right",
              collapseStyle: "selected-arrow gravit-icon-down",
              freeHeight: 0,
              insertIntoStyle: "g-drop",
              upSeparatorSpan1Style: "g-up-separator-span1",
              upSeparatorSpan2Style: "g-up-separator-span2",
              downSeparatorSpan1Style: "g-down-separator-span1",
              downSeparatorSpan2Style: "g-down-separator-span2",
              renderer: f.bind(this),
              toggleRenderer: p.bind(this),
              separatorRenderer: null,
              canDropCallback: () => !1,
              moveCallback: null,
              isDuplicateEffectCallback: null,
              duplicateCallback: null,
              clickCallback: null,
              startDraggingCallback: null,
              patternChooserStatusChangeCallBack: null,
              bottomHeight: 3,
            },
            e
          )),
          this.each(function () {
            $(this)
              .addClass("g-selected-panel")
              .data("gselectedpanel", {
                vtree: new a(
                  this,
                  u.bind(this),
                  e.nodeStyle,
                  e.toggleRenderer ? e.toggleRenderer : null,
                  e.expandStyle == e.collapseStyle ? e.expandStyle : null,
                  e.separatorRenderer ? e.separatorRenderer : null,
                  e.freeHeight,
                  e.insertIntoStyle,
                  () => !1,
                  null,
                  e.isDuplicateEffectCallback,
                  null,
                  c.bind(this),
                  d.bind(this),
                  e.upSeparatorSpan1Style,
                  e.upSeparatorSpan2Style,
                  e.downSeparatorSpan1Style,
                  e.downSeparatorSpan2Style,
                  !1,
                  15,
                  21,
                  e.bottomHeight,
                  e.renderFinishCallback
                ),
                options: e,
                layersTreeNodeMap: {},
                layersTreeNodeMapByNodes: new Map(),
                selections: null,
                currentFocus: null,
              });
          })
        );
      },
      refresh: function () {
        $(this).data("gselectedpanel").vtree.refresh();
      },
      relayout: function () {
        $(this).data("gselectedpanel").vtree.requestInvalidation();
      },
      setSelections: function (e) {
        var t = $(this),
          n = t.data("gselectedpanel");
        return arguments.length
          ? (e !== n.selections &&
              (_.call(this), (n.selections = e), v.call(this)),
            this)
          : n.selections;
      },
    };
    (e.exports = l),
      ($.fn.gSelectedPanel = function (e) {
        return b[e]
          ? b[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : b.init.apply(this, arguments);
      });
  }