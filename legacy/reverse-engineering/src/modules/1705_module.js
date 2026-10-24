/**
 * Webpack Module #1705
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    var o = n(1),
      i = {
        value: function (e) {
          var t = i.options.call(this).unit;
          if (arguments.length > 0) {
            if (e) {
              var n = gDesigner.getActiveDocument(),
                a = n ? n.getScene() : null;
              $(this).gInputBox(
                "value",
                o.GUtil.formatNumber(
                  e.toUnit(t),
                  a ? a.getOptimalDecimalsCount(t) : 2
                )
              );
            } else $(this).val("");
            return this;
          }
          var r = o.GLength.parseEquation($(this).val(), t);
          return r ? r.convert(t) : new o.GLength(0, t);
        },
        list: function (e) {
          i.options.call(this).list = e;
        },
        options: function () {
          return $(this).data("ginputbox").options;
        },
        init: function (e) {
          return (
            ((e = $.extend(
              { unit: o.GLength.Unit.PX, created: !1 },
              e
            )).postfix = e.unit),
            this.each(function () {
              var t = $(this),
                n = this;
              $(this).hasClass("g-unitbox")
                ? (e.created = !0)
                : t.addClass("g-unitbox").attr("type", "text"),
                t.gInputBox("isInit") || t.gInputBox(e);
              var a = function () {
                let e = t.gInputBox("value"),
                  n = $(".g-unitbox.option-list").find(".option-item");
                if ((n.removeClass("g-selected"), e))
                  for (let t = 0; t < n.length; ++t) {
                    let o = n[t];
                    $(o).data("value") == e && $(o).addClass("g-selected");
                  }
              };
              t.on("change", function () {
                a();
              }),
                e.list &&
                  (t.unbind("click"),
                  t.on("click", function (r) {
                    gDesigner.stats("unitbox_" + (e.source || "") + "_button");
                    for (
                      var s = $("<div></div>")
                          .addClass("g-unitbox")
                          .addClass("option-list"),
                        l = $("<div></div>"),
                        c = 0;
                      c < e.list.length;
                      c++
                    )
                      $("<div></div>")
                        .addClass("option-item")
                        .text(e.list[c] + " " + e.postfix)
                        .data("value", e.list[c])
                        .on("mousedown", function () {
                          i.value.call(
                            n,
                            new o.GLength($(this).data("value"), e.unit)
                          ),
                            t.trigger("change"),
                            l.gOverlay("close");
                        })
                        .appendTo(s);
                    l.append(s).gOverlay({
                      releaseOnClose: !0,
                      padding: !1,
                      enterCallback: function () {
                        var a = $(".g-unitbox.option-list").find(
                          ".option-item:hover"
                        );
                        a.length > 0 &&
                          (i.value.call(
                            n,
                            new o.GLength($(a).data("value"), e.unit)
                          ),
                          t.trigger("change")),
                          l.gOverlay("close");
                      },
                    }),
                      l.css("min-width", t.outerWidth()),
                      l.gOverlay("open", n),
                      a(),
                      t.gInputBox("requestFocus");
                  }));
            }),
            this
          );
        },
      };
    $.fn.gUnitBox = function (e) {
      return i[e]
        ? i[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : i.init.apply(this, arguments);
    };
  }