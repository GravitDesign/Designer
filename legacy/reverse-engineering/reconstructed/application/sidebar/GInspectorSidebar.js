/**
 * GInspectorSidebar
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInspectorSidebar() {
  // Constructor (reconstructed)
}

// Prototype methods
GInspectorSidebar.prototype._updateFromToolOrSelection = function (e) {
        var t = this._document.getEditor();
        if (
          this._document &&
          t &&
          ((this._elements = t.getSelection()),
          this._elements &&
            this._elements.length &&
            (this._elements = t.filterIndividualElements(
              this._elements.filter((e) => !e.hasMixin(i.GAnnotation))
            )),
          !this._elements || 0 === this._elements.length)
        ) {
          var n = gDesigner.getToolManager().getActiveTool(),
            a = null;
          n instanceof o.GItemTool && (a = n.getDefaultStyle())
            ? (this._elements = [a])
            : (this._elements = [this._document.getScene().getActivePage()]);
        }
        this._updatePropertyPanels(!1);
      }

GInspectorSidebar.prototype._updatePropertyPanels = function (e, t) {
        var n = false,
          o = null,
          i = null;
        this._touchTools = [];
        for (var a = 0; a < this._propertyPanels.length; ++a) {
          var r = this._propertyPanels[a],
            s = r.properties,
            l = s.isAvailable(this._transformMode);
          if (
            (l &&
              (l = r.properties.update(
                e ? null : this._document,
                this._elements ? this._elements : null,
                t || null
              )),
            l)
          ) {
            const e = r.properties.getTouchTools();
            e && (this._touchTools = this._touchTools.concat(e));
          }
          r.panel.css("display", l ? "" : "none"),
            r.toolbar &&
              (r.toolbar.css("display", l ? "" : "none"),
              s instanceof _ && l && (i = r.toolbar),
              $.inArray(r.properties.toString(), T.ACCORDIONS) > -1 &&
                l &&
                (r.toolbar
                  .addClass("appearance-panel-toggle-btn")
                  .gAccordion("init", ".properties-panel", "label"),
                this._htmlElement
                  .find(".appearance-panel-toggle-btn button.g-accordion")
                  [gDesigner.isTouchEnabled() ? "hide" : "show"]()));
          var c = l && n && s.isGroup(o);
          r.divider.css("display", c ? "" : "none"),
            (n = n || l),
            l && ((o = s), this._appearancePanel.css("display", ""));
          const d = this._isPropertiesEnabled(r.properties);
          r.toolbar && r.toolbar.toggleClass("g-disabled", !d),
            r.panel && r.panel.toggleClass("g-disabled", !d);
        }
        i && gDesigner.isTouchEnabled() && i.css("display", "");
        var d = $("<hr/>").addClass("appearance-divider");
        0 === $(".appearance-divider").length &&
          $(".appearance-toolbar:first").before(d),
          $(".appearance-divider").css(
            "display",
            "none" === $(".appearance-toolbar:first").css("display")
              ? "none"
              : ""
          ),
          $(".appearance-properties-panel >div >hr:visible:last").css(
            "display",
            "none"
          ),
          $(".sidebar-inspector").find(".toolbar").removeClass("last-toolbar"),
          $(".sidebar-inspector")
            .find(".toolbar")
            .filter(":visible")
            .filter(":last")
            .addClass("last-toolbar"),
          gDesigner.isTouchEnabled() && this._fireUpdateEvent(),
          this._updateUI();
      }

GInspectorSidebar.prototype._updateUI = function () {
        let e = this._htmlElement.find(".group-frame-property-panel"),
          t = this._htmlElement.find(".frame-property-panel"),
          n = this._htmlElement.find(".item-property-panel"),
          o = this._htmlElement.find(".symbol-instance-toolbar"),
          i = this._htmlElement.find(".symbol-instance-panel"),
          a = null;
        (a = gDesigner.isTouchEnabled()
          ? this._htmlElement.find(
              ".appearance-properties-panel .appearance-property-panel:last-child"
            )
          : this._htmlElement.find(".scene-properties-panel").next()),
          a &&
            (i.insertAfter(a),
            o.insertAfter(a),
            n.next().insertAfter(a),
            n.insertAfter(a),
            t.next().insertAfter(a),
            t.insertAfter(a),
            e.next().insertAfter(a),
            e.insertAfter(a));
      }

GInspectorSidebar.prototype._settingChanged = function (e) {
        "touch" === e.key &&
          (this._htmlElement
            .find(".appearance-panel-toggle-btn button.g-accordion")
            [gDesigner.isTouchEnabled() ? "hide" : "show"](),
          this._updateUI(),
          this._updatePropertyPanels());
      }

GInspectorSidebar.prototype._isPropertiesEnabled = function (e) {
        return true;
      }

GInspectorSidebar.prototype.getTouchTools = function () {
        let { disableContextSensitive: e = false } =
          arguments.length > 0 && undefined !== arguments[0] ? arguments[0] : {};
        return e ? this._getAllTouchTools() : this._touchTools;
      }

GInspectorSidebar.prototype._getAllTouchTools = function () {
        return [
          ...new Set(
            this._propertyPanels.reduce((e, t) => {
              const n = t.properties.getTouchTools();
              return n && (e = e.concat(n)), e;
            }, [])
          ),
        ];
      }

GInspectorSidebar.prototype.toString = function () {
        return "[Object GInspectorSidebar]";
      }

module.exports = GInspectorSidebar;
