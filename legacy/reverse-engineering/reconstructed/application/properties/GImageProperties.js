/**
     * Image properties panel
     * @class GImageProperties
     * @extends GProperties
     * @constructor
     */

function GImageProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GImageProperties.prototype.update = function (document, elements) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                o.GImage.StatusEvent,
                this._imageStatus,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                o.GImage.ConvertStatusEvent,
                this._imageConvertStatus,
                this
              ),
            (this._document = null)),
          (this._image = null),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            if (t[n] instanceof o.GImage) {
              if (this._image) {
                this._image = null;
                break;
              }
              this._image = t[n];
            }
          if (this._image)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  o.GImage.StatusEvent,
                  this._imageStatus,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  o.GImage.ConvertStatusEvent,
                  this._imageConvertStatus,
                  this
                ),
              this._updateProperties(),
              !0
            );
        }
        return (
          this._controls.find(".g-image-convert-status").css("display", "none"),
          !1
        );
      }

/**
     * @param {IFNode.AfterPropertiesChangeEvent} event
     * @private
     */
GImageProperties.prototype._afterPropertiesChange = function (event) {
        !e.temporary &&
          this._image &&
          this._image === e.node &&
          this._updateProperties();
      }

/**
     * @param {IFNode.AfterPropertiesChangeEvent} event
     * @private
     */
    GImageProperties.prototype._afterPropertiesChange = function (event) {
        if (this._image && this._image === event.node) {
            this._updateProperties();
        }
    };

    /**
     * @param {IFImage.StatusEvent} event
     * @private
     */
GImageProperties.prototype._imageStatus = function (event) {
        e.image !== this._image ||
          (e.status !== o.GImage.ImageStatus.Error &&
            e.status !== o.GImage.ImageStatus.Loaded) ||
          this._updateProperties();
      }

GImageProperties.prototype._imageConvertStatus = function (e) {
        this._updateConvertStatus(e.status);
      }

GImageProperties.prototype._updateConvertStatus = function (e) {
        var t;
        switch (e) {
          case o.GImage.ConvertStatus.Checking:
            t =
              o.GLocale.get(
                new o.GLocaleKey("GImageProperties", "text.check-profile")
              ) + "...";
            break;
          case o.GImage.ConvertStatus.Converting:
            t =
              o.GLocale.get(
                new o.GLocaleKey("GImageProperties", "text.loading-profile")
              ) + "...";
        }
        t && this._controls.find(".g-image-convert-status > span").text(t),
          this._controls
            .find(".g-image-convert-status")
            .css("display", t ? "" : "none");
      }

/**
     * @param {IFImage.StatusEvent} event
     * @private
     */
    GImageProperties.prototype._imageStatus = function (event) {
        if (event.image === this._image && (event.status === IFImage.ImageStatus.Error || event.status === IFImage.ImageStatus.Loaded)) {
            this._updateProperties();
        }
    };

    /**
     * @param {Boolean} [noBBoxCalculation] if set, do not recalculate all element's bbox.
     * Defaults to false.
     * @private
     */
GImageProperties.prototype._updateProperties = function () {
        this._image.getProperty("url"), this._image.getStatus();
        var e = this._image.isReady(),
          t = this._image.getGeometryBBox(),
          n = t ? t.getWidth() : 0,
          i = t ? t.getHeight() : 0,
          a = this._image.getWidth(),
          r = this._image.getHeight();
        if (gDesigner.getActiveDocument()) {
          var s = gDesigner
            .getActiveDocument()
            .getEditor()
            .hasSelectionDetail();
          this._panel
            .find('button[data-action="reset-size"]')
            .prop(
              "disabled",
              !e || (o.GMath.isEqualEps(a, n) && o.GMath.isEqualEps(r, i))
            ),
            this._panel
              .find('button[data-action="handle-crop"]')
              .data("no-crop", s),
            this._panel
              .find(".crop-label")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GImageProperties",
                    s ? "action.no-crop" : "action.crop"
                  )
                )
              ),
            this._panel
              .find('[data-image-palette="button"]')
              .prop("disabled", !e)
              .css("display", ""),
            this._panel
              .find('[data-image-palette="palette"]')
              .css("display", "none"),
            this._updateConvertStatus(this._image.getConvertStatus());
        }
      }

/** @override */
GImageProperties.prototype.toString = function () {
        return "[Object GImageProperties]";
      }

module.exports = GImageProperties;
