/**
     * The text tool
     * @class GTextTool
     * @extends IFShapeTool
     * @constructor
     */

function GTextTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
    IFTextTool.prototype._hasCenterCross = function () {
        return true;
    };

    /** @override */
    IFTextTool.prototype._createShapeManually = function (position) {
        var text = new IFText();
        text.setProperty('trf', new IFTransform(1, 0, 0, 1, position.getX(), position.getY()));
        this._insertText(text);
    };

    /** @private */
GTextTool.prototype._insertText = function (text) {
          return o.prototype._insertShape.call(
            this,
            e,
            !1,
            t,
            b.get(new C("GTextTool", "action.insert-text"))
          );
        }

GTextTool.prototype._getDefaultMeasure = function (e) {
          if (!this._defaultMeasure) {
            var t = this._scene && this._scene.getWorkspace(),
              i = t && t.getFontManager();
            if (i) {
              var n = [];
              n.push(
                e.getProperty("_tfs") === E.Style.Normal ? "normal" : "italic"
              ),
                n.push(e.getProperty("_tfw")),
                n.push(e.getProperty("_tfi") + "px"),
                n.push(e.getProperty("_tff"));
              var r = "font: " + n.join(" ");
              this._defaultMeasure = new w(
                b.get(new C("GTextTool", "your-text-here")),
                r,
                null,
                i
              );
            }
          }
          return this._defaultMeasure;
        }

/** override */
GTextTool.prototype.toString = function () {
          return "[Object GTextTool]";
        }

module.exports = GTextTool;
