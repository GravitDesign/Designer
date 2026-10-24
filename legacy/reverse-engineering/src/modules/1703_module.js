/**
 * Webpack Module #1703
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13), n(32), n(38), n(33);
    var o = n(1);
    const i = n(238),
      a = n(444);
    var r = {
      value: function (e) {
        return arguments.length > 0
          ? ($(this).find("input").gInputBox("value", e), this)
          : $(this).find("input").gInputBox("value");
      },
      init: function (e) {
        return (
          this.each(function () {
            e = o.GUtil.extend({ list: [] }, e);
            const t = new i();
            e.list
              .map((e) => ("object" != typeof e ? { title: e, data: e } : e))
              .forEach((e) => {
                let { title: n, data: o } = e;
                return t.createAddItem(n).setData(o);
              });
            const n = $(this);
            n.addClass("g-input-select")
              .append(
                $("<input/>")
                  .attr("type", "text")
                  .gInputBox(e)
                  .on("change", () => n.trigger("change"))
              )
              .append(
                $("<button></button>")
                  .css("display", e.list.length ? "" : "none")
                  .on("click", (e) => {
                    t.open(
                      e.target,
                      a.Position.Right_Bottom,
                      a.Position.Right_Bottom,
                      (t) => {
                        $(e.target)
                          .closest(".g-input-select")
                          .find("input")
                          .val(t.getData())
                          .trigger("change");
                      }
                    );
                  })
              );
          }),
          this
        );
      },
    };
    $.fn.gInputSelect = function (e) {
      return r[e]
        ? r[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.gInputSelect")
        : r.init.apply(this, arguments);
    };
  }