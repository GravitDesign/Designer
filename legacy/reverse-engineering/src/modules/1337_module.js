/**
 * Webpack Module #1337
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o() {}
    n(4),
      n(13),
      (o.Orientation = { Vertical: "vertical", Horizontal: "horizontal" }),
      (function (e) {
        const t = {
          _toggleTransitions: function (t) {
            return e(this).toggleClass("g-transitions-off", !t), this;
          },
          _toggleVisibilty: function (t) {
            const n = e(this);
            if (n.hasClass("expanded") !== t)
              return (
                n.toggleClass("collapsed", !t).toggleClass("expanded", t),
                n.hasClass(o.Orientation.Vertical)
                  ? n
                      .children(".g-collapsible-button:first")
                      .find("span")
                      .toggleClass("gravit-icon-touch-arrow-up", !t)
                      .toggleClass("gravit-icon-touch-arrow-down", t)
                  : n
                      .siblings(".g-collapsible-button:first")
                      .find("span")
                      .toggleClass("gravit-icon-touch-arrow-right", !t)
                      .toggleClass("gravit-icon-touch-arrow-left", t),
                this
              );
          },
          init: function (n) {
            n = e.extend({ orientation: o.Orientation.Vertical }, n);
            const i = this;
            return this.each(function () {
              const o = e(this)
                .addClass("g-collapsible g-transitions-off expanded")
                .addClass(n.orientation);
              "vertical" === n.orientation
                ? o.prepend(
                    e("<div/>")
                      .addClass("g-collapsible-button")
                      .append(
                        e("<span/>").addClass("gravit-icon-touch-arrow-down")
                      )
                      .on("click", () => {
                        const e = o.hasClass("expanded");
                        t._toggleTransitions.call(i, !0),
                          t._toggleVisibilty.call(i, !e),
                          o.trigger("visibilitychanged", [!e]);
                      })
                  )
                : o.before(
                    e("<div/>")
                      .addClass("g-collapsible-button")
                      .append(
                        e("<span/>").addClass("gravit-icon-touch-arrow-left")
                      )
                      .on("click", () => {
                        const e = o.hasClass("expanded");
                        t._toggleTransitions.call(i, !0),
                          t._toggleVisibilty.call(i, !e, !0),
                          o.trigger("visibilitychanged", [!e]);
                      })
                  );
            });
          },
          collapse: function () {
            return t._toggleVisibilty.call(this, !1);
          },
          expand: function () {
            return t._toggleVisibilty.call(this, !0);
          },
        };
        e.fn.gCollapsible = function (n) {
          return t[n]
            ? t[n].apply(this, Array.prototype.slice.call(arguments, 1))
            : "object" != typeof n && n
            ? void e.error(
                "Method " + n + " does not exist on jQuery.gCollapsible"
              )
            : t.init.apply(this, arguments);
        };
      })(jQuery),
      (e.exports = o);
  }