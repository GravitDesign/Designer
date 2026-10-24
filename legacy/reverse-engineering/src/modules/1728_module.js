/**
 * Webpack Module #1728
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(290), n(57), n(4), n(13);
    var i,
      a,
      r,
      s = n(15),
      l = n(1),
      c = o(n(11)),
      d = n(10),
      u = n(67),
      p = o(n(1342)),
      g = {
        init: function (e) {
          if (e) {
            if (!(e instanceof u.GRichTooltipConfig))
              throw new Error("Not a Tooltip Config");
            return (
              (e = $.extend(
                {
                  title: "No title",
                  isPro: !1,
                  shortcut: null,
                  video: null,
                  pic: null,
                  description: null,
                  videoTimeout: 2e3,
                  middle: !0,
                  marginLeft: 0,
                  side: !1,
                  learnMore: null,
                  upgradeToProStatsValue: null,
                  forceShow: !1,
                  flipHorizontal: !1,
                },
                e.getConfig()
              )),
              d.IS_COREL && !e.forceShow
                ? this
                : this.each(function () {
                    const t = $(this);
                    (e._id = c.default.uuid(7)),
                      t.data("g-rich-tooltip", e),
                      t.on("mouseover", function (e) {
                        i && (clearTimeout(i), (i = null)),
                          a && (clearTimeout(a), (a = null));
                        var n = function () {
                          t.data("g-rich-tooltip-container-hovered", !0),
                            g.showTooltip.call(t, e);
                        };
                        r ? n() : (a = setTimeout(n, 500));
                      }),
                      t.on("mouseout", function (e) {
                        a && (clearTimeout(a), (a = null)),
                          t.data("g-rich-tooltip-container-hovered", !1),
                          g.hideTooltip.call(t, e);
                      }),
                      t.on("mousedown", function () {
                        a && (clearTimeout(a), (a = null));
                      });
                  })
            );
          }
        },
        showTooltip: function () {
          const e = $(this),
            t = e.data("g-rich-tooltip");
          if (r) {
            if (r.data("g-rich-tooltip-id") === t._id) return;
            g.close.call(e);
          }
          gContainer.getProperty(p.default.StoragePropertyName).then((n) => {
            (t.enhanced = "boolean" != typeof n || n),
              (r = g.createTooltip(t)).on("mouseover", function () {
                i && (clearTimeout(i), (i = null)),
                  e.data("g-rich-tooltip-self-tooltip-hovered", !0);
              }),
              r.on("mouseout", function () {
                e.data("g-rich-tooltip-self-tooltip-hovered", !1),
                  g.hideTooltip.call(e);
              }),
              r.on("click", function () {
                g.close.call(e);
              }),
              r.gOverlay("open", e);
          });
        },
        hideTooltip: function () {
          const e = $(this);
          i = setTimeout(() => {
            e.data("g-rich-tooltip-container-hovered") ||
              e.data("g-rich-tooltip-self-tooltip-hovered") ||
              g.close.call(e);
          }, 100);
        },
        createTooltip: function (e) {
          var t = 0,
            n = 4;
          return (
            e.side ? ((t = 0), (n = -6)) : e.middle && (t = -13),
            e.marginLeft && (t += parseInt(e.marginLeft)),
            e.flipHorizontal && (t = 0 - t),
            $("<div />")
              .addClass("g-rich-tooltip-container")
              .data("g-rich-tooltip-id", e._id)
              .append(g.createTooltipContent(e))
              .gOverlay({
                padding: !0,
                releaseOnClose: !0,
                bottomClazz: "from-bottom",
                rightClazz: "from-right",
                offsetY: n,
                offsetX: t,
                bottomOffsetY: 6,
                clazz:
                  "g-tooltip-content-overlay " +
                  (e.flipHorizontal ? "flip-horizontal" : ""),
                disableDarkShadow: !0,
                middle: e.middle,
                side: e.side,
                flipHorizontal: e.flipHorizontal,
              })
          );
        },
        createTooltipContent: function (e) {
          const {
            title: t,
            isPro: n,
            shortcut: o,
            video: i,
            pic: a,
            description: r,
            videoTimeout: c,
            enhanced: d,
            learnMore: u,
            upgradeToProStatsValue: p,
          } = e;
          let g = r;
          const h = gDesigner.getLicense(),
            f = (h.isPro() || h.isTrial()) && h.isExpired(),
            m = u
              ? '<a href="'
                  .concat(u, '" target="_blank">')
                  .concat(
                    l.GLocale.get(
                      new l.GLocaleKey("GCommonNames", "text.learn-more")
                    ),
                    "</a>"
                  )
              : "";
          g = g ? "".concat(g, " ").concat(m) : m;
          const y = $("<div />")
            .addClass("g-tooltip-content-wrapper")
            .toggleClass("g-pro", n)
            .append(
              $("<div />")
                .addClass("g-tooltip-content-header")
                .toggleClass("simple", !d)
                .append(
                  o && o.length
                    ? $("<div />")
                        .addClass("g-tooltip-content-shortcut")
                        .text(s.GKey.shortcutToString(o))
                    : ""
                )
                .append(
                  $("<div />")
                    .toggleClass("limit-width", !(!o || !o.length))
                    .addClass("g-tooltip-content-title")
                    .text(t)
                )
            )
            .append(
              d && g
                ? $("<div />").addClass("g-tooltip-content-description").html(g)
                : ""
            )
            .append(
              d && i && i.length
                ? $("<div />").addClass("g-tooltip-content-video loading")
                : ""
            )
            .append(
              d && a && a.length
                ? $("<div />")
                    .addClass("g-tooltip-content-picture")
                    .append(
                      $("<img />")
                        .attr("width", 298)
                        .attr("height", 160)
                        .attr("src", a)
                    )
                : ""
            )
            .append(
              d && n && f
                ? $("<div />")
                    .addClass("g-tooltip-content-footer")
                    .append(
                      $("<div />")
                        .addClass("g-tooltip-footer-pro-badge")
                        .append(
                          $("<div />")
                            .addClass("g-tooltip-pro-text")
                            .text(
                              l.GLocale.get(
                                new l.GLocaleKey(
                                  "GCommonNames",
                                  "text.try-this-feature-pro-tooltip-text"
                                )
                              )
                            )
                        )
                    )
                    .on("click", () => {
                      gDesigner.openPaymentDialog(),
                        gDesigner.stats("action_tooltips_upgradetopro", p);
                    })
                : ""
            );
          return (
            d &&
              i &&
              setTimeout(() => {
                const e = y.find(".g-tooltip-content-video");
                if (e.length) {
                  const t = $("<video />")
                    .attr("width", 298)
                    .attr("height", 160)
                    .attr("src", i)
                    .attr("autoplay", !0)
                    .attr("loop", !0);
                  t.on("loadeddata", function () {
                    e.removeClass("loading");
                  }),
                    e.append(t);
                }
              }, c),
            y
          );
        },
        close: function () {
          r && (r.gOverlay("close"), (r = void 0));
        },
      };
    $.fn.gRichTooltip = function (e) {
      return g[e]
        ? g[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : g.init.apply(this, arguments);
    };
  }