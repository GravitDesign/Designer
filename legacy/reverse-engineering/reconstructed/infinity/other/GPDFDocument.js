/**
 * GPDFDocument
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFDocument() {
  // Constructor (reconstructed)
}

// Prototype methods
GPDFDocument.prototype.convertToPDFPoint = function (e) {
          return new c(1, 0, 0, -1, 0, this.getPageSize().height).mapPoint(e);
        }

GPDFDocument.prototype.convertToViewportPoint = function (e) {
          return new c(1, 0, 0, -1, 0, this.getPageSize().height)
            .inverted()
            .mapPoint(e);
        }

GPDFDocument.prototype.convertToPDFCoordinates = function (e) {
          return new c(1, 0, 0, -1, 0, this.getPageSize().height)
            .preMultiplied(e)
            .preMultiplied(new c(1, 0, 0, -1, 0, 0));
        }

GPDFDocument.prototype.add = function (e, t) {
          this.body.add(e, t), e instanceof r && this.pushGraphics(e);
        }

GPDFDocument.prototype.addText = function (e) {
          var t = this.getCurrentGraphics();
          if (t) return t.addText(e);
        }

GPDFDocument.prototype.addResource = function (e, t) {
          return this.getCurrentResources().add(e, t);
        }

GPDFDocument.prototype.getCurrentGraphics = function () {
          return this._stackGraphics.slice(-1).pop();
        }

GPDFDocument.prototype.createGraphics = function () {
          var e = new r(this);
          return this.add(e), e;
        }

GPDFDocument.prototype.pushGraphics = function (e) {
          this._stackGraphics.push(e);
        }

GPDFDocument.prototype.popGraphics = function () {
          return this._stackGraphics.pop();
        }

GPDFDocument.prototype.getCurrentResources = function () {
          return this.body.getCurrentResources();
        }

GPDFDocument.prototype.addIndirectObject = function (e) {
          this.body.addIndirectObject(e);
        }

GPDFDocument.prototype.removeIndirectObject = function (e) {
          this.body.removeIndirectObject(e);
        }

GPDFDocument.prototype.getIndirectObject = function (e) {
          return this.body.getIndirectObject(e);
        }

GPDFDocument.prototype.write = function (e) {
          (this._writer = e),
            this.header.write(e),
            this.body.write(e),
            e.write("%%EOF");
        }

GPDFDocument.prototype.toString = function () {
          return "[Object GPDFDocument]";
        }


module.exports = GPDFDocument;
