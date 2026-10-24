/**
 * Webpack Module #1475
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(797),
      i = n(1);
    n(257);
    function a(e, t, n, o, a, r) {
      (this._currentDocument = e),
        (this._newDocument = t),
        (this._localName = n),
        (this._cloudName = o),
        (this._callback = a),
        (this._onCancel = r),
        (this._dialog = $("<div></div>")),
        $("<div></div>")
          .addClass("g-btn-close")
          .css("display", this._onCancel ? "" : "none")
          .append($("<span></span>").addClass("gravit-icon-close"))
          .on("click", this.close.bind(this))
          .appendTo(this._dialog);
      var s = $("<div></div>").addClass("header").appendTo(this._dialog);
      $("<div></div>")
        .addClass("title")
        .append(
          $("<span></span>").text(
            i.GLocale.get(
              new i.GLocaleKey("GDocumentChooser", "text.sync.title")
            )
          )
        )
        .appendTo(s),
        $("<div></div>")
          .addClass("subtitle")
          .append(
            $("<span></span>").text(
              i.GLocale.get(
                new i.GLocaleKey("GDocumentChooser", "text.sync.subtitle")
              )
            )
          )
          .appendTo(s),
        (this._container = $("<div></div>")
          .addClass("container")
          .appendTo(this._dialog)),
        (this._footer = $("<div></div>")
          .addClass("footer")
          .css("display", this._onCancel ? "" : "none")
          .appendTo(this._dialog));
      let l = $("<div></div>").addClass("buttons").appendTo(this._footer);
      $("<button></button>")
        .addClass("g-button")
        .text(i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")))
        .on("click", this.close.bind(this))
        .appendTo(l);
      this._dialog.gDialog({
        releaseOnClose: !0,
        className: "g-document-chooser",
      }),
        this._updatePreview();
    }
    i.GObject.inherit(a, i.GObject),
      (a.prototype.open = function () {
        this._dialog.gDialog("open", !1);
      }),
      (a.prototype.close = function () {
        this._dialog.gDialog("close"), this._onCancel && this._onCancel();
      }),
      (a.prototype._updatePreview = function () {
        this._container.empty(),
          this._createPreview(
            this._newDocument,
            "online",
            this._cloudName,
            this._newDocument.lastModifiedDate() >
              this._currentDocument.lastModifiedDate()
          ),
          this._createPreview(
            this._currentDocument,
            "offline",
            this._localName,
            this._currentDocument.lastModifiedDate() >
              this._newDocument.lastModifiedDate()
          );
      }),
      (a.prototype._loadPreview = function (e, t) {
        return new Promise(function (n) {
          if ("offline" !== t) {
            var o = [],
              a = function (e) {
                if (
                  e.image.getStatus() === i.GImage.ImageStatus.Loaded ||
                  e.image.getStatus() === i.GImage.ImageStatus.Error
                ) {
                  e.image.removeEventListener(i.GImage.StatusEvent, this);
                  var t = o.indexOf(e.image);
                  -1 !== t && o.splice(t, 1), o.length || n();
                }
              };
            e.acceptChildren((e) => {
              e instanceof i.GImage &&
                ((e.getStatus() === i.GImage.ImageStatus.Error &&
                  e.getStatus() === i.GImage.ImageStatus.Loaded) ||
                  (o.push(e), e.addEventListener(i.GImage.StatusEvent, a)));
            }),
              o.length || n();
          } else n();
        });
      }),
      (a.prototype._createPreview = function (e, t, n) {
        let a = arguments.length > 3 && void 0 !== arguments[3] && arguments[3];
        var r = $("<div />").addClass("image"),
          s = $("<div></div>")
            .addClass("preview")
            .on("click", () => {
              gDesigner.stats("documentchooser_click_preview", t),
                this.close(),
                this._callback(e);
            })
            .appendTo(this._container),
          l = $("<div></div>")
            .addClass("preview-image loading")
            .css("background", i.GPattern.asCSSBackground(null))
            .append(r)
            .appendTo(s);
        this._loadPreview(e, t).then(() => {
          var t = o.GBitmapExport.export(e);
          l.removeClass("loading"),
            r.css(
              "background-image",
              "url(".concat(t.toImageDataUrl(i.GBitmap.ImageType.JPEG, 1), ")")
            );
        });
        var c = function (e) {
          return 0 === e.getTime()
            ? i.GLocale.get(
                new i.GLocaleKey("GDocumentChooser", "text.unavailable")
              )
            : i.GLocale.toLocaleDate(e, {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
              });
        };
        s.append(
          $("<div></div>")
            .addClass("title")
            .append(
              $("<span></span>").text(
                n +
                  " " +
                  i.GLocale.get(
                    new i.GLocaleKey("GDocumentChooser", "text." + t)
                  )
              )
            )
        ).append(
          $("<div></div>")
            .addClass("subtitle")
            .append(
              $("<span></span>").text(
                c(e.lastModifiedDate()) +
                  (a
                    ? " " +
                      i.GLocale.get(
                        new i.GLocaleKey("GDocumentChooser", "text.newer-file")
                      )
                    : "")
              )
            )
        );
      }),
      (e.exports = a);
  }