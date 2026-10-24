/**
 * GSymbolEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSymbolEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GSymbolEditor.prototype._applyPartMove = function (e, t, i, n) {
          e === s.LabelHolder.LABEL_PART_ID &&
            (this.canApplyTransform()
              ? (this._prepareApplyTransform(this._element),
                this._applyTransform(this._element, !0, n, i))
              : this.resetTransform()),
            s.prototype._applyPartMove.call(this, e, t, i, n);
        }

GSymbolEditor.prototype.getCustomBBox = function (e, t) {
          var i = s.prototype.getCustomBBox.call(this, e, t);
          if (this.getElement().getScene())
            if (i) {
              var n = e.getScaleFactor(),
                r =
                  this.getElement()
                    .getScene()
                    .getLabelBBox(this.getElement().isScaleLabel() ? n : 1 / n)
                    .getHeight() + 1;
              i = i.expanded(0, r, 0, 0);
            } else
              this.getElement().getGeometryBBox() &&
                (i = this._getLabelBBox(e));
          return i;
        }

GSymbolEditor.prototype.setColor = function (e) {
          this._color = e;
        }

GSymbolEditor.prototype.getColor = function () {
          return this.getElement() &&
            (this.getElement().isMaster() ||
              this.getElement().getMasterSymbol())
            ? this._color
            : null;
        }

GSymbolEditor.prototype._applyTransform = function (e, t, i, n) {
          var r = this._transform,
            a = false;
          if (!r)
            if (this._elementPreview || this._savedElementPreview) {
              var s =
                  (
                    this._savedElementPreview || this._elementPreview
                  ).getTransform() || new u(),
                l = e.getTransform() || new u();
              r = s.preMultiplied(l.inverted());
            } else r = new u();
          var A = e.findParent(function (e) {
            if (e instanceof h) return true;
          });
          if (((p = A && A.isMaster()), !r.isIdentity())) {
            var c, p;
            if ((e.beginUpdate(), t))
              e.setTransform((e.getProperty("trf") || new u()).multiplied(r)),
                (!p || (p && e.isMaster())) &&
                  ((c = e.getProperty("blockEv")),
                  (a = true),
                  e.setProperty("blockEv", !0)),
                this._transformSubElements(e, t, r, i, n);
            else {
              var d = e.getProperty("frame"),
                g = this.getBox(),
                f = this._storedMoveData,
                m = e.getTransform();
              if (e.dependentUpdate)
                e.setTransform((m || new u()).multiplied(r));
              else if (f) {
                var y = u.getResizeTransform(
                  g,
                  f.side,
                  f.dx,
                  f.dy,
                  f.shift,
                  f.option
                );
                e.setProperty("frame", y.mapRect(d)),
                  p ||
                    (this._savedElementPreview &&
                      (e._layoutTransform =
                        this._savedElementPreview._layoutTransform),
                    this._transformSiblings(y, m, d, i, n));
              } else
                this._transform &&
                  (e.setTransform(
                    (e.getProperty("trf") || new u()).multiplied(
                      this._transform
                    )
                  ),
                  p || this._transformSiblings(r, m, d, i, n));
              p &&
                e.isMaster() &&
                ((c = e.getProperty("blockEv")),
                (a = true),
                e.setProperty("blockEv", !0)),
                this._transformSubElements(e, t, r, i, n);
            }
            a && e.setProperty("blockEv", c), e.endUpdate();
          }
          (this._savedElementPreview = null),
            o.prototype._applyTransform.call(this, e);
        }

GSymbolEditor.prototype._transformSubElements = function (e, t, i, n, o) {
          if (t || !e.hasAnchors())
            for (
              var a = this._storedMoveData, s = e.getFirstChild();
              null != s;
              s = s.getNext()
            )
              if (s instanceof l && (!n || n.indexOf(s) < 0)) {
                var h = r.openEditor(s),
                  A = new g.EdTransformOptions();
                (A.fullContentsTransform = !!t),
                  (s.dependentUpdate = true),
                  s.setProperty("subtrf", !0, !0),
                  (A.storedMoveData = a);
                s.getTransform() || new u();
                h instanceof g && (h._preTransform = this._preTransform),
                  h.edTransform(i, null, null, A),
                  h.applyTransform(s, t, n, o),
                  (s.dependentUpdate = false),
                  s.setProperty("subtrf", !1, !0);
              }
        }

GSymbolEditor.prototype._transformSiblings = function (e, t, i, n, o) {
          var a = this._storedMoveData;
          if ((this._storedMoveData || e) && this.getElement().isMaster()) {
            var s = this.getElement().dependentUpdate,
              l = (t || new u()).decomposed(),
              h = i,
              A = this._preTransform;
            this.getElement()._iterateSiblings(this.getElement(), function (t) {
              var i = t.getTransform() || new u(),
                c = i.decomposed();
              if (
                d.equals(h, t.getProperty("frame")) &&
                u.equals(l.scale, c.scale) &&
                u.equals(l.skew, c.skew)
              ) {
                var p = r.openEditor(t),
                  f = new g.EdTransformOptions();
                (f.fullContentsTransform = false),
                  (t.dependentUpdate = s),
                  (f.storedMoveData = a);
                var m,
                  y,
                  _ = p.getBox();
                (m =
                  e ||
                  u.getResizeTransform(
                    _,
                    a.side,
                    a.dx,
                    a.dy,
                    a.shift,
                    a.option
                  )),
                  p.edTransform(
                    i.inverted().multiplied(m).multiplied(i),
                    null,
                    null,
                    f
                  ),
                  (p._preTransform = A),
                  t.isMaster() ||
                    ((y = t.getProperty("blockEv")),
                    t.setProperty("blockEv", !0)),
                  p.applyTransform(t, !1, n, o),
                  r.closeElementEditor(t),
                  t.isMaster() || t.setProperty("blockEv", y),
                  (t.dependentUpdate = false);
              }
            });
          }
        }

GSymbolEditor.prototype.toString = function () {
          return "[Object GSymbolEditor]";
        }

module.exports = GSymbolEditor;
