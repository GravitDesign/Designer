/**
 * GPathsGraphEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPathsGraphEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GPathsGraphEditor.prototype._ensureConsistentSelection = function () {
          this._selectionMode = F.SelectionMode.None;
          for (
            var e = [], t = this._element.getAnchors().getFirstChild();
            null != t;
            t = t.getNext()
          )
            t.hasFlag(n.Flag.Selected) &&
              e.push(
                new a.PartInfo(
                  this,
                  {
                    type: F.PartType.Anchor,
                    point: t,
                  },
                  null,
                  !1,
                  !0
                )
              );
          for (
            var i = this._element.getEdges().getFirstChild();
            null != i;
            i = i.getNext()
          )
            i.hasFlag(n.Flag.Selected) &&
              e.push(
                new a.PartInfo(
                  this,
                  {
                    type: F.PartType.Segment,
                    edge: i,
                    apLeft: null,
                    apRight: null,
                  },
                  {},
                  !1,
                  !0
                )
              );
          for (
            var r = this._element.getFacets().getFirstChild();
            null != r;
            r = r.getNext()
          )
            r.hasFlag(n.Flag.Selected) &&
              e.push(
                new a.PartInfo(
                  this,
                  {
                    type: F.PartType.Facet,
                    facet: r,
                  },
                  {},
                  !1,
                  !1
                )
              );
          this.updatePartSelection(!1, e);
        }

GPathsGraphEditor.prototype._initPBEditor = function (e) {
          (this._pathBaseInEdit = e),
            (this._pbEditor = v.openEditor(this._pathBaseInEdit, !0)),
            this._pbEditor.setFlag(a.Flag.Selected),
            this._pbEditor.removeFlag(b.Flag.ResizeAll),
            this._pbEditor.setCatchHandle(!1),
            this._pbEditor.setFlag(a.Flag.HideEditor);
        }

GPathsGraphEditor.prototype._closePBEditor = function (e) {
          this._pbEditor &&
            this._pathBaseInEdit &&
            (this.requestInvalidation(),
            this._pbEditor.requestInvalidation(),
            e && this._pbEditor.updatePartSelection(!1, null),
            (this._pbEditor = null),
            v.closeElementEditor(this._pathBaseInEdit),
            (this._pathBaseInEdit = null),
            this.requestInvalidation());
        }

GPathsGraphEditor.prototype.toString = function () {
          return "[Object GPathsGraphEditor]";
        }

module.exports = GPathsGraphEditor;
