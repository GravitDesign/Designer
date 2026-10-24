/**
     * Action for aligning
     * @class GAlignAction
     * @extends GAction
     * @constructor
     */

function GAlignAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GAlignAction.prototype.isEnabled = function (elements, compound, geometry, referenceBox) {
        var o = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor()
          : null;
        return !(
          !(e = e || (o ? o.getIndividualSelection() : null)) || !e.length
        );
      }

GAlignAction.prototype.execute = function (elements, compound, geometry, referenceBox) {
        var i = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor()
          : null;
        if (
          ((e = e || (i ? i.getIndividualSelection() : null)),
          i && e && 1 === e.length && !n)
        ) {
          var a = o.GElementEditor.getEditor(e[0]);
          if (!a || !a.isAlignPartsAllowed())
            if (i.getScene().isFixedSized())
              n = i.getScene().getActivePage().getGeometryBBox();
            else n = i.getScene().getPaintBBox();
        }
        gDesigner
          .getActiveDocument()
          .getEditor()
          .arrangeAlign(this._type, e, t, n);
      }

GAlignAction.prototype._isAlignOnlyCategory = function () {
        switch (this._type) {
          case o.GEditor.ArrangeAlignType.AlignLeft:
          case o.GEditor.ArrangeAlignType.AlignCenter:
          case o.GEditor.ArrangeAlignType.AlignRight:
          case o.GEditor.ArrangeAlignType.AlignTop:
          case o.GEditor.ArrangeAlignType.AlignMiddle:
          case o.GEditor.ArrangeAlignType.AlignBottom:
            return true;
          default:
            return false;
        }
      }

GAlignAction.prototype.getTooltipConfig = function (e) {
        return (
          (e && c.TOOLTIP_CONFIG[e] && c.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }

/** @override */
GAlignAction.prototype.toString = function () {
        return "[Object GAlignAction]";
      }

module.exports = GAlignAction;
