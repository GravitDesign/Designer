/**
 * Webpack Module #1718
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13), n(32), n(33);
    var o = n(1),
      i = n(67),
      a = n(608);
    function r(e) {
      var t = $(this).data("gsymbolspanel"),
        n = e.getMultireferenceId();
      if (t.symbolNodes[n])
        e.isMaster() &&
          !e.hasEventListeners(o.GSymbol.AfterThumbnailUpdate) &&
          e.addEventListener(o.GSymbol.AfterThumbnailUpdate, l.bind(this));
      else {
        var i = c.call(this, e);
        i && (i.appendTo($(this)), (t.symbolNodes[n] = e));
      }
    }
    function s(e, t) {
      if (e.isMaster()) {
        var n = $(this).data("gsymbolspanel"),
          i = e.getMultireferenceId(),
          a = $(this).find("#symbol_" + i);
        if (a.length) {
          if (n.scene) {
            var r = d.call(this, e);
            if (
              r &&
              (r.removeEventListener(o.GSymbol.AfterThumbnailUpdate, l), !t)
            ) {
              var s = n.blockHandlers;
              (n.blockHandlers = !0),
                n.scene.removeSymbol(r),
                (n.blockHandlers = s);
            }
          }
          delete n.symbolNodes[i],
            a.remove(),
            0 === Object.keys(n.symbolNodes).length && y.call(this);
        }
      }
    }
    function l(e) {
      var t = e.symbol,
        n = t.getFrame();
      if (n && t.getPaintBBox()) {
        $(this).data("gsymbolspanel");
        var i = t.getMultireferenceId(),
          a = $(this).find("#symbol_" + i),
          r = a.find(".symbol-image");
        r.empty();
        var s = n.getWidth(),
          l = n.getHeight() / s,
          c = 85,
          d = c * l;
        d > 85 && (c = (d = 85) / l), h(r, c, d);
        var u = e.image.getBitmap().getHTMLElement(!0);
        if (
          ($(u).css({ width: c, height: d, margin: "5px" }),
          t.hasFlag(o.GNode.Flag.Selected))
        )
          a.find(".symbol-title-group").addClass("g-highlighted");
        $(u).appendTo(r);
      }
    }
    function c(e) {
      var t = $(this).data("gsymbolspanel");
      if (e.isMaster()) {
        if (!(e instanceof o.GSymbol)) throw new Error("item not symbol");
        var n = $(this).find(".symbol-panel-info").parent();
        n.length && n.remove();
        var a = $("<div />")
            .attr("draggable", !1)
            .attr("id", "symbol_" + e.getMultireferenceId())
            .css({ display: "inline" })
            .gRichTooltip(
              i.GRichTooltipConfig.from({
                title: e.getProperty("name"),
                description: o.GLocale.get(
                  new o.GLocaleKey(
                    "GCommonNames",
                    "text.symbol-panel-symbol-tooltip-description"
                  )
                ),
                middle: !1,
                learnMore:
                  "",
              })
            ),
          r = $("<span></span>").addClass("symbol-title-group");
        r.appendTo(a);
        var s = e.getProperty("name");
        s = s || e.getNodeNameTranslated();
        var c = $("<span></span>");
        e.addEventListener(o.GSymbol.AfterThumbnailUpdate, l.bind(this)),
          c.addClass("symbol-image").appendTo(r);
        var u = this;
        return (
          r
            .attr("draggable", !0)
            .css({
              display: "inline-block",
              backgroundColor: "#eee",
              margin: "5px",
              height: "95px",
              width: "45%",
              textAlign: "center",
              lineHeight: "180px",
            })
            .on("dragstart", function (n) {
              $(this).addClass("g-dragging"),
                (n.originalEvent.dataTransfer.effectAllowed = "move"),
                n.originalEvent.dataTransfer.setData(
                  o.GNode.MIME_TYPE,
                  o.GNode.serialize(e)
                ),
                (t.dragNode = e),
                setTimeout(
                  function () {
                    $(this).removeClass("g-dragging");
                  }.bind(this),
                  0
                );
            })
            .on("drop", function (e) {
              $(this).parent().parent().data("gsymbolspanel").dragNode = null;
            })
            .on("click", function (n) {
              gDesigner.stats("symbol_click_select");
              var o = d.call(u, e);
              o &&
                (o.getScene()
                  ? t.options.clickCallback(o)
                  : r.toggleClass("g-highlighted"));
            })
            .on("dblclick", function (n) {
              gDesigner.stats("symbol_click_focus");
              var o = d.call(u, e);
              o && t.options.dblClickCallback(o);
            }),
          a
        );
      }
    }
    function d(e) {
      if (e.getScene()) return e;
      var t = $(this).data("gsymbolspanel");
      if (!t.scene) return null;
      for (var n = t.scene.getSymbols(), o = 0; o < n.length; o++)
        if (n[o].getMultireferenceId() === e.getMultireferenceId()) return n[o];
    }
    function u(e) {
      var t = $(this).data("gsymbolspanel");
      if (!t.blockHandlers && e.node instanceof o.GSymbol)
        if (e.data.created) {
          r.call(this, e.node);
          var n = t.scene.getSymbolImage(e.node);
          n ? l.call(this, { symbol: e.node, image: n }) : e.node.toBitmap();
        } else s.call(this, e.node, !0);
    }
    function p(e) {
      !$(this).data("gsymbolspanel").blockHandlers && (e.node, o.GSymbol);
    }
    function g(e) {
      for (
        var t = $(this).data("gsymbolspanel"), n = e.node;
        n && !(n instanceof o.GSymbol && n.isMaster());

      )
        n = n.getParent();
      if (!t.blockHandlers && n) {
        var i = n.getMultireferenceId(),
          a = $(this)
            .find("#symbol_" + i)
            .find(".symbol-title-group");
        e.flag === o.GNode.Flag.Selected &&
          (e.set
            ? a.addClass("g-highlighted")
            : a.removeClass("g-highlighted"));
      }
    }
    function h(e, t, n) {
      e.css({ position: "relative", top: n / 2 - 42.5 + "px" });
    }
    function f() {
      $(this).data("gsymbolspanel"), $(this).data("gsymbolspanel");
      for (var e = $(this).find(".symbol-image"), t = 0; t < e.length; t++) {
        var n = $(e[t]),
          o = n.find("canvas");
        (o.css("width") || "0px").split("px")[0];
        h(n, 0, (o.css("height") || "0px").split("px")[0]);
      }
    }
    function m() {
      var e = $(this).data("gsymbolspanel");
      (e.symbolNodes = {}), (e.scene = null), $(this).empty(), y.call(this);
    }
    function y() {
      $("<div>")
        .append(
          $("<div>")
            .addClass("symbol-panel-info")
            .append(
              $("<div></div>")
                .addClass("symbol-panel-infotitle")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCreateSymbolAction",
                      "common.nosymbolsdefined"
                    )
                  )
                )
            )
            .append(
              $("<span></span>").text(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GCreateSymbolAction",
                    "common.nosymbolsdefined-info"
                  )
                )
              )
            )
        )
        .appendTo($(this));
    }
    var v = {
      init: function (e) {
        return (
          (e = $.extend(
            {
              moveCallback: null,
              clickCallback: null,
              dblClickCallback: null,
              startDraggingCallback: null,
            },
            e
          )),
          this.each(function () {
            $(this).addClass("g-symbols-panel").data("gsymbolspanel", {
              options: e,
              symbolNodes: {},
              scene: null,
              currentFocus: null,
            });
          })
        );
      },
      relayout: function () {
        f.call(this);
      },
      newSymbolClick: function () {
        return (
          gDesigner.canExecuteAction(a.ID) &&
            (gDesigner.stats("symbol_click_createnewsymbol"),
            gDesigner.executeAction(a.ID, void 0, void 0, !0)),
          !1
        );
      },
      isSelected: function () {
        $(this).data("gsymbolspanel");
        return $(this).find(".g-highlighted").length > 0;
      },
      removeSelected: function () {
        var e = $(this).data("gsymbolspanel"),
          t = $(this).find(".g-highlighted").parent().attr("id");
        if (t) {
          var n = t.split("_")[1],
            o = e.symbolNodes[n];
          o && s.call(this, o);
        }
      },
      scene: function (e) {
        var t = $(this),
          n = t.data("gsymbolspanel");
        if (!arguments.length) return n.scene;
        if (
          e !== n.scene &&
          (n.scene &&
            n.scene.hasMixin(o.GEventTarget) &&
            (n.scene.removeEventListener(
              o.GNode.AfterSpecialChangeEvent,
              n.afterSpecialChangeHandler,
              this
            ),
            n.scene.removeEventListener(
              o.GNode.AfterPropertiesChangeEvent,
              n.afterPropertiesChangeHandler,
              this
            ),
            n.scene.removeEventListener(
              o.GNode.AfterFlagChangeEvent,
              n.afterFlagChangeHandler,
              this
            )),
          m.call(this),
          (n.scene = e),
          n.scene)
        ) {
          n.scene.hasMixin(o.GEventTarget) &&
            ((n.afterSpecialChangeHandler = u.bind(this)),
            (n.afterPropertiesChangeHandler = p.bind(this)),
            (n.afterFlagChangeHandler = g.bind(this)),
            n.scene.addEventListener(
              o.GNode.AfterSpecialChangeEvent,
              n.afterSpecialChangeHandler,
              this
            ),
            n.scene.addEventListener(
              o.GNode.AfterPropertiesChangeEvent,
              n.afterPropertiesChangeHandler,
              this
            ),
            n.scene.addEventListener(
              o.GNode.AfterFlagChangeEvent,
              n.afterFlagChangeHandler,
              this
            ));
          var i = n.scene.getSymbols();
          i &&
            i.forEach(
              function (e) {
                r.call(this, e);
                var t = n.scene.getSymbolImage(e);
                t ? l.call(this, { symbol: e, image: t }) : e.toBitmap();
              }.bind(this)
            );
        }
        return this;
      },
    };
    $.fn.gSymbolsPanel = function (e) {
      return v[e]
        ? v[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : v.init.apply(this, arguments);
    };
  }