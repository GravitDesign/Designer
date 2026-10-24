/**
 * Webpack Module #1698
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(13);
    var o = n(53),
      i = n(1),
      a = n(15);
    const r = n(1699);
    function s() {}
    i.GObject.inheritAndMix(s, i.GObject);
    var l = {
      init: function (e) {
        return (
          (e = $.extend({}, e)),
          this.each(function () {
            var t = this,
              n = $(this);
            n.addClass("g-button")
              .data("g-eye-dropper", {
                picker: null,
                documentMove: null,
                documentMouseDown: null,
                documentKeyDown: null,
                rgba: null,
              })
              .attr(
                "data-title",
                i.GLocale.get(new i.GLocaleKey("GEyeDropper", "text.tooltip"))
              )
              .append($("<span></span>").addClass("gravit-icon-picker"))
              .on("click", function (o) {
                n.closest(".g-disabled").length ||
                  (e.onClick
                    ? e.onClick.call(this)
                    : gDesigner.stats("eyedropper_click_pick"),
                  o.stopPropagation(),
                  o.preventDefault(),
                  l.setActive.call(t, !l.isActive.call(t), o.pageX, o.pageY));
              });
          })
        );
      },
      isActive: function () {
        var e = $(this).data("g-eye-dropper");
        return !!e && !!e.picker;
      },
      setValue: function (e) {
        const t = $(this),
          n = "string" == typeof e ? e : i.GPattern.asCSSBackground(e);
        t.find(".g-eye-dropper-preview-color-difference")
          .find(".current")
          .css({ background: n });
        const o = t.data("g-eye-dropper") || {};
        (o.currentColor = n), t.data("g-eye-dropper", o);
      },
      setActive: function (e, t, n) {
        if (e !== l.isActive.call(this)) {
          var s = $(this),
            c = s.data("g-eye-dropper"),
            d = function () {
              gDesigner
                .getToolManager()
                .removeEventListener(o.GToolManager.ToolChangedEvent, d, this),
                $(".g-eye-dropper-picker").remove();
            }.bind(this);
          if (e) {
            var u = gDesigner.getWindows().getActiveWindow();
            if (!u) return;
            s.addClass("g-active");
            for (
              var p = u
                  .getView()
                  .getSceneCanvas()
                  .getBitmap()
                  .getHTMLElement(!0),
                g = i.GPaintCanvas.getScreenDPI(),
                h = $("<canvas></canvas>")
                  .attr({ width: 135, height: 135 })
                  .addClass("g-cursor-pixel g-eye-dropper-preview"),
                f = $("<span></span>").addClass("g-eye-dropper-preview-color"),
                m = $("<span/>")
                  .addClass("g-eye-dropper-preview-color-difference")
                  .append(
                    $("<div/>")
                      .addClass("color-preview")
                      .addClass("current")
                      .css({ background: c.currentColor })
                  )
                  .append(
                    $("<div/>").addClass("color-preview").addClass("new")
                  ),
                y = $("<div/>").addClass("g-eye-dropper-color-pointer"),
                v = h[0].getContext("2d"),
                _ = [
                  "imageSmoothingEnabled",
                  "webkitImageSmoothingEnabled",
                  "mozImageSmoothingEnabled",
                ],
                b = 0;
              b < _.length;
              ++b
            ) {
              var w = _[b];
              if (CanvasRenderingContext2D.prototype.hasOwnProperty(w)) {
                v[w] = !1;
                break;
              }
            }
            c.picker = $("<div></div>")
              .addClass("g-eye-dropper-picker g-cursor-pixel")
              .append(h)
              .append(f)
              .append(m)
              .append(y)
              .appendTo($("body"));
            var C = function (e) {
              return 1 == e.length ? "0" + e : e;
            };
            function x(e, t) {
              if (
                (v.setTransform(1, 0, 0, 1, 0, 0), u.viewContainsMouse(e, t))
              ) {
                var n = e * g,
                  o = t * g;
                (n = Math.max(0, Math.min(n, p.width))),
                  (o = Math.max(0, Math.min(o, p.height)));
                var a = p.getContext("2d").getImageData(n, o, 1, 1).data,
                  r =
                    C(a[0].toString(16)) +
                    C(a[1].toString(16)) +
                    C(a[2].toString(16));
                (r = r.toUpperCase()), (c.rgba = a);
                const i = gDesigner.isTouchEnabled() ? 10 : 5;
                h.css(
                  "box-shadow",
                  "0 0 0 ".concat(i, "px rgb(") +
                    a[0] +
                    "," +
                    a[1] +
                    "," +
                    a[2] +
                    ")"
                ),
                  f.text("R:" + a[0] + " G:" + a[1] + " B:" + a[2] + " #" + r),
                  f.css({
                    display: "block",
                    top: t + 5 + "px",
                    left: e - 55 + "px",
                  }),
                  m.find(".new").css({ background: "#" + r }),
                  y.css({
                    display: "block",
                    top: t - 5 + "px",
                    left: e - 5 + "px",
                  }),
                  m.css({
                    display: "block",
                    top: t - 76 + "px",
                    left: e - 78 + "px",
                  }),
                  v.clearRect(0, 0, 135, 135),
                  v.drawImage(p, e * g - 8, t * g - 8, 16, 16, 0, 0, 135, 135);
              } else
                (c.rgba = null),
                  h.css("box-shadow", ""),
                  f.css({ display: "none" }),
                  m.css({ display: "none" }),
                  y.attr("style", "display: none !important"),
                  v.clearRect(0, 0, 135, 135),
                  (v.fillStyle = "rgba(0,0,0,0.75)"),
                  v.scale(0.9, 0.9),
                  v.fillText(
                    i.GLocale.get(
                      new i.GLocaleKey("GEyeDropper", "text.preview")
                    ),
                    10,
                    72,
                    135
                  );
            }
            gDesigner.isTouchEnabled() &&
              (c.draggablePoint = new r(
                h.get(0),
                (e) => {
                  const t = h.get(0).getBoundingClientRect();
                  let n = e.pageX,
                    o = e.pageY;
                  (n -= t.width - 8),
                    (o -= t.height - 30),
                    (n += 8),
                    (o += 8),
                    h.css({ left: n + "px", top: o + "px" });
                  const i = h.get(0).getBoundingClientRect(),
                    a = i.left + i.width / 2,
                    r = i.top + i.height / 2;
                  x.call(this, a, r);
                },
                () => {
                  l.setActive.call(this, !1),
                    c.rgba && s.trigger("colorchange", [c.rgba]);
                }
              )),
              (c.documentMove = function (e) {
                if (gDesigner.isTouchEnabled()) return;
                const t = e.pageX,
                  n = e.pageY,
                  o = h.get(0).getBoundingClientRect(),
                  i = t - o.width / 2 + 8,
                  a = n - o.height / 2 + 8;
                h.css({ left: i + "px", top: a + "px" }), x.call(this, t, n);
              }.bind(this)),
              (c.documentMouseDown = function (e) {
                gDesigner.isTouchEnabled()
                  ? l.isActive.call(this)
                    ? l.setActive.call(this, !1)
                    : l.setActive.call(this, !0)
                  : (l.setActive.call(this, !1),
                    c.rgba && s.trigger("colorchange", [c.rgba]));
              }.bind(this)),
              (c.documentKeyDown = function (e) {
                a.GKey.translateKey(e.keyCode) === a.GKey.Constant.ESC &&
                  l.setActive.call(this, !1);
              }.bind(this)),
              "number" == typeof t &&
                "number" == typeof n &&
                (gDesigner.isTouchEnabled()
                  ? c.draggablePoint.moveTo(t, n, !0)
                  : c.documentMove({ pageX: t, pageY: n })),
              document.addEventListener("keydown", c.documentKeyDown),
              document.addEventListener("mousedown", c.documentMouseDown),
              document.addEventListener("mousemove", c.documentMove),
              gDesigner
                .getToolManager()
                .addEventListener(o.GToolManager.ToolChangedEvent, d, this);
          } else
            document.removeEventListener("keydown", c.documentKeyDown),
              document.removeEventListener("mousedown", c.documentMouseDown),
              document.removeEventListener("mousemove", c.documentMove),
              gDesigner
                .getToolManager()
                .removeEventListener(o.GToolManager.ToolChangedEvent, d, this),
              c.picker.remove(),
              (c.picker = null),
              (c.documentKeyDown = null),
              (c.documentMouseDown = null),
              (c.documentMove = null),
              c.draggablePoint && c.draggablePoint.unmount(),
              s.removeClass("g-active");
        }
      },
    };
    (e.exports = s),
      ($.fn.gEyeDropper = function (e) {
        return l[e]
          ? l[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : l.init.apply(this, arguments);
      });
  }