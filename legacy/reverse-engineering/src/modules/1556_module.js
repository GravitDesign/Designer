/**
 * Webpack Module #1556
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(34), n(91), n(4), n(13);
    var i = n(1),
      a = o(n(44));
    function r(e, t, n, o) {
      let r =
        arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : {};
      var s = this;
      (this._dialog = $("<div></div>")),
        $("<div/>")
          .css("display", "grid")
          .append(
            $("<span/>")
              .css("display", "block")
              .html(
                i.GLocale.get(
                  new i.GLocaleKey("GNewFilePrompt", "text.name-document")
                )
              )
          )
          .append(
            $("<input/>")
              .attr("type", "text")
              .css("margin-top", "10px")
              .css("width", "100%")
              .val(o || "")
              .addClass("name")
          )
          .appendTo(this._dialog);
      var l = function (e) {
          13 === e.which &&
            (gDesigner.stats("newfile_enter_save"), c(), e.stopPropagation());
        },
        c = function () {
          if ($(s._dialog).find(".name").val().trim()) {
            var t = $(s._dialog).find(".name").val();
            r && r.fn && !r.fn(t)
              ? a.default.alert(
                  r.errorMessage.replace("%fileName%", '"'.concat(t, '"'))
                )
              : (e(t), s.close());
          }
        };
      $(s._dialog).find(".name").keypress(l),
        this._dialog.gDialog({
          className: "g-new-file-prompt-dialog",
          releaseOnClose: !1,
          closeCallback: t,
          buttons: [
            $(
              "<button"
                .concat(n ? ' class="'.concat(n, '"') : "", ">")
                .concat(
                  i.GLocale.get(
                    new i.GLocaleKey("GNewFilePrompt", "action.create")
                  ),
                  "</button>"
                )
            ).on("click", function () {
              gDesigner.stats("newfile_click_save"), c();
            }),
            $(
              "<button>" +
                i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")) +
                "</button>"
            ).on("click", function () {
              gDesigner.stats("newfile_click_close"), s.close();
            }),
          ],
        });
    }
    i.GObject.inherit(r, i.GObject),
      (r.prototype.open = function () {
        this._dialog.gDialog("open", !0), $(this._dialog).find(".name").focus();
      }),
      (r.prototype.close = function () {
        this._dialog.gDialog("close");
      }),
      (e.exports = r);
  }