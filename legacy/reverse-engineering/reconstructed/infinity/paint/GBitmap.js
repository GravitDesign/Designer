/**
     * A class representing a bitmap
     * @param {Number|Image|HTMLImageElement|IFPaintCanvas|HtmlCanvasElement|CanvasRenderingContext2D} sourceOrWidth
     * @param {Number} height
     * @class GBitmap
     * @constructor
     */

function GBitmap() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * This is called to modify the underlying bitmap data
     * @param {Function} modifier the modifier function retrieving the bitmap data (32BPP RGBA), the width and the height
     * @param {IFRect} [area] optional area defining the bitmap data to be manipulated,
     * if not provided or null, takes the whole bitmap by default
     */
GBitmap.prototype.modifyPixels = function (modifier, area) {
          if (
            0 ===
              (i =
                i ||
                new r(0, 0, this.getWidth(), this.getHeight())).getWidth() ||
            0 === i.getHeight()
          )
            return null;
          var o = this._canvasContext.getImageData(
            i.getX(),
            i.getY(),
            i.getWidth(),
            i.getHeight()
          );
          return (
            o.runModifier && n
              ? o.runModifier(e, i.getWidth(), i.getHeight(), t)
              : e(o.data, i.getWidth(), i.getHeight(), t),
            this._canvasContext.putImageData(o, i.getX(), i.getY()),
            o
          );
        }

GBitmap.prototype.applyFilter = function (e, t, i) {
          return this.modifyPixels(e.apply, t, i, !0);
        }

/** @override */
GBitmap.prototype.toString = function () {
          return "[Object GBitmap]";
        }

module.exports = GBitmap;
