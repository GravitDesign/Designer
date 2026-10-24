/**
 * Webpack Module #1723
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = o(n(565)),
      r = {
        init: function (e) {
          return (
            (e = $.extend({ allowDrag: !0, allowDrop: !0 }, e)),
            this.each(function () {
              var t = this,
                n = $(this);
              n.data("gpatterntarget", {
                options: e,
                pattern: null,
                types: null,
              }),
                e.allowDrag &&
                  n
                    .attr("draggable", "true")
                    .attr("data-drag-mode", a.default.PRESS_AND_HOLD)
                    .on("dragstart", function (e) {
                      var t = e.originalEvent,
                        o = n.data("gpatterntarget").pattern;
                      if (o) {
                        t.stopPropagation(), n.trigger("patterndrag", o);
                        var a = gDragImage().css({
                          background: i.GPattern.asCSSBackground(o),
                          width: "20px",
                          height: "20px",
                        });
                        t.dataTransfer.setDragImage(a[0], 10, 10),
                          (t.dataTransfer.effectAllowed = "move"),
                          t.dataTransfer.setData(
                            i.GPattern.MIME_TYPE,
                            i.GPattern.serialize(o)
                          ),
                          (t.dataTransfer.sourceElement = this);
                      } else t.preventDefault();
                    })
                    .on("dragend", function (e) {
                      e.stopPropagation();
                    }),
                e.allowDrop &&
                  n
                    .on("dragover", function (e) {
                      e.stopPropagation();
                      var t = e.originalEvent;
                      t.preventDefault(),
                        t.stopPropagation(),
                        (e.originalEvent.dataTransfer.dropEffect = "move");
                    })
                    .on("drop", function (e) {
                      e.stopPropagation();
                      var o = n.data("gpatterntarget"),
                        a = e.originalEvent,
                        s = a.dataTransfer.getData(i.GPattern.MIME_TYPE);
                      if (s && (s = i.GPattern.deserialize(s))) {
                        var l = !0;
                        if (o.types && o.types.length > 0) {
                          l = !1;
                          for (var c = 0; c < o.types.length; ++c)
                            if (o.types[c] && s instanceof o.types[c]) {
                              l = !0;
                              break;
                            }
                        }
                        if (l) {
                          var d = n.data("gpatterntarget").pattern;
                          i.GUtil.equals(s, d) ||
                            (r.value.call(t, s), n.trigger("patternchange", s)),
                            n.trigger("patterndrop", [s, a]);
                        }
                      }
                      return !1;
                    });
            })
          );
        },
        value: function (e) {
          var t = $(this),
            n = t.data("gpatterntarget") || {};
          return arguments.length
            ? ((e = "string" == typeof e ? i.GPattern.deserialize(e) : e),
              (n.pattern = e),
              this)
            : n.pattern || null;
        },
        types: function (e) {
          var t = $(this),
            n = t.data("gpatterntarget");
          return arguments.length ? ((n.types = e), this) : n.types;
        },
      };
    $.fn.gPatternTarget = function (e) {
      return r[e]
        ? r[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : r.init.apply(this, arguments);
    };
  }