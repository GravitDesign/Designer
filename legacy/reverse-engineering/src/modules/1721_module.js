/**
 * Webpack Module #1721
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57);
    var o = n(1156),
      i = n(444),
      a = {
        init: function (e) {
          return (
            (e = $.extend(
              {
                menu: null,
                defaultAction: null,
                dblclick: null,
                touch: !1,
                reference: null,
              },
              e
            )),
            this.each(function () {
              var t = this,
                n = null;
              "function" == typeof e.menu &&
                ((e.menuFactory = e.menu), (e.menu = e.menuFactory())),
                e.menu.setTouchMode(!!e.touch);
              $(this)
                .addClass("g-menu-button")
                .data("gmenubutton", { options: e })
                .on("mousedown", function (o) {
                  if ((o.stopPropagation(), e.menuFactory)) {
                    const t = e.menuFactory();
                    if (t !== e.menu) {
                      e.menu.clearItems();
                      for (let n = 0; n < t.getItemCount(); ++n)
                        e.menu.addItem(t.getItem(n));
                    }
                  }
                  e.dblclick
                    ? setTimeout(() => {
                        parseInt($(t).data("dblclicked"), 10)
                          ? e.menu.isOpen() && a.close.call(t)
                          : e.defaultAction
                          ? (n = setTimeout(
                              function () {
                                a.open.call(t), (n = null);
                              }.bind(this),
                              250
                            ))
                          : e.menu.isOpen()
                          ? a.close.call(t)
                          : a.open.call(t);
                      }, 500)
                    : e.defaultAction
                    ? (n = setTimeout(
                        function () {
                          a.open.call(t), (n = null);
                        }.bind(this),
                        250
                      ))
                    : e.menu.isOpen()
                    ? a.close.call(t)
                    : a.open.call(t);
                })
                .on("mouseup", function (o) {
                  o.stopPropagation(),
                    e.dblclick
                      ? setTimeout(() => {
                          var o = parseInt($(t).data("dblclicked"), 10);
                          o
                            ? $(t).data("dblclicked", o - 1)
                            : (null !== n && (clearTimeout(n), (n = null)),
                              !e.menu.isOpen() &&
                                e.defaultAction &&
                                e.defaultAction());
                        }, 500)
                      : (null !== n && (clearTimeout(n), (n = null)),
                        !e.menu.isOpen() &&
                          e.defaultAction &&
                          e.defaultAction());
                })
                .on("dblclick", function (n) {
                  n.stopPropagation(),
                    e.dblclick &&
                      ($(t).data("dblclicked", 2), e.dblclick.call(t));
                });
            })
          );
        },
        open: function () {
          var e = $(this),
            t = e.data("gmenubutton").options,
            n = t.menu;
          if (!n.isOpen()) {
            e.addClass("g-active");
            var a,
              r = function () {
                e.removeClass("g-active"), n.removeEventListener(o, r);
              };
            if (
              (n.addEventListener(o, r),
              t.reference &&
                (t.reference instanceof jQuery ||
                t.reference instanceof HTMLElement
                  ? (a = t.reference)
                  : "function" == typeof t.reference && (a = t.reference())),
              a instanceof HTMLElement && (a = $(a)),
              a || (a = e),
              n.open(
                a,
                i.Position.Center,
                i.Position.Right_Bottom,
                function (t) {
                  e.trigger("menuitemactivate", t);
                }
              ),
              t.getActiveItem && "function" == typeof t.getActiveItem)
            ) {
              const e = t.getActiveItem();
              e && n.setActiveItem(e);
            }
          }
        },
        close: function () {
          var e = $(this).data("gmenubutton").options.menu;
          e.isOpen() && e.close();
        },
      };
    $.fn.gMenuButton = function (e) {
      return a[e]
        ? a[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : a.init.apply(this, arguments);
    };
  }