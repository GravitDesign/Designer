/**
 * Webpack Module #446
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = o(n(119)),
      r = o(n(860));
    function s(e) {
      let t =
        arguments.length > 1 && void 0 !== arguments[1]
          ? arguments[1]
          : () => {};
      (this._cb = e), (this._showFormCb = t), this._run();
    }
    i.GObject.inherit(s, i.GObject),
      (s.prototype._close = function () {
        this._dialog && this._dialog.gDialog("close");
      }),
      (s.prototype._run = function () {
        if (gDesigner.isAnonymous())
          return (
            new r.default((e) => {
              e && !e.anonymous && this._logged(e);
            }).open({ anonymous: !0, signup: !0, animate: !0 }),
            void this._showFormCb()
          );
        this._cb && this._cb();
      }),
      (s.prototype._logged = function (e) {
        this._close(), this._cb && this._cb(e);
      }),
      (s.prototype._build = function () {
        (this._dialog = $("<div/>")),
          gDesigner.getUser().then((e) => {
            if (e) this._logged(e);
            else {
              this._dialog.closest(".loading").removeClass("loading");
              var t = $("<div/>");
              t.addClass("container").appendTo(this._dialog),
                $("<div/>").addClass("logo").appendTo(t),
                $("<span/>")
                  .addClass("title")
                  .text(
                    i.GLocale.get(new i.GLocaleKey("GLoginPanel", "text.title"))
                  )
                  .appendTo(t),
                $("<span/>")
                  .addClass("subtitle")
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GLoginPanel", "text.subtitle")
                    )
                  )
                  .appendTo(t);
              var n = $("<div/>");
              n.addClass("buttons").appendTo(t);
              var o = (e, t) => {
                var o = $("<div/>");
                o.on("click", t),
                  o
                    .addClass(e)
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey("GLoginPanel", "text." + e)
                      )
                    )
                    .appendTo(n);
              };
              o("login", () => {
                a.default.performLogin().then((e) => {
                  this._logged(e);
                });
              }),
                o("signup", () => {
                  a.default.performSignup().then((e) => {
                    this._logged(e);
                  });
                });
            }
          }),
          this._dialog.gDialog({
            releaseOnClose: !0,
            className: "g-login-panel loading",
          }),
          this._dialog.gDialog("open", !0);
      }),
      (e.exports = s);
  }