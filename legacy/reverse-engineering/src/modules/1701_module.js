/**
 * Webpack Module #1701
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(8), n(20), n(851), n(4), n(41), n(13), n(26);
    var o = n(1),
      i = n(40),
      a = n(1200),
      r = n(255);
    function s(e, t) {
      var n = $(this);
      n.empty(),
        (n.data("g-fonts-panel").lastPreviewPosition = 0),
        l.call(this, e, t);
    }
    function l(e, t) {
      var n = $(this),
        o = this,
        a = n.data("g-fonts-panel"),
        r = e.faces;
      if (r) {
        var s = function (e, t, n) {
            if (t && "_SPECIAL_" === t.getAttribute("name"))
              e.stopPropagation();
            else {
              if (
                (t && !n && (n = $(t).closest(".fonts-row").data("font")),
                n.special)
              )
                return (
                  gDesigner.stats("fontspanel_click_deletefont", n.family),
                  void e.stopPropagation()
                );
              gDesigner.stats("fontspanel_click_setfont", n.family),
                p.selection.call(o, n.family),
                a.options.changeCallback && a.options.changeCallback(n),
                e.preventDefault();
            }
          },
          l = null;
        t && t.length && (l = t);
        var u = [],
          g = [];
        for (let e = 0; e < r.length; ++e) {
          const t = r[e];
          var h = $("<div></div>")
            .addClass("fonts-row")
            .data("font", t)
            .on("mousedown", function (e) {
              (gDesigner.isTouchEnabled() && !e.originalEvent.isTrusted) ||
                s(e, e.target);
            })
            .on("click", (e) => {
              gDesigner.isTouchEnabled() && s(e, e.target);
            })
            .append(
              $("<div></div>")
                .addClass("info")
                .text(t.displayname || t.family)
            );
          u.push(h),
            t.cachedPreview
              ? ($("<div></div>")
                  .addClass("preview")
                  .append(t.cachedPreview)
                  .appendTo(h),
                (a.lastPreviewPosition += 22))
              : t.addPreviewCallback && ((t.row = h), g.push(t));
        }
        var f = 0;
        if (l)
          for (let e = 0; e < g.length; e++) {
            const t = g[e];
            if ((t.displayname || t.family).localeCompare(l) >= 0) {
              f = e;
              break;
            }
          }
        (0, i.iterateAroundIndex)(g, f, (e) => {
          e.addPreviewCallback.call(
            e,
            function (e) {
              this.cachedPreview ||
                ((e instanceof Element || e instanceof jQuery) &&
                  ((this.cachedPreview = e),
                  (a.lastPreviewPosition += 22),
                  (function (e, t) {
                    null === c &&
                      (c = setTimeout(function () {
                        for (var e of d) e.where.append(e.what);
                        (d = []), (c = null);
                      }));
                    d.push({ what: e, where: t });
                  })(
                    $("<div></div>").addClass("preview").append(e),
                    this.row
                  )));
            }.bind(e)
          );
        }),
          n.append(u),
          n.on("keydown", function (e, t) {
            if (13 === (t || e.which || e.keyCode)) {
              var n = $(".g-fonts-panel").find(".fonts-row:hover").data("font");
              n && n.family && s(e, null, n);
            }
          });
      }
    }
    var c = null,
      d = [];
    function u(e, t) {
      var n = this,
        o = $(this).data("g-fonts-panel"),
        i = o.manager;
      e !== o.previousQuery &&
        ((o.previousQuery = e),
        i.query((e) => {
          s.call(n, e, t);
        }, e));
    }
    var p = {
      init: function (e) {
        return (
          (e = $.extend(
            { search: null, preview: null, changeCallback: null },
            e
          )),
          this.each(function () {
            var t = this,
              n = gDesigner
                .getWorkspace()
                .getFontManager()
                .getDefaultFont()
                .getFamily(),
              o = r.getInstance(),
              i = $(this)
                .empty()
                .addClass("g-fonts-panel")
                .data("g-fonts-panel", {
                  options: e,
                  lastPreviewPosition: 0,
                  search: e.search || null,
                  changeCallback: e.changeCallback || null,
                  manager: o,
                });
            o.addEventListener(r.ResetEvent, () => {
              i.addClass("g-loading"),
                o.query((e) => {
                  s.call(t, e, n), i.removeClass("g-loading"), (n = void 0);
                }, "%");
            }),
              i
                .on("scroll", function () {
                  var e = i.scrollTop(),
                    n = i.data("g-fonts-panel"),
                    o = n.lastPreviewPosition,
                    a = i.height(),
                    r = n.manager;
                  r.isLoading() ||
                    (e / Math.max(1, o - a) > 0.7 &&
                      r.loadMore((e) => {
                        l.call(t, e, "Open Sans");
                      }, n.search));
                })
                .on("focusin", function (e) {
                  e.preventDefault();
                });
          })
        );
      },
      selection: function (e) {
        var t = this,
          n = $(this),
          o = n.data("g-fonts-panel");
        if (!arguments.length) {
          var i = n.find(".fonts-row.g-selected");
          return i.length ? i.data("font").family : null;
        }
        return (
          n.find(".fonts-row").each(function (i, a) {
            var r = $(a),
              s = r.data("font").family === e;
            if ((r.toggleClass("g-selected", s), s)) {
              var c = o.manager;
              if (
                !r.data("font").cachedPreview ||
                (i > 0 &&
                  !$(n.find(".fonts-row")[i - 1]).data("font").cachedPreview)
              )
                for (
                  var d = c.loadMore(l.bind(t), o.search);
                  0 !== d && d < i;

                ) {
                  if (d >= (d = c.loadMore(l.bind(t), o.search))) break;
                }
            }
          }),
          this
        );
      },
      selectUpper: function () {
        var e = $(this),
          t = e.data("g-fonts-panel"),
          n = e.find(".fonts-row.g-selected").prev().data("font");
        n ||
          (n = e
            .find(".fonts-row")
            .filter(function () {
              return $(this).position().top <= $(this).outerHeight();
            })
            .data("font")),
          n &&
            (p.selection.call(this, n.family),
            p.focusCurrent.call(this),
            t.options.changeCallback && t.options.changeCallback(n));
      },
      selectLower: function () {
        var e = $(this),
          t = e.data("g-fonts-panel"),
          n = e.find(".fonts-row.g-selected").next().data("font");
        n ||
          (n = e
            .find(".fonts-row")
            .filter(function () {
              return $(this).position().top <= $(this).outerHeight();
            })
            .data("font")),
          n &&
            (p.selection.call(this, n.family),
            p.focusCurrent.call(this),
            t.options.changeCallback && t.options.changeCallback(n));
      },
      search: function (e, t) {
        var n = $(this),
          o = n.data("g-fonts-panel");
        return arguments.length
          ? (e !== o.search && ((o.search = e), p.refresh.call(this, !1, t)),
            this)
          : o.search;
      },
      focusCurrent: function () {
        var e,
          t = $(this),
          n = t.find(".fonts-row.g-selected"),
          o = 0;
        n &&
          n.position() &&
          (n.position().top > t.height() - n.outerHeight()
            ? ((e = n.index()),
              t.find(".fonts-row:lt(" + e + ")").each(function () {
                o += $(this).outerHeight(!0);
              }),
              t.scrollTop(o - t.height() + n.outerHeight(!0)))
            : n.position().top < 0 &&
              ((e = n.index()),
              t.find(".fonts-row:lt(" + e + ")").each(function () {
                o += $(this).outerHeight(!0);
              }),
              t.scrollTop(o)));
      },
      reload: function (e) {
        ($(this).data("g-fonts-panel").previousQuery = null),
          p.refresh.call(this, !1, e);
      },
      refresh: function (e, t) {
        var n = $(this),
          i = n.data("g-fonts-panel"),
          a = i.search ? i.search + "%" : "%";
        a !== i.previousQuery &&
          (n.empty(),
          (i.lastPreviewPosition = 0),
          n.text(
            o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.loading")) +
              "..."
          ),
          e && (i.search = null),
          u.call(this, a, t));
      },
      stylesForFont: function (e, t) {
        var n = null,
          o = $(this).data("g-fonts-panel").manager;
        if (o.isCacheEmpty()) return void (t && o.query(t, "%", !0));
        let i = (0, a.getFontFamily)(e, o.searchFamilyInCache.bind(o));
        if (i && i.fonts && i.fonts.length) {
          n = [];
          for (var r = 0; r < i.fonts.length; r++) n.push(i.fonts[r].style);
        }
        return n;
      },
      stylesForWeight: function (e, t, n, o) {
        var i = null,
          r = $(this).data("g-fonts-panel").manager;
        if (r.isCacheEmpty()) return void (n && r.query(n, "%", !0));
        let s = (0, a.getFontFamily)(t, r.searchFamilyInCache.bind(r));
        if (s && s.fonts && s.fonts.length) {
          i = [];
          for (var l = 0; l < s.fonts.length; l++)
            s.fonts[l].weight === e &&
              (o && s.fonts[l].hasOwnProperty("family")
                ? s.fonts[l].family === t && i.push(s.fonts[l].style)
                : i.push(s.fonts[l].style));
        }
        return i;
      },
      subfamiliesForWeight: function (e, t, n) {
        var o = null,
          i = $(this).data("g-fonts-panel").manager;
        if (i.isCacheEmpty()) return void (n && i.query(n, "%", !0));
        let r = (0, a.getFontFamily)(t, i.searchFamilyInCache.bind(i));
        if (r && r.fonts && r.fonts.length) {
          o = [];
          for (var s = 0; s < r.fonts.length; s++)
            r.fonts[s].weight === e &&
              o.push({
                realName: r.fonts[s].family || r.family,
                subFamily: r.fonts[s].subfamily,
              });
        }
        return o;
      },
      weightsForFont: async function (e, t, n) {
        var o = null,
          i = $(this).data("g-fonts-panel").manager;
        if (i.isCacheEmpty()) return void (t && i.query(t, "%", !0));
        let r = (0, a.getFontFamily)(e, i.searchFamilyInCache.bind(i));
        if (
          (r.isLocalFont &&
            ((r.fonts = await (0, a.parseNativeFonts)(r.fonts)),
            delete r.isLocalFont),
          r && r.fonts && r.fonts.length)
        ) {
          o = [];
          for (var s = 0; s < r.fonts.length; s++)
            n &&
              r.fonts[s].hasOwnProperty("family") &&
              r.fonts[s].family === e &&
              o.push(r.fonts[s].weight),
              o.push(r.fonts[s].weight);
        }
        return o;
      },
      fontDisplayName: function (e, t) {
        var n = $(this).data("g-fonts-panel").manager;
        if (n.isCacheEmpty()) return void (t && n.query(t, "%", !0));
        let o = (0, a.getFontFamily)(e, n.searchFamilyInCache.bind(n));
        return (o && (o.displayname || o.family)) || e;
      },
      fontsLength: function () {
        return $(this).find(".fonts-row").length;
      },
    };
    $.fn.gFontsPanel = function (e) {
      return p[e]
        ? p[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : p.init.apply(this, arguments);
    };
  }