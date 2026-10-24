/**
 * Webpack Module #1604
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    e.exports = {
      _reInitLayout: function () {
        (this._canvasPropertiesRowInTouch = $("<div></div>")
          .attr("data-property-row", "canvas-size")
          .addClass("canvas-properties-touch")
          .gPropertyRow({
            columns: [
              {
                clazz: "canvas-properties-color-column",
                content: this._createInput("bck"),
              },
              {
                clazz: "canvas-properties-type-and-size-column",
                content: $("<div>")
                  .addClass("canvas-properties-type-and-size-wrapper")
                  .append(
                    $("<div>")
                      .addClass("preset-size-wrapper")
                      .append(this._createInput("preset-size"))
                  )
                  .append(
                    $("<div>")
                      .addClass("width-wrapper")
                      .append(this._createInput("w"))
                  )
                  .append(
                    $("<div>")
                      .addClass("height-wrapper")
                      .append(this._createInput("h"))
                  ),
              },
            ],
          })
          .insertBefore(this._hrAfterbleedRow)),
          (this._bleedRowInTouch = $("<div>")
            .addClass("page-size-and-bleed-properties-touch")
            .gPropertyRow({
              columns: [
                {
                  content: $(
                    "<span>" +
                      o.GLocale.get(
                        new o.GLocaleKey("GPageProperties", "text.bleed")
                      ) +
                      "</span>"
                  ),
                },
                {
                  clazz: "bleed-selector-column",
                  content: this._createInput("bl"),
                },
                {
                  clazz: "page-size-and-bleed-separator-column",
                  content: $("<div>").addClass("page-size-and-bleed-separator"),
                },
                {
                  clazz: "canvas-rotate-btn-column",
                  content: this._createInput("rotate-canvas"),
                },
                {
                  clazz: "canvas-trim-btn-column",
                  content: this._createInput("trim-canvas"),
                },
                {
                  clazz: "canvas-clip-btn-column",
                  content: this._createInput("clip-content"),
                },
              ],
            })
            .insertBefore(this._hrAfterbleedRow));
      },
    };
  }