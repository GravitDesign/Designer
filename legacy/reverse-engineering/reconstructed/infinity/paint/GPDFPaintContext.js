/**
 * GPDFPaintContext
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFPaintContext(e) {
        (this._context2d = e),
          (this.canvas = new l(this._context2d)),
          (this.configuration = new A()),
          (this._context2d.canvas = this.canvas),
          (this.canvas._canvasContext = e),
          (this._nodeStack = []),
          (this.canvasStack = [this.canvas]),
          (this.canvas._paintContext = this),
          (this.outlineColors = []);
      }

GObject.inherit(GPDFPaintContext, o);

// Prototype methods
GPDFPaintContext.prototype.beginNode = function (e) {
          this._nodeStack.push(e),
            this.canvas.getGraphics().add(new s(e, s.Type.BEGIN));
        }

GPDFPaintContext.prototype.endNode = function (e) {
          this._nodeStack.pop(),
            this.canvas.getGraphics().add(new s(e, s.Type.END));
        }

GPDFPaintContext.prototype.getCurrentNode = function () {
          return this._nodeStack.slice(-1).pop() || new n();
        }

GPDFPaintContext.prototype.toString = function () {
          return "[Object GPDFPaintContext]";
        }

module.exports = GPDFPaintContext;
