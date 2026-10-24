/**
 * GAnnotationProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAnnotationProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GAnnotationProperties.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateTouchComponents();
      }

GAnnotationProperties.prototype._updateTouchComponents = function (e) {
        const t = this._panel.find(".custom-checkbox-mode");
        gDesigner.isTouchEnabled()
          ? t.gCheckboxSlider()
          : t.gCheckboxSlider("unmount");
      }

GAnnotationProperties.prototype.update = function (e, t, n) {
        if (
          (this._document &&
            (this._applyPendingUpdateForSelection(),
            gDesigner.removeEventListener(c, this._stateChangedEvent, this),
            gDesigner
              .getFileReviewManager()
              .removeEventListener(
                d.UpdateEvent,
                this._handleReviewUpdate,
                this
              ),
            gDesigner.removeEventListener(u, this._settingChanged, this),
            this._document.getScene() &&
              this._document
                .getScene()
                .removeEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange
                ),
            this._document.removeEventListener(
              l,
              this._collaborationEvent,
              this
            ),
            (this._document = null)),
          (this._elements = []),
          e && t && e.getScene())
        ) {
          if (
            (gDesigner.addEventListener(c, this._stateChangedEvent, this),
            gDesigner
              .getFileReviewManager()
              .addEventListener(d.UpdateEvent, this._handleReviewUpdate, this),
            gDesigner.addEventListener(u, this._settingChanged, this),
            t)
          )
            for (var o = 0; o < t.length; ++o) {
              var i = t[o];
              ((i instanceof a.GStyle &&
                n &&
                n instanceof this._propertyTool) ||
                (i instanceof this._propertyClass &&
                  i.hasMixin(a.GAnnotation))) &&
                this._elements.push(i);
            }
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document.addEventListener(
                l,
                this._collaborationEvent,
                this
              ),
              this._updateProperties(),
              this._updateTouchComponents(),
              !0
            );
        }
        return false;
      }

GAnnotationProperties.prototype._getAppManager = function () {
        return (
          this._appManager ||
            (this._appManager = gDesigner.getApplicationManager()),
          this._appManager
        );
      }

GAnnotationProperties.prototype._updateToolbar = function () {
        this._toolbarButton.toggleClass(
          "g-disabled",
          !this._getAppManager().isCommentingEditingEnabled()
        );
      }

GAnnotationProperties.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          e.node === this._elements[0] &&
          this._availableProperties.some((t) => e.properties.indexOf(t) >= 0) &&
          this._updateProperties();
      }

GAnnotationProperties.prototype._recordPendingUpdateForSelection = function (e, t, n, o, i) {
        this._pendingUpdates.set(e, {
          props: t,
          values: n,
          title: o,
          target: i,
        });
      }

GAnnotationProperties.prototype._cleanPendingUpdateForSelection = function (e) {
        this._pendingUpdates.delete(e);
      }

GAnnotationProperties.prototype._applyPendingUpdateForSelection = function () {
        let e =
          arguments.length > 0 && undefined !== arguments[0] ? arguments[0] : null;
        function t(e) {
          const t = this._pendingUpdates.get(e);
          t && this._assignProperties(t.props, t.values, t.title, !1, t.target);
        }
        e
          ? t.call(this, e)
          : this._pendingUpdates.forEach((e, n) => {
              t.call(this, n), this._cleanPendingUpdateForSelection(n);
            });
      }

GAnnotationProperties.prototype._updateProperties = function () {
        if (!this._elements || !this._elements.length)
          return void console.warn(
            "GAnnotationProperties: empty _elements array"
          );
        if (!this._document.getScene())
          return void console.warn("Scene is null");
        var e = this._elements[0];
        i.GElementEditor.getEditor(e);
        const t =
            !e.hasMixin(a.GAnnotation) ||
            r.default.isOwner(gDesigner.getSyncUser(), e),
          n = this._getAppManager().isCommentingEditingEnabled();
        if (this._availableProperties.indexOf(p.PropertySet.FillLayer) >= 0) {
          var o = e.getPaintLayers().getFillLayers()[0];
          this._panel
            .find('[data-property="'.concat(p.PropertySet.FillLayer, '"]'))
            .gPatternChooser(
              "setPattern",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "value",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "opacity",
              o ? o.getProperty("_op", !1, !1, !0) : null
            ),
            t && n
              ? this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.FillLayer, '"]')
                  )
                  .removeClass("g-disabled")
              : this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.FillLayer, '"]')
                  )
                  .addClass("g-disabled");
        }
        if (this._availableProperties.indexOf(p.PropertySet.BorderLayer) >= 0) {
          o = e.getPaintLayers().getBorderLayers()[0];
          this._panel
            .find('[data-property="'.concat(p.PropertySet.BorderLayer, '"]'))
            .gPatternChooser(
              "setPattern",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "value",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "opacity",
              o ? o.getProperty("_op", !1, !1, !0) : null
            ),
            t && n
              ? this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.BorderLayer, '"]')
                  )
                  .removeClass("g-disabled")
              : this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.BorderLayer, '"]')
                  )
                  .addClass("g-disabled");
        }
        if (this._availableProperties.indexOf(p.PropertySet.BorderWidth) >= 0) {
          var s = (o = e.getPaintLayers().getBorderLayers()[0])
              .getProperty(p.PropertySet.BorderWidth)
              .toString(),
            l = this._panel.find(
              '[data-property="'.concat(p.PropertySet.BorderWidth, '"]')
            );
          l
            .gUnitBox({
              unit:
                this._document.getScene().$ut === a.GLength.Unit.PX
                  ? a.GLength.Unit.PX
                  : a.GLength.Unit.PT,
              minValue: 0,
            })
            .gUnitBox(
              "value",
              null !== s
                ? new a.GLength.parseLength(s, a.GLength.Unit.PT)
                : null
            ),
            t && n
              ? l.removeClass("g-disabled").attr("disabled", !1)
              : l.addClass("g-disabled").attr("disabled", !0);
        }
        [p.PropertySet.BorderHeadMarker, p.PropertySet.BorderTailMarker]
          .filter(
            (e) =>
              this._availableProperties.indexOf(e) >= 0 ||
              this._availableProperties.includes("arrows")
          )
          .forEach((o) => {
            var i = e.getPaintLayers().getBorderLayers()[0].getProperty(o),
              a = this._panel.find('[data-property="' + o + '"]');
            a.prop("checked", !!i),
              t && n
                ? (a.removeClass("g-disabled"), a.attr("disabled", !1))
                : (a.addClass("g-disabled"), a.attr("disabled", !0));
          });
      }

GAnnotationProperties.prototype._assignProperty = function (e, t, n, o, i, a) {
        this._assignProperties([e], [t], n, o, i, a);
      }

GAnnotationProperties.prototype._assignProperties = function (e, t, n, o, i, r) {
        if (this._document) {
          var s = this._document.getEditor();
          o || s.beginTransaction();
          try {
            for (var l = null, c = 0; c < this._elements.length; ++c) {
              var d;
              i === p.PropertyTarget.FillLayer
                ? ((d = this._elements[c]
                    .getPaintLayers()
                    .getFillLayers()[0]) ||
                    ((d = new a.GStylable.FillPaintLayer()),
                    this._elements[c].getPaintLayers().appendChild(d)),
                  (l = $.extend(
                    { fillLayerIndex: d.getParent().getIndexOfChild(d) },
                    l || r
                  )))
                : i === p.PropertyTarget.BorderLayer
                ? ((d = this._elements[c]
                    .getPaintLayers()
                    .getBorderLayers()[0]) ||
                    ((d = new a.GStylable.BorderPaintLayer()),
                    this._elements[c].getPaintLayers().appendChild(d)),
                  (l = $.extend(
                    { borderLayerIndex: d.getParent().getIndexOfChild(d) },
                    l || r
                  )))
                : (d = this._elements[c]),
                d && d.setProperties(e, t, !1, !1, o);
            }
          } finally {
            o || s.commitTransaction(n, l);
          }
        } else console.warn("GAnnotationProperties: empty _document property");
      }

GAnnotationProperties.prototype.isEditing = function () {
        return this._isEditing;
      }

GAnnotationProperties.prototype.setIsEditing = function (e) {
        this._isEditing = e;
      }

GAnnotationProperties.prototype.toString = function () {
        return "[Object GAnnotationProperties]";
      }

module.exports = GAnnotationProperties;
