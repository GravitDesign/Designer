/**
 * GGradientStyleEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GGradientStyleEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GGradientStyleEditor.prototype._paintCross = function (e, t) {
          var i = p.annotationHandles.gradient,
            n = (i.size, Math.floor(e.getX()) + 0.5),
            r = Math.floor(e.getY()) + 0.5;
          i.outlineWidth % 2 != 0 && ((n += 0.5), (r += 0.5));
          var o = i.size / 2;
          t.canvas.strokeLine(
            n - o,
            r - o,
            n + o,
            r + o,
            i.outlineWidth + 2 * E.getScreenDPI(),
            new w(w.parseCSSColor(i.lineShadowColor)),
            !1,
            0.6
          ),
            t.canvas.strokeLine(
              n + o,
              r - o,
              n - o,
              r + o,
              i.outlineWidth + 2 * E.getScreenDPI(),
              new w(w.parseCSSColor(i.lineShadowColor)),
              !1,
              0.6
            ),
            t.canvas.strokeLine(
              n - o,
              r - o,
              n + o,
              r + o,
              i.outlineWidth,
              w.WHITE
            ),
            t.canvas.strokeLine(
              n + o,
              r - o,
              n - o,
              r + o,
              i.outlineWidth,
              w.WHITE
            );
        }

GGradientStyleEditor.prototype._prepareNewStop = function (e) {
          for (
            var t = this._gradient.getStops(), i = null, n = null, r = 0;
            r < t.length;
            ++r
          ) {
            var o = t[r].position;
            o < e && (!i || o > i.position) && (i = t[r]),
              o > e && (!n || o < n.position) && (n = t[r]);
          }
          var a = new w(t[0].color.getValue()),
            s = t[0].opacity;
          if (i && n) {
            var l = n.position - i.position,
              h = l ? (e - i.position) / l : 1,
              A = l ? (n.position - e) / l : 0,
              c = i.color.getValue(),
              p = n.color.getValue(),
              u = i.opacity,
              d = n.opacity;
            (a = new w([
              Math.round(c[0] * A + p[0] * h),
              Math.round(c[1] * A + p[1] * h),
              Math.round(c[2] * A + p[2] * h),
            ])),
              (s = u * A + d * h);
          } else
            n ||
              ((a = new w(t[t.length - 1].color.getValue())),
              (s = t[t.length - 1].opacity));
          return {
            position: e,
            color: a,
            opacity: s,
          };
        }

GGradientStyleEditor.prototype._iterateAnnotations = function (e) {
          var t = this._getAnnotationPoints();
          if (t) for (var i = 0; i < t.length; ++i) if (e(t[i], i)) return;
        }

GGradientStyleEditor.prototype._getAnnotationPoints = function () {
          return null;
        }

GGradientStyleEditor.prototype._getCompositeTransform = function (e) {
          var t =
              e && this._gradient.getTransform()
                ? this._gradient.getTransform()
                : new g(),
            i = this._getBBoxElem();
          if (i)
            if (!this._componentOfEffect && i instanceof A) {
              var n = null;
              (o = i.getPatternBBox()) &&
                (n = g.getNativeRectTransformation(o)),
                (t = n ? t.multiplied(n) : t);
              var r = i.getTransform();
              t = r ? t.multiplied(r) : t;
            } else {
              var o;
              n = null;
              (o = i.getGeometryBBox()) &&
                (n = g.getNativeRectTransformation(o)),
                (t = n ? t.multiplied(n) : t);
            }
          return t;
        }

GGradientStyleEditor.prototype._getSnapPoints = function (e) {
          var t = [],
            i = this._getBBoxElem(),
            n = null,
            r = i.getSourceBBox();
          if (
            (r && !r.isEmpty()
              ? (n = i.getTransform() || new g())
              : ((n = new g()), (r = i.getGeometryBBox())),
            e && (n = n.multiplied(e)),
            r && !r.isEmpty())
          )
            for (
              var o = [
                  u.Side.TOP_LEFT,
                  u.Side.TOP_RIGHT,
                  u.Side.BOTTOM_LEFT,
                  u.Side.BOTTOM_RIGHT,
                  u.Side.RIGHT_CENTER,
                  u.Side.LEFT_CENTER,
                  u.Side.TOP_CENTER,
                  u.Side.BOTTOM_CENTER,
                  u.Side.CENTER,
                ],
                a = 0;
              a < o.length;
              ++a
            ) {
              var s = o[a],
                l = n.mapPoint(r.getSide(s));
              t.push(l);
            }
          return t;
        }

GGradientStyleEditor.prototype._snapPosition = function (e) {
          var t = e;
          if (this._snapPoints)
            for (var i = 0; i < this._snapPoints.length; ++i) {
              var n = this._snapPoints[i];
              if (
                m.ptSqrDist(n.getX(), n.getY(), e.getX(), e.getY()) <=
                f.options.snapDistance * f.options.snapDistance
              ) {
                t = n;
                break;
              }
            }
          return t;
        }

GGradientStyleEditor.prototype._constrainPosition = function (e, t, i, r) {
          if (!i && !r) return null;
          var o = null,
            a = r;
          if (i) {
            var s = this._getBBoxElem(),
              l = s.getSourceBBox();
            l
              ? (o = s.getTransform() || new g())
              : ((o = new g()), (l = s.getGeometryBBox())),
              l && (a = l.getSide(i)),
              t && (o = o.multiplied(t));
          } else o = t || new g();
          return (
            (a = o.mapPoint(a)),
            n.convertToConstrain(
              a.getX(),
              a.getY(),
              e.getX(),
              e.getY(),
              p.cursorConstraint
            )
          );
        }

GGradientStyleEditor.prototype._getBBoxElem = function () {
          var e =
            this._propHolder instanceof A || this._propHolder instanceof d
              ? this._propHolder
              : null;
          if (!e)
            for (
              var t = this._propHolder.getParent();
              !e && t;
              t = t.getParent()
            )
              e = t instanceof A || t instanceof d || t instanceof c ? t : null;
          return e;
        }

GGradientStyleEditor.prototype._synchIdx = function (e) {
          var t = this._gradient.getStops();
          if (
            t &&
            t.length &&
            e &&
            e.type == P.STOP_HANDLE_PART_ID &&
            null != e.idx &&
            e.idx < t.length &&
            this._partSelection &&
            this._partSelection.length &&
            this._partIdAreEqual(e, this._partSelection[0])
          ) {
            var i = t[e.idx];
            this._gradient.sortStops();
            for (var n = 0; n < t.length; ++n)
              t[n] == i &&
                n != e.idx &&
                ((e.idx = n), (this._partSelection[0].idx = n));
          }
        }

GGradientStyleEditor.prototype.toString = function () {
          return "[Object GGradientStyleEditor]";
        }

module.exports = GGradientStyleEditor;
