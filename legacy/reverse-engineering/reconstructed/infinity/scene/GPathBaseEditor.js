/**
     * A base editor for a base path
     * @param {IFPathBase} path the path this editor works on
     * @class GPathBaseEditor
     * @extends IFShapeEditor
     * @constructor
     */

function GPathBaseEditor(e) {
        (this._catchHandle = true), a.call(this, e);
      }

GObject.inherit(GPathBaseEditor, GShapeEditor);

// Prototype methods
GPathBaseEditor.prototype.transformBox = function (e, t) {
          if (
            (a.prototype.transformBox.call(this, e, t), e && !e.isIdentity())
          ) {
            var i = this._element.getSourceBBox();
            if (i && !i.isEmpty()) {
              var n = this.getPaintElement();
              this._element.transformStyledCorners(n, e);
            }
          }
        }

GPathBaseEditor.prototype.edTransform = function (e, t, i, n) {
          this._elementPreview || this.createElementPreview(),
            this.hasFlag(o.Flag.Outline)
              ? this.requestInvalidation()
              : this.setOutlineTmpFlag(),
            n && (this._storedMoveData = n.storedMoveData);
          var r = this._element.getProperty("trf"),
            a = r ? r.multiplied(e) : e;
          this._elementPreview.setTransform(a),
            this._element.transferStyledCorners(this._elementPreview),
            this._element.transformStyledCorners(this._elementPreview, e),
            this._setTransform(null),
            this.requestInvalidation();
        }

GPathBaseEditor.prototype._paintOutline = function (e, t, i, n, r) {
          !i && this._elementPreview && r
            ? a.prototype._paintOutline.call(this, r, t, i, n)
            : a.prototype._paintOutline.call(this, e, t, i, n);
        }

GPathBaseEditor.prototype.getPathBasePreview = function () {
          if (!this._elementPreview) {
            var e = this._element.getAnchorPoints();
            this._setElementPreview(new l());
            var t = this._elementPreview.getAnchorPoints();
            t._beginBlockChanges([
              n._Change.BeforeChildInsert,
              n._Change.AfterChildInsert,
            ]);
            for (var i = e.getFirstChild(); null != i; i = i.getNext()) {
              var r = new l.AnchorPoint();
              r.transferProperties(i, [l.AnchorPoint.GeometryProperties]),
                i.hasFlag(n.Flag.Selected) && r.setFlag(n.Flag.Selected),
                t.appendChild(r);
            }
            t._endBlockChanges([
              n._Change.BeforeChildInsert,
              n._Change.AfterChildInsert,
            ]);
          }
          return this._elementPreview;
        }

GPathBaseEditor.prototype.releasePathBasePreview = function () {
          this._setElementPreview(null);
        }

GPathBaseEditor.prototype.getPointPreview = function (e) {
          if (e.getParent() == this._element.getAnchorPoints()) {
            this.requestInvalidation();
            var t = e.getParent().getIndexOfChild(e);
            return this.getPathBasePreview()
              .getAnchorPoints()
              .getChildByIndex(t);
          }
          return null;
        }

GPathBaseEditor.prototype._catchHandleAllowed = function () {
          return this._catchHandle;
        }

GPathBaseEditor.prototype.setCatchHandle = function (e) {
          this._catchHandle = !!e;
        }

/**
     * A base editor for a base path
     * @param {IFPathBase} path the path this editor works on
     * @class IFPathBaseEditor
     * @extends IFShapeEditor
     * @constructor
     */
    function IFPathBaseEditor(path) {
        IFShapeEditor.call(this, path);
    };
    IFObject.inherit(IFPathBaseEditor, IFShapeEditor);

    /** @override */
GPathBaseEditor.prototype.toString = function () {
          return "[Object GPathBaseEditor]";
        }


module.exports = GPathBaseEditor;
