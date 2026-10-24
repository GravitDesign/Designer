/**
 * GSceneWidget
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSceneWidget() {
  // Constructor (reconstructed)
}

// Prototype methods
GSceneWidget.prototype._updateViewTransforms = function (e, t) {
          (this._scrollX = Math.round(this._scrollX)),
            (this._scrollY = Math.round(this._scrollY)),
            (this._scrollDX = Math.round(this._scrollDX)),
            (this._scrollDY = Math.round(this._scrollDY)),
            this._isPanning &&
              (this._dirtyElementList.translate(
                -this._scrollDX,
                -this._scrollDY
              ),
              this._dirtySceneList.translate(-this._scrollDX, -this._scrollDY));
          var i =
              this._lastInvalidatedVtoWtransform || this._viewToWorldTransform,
            n = this.getLogicalZoom(),
            r = new u().scaled(n, n).translated(-this._scrollX, -this._scrollY);
          if (!u.equals(r, this._worldToViewTransform)) {
            if (
              ((this._worldToViewTransform = r),
              (this._viewToWorldTransform = r.inverted()),
              (v.scaleLabelFactor =
                this._viewToWorldTransform.getScaleFactor()),
              !t)
            ) {
              var o = false;
              if (i && this._viewToWorldTransform) {
                var a = f.getScreenDPI(),
                  s = i.mapRect(
                    new p(0, 0, this.getWidth() * a, this.getHeight() * a)
                  ),
                  l = this._viewToWorldTransform.mapRect(
                    new p(0, 0, this.getWidth() * a, this.getHeight() * a)
                  );
                if (
                  C.isEqualEps(s.getWidth(), l.getWidth(), 1e-6) &&
                  C.isEqualEps(s.getHeight(), l.getHeight(), 1e-6)
                ) {
                  var h = l.subtracted(s, !0),
                    A = null;
                  A =
                    h instanceof Array
                      ? h.map(function (e) {
                          return r.mapRect(e);
                        })
                      : [r.mapRect(h)];
                  for (var c = false, d = 0; d < A.length; d++)
                    c = this.invalidate(A[d], !0) || c;
                  ((!w.ENABLE_RENDERER && c) || w.ENABLE_RENDERER) &&
                    (this._panSubAreas = A),
                    (o = true);
                }
              }
              a = f.getScreenDPI();
              var g = this.getViewBox().scaled(a, a),
                m = g.getWidth(),
                y = g.getHeight();
              (g = g.expanded(m, y, m, y)),
                this._scene.setScreenBox(
                  this.getViewTransform(this._scene).mapRect(g)
                ),
                o || this.invalidate(null, !0);
            }
            !e &&
              this.hasEventListeners(P.TransformEvent) &&
              this.trigger(P.TRANSFORMEVENT);
          }
          this._relayoutRulers();
        }

GSceneWidget.prototype._relayoutRulers = function () {
          if (this._horizontalRuler && this._verticalRuler && this._unitRuler) {
            var e = f.getScreenDPI(),
              t = new A(0, 0),
              i = this._scene.getActivePage();
            if (i) {
              var n = i.getGeometryBBox();
              if (n) {
                var r = this.getWorldTransform().mapPoint(t);
                t = (t = this.getWorldTransform(i).mapPoint(
                  new A(n.getX(), n.getY())
                )).subtract(r);
              }
            }
            var o = this._viewOffset[0],
              a = this._viewOffset[1],
              s = this._viewOffset[2],
              l = this._viewOffset[3],
              h = this._horizontalRuler.getHeight(),
              c = this._viewConfiguration.rulerLeftFill,
              p = this._viewConfiguration.ignoreRulerOffsets;
            this._horizontalRuler.resize(
              this.getWidth() - h - o - (p ? 0 : s),
              h
            ),
              this._verticalRuler.resize(
                h + (c ? o : 0),
                this.getHeight() - h - a - (p ? 0 : l)
              ),
              this._unitRuler.resize(h + (c ? o : 0), h),
              this._horizontalRuler.move(h + o, a),
              this._verticalRuler.move(c ? 0 : o, h + a),
              this._unitRuler.move(c ? 0 : o, a),
              this._horizontalRuler.updateView(
                -this._scrollX - o * e - h * e + t.getX(),
                this.getLogicalZoom()
              ),
              this._verticalRuler.updateView(
                -this._scrollY - a * e - h * e + t.getY(),
                this.getLogicalZoom()
              );
          }
        }

GSceneWidget.prototype._sceneInvalidationRequest = function (e) {
          var t = e.area;
          if (t) {
            if (e.page && !this.getViewConfiguration().multiPageView) {
              var i = this._scene && this._scene.getActivePage();
              if (i && i !== e.page) return;
            }
            t = (t = this.getWorldTransform(e.page || this._scene).mapRect(
              t
            )).expanded(2, 2, 2, 2);
          }
          this.invalidate(t, !0),
            this._sceneCanvas.setDirtyCache(
              t,
              this.getLogicalZoom(),
              this._scrollX,
              this._scrollY
            );
        }

GSceneWidget.prototype.getViewVisibleArea = function () {
          var e = this._viewOffset[0];
          this._verticalRuler && (e += this._verticalRuler.getWidth());
          var t = this._viewOffset[1];
          this._horizontalRuler && (t += this._horizontalRuler.getHeight());
          var i = this._width - this._viewOffset[2],
            n = this._height - this._viewOffset[3],
            r = f.getScreenDPI();
          return new p(e * r, t * r, (i - e) * r, (n - t) * r);
        }

GSceneWidget.prototype._wheelListener = function (e) {
          if (g.modifiers.metaKey || g.modifiers.ctrlKey || e.zoom) {
            "number" == typeof this._wheelScrollingOrZooming &&
              (clearTimeout(this._wheelScrollingOrZooming),
              (this._cumulativeInvalidationArea = null),
              (this._isPanning = false),
              (this._wheelScrollingOrZooming = null)),
              (this._wheelScrollingOrZooming = setTimeout(
                function () {
                  (this._wheelScrollingOrZooming = null), this.finishZoom();
                }.bind(this),
                w.RERENDER_ZOOM_AFTER_MS
              )),
              this.beginZoom();
            var t = 0 !== e.deltaX ? e.deltaX : e.deltaY,
              i = this.getZoom(),
              n = 1.6,
              r = null;
            if ((Math.abs(t) > 20 && (t = 20 * (t < 0 ? -1 : 1)), t < 0)) {
              var o = i / n;
              (r = i + ((-1 * t) / w.ZOOM_STEP) * o) >=
                P.options.maxZoomFactor && (r = P.options.maxZoomFactor);
            } else {
              o = i / n;
              (r = i - (t / w.ZOOM_STEP) * o) <= P.options.minZoomFactor &&
                (r = P.options.minZoomFactor);
            }
            for (var a = 0; a < this._zoomSteps.length; ++a) {
              ((r > (n = this._zoomSteps[a]) && i < n) || (r < n && i > n)) &&
                (r = this._zoomSteps[a]);
            }
            if (null !== r && r !== i) {
              var s = this.getViewTransform().mapPoint(e.client);
              this.zoomAt(s, r);
            }
          } else
            "number" == typeof this._wheelScrollingOrZooming &&
              (clearTimeout(this._wheelScrollingOrZooming),
              this._isZooming &&
                ((this._isZooming = false),
                (this._cumulativeInvalidationArea = [this._getSceneRect()])),
              (this._wheelScrollingOrZooming = null)),
              (this._wheelScrollingOrZooming = setTimeout(
                function () {
                  (this._wheelScrollingOrZooming = null), this.finishPan();
                }.bind(this),
                w.RERENDER_PAN_AFTER_MS
              )),
              this.beginPan(),
              g.modifiers.shiftKey
                ? this.scrollBy(e.deltaY, e.deltaX)
                : this.scrollBy(e.deltaX, e.deltaY);
        }

GSceneWidget.prototype._rulerMouseMoveListener = function (e) {
          var t = this._horizontalRuler.getHeight(),
            i = f.getScreenDPI();
          this._horizontalRuler.setMousePosition(
            e.client.getX() / i - t - this._viewOffset[0]
          ),
            this._verticalRuler.setMousePosition(
              e.client.getY() / i - t - this._viewOffset[1]
            );
        }

GSceneWidget.prototype._leaveListener = function (e) {
          this._horizontalRuler &&
            (this._horizontalRuler.setMousePosition(-999),
            this._verticalRuler.setMousePosition(-999)),
            (this._inlineHintDiv.style.visibility = "hidden");
        }

GSceneWidget.prototype._enterListener = function (e) {
          "hidden" === this._inlineHintDiv.style.visibility &&
            (this._inlineHintDiv.style.visibility = "");
        }

GSceneWidget.prototype._afterFlagChange = function (e) {
          e.node instanceof a &&
            e.flag === o.Flag.Active &&
            e.set &&
            this._relayoutRulers();
        }

GSceneWidget.prototype.startTouchMode = function () {
          b.setRenderParameters({
            quickRender: w.QUICK_RENDER_WHEN_ZOOMING,
            noWebGL: w.NO_WEBGL_WHEN_ZOOMING,
          });
        }

GSceneWidget.prototype.endTouchMode = function () {
          b.setRenderParameters({
            quickRender: !1,
            noWebGL: !1,
          }),
            this.invalidate(null, !0);
        }

GSceneWidget.prototype.cleanCache = function () {
          this._sceneCanvas.cleanCache();
        }

GSceneWidget.prototype.configureCache = function () {
          if (w.ENABLE_CACHE)
            switch (E.hardware) {
              case E.Hardware.Desktop:
                (w.MAX_CACHED_ZOOM_LEVELS = 5),
                  (w.MAX_CACHED_PER_ONE_ZOOM = 64);
                break;
              default:
                (w.MAX_CACHED_ZOOM_LEVELS = 3),
                  (w.MAX_CACHED_PER_ONE_ZOOM = 21);
            }
        }

GSceneWidget.prototype.toString = function () {
          return "[Object GSceneWidget]";
        }

module.exports = GSceneWidget;
