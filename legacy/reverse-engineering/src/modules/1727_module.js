/**
 * Webpack Module #1727
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57), n(4), n(13);
    var o = [];
    function i() {
      if (o.length > 0) {
        var e = $(o[o.length - 1]);
        $(e).data("gdialog").closable && e.gDialog("close", !0);
      }
    }
    document.addEventListener("keydown", function (e) {
      27 === e.keyCode && i();
    });
    var a = {
      init: function (e) {
        return (
          (e = $.extend(
            {
              releaseOnClose: !0,
              className: "",
              buttons: null,
              openCallback: null,
              closeCallback: null,
              nowrap: !1,
              closeTimeout: null,
              alwaysCloseable: !1,
            },
            e
          )),
          this.each(function () {
            var t = $(this).data("gdialog", { options: e, closable: !1 });
            if (
              (e.nowrap ||
                t.addClass("g-dialog-content").wrap(
                  $("<div></div>")
                    .addClass("g-dialog")
                    .addClass(e.className || "")
                ),
              e.buttons && e.buttons.length)
            )
              for (
                var n = $("<div></div>")
                    .addClass("g-dialog-footer")
                    .appendTo(t.closest(".g-dialog")),
                  o = $("<div/>").addClass("buttons").appendTo(n),
                  i = 0;
                i < e.buttons.length;
                ++i
              )
                $(e.buttons[i]).appendTo(o);
          })
        );
      },
      open: function (e) {
        var t = $(this),
          n = t.data("gdialog"),
          a = n.options || {};
        n && (n.closable = e || !1);
        var r = t.closest(".g-dialog"),
          s = $("<div></div>")
            .addClass("g-dialog-container")
            .on("mousedown", (e) =>
              $(e.target).hasClass("g-dialog-container") &&
              0 === $(e.target).find(".g-overlay").length
                ? i()
                : void 0
            )
            .append(r)
            .appendTo($("body"));
        if (n) {
          const { options: { className: e } = {} } = n;
          e && s.addClass("".concat(e, "-container"));
        }
        return (
          o.push(this[0]),
          t.trigger("open"),
          s.addClass("visible"),
          a && a.openCallback && a.openCallback.call(this),
          this
        );
      },
      isOpen: function () {
        return o.length && o[o.length - 1] === this[0];
      },
      close: function (e, t) {
        var n = $(this),
          i = n.data("gdialog").options || {};
        if (
          (i.alwaysCloseable && o.indexOf(this[0]) >= 0) ||
          (o.length && o[o.length - 1] === this[0])
        ) {
          var a = n.closest(".g-dialog-container");
          if (
            (a.removeClass("visible"),
            setTimeout(() => {
              i.releaseOnClose
                ? n.closest(".g-dialog").remove()
                : n.parents(".g-dialog").detach(),
                a.remove();
            }, parseInt(isNaN(t) ? (isNaN(i.closeTimeout) ? 250 : i.closeTimeout) : t)),
            i.alwaysCloseable)
          ) {
            var r = o.indexOf(this[0]);
            o.splice(r, 1);
          } else o.pop();
          i && i.closeCallback && i.closeCallback(e);
        }
        return this;
      },
    };
    $.fn.gDialog = function (e) {
      return a[e]
        ? a[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : a.init.apply(this, arguments);
    };
  }