/**
 * GTexturePattern
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GTexturePattern() {
  // Constructor (reconstructed)
}

// Prototype methods
GTexturePattern.prototype.clone = function () {
          var e = this.serialize(),
            t = new d();
          return (
            t.deserialize(e),
            (t._cachedBitmap = this._cachedBitmap),
            this._cachedBitmap && (this._cloned = true),
            (t._invalidate = true),
            t.setScene(this._scene),
            t
          );
        }

GTexturePattern.prototype.asCSSBackground = function (e) {
          var t = this._storedUrl || this._url;
          return (
            c.isDictionary(t) && (t = ""),
            this._node &&
              (t =
                "image" === l.getName(this._node)
                  ? this._node.getProperty("storedUrl") || ""
                  : this._node.toBitmap().toImageDataUrl(s.ImageType.PNG)),
            'url("' + t + '")'
          );
        }

GTexturePattern.prototype.getAverageColor = function () {
          return [128, 128, 128, 1];
        }

GTexturePattern.prototype.getRawUrl = function () {
          return this._storedUrl;
        }

GTexturePattern.prototype.getUrl = function () {
          return this._url;
        }

GTexturePattern.prototype._getRotatedTransform = function (e) {
          var t = e.decomposed();
          return t.rotate.multiplied(t.skew);
        }

GTexturePattern.prototype.toString = function () {
          return "[Object GTexturePattern]";
        }

module.exports = GTexturePattern;
