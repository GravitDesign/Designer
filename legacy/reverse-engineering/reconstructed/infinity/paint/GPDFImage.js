/**
 * GPDFImage
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFImage(e, t, i, r) {
        n.call(this, r),
          this.putDictionary("/Type", "/XObject"),
          this.putDictionary("/Subtype", "/Image"),
          this.putDictionary("/Width", e),
          this.putDictionary("/Height", t),
          this.putDictionary("/ColorSpace", i.name),
          this.putDictionary("/BitsPerComponent", 8);
      }

// Prototype methods
GPDFImage.prototype.getWidth = function () {
          return this.dictionary.get("/Width");
        }

GPDFImage.prototype.getHeight = function () {
          return this.dictionary.get("/Height");
        }

GPDFImage.prototype.setMask = function (e) {
          this.putDictionary("/SMask", e);
        }

GPDFImage.prototype.getMask = function () {
          var e = this.dictionary.get("/SMask");
          return e ? e.getPDFObject() : null;
        }

GPDFImage.prototype.setFilter = function (e) {
          this.filter = e;
        }

GPDFImage.prototype.toString = function () {
          return "[Object GPDFImage]";
        }

module.exports = GPDFImage;
