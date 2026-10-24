/**
 * Webpack Module #1351
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.buildLayerItemContainer = function (e, t, n, a) {
        var r = $(e);
        r.attr("draggable", !1),
          r.gPro({
            pro: t instanceof o.GElement && !!t.getProperty("_pro", !0),
          });
        var s = $("<span></span>")
          .addClass("layer-title-group")
          .toggleClass("g-selected", t.hasFlag(o.GNode.Flag.Selected));
        s.appendTo(r),
          r
            .on("mouseenter", function (e) {
              t.hasFlag(o.GElement.Flag.Hidden) ||
                t.setFlag(o.GNode.Flag.Highlighted);
            })
            .on("mouseleave", function (e) {
              t.hasFlag(o.GElement.Flag.Hidden) ||
                t.removeFlag(o.GNode.Flag.Highlighted);
            });
        var l = t.getProperty("name");
        l = l || t.getNodeNameTranslated();
        var c = $("<span></span>").html(l);
        c.addClass("layer-title").appendTo(s);
        var d = function (e) {
          return e instanceof o.GSymbol && !!e.getMasterSymbol();
        };
        (d(t) || t.findParent(d)) && r.addClass("g-symbol-row");
        r.toggleClass("g-active", t.hasFlag(o.GNode.Flag.Active))
          .toggleClass("g-has-selection", n)
          .toggleClass("g-selected", t.hasFlag(o.GNode.Flag.Selected));
        var u,
          { icon: p, overlayIcon: g } = i(t, a);
        p &&
          ("<svg" === p.substr(0, 4)
            ? (u = $("<span></span>")
                .addClass("layer-icon")
                .append(
                  $(p)
                    .addClass("layer-icon")
                    .attr({ width: "16px", height: "16px" })
                    .css({
                      verticalAlign: "middle",
                      paddingLeft: "1px",
                      opacity: "initial",
                    })
                )
                .insertBefore(c))
            : (gDesigner.isTouchEnabled() && (p += "-small"),
              (u = $("<span></span>")
                .addClass("layer-icon " + p)
                .css({ opacity: "initial" })
                .insertBefore(c))));
        g && u && g.appendTo(u);
        return { container: r, title: c, titleGroup: s };
      }),
      (t.getIconByLayerType = i),
      (t.getLayerOrItemStatus = function (e) {
        var t = !1,
          n = null,
          i = !1,
          a = e;
        for (; (a = a.getParent()) && !(a instanceof o.GScene); ) {
          a instanceof o.GBlock &&
            ((t = !1 === a.getProperty("vis") || t),
            (s = a.getProperty("lkt")) &&
              (n ? s === o.GBlock.LockType.Full && (n = s) : (n = s))),
            a instanceof o.GLayer && (i = !0 === a.getProperty("otl") || i);
        }
        var r = t || !1 === e.getProperty("vis"),
          s = n || e.getProperty("lkt"),
          l = i || (e instanceof o.GLayer && e.getProperty("otl")),
          c = !1;
        if (e.hasMixin(o.GNode.Container))
          for (var d = e.getFirstChild(); null !== d && !c; d = d.getNext())
            d instanceof o.GItem &&
              d.hasFlag(o.GNode.Flag.Selected) &&
              (c = !0);
        return {
          parentHidden: t,
          parentLockType: n,
          parentOutlined: i,
          isHidden: r,
          lockType: s,
          isOutlined: l,
          hasSelection: c,
        };
      });
    var o = n(1);
    function i(e, t) {
      var n = null,
        i = null;
      if (
        (e instanceof o.GLayer
          ? (n = t ? "gravit-icon-folderopen" : "gravit-icon-folderclose")
          : e instanceof o.GSlice
          ? (n = "gravit-icon-slice")
          : e instanceof o.GGroup
          ? (n = "gravit-icon-group")
          : e instanceof o.GShape
          ? e instanceof o.GPathsGraph
            ? (n = "gravit-icon-pathgraph3")
            : e instanceof o.GSimpleShape
            ? (n = e.getIcon())
            : e instanceof o.GText
            ? ((n = "gravit-icon-textbox"),
              e.isFakeText() &&
                (i = $("<div></div>").addClass("layer-icon-overlay")))
            : e instanceof o.GImage
            ? (n = "gravit-icon-picture")
            : e instanceof o.GEllipse
            ? (n = "gravit-icon-ellipse")
            : e instanceof o.GRectangle
            ? (n = "gravit-icon-rectangle")
            : e instanceof o.GPath || e instanceof o.GCompoundPath
            ? (n = "gravit-icon-pen")
            : e instanceof o.GPolygon
            ? (n = "gravit-icon-polygon")
            : e instanceof o.GCompoundShape && (n = "gravit-icon-merge-union")
          : e instanceof o.GSymbol &&
            ((n = "gravit-icon-symbol"),
            e.isMaster()
              ? (n += "master")
              : e.getMasterSymbol()
              ? (n += "instance")
              : (n += "detached")),
        e instanceof o.GShape &&
          e.getParent() instanceof o.GCompoundShape &&
          e.getPrevious())
      )
        switch (e.getProperty("bool")) {
          case o.GVertexPolyBoolean.OR:
            n = "gravit-icon-merge-union";
            break;
          case o.GVertexPolyBoolean.AND:
            n = "gravit-icon-merge-intersect";
            break;
          case o.GVertexPolyBoolean.SUB:
            n = "gravit-icon-merge-subtract";
            break;
          case o.GVertexPolyBoolean.XOR:
            n = "gravit-icon-merge-difference";
        }
      return { icon: n, overlayIcon: i };
    }
  }