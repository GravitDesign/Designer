/**
 * Webpack Module #841
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(96), n(4), n(13), n(32), n(33);
    var o = n(1);
    function i(e, t, n, i) {
      (this._dialog = $("<div></div>")),
        (this._replacedFonts = {}),
        (this.opened = !1),
        (this._document = e),
        (this._callbacks = []),
        (this._keepFontsButton = $(
          "<button>" +
            o.GLocale.get(
              new o.GLocaleKey("GMissingFontsDialog", "action.keep-fonts")
            ) +
            "</button>"
        ).on("click", () => this._keepFonts())),
        this._hasFakeTextNodes() ||
          (this._keepFontsButton.addClass("g-disabled"),
          this._keepFontsButton.attr("disabled", !0)),
        i && this._callbacks.push(i),
        $("<div></div>")
          .addClass("title")
          .text(
            o.GLocale.get(
              new o.GLocaleKey("GMissingFontsDialog", "text.fonts-missing")
            )
          )
          .appendTo(this._dialog),
        $("<div></div>")
          .addClass("subtitle")
          .text(
            o.GLocale.get(
              new o.GLocaleKey("GMissingFontsDialog", "text.fonts-not-found")
            )
          )
          .appendTo(this._dialog),
        (this._fontsContainer = $("<div></div>")
          .addClass("fonts-container")
          .appendTo(this._dialog)),
        this.setMissingFonts(t);
      var a = [];
      a.push(this._keepFontsButton),
        e &&
          a.unshift(
            $(
              "<button>" +
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GMissingFontsDialog",
                    "action.replace-fonts"
                  )
                ) +
                "</button>"
            ).on("click", this._replaceFonts.bind(this))
          ),
        this.setProviderEnablers(n),
        this._dialog.gDialog({
          releaseOnClose: !0,
          className: "g-missingfonts-dialog",
          buttons: a,
        });
    }
    o.GObject.inherit(i, o.GObject),
      (i.prototype.getMissingFonts = function () {
        var e = [];
        return (
          this._fontsContainer
            .find(".postscriptname")
            .each((t, n) => e.push($(n).data("font"))),
          e
        );
      }),
      (i.prototype.setProviderEnablers = function (e) {
        if (e && e.length > 0) {
          $("<div></div>")
            .addClass("subtitle")
            .text(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GMissingFontsDialog",
                  "text.turn-disabled-function"
                )
              ) + ":"
            )
            .css({ marginTop: "5px" })
            .appendTo(this._dialog);
          for (var t = 0; t < e.length; t++) $(e[t]).appendTo(this._dialog);
        }
      }),
      (i.prototype.setMissingFonts = function (e) {
        if (e) {
          var t = Object.keys(this._replacedFonts);
          if (Array.isArray(e)) {
            var n = gDesigner.getWorkspace().getFontManager().getDefaultFont();
            this._keepFontsButton.show(),
              e.forEach((e) => {
                this._replacedFonts[e] = n.getFamily();
              });
          } else
            this._keepFontsButton.hide(),
              Object.keys(e).forEach((t) => {
                this._replacedFonts[t] = e[t];
              });
          var o = this;
          Object.keys(this._replacedFonts).forEach((e) => {
            if (!(t.indexOf(e) >= 0)) {
              var i = $("<div></div>")
                .addClass("font-row")
                .appendTo(this._fontsContainer);
              $("<div></div>")
                .addClass("postscriptname")
                .data("font", e)
                .text(e)
                .appendTo(i),
                $("<input/>")
                  .addClass("g-select")
                  .data("font", e)
                  .attr("type", "button")
                  .gFontsButton({
                    assignFontCallback: function (e, t) {
                      o._replacedFonts[t.data("font")] = e;
                    },
                  })
                  .val(o._replacedFonts[e] || n.getFamily())
                  .appendTo(i);
            }
          });
        } else this._keepFontsButton.hide();
      }),
      (i.prototype.open = function (e) {
        var t =
          e ||
          o.GLocale.get(
            new o.GLocaleKey("GMissingFontsDialog", "action.keep-fonts")
          );
        this._keepFontsButton.text(t),
          (this.opened = !0),
          this._dialog.gDialog("open", !1);
      }),
      (i.prototype.close = function (e) {
        (this.opened = !1),
          this._callbacks.forEach((t) => {
            t(e ? this._replacedFonts : null);
          }),
          this._dialog.gDialog("close");
      }),
      (i.prototype._keepFonts = function () {
        gDesigner.stats("missingfonts_keep_fonts");
        var e = this._document.getScene();
        if (e) {
          var t = e.getProperty("cst") || [];
          Object.keys(this._replacedFonts).forEach((e) => {
            !t.indexOf(e) >= 0 && t.push(e);
          }),
            e.setProperty("cst", t),
            this.close();
        } else this.close();
      }),
      (i.prototype._hasFakeTextNodes = function () {
        var e = !1;
        const t = this._document && this._document.getScene();
        return (
          t &&
            t.acceptChildren((t) => {
              if (
                t instanceof o.GText &&
                (t.isFakeText() || t.hasEmbeddedFonts())
              )
                return (e = !0), !1;
            }),
          e
        );
      }),
      (i.prototype._replaceFonts = function () {
        gDesigner.stats("missingfonts_replace_fonts"),
          this._document.getScene().acceptChildren((e) => {
            if (e instanceof o.GText)
              if (e.isFakeText() || !e.$fontFamilies)
                e.replaceFonts(this._replacedFonts, e.hasEmbeddedFonts());
              else {
                var t = gDesigner
                    .getWorkspace()
                    .getFontManager()
                    .getDefaultFont(),
                  n = Object.keys(this._replacedFonts),
                  i = e.getContent();
                i &&
                  (i.forEach((o, i) => {
                    var a =
                      (e.$fontFamilies && e.$fontFamilies[i]) || o.fontFamily;
                    -1 !== n.indexOf(a) &&
                      (o.fontFamily = this._replacedFonts[a] || t.getFamily());
                  }),
                  (e._runsDirty = !0),
                  (e.$content = JSON.stringify(i)),
                  e.setText(i),
                  e.repaint());
              }
            else if (e instanceof o.GStyle) {
              var a = e.getProperty("_tff");
              this._replacedFonts instanceof o.GFont
                ? e.setProperties(
                    ["_tff", "_tfs", "_tfw"],
                    [
                      this._replacedFonts.getFamily(),
                      this._replacedFonts.getStyle(),
                      this._replacedFonts.getWeight(),
                    ]
                  )
                : a &&
                  this._replacedFonts[a] &&
                  e.setProperty("_tff", this._replacedFonts[a]);
            }
          }),
          this.close(!0);
      }),
      (e.exports = i);
  }