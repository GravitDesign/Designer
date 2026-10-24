/**
 * Webpack Module #1702
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(193), n(20), n(3), n(34);
    var i = n(1),
      a = n(15);
    n(1259);
    var r = o(n(1278)),
      s = {
        value: function (e) {
          var t = $(this),
            n = t.data("ginputbox");
          function o(e) {
            if (n) {
              var t = null;
              "undefined" != typeof gDesigner &&
                gDesigner.getActiveDocument() &&
                (t = gDesigner
                  .getActiveDocument()
                  .getScene()
                  .getProperty("ut"));
              var o =
                n.options && n.options.postfix !== t ? n.options.postfix : null;
              if (e && e.length && n && o) {
                var i = e.lastIndexOf(o);
                i >= 0 && (e = e.substr(0, i));
              }
            }
            return e;
          }
          function a(e) {
            if (n) {
              var t = "" === (e = o(e)),
                a = t ? null : i.GLength.parseEquationValue(e),
                r = n.options ? n.options.minValue : null,
                s = n.options ? n.options.maxValue : null;
              ("number" != typeof r && "number" != typeof s) ||
                (("number" == typeof a && isFinite(a)) ||
                (t && n.options.allowEmptyValue)
                  ? "number" == typeof r && null !== a && a < r
                    ? (e = r.toString())
                    : "number" == typeof s &&
                      null !== a &&
                      a > s &&
                      (e = s.toString())
                  : (e = "number" == typeof r ? r.toString() : s.toString()));
            }
            return e;
          }
          function r(e) {
            if (
              ((e || 0 === e) && (e = (e = e.toString()).replace(",", ".")), n)
            ) {
              if (
                ((e = a(e)),
                n.options.allowEmptyValue || e || (e = "0"),
                n.options.replace &&
                  null !== n.options.replace.oldValue &&
                  e === n.options.replace.oldValue)
              )
                return t.val(n.options.replace.newValue);
              var o = null;
              "undefined" != typeof gDesigner &&
                gDesigner.getActiveDocument() &&
                (o = gDesigner
                  .getActiveDocument()
                  .getScene()
                  .getProperty("ut"));
              var i =
                n.options && n.options.postfix !== o ? n.options.postfix : null;
              e &&
                e.length &&
                i &&
                e.substr(e.length - i.length) !== i &&
                (e += i);
            }
            var r = t[0];
            return r && (r.value = e), t;
          }
          if (arguments.length) return r(e);
          var s = t.val();
          s = o(s);
          var l = "" === s,
            c = l ? null : i.GLength.parseEquationValue(s);
          return (
            (s = a(s)),
            (n &&
              (n.options.allowEmptyValue ||
                (s && null !== c && isFinite(c)))) ||
              (s = "0"),
            s
          );
        },
        increment: function (e, t, n) {
          var o = $(this),
            a = o.data("ginputbox"),
            r = parseFloat(i.GUtil.parseNumber(s.value.call(this)));
          if ("number" == typeof r && !isNaN(r) && a) {
            var l,
              c = e
                ? a.options.fastIncrementValue
                : t && "%" !== a.options.postfix
                ? a.options.slowIncrementValue
                : a.options.incrementValue,
              d = 2;
            "undefined" != typeof gDesigner &&
              gDesigner.getActiveDocument() &&
              ((l = gDesigner.getActiveDocument().getScene().getProperty("ut")),
              (d = gDesigner
                .getActiveDocument()
                .getScene()
                .getOptimalDecimalsCount())),
              (l !== i.GLength.Unit.IN && l !== i.GLength.Unit.CM) ||
                (a.options.postfix !== l && null !== a.options.postfix) ||
                a.fixedIncrement ||
                (c *= 0.1),
              c < 1 && 0 == d && (c = 1),
              n ? (r -= c) : (r += c),
              s.value.call(this, i.GUtil.formatNumber(r, d)),
              o.change();
          }
        },
        mousemoveIncrement: function (e, t, n, o) {
          var a = $(this),
            r = a.data("ginputbox");
          if ("number" == typeof n && !isNaN(n) && r) {
            var l,
              c = e
                ? r.options.fastIncrementValue * o
                : t && "%" !== r.options.postfix
                ? o * r.options.slowIncrementValue
                : o,
              d = 2;
            "undefined" != typeof gDesigner &&
              gDesigner.getActiveDocument() &&
              ((l = gDesigner.getActiveDocument().getScene().getProperty("ut")),
              (d = gDesigner
                .getActiveDocument()
                .getScene()
                .getOptimalDecimalsCount())),
              (l !== i.GLength.Unit.IN && l !== i.GLength.Unit.CM) ||
                (r.options.postfix !== l && null !== r.options.postfix) ||
                r.fixedIncrement ||
                (c *= 0.1),
              c < 1 && 0 == d && (c = 1);
            var u = n + c;
            return (
              s.value.call(this, i.GUtil.formatNumber(u, d)), a.change(), u
            );
          }
        },
        onFocusIn: function () {
          var e = $(this);
          (e.data("ginputbox").receivingFocus = !0),
            e.css("border", "1px solid rgba(215, 46, 99, 0.3)");
        },
        onFocusOut: function () {
          var e = $(this);
          (e.data("ginputbox").insideClicked = !1),
            (e.data("ginputbox").leftMouseMoved = !1),
            e.css("border", "");
        },
        requestFocus: function () {
          var e = $(this),
            t = e.data("ginputbox");
          t.receivingFocus &&
            (t.options.selectOnFocus && e.select(), (t.receivingFocus = !1));
        },
        onMouseEnter: function () {
          var e = $(this),
            t = e.data("ginputbox");
          !t.insideClicked &&
            t.options.mousemoveIncrement &&
            (e.css("cursor", "url(assets/cursor/cursor-scrub.svg) 16 16, auto"),
            e.css("border", "1px solid rgba(215, 46, 99, 0.3)"));
        },
        onMouseLeave: function () {
          var e = $(this),
            t = e.data("ginputbox");
          t.leftMouseMoved ||
            t.insideClicked ||
            !t.options.mousemoveIncrement ||
            (e.css("cursor", ""), e.css("border", ""));
        },
        leftMouseDown: function (e) {
          var t = $(this),
            n = t.data("ginputbox");
          if (
            ((n.strValue = t.val()),
            !n.insideClicked && n.options.mousemoveIncrement)
          ) {
            t.css("border", "1px solid rgba(215, 46, 99, 0.3)"),
              (n.leftMouseMoved = !1);
            var o = parseFloat(i.GUtil.parseNumber(s.value.call(this)));
            "" === n.strValue && isNaN(o) && (o = 0);
            var r = null,
              l = t.scrollParent();
            "undefined" != typeof gDesigner &&
              l &&
              gDesigner.isTouchDevice() &&
              l.css("overflow-y", "hidden");
            var c = function (e) {
                e.originalEvent.cancelable && e.preventDefault();
                var i = 0,
                  l =
                    e.pageY ||
                    (e.originalEvent.changedTouches &&
                      e.originalEvent.changedTouches[0] &&
                      e.originalEvent.changedTouches[0].pageY);
                null === r
                  ? ($("html").css(
                      "cursor",
                      "url(assets/cursor/cursor-scrub.svg) 16 16, auto"
                    ),
                    $("html").css("user-select", "none"),
                    $("body").css("pointer-events", "none"),
                    (n.leftMouseMoved = !0),
                    (r = l))
                  : ((i = r - l), (r = l)),
                  (o = s.mousemoveIncrement.call(
                    t[0],
                    a.GPlatform.modifiers.shiftKey || e.shiftKey,
                    a.GPlatform.modifiers.optionKey || e.altKey,
                    o,
                    i
                  ));
              },
              d = function (e) {
                $("body").css("pointer-events", ""),
                  $("html").css("cursor", ""),
                  $("html").css("user-select", ""),
                  $("html").unbind("mousemove", c),
                  $("html").unbind("mouseup", d),
                  t.off("touchmove", c),
                  "undefined" != typeof gDesigner &&
                    !gDesigner.isTouchDevice() &&
                    n.leftMouseMoved &&
                    t.blur(),
                  "undefined" != typeof gDesigner &&
                    gDesigner.isTouchDevice() &&
                    (l && l.css("overflow-y", "auto"),
                    t.is(":focus") || t.css("border", ""));
              };
            t.on("touchmove", c),
              $("html").bind("mousemove", c),
              $("html").bind("mouseup", d);
          }
        },
        leftMouseUp: function () {
          var e = $(this),
            t = e.data("ginputbox");
          t.options.mousemoveIncrement &&
            (t.leftMouseMoved || ((t.insideClicked = !0), e.css("cursor", "")),
            "undefined" != typeof gDesigner &&
              gDesigner.isTouchDevice() &&
              t.leftMouseMoved &&
              t.strValue === e.val() &&
              e.trigger("focus"));
        },
        isInit: function () {
          return !!$(this).data("ginputbox");
        },
        init: function (e) {
          return (
            this.each(function () {
              var t = this,
                n = $(this);
              (e = $.extend(
                {
                  selectOnFocus: !0,
                  triggerChangeOnEnter: !0,
                  keyIncrement: !0,
                  wheelIncrement: !0,
                  mousemoveIncrement: !0,
                  incrementValue: 1,
                  fastIncrementValue: 10,
                  slowIncrementValue: 0.1,
                  fixedIncrement: !1,
                  minValue: null,
                  maxValue: null,
                  postfix: null,
                },
                e
              )),
                n
                  .data("ginputbox", {
                    options: e,
                    receivingFocus: !1,
                    enterKeyValue: void 0,
                    insideClicked: !1,
                    leftMouseMoved: !1,
                    strValue: void 0,
                  })
                  .prop("draggable", !1),
                e.created ||
                  n
                    .on("change", function (e) {
                      s.value.call(t, n.val());
                    })
                    .on("focusin", function (e) {
                      s.onFocusIn.call(t);
                    })
                    .on("focusout", function (e) {
                      s.onFocusOut.call(t);
                    })
                    .on("click", function (e) {
                      s.requestFocus.call(t);
                    })
                    .on("wheel", function (e) {
                      if (
                        n.data("ginputbox").options.wheelIncrement &&
                        n.is(":focus")
                      ) {
                        e.preventDefault();
                        var o =
                          0 != e.originalEvent.deltaX
                            ? e.originalEvent.deltaX
                            : e.originalEvent.deltaY;
                        s.increment.call(
                          t,
                          a.GPlatform.modifiers.shiftKey || e.shiftKey,
                          a.GPlatform.modifiers.optionKey || e.altKey,
                          o > 0
                        );
                      }
                    })
                    .on("keydown", function (e) {
                      var o = n.data("ginputbox");
                      (38 != e.keyCode && 40 !== e.keyCode) ||
                        !o.options.keyIncrement ||
                        (e.preventDefault(),
                        s.increment.call(
                          t,
                          a.GPlatform.modifiers.shiftKey || e.shiftKey,
                          a.GPlatform.modifiers.optionKey || e.altKey,
                          40 === e.keyCode
                        ),
                        n.trigger("focus")),
                        13 === e.keyCode &&
                          o.options.triggerChangeOnEnter &&
                          n.blur();
                    })
                    .on("mouseenter", function (e) {
                      r.default.isEnabled() &&
                        (e.preventDefault(), s.onMouseEnter.call(t));
                    })
                    .on("mouseleave", function (e) {
                      r.default.isEnabled() && s.onMouseLeave.call(t);
                    })
                    .on("mousedown", function (e) {
                      r.default.isEnabled() &&
                        1 === e.which &&
                        (s.leftMouseDown.call(t, e),
                        $(this)
                          .parents(".properties-panel")
                          .addClass("noscroll"));
                    })
                    .on("mouseup", function (e) {
                      r.default.isEnabled() &&
                        1 === e.which &&
                        (s.leftMouseUp.call(t),
                        $(this)
                          .parents(".properties-panel")
                          .removeClass("noscroll"));
                    });
            }),
            this
          );
        },
      };
    $.fn.gInputBox = function (e) {
      return s[e]
        ? s[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : s.init.apply(this, arguments);
    };
  }