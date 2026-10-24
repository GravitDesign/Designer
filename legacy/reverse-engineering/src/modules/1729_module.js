/**
 * Webpack Module #1729
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    var o = function (e, t) {
        var n = $(e);
        n.addClass(t ? "collapsed" : "expanded"),
          n.removeClass(t ? "expanded" : "collapsed");
        var o = $(n.find(".gravit-icon-down,.gravit-icon-right")[0]);
        o.removeClass(t ? "gravit-icon-down" : "gravit-icon-right"),
          o.addClass(t ? "gravit-icon-right" : "gravit-icon-down");
      },
      i = {
        init: function (e, t, n, i) {
          return this.each(function () {
            var a = $(this).next(e);
            if (!$(this).hasClass("accordion")) {
              var r = $("<span></span>").addClass(
                  $(this).hasClass("collapsed")
                    ? "gravit-icon-right"
                    : "gravit-icon-down"
                ),
                s = $("<button></button>")
                  .addClass("g-accordion")
                  .on(
                    "click",
                    function () {
                      a.toggle();
                      var e = "none" === a.css("display");
                      o(this, e),
                        i &&
                          gDesigner.stats(
                            "".concat(i, "_toggle_page"),
                            e ? "Collapse" : "Expand"
                          ),
                        $(this).trigger("change");
                    }.bind(this)
                  )
                  .append(r),
                l = $("<div/>").addClass("g-accordion-ghost");
              if (t) {
                var c = $(this).find(t + ":first");
                n
                  ? $(s).insertBefore(c)
                  : ($(s).insertAfter(c), $(l).insertAfter(s)),
                  c
                    .on("click", function () {
                      s.trigger("click");
                    })
                    .on("mouseover", function () {
                      s.toggleClass("hovered");
                    })
                    .on("mouseout", function () {
                      s.toggleClass("hovered");
                    });
              } else $(this).append(s), $(this).append(l);
              $(this).addClass("accordion");
            }
            a.css("display", $(this).hasClass("collapsed") ? "none" : "");
          });
        },
        toggleOpen: function (e) {
          o(this, !e);
        },
      };
    $.fn.gAccordion = function (e) {
      return i[e]
        ? i[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : i.init.apply(this, arguments);
    };
  }