/**
 * Webpack Module #864
 * Type: class
 * Name: GInspectorSidebar
 */

function (e, t, n) {
    "use strict";
    n(19), n(168), n(3), n(4), n(41), n(13), n(169), n(26);
    var o = n(53),
      i = n(1),
      a = n(78),
      r = n(606),
      s = n(806),
      l = n(395),
      c = n(1160),
      d = n(1261),
      u = n(1162),
      p = n(1262),
      g = n(1264),
      h = n(1265),
      f = n(1266),
      m = n(1269),
      y = n(1270),
      v = n(1271),
      _ = n(1272),
      b = n(1273),
      w = n(1274),
      C = n(1528),
      x = n(1159);
    const S = n(135),
      E = n(198),
      A = n(807);
    function T() {
      s.call(this), (this._propertyPanels = []), (this._touchTools = []);
    }
    i.GObject.inherit(T, s),
      (T.ACCORDIONS = [
        c.prototype.toString(),
        d.prototype.toString(),
        u.prototype.toString(),
        p.prototype.toString(),
      ]),
      (T.APPEARANCE_PROPERTIES = [
        w.prototype.toString(),
        y.prototype.toString(),
        m.prototype.toString(),
        h.prototype.toString(),
        b.prototype.toString(),
        f.prototype.toString(),
        v.prototype.toString(),
        _.prototype.toString(),
        g.prototype.toString(),
        c.prototype.toString(),
      ]),
      (T.ID = E.SidebarsIds.GInspectorSidebar),
      (T.TITLE = new i.GLocaleKey("GInspectorSidebar", "title")),
      (T.prototype._touchTools = null),
      (T.prototype._htmlElement = null),
      (T.prototype._propertyPanels = null),
      (T.prototype._document = null),
      (T.prototype._elements = null),
      (T.prototype._transformMode = !1),
      (T.prototype._appearancePanel = null),
      (T.prototype._versionHistoryPanel = null),
      (T.prototype._versionHistoryProperties = null),
      (T.prototype._versionHistoryMode = !1),
      (T.prototype.getId = function () {
        return T.ID;
      }),
      (T.prototype.getTitle = function () {
        return T.TITLE;
      }),
      (T.prototype.isEnabled = function () {
        return !!this._document;
      }),
      (T.prototype.isVisible = function () {
        return !(
          !gDesigner.getApplicationManager().isInspectEnabled() &&
          gDesigner.getActiveDocument()
        );
      }),
      (T.prototype.getOrientation = function () {
        return l.Orientation.Right;
      }),
      (T.prototype.getMinimumWidth = function () {
        return 300;
      }),
      (T.prototype.isResizeable = function () {
        return !1;
      }),
      (T.prototype.getDefaultWidth = function () {
        return 300;
      }),
      (T.prototype.init = function (e) {
        s.prototype.init.call(this, e), (this._htmlElement = e);
        var t = $("<div></div>")
            .addClass("panels scrolling-panels")
            .appendTo(this._htmlElement),
          n = $("<div></div>")
            .addClass("panels sticky-panels")
            .appendTo(this._htmlElement),
          o = $("<div></div>").addClass("toolbar appearance-toolbar");
        (this._appearancePanel = $("<div></div>")
          .css("display", "none")
          .addClass("properties-panel")
          .addClass("appearance-properties-panel")),
          $("<label></label>")
            .addClass("appearance-toolbar-title")
            .text(
              i.GLocale.get(new i.GLocaleKey("GAppearanceProperties", "title"))
            )
            .appendTo(o);
        for (
          var a = function (e) {
              var i = e.isSticky() ? n : t,
                a = $("<div></div>")
                  .css("display", "none")
                  .addClass("properties-panel"),
                r = $("<hr/>"),
                s = $("<div></div>").addClass("toolbar");
              if ($.inArray(e.toString(), T.APPEARANCE_PROPERTIES) > -1) {
                var l = $("<div></div>").addClass("appearance-property-panel");
                e.init(l, o),
                  r.appendTo(l),
                  this._appearancePanel.append(l),
                  o.appendTo(i),
                  this._appearancePanel.appendTo(i),
                  (s = o),
                  (a = l);
              } else
                r.appendTo(i),
                  e.init(a, s),
                  "" !== s.html() ? s.appendTo(i) : (s = null),
                  a.appendTo(i);
              this._propertyPanels.push({
                panel: a,
                toolbar: s,
                divider: r,
                properties: e,
              });
            }.bind(this),
            r = 0;
          r < gravit.properties.length;
          ++r
        )
          a(gravit.properties[r]);
        this._activeTool(gDesigner.getToolManager().getActiveTool()),
          this._updatePropertyPanels(),
          this._initVersionHistoryPanel(),
          gDesigner
            .getRightSidebars()
            .addEventListener(A, this._sidebarEvent, this),
          gDesigner.addEventListener(S, this._settingChanged, this);
      }),
      (T.prototype._getPropertyPanel = function (e) {
        return (
          this._propertyPanels.find((t) => t.properties instanceof e) || null
        );
      }),
      (T.prototype.openFillPatternChooser = function () {
        const e = this._getPropertyPanel(d);
        e && e.properties.openPatternChooser();
      }),
      (T.prototype.openBorderPatternChooser = function () {
        const e = this._getPropertyPanel(u);
        e && e.properties.openPatternChooser();
      }),
      (T.prototype.openFillEyeDropper = function (e, t) {
        const n = this._getPropertyPanel(d);
        n && n.properties.openEyeDropper(e, t);
      }),
      (T.prototype.openBorderEyeDropper = function (e, t) {
        const n = this._getPropertyPanel(u);
        n && n.properties.openEyeDropper(e, t);
      }),
      (T.prototype.openTextColorEyeDropper = function (e, t) {
        const n = this._getPropertyPanel(b);
        n && n.properties.openEyeDropper(e, t);
      }),
      (T.prototype.setPathPointsNodeType = function (e) {
        const t = this._getPropertyPanel(m);
        t && t.properties.assignNodeType(e);
      }),
      (T.prototype._sidebarEvent = function (e) {
        gDesigner.isTouchEnabled() &&
          e.type === A.Type.Activated &&
          e.sidebar &&
          e.sidebar.getId() === E.SidebarsIds.GAnnotationsSidebar &&
          this._updatePropertyPanels();
      }),
      (T.prototype.activate = function () {
        gDesigner.addEventListener(a, this._documentEvent, this),
          gDesigner
            .getToolManager()
            .addEventListener(
              o.GToolManager.ToolChangedEvent,
              this._toolChangedEvent,
              this
            );
        var e = gDesigner.getActiveDocument();
        e && this._activateDocument(e);
      }),
      (T.prototype.deactivate = function () {
        gDesigner.removeEventListener(a, this._documentEvent, this),
          gDesigner
            .getToolManager()
            .removeEventListener(
              o.GToolManager.ToolChangedEvent,
              this._toolChangedEvent,
              this
            ),
          this._document && this._deactivateDocument();
      }),
      (T.prototype._initVersionHistoryPanel = function () {
        this._versionHistoryPanel = $("<div />")
          .css("display", "none")
          .addClass("panels history-panel")
          .appendTo(this._htmlElement);
        var e = $("<div></div>").addClass(
            "properties-panel version-history-panel"
          ),
          t = $("<div></div>").addClass("toolbar");
        (this._versionHistoryProperties = new C()),
          this._versionHistoryProperties.init(e, t),
          this._versionHistoryPanel.append(t).append(e),
          gDesigner.addEventListener(x, this._updateVersionsPanel, this);
      }),
      (T.prototype._updateVersionsPanel = function (e) {
        if (e.type === x.Type.Enable) {
          var t;
          switch (((this._versionHistoryMode = !0), this.getOrientation())) {
            case l.Orientation.Left:
              t = gDesigner.getLeftSidebars();
              break;
            case l.Orientation.Right:
              t = gDesigner.getRightSidebars();
          }
          t.setActiveSidebar(this.getId()),
            gDesigner.setPartVisible(t.getSidebarsPart(), !0),
            this._htmlElement.find(".panels").css("display", "none"),
            this._versionHistoryPanel.appendTo(this._htmlElement),
            this._versionHistoryPanel.css("display", "");
        } else
          e.type === x.Type.Disable &&
            ((this._versionHistoryMode = !1),
            this._htmlElement.find(".panels").css("display", ""),
            this._versionHistoryPanel.css("display", "none"),
            this._updatePropertyPanels(!1));
        gDesigner.isTouchEnabled() && this._updateVersionsPanelTouch();
      }),
      (T.prototype._documentEvent = function (e) {
        e.type === a.Type.Activated
          ? this._activateDocument(e.document)
          : e.type === a.Type.Deactivated
          ? this._deactivateDocument()
          : e.type === a.Type.StorageItemUpdated &&
            this._updatePropertyPanels(!1, e.data ? e.data : null);
      }),
      (T.prototype._activateDocument = function (e) {
        this._document && this._deactivateDocument(), (this._document = e);
        var t = this._document.getScene(),
          n = this._document.getEditor();
        gDesigner
          .getToolManager()
          .addEventListener(
            o.GToolManager.ToolChangedEvent,
            this._updateFromToolOrSelection,
            this
          ),
          n.addEventListener(
            o.GEditor.SelectionChangedEvent,
            this._updateFromToolOrSelection,
            this
          ),
          t.addEventListener(
            i.GNode.AfterFlagChangeEvent,
            this._afterFlagChangeEvent,
            this
          ),
          this._updateFromToolOrSelection(),
          this.trigger(r.UPDATE_EVENT);
      }),
      (T.prototype._deactivateDocument = function () {
        var e = this._document.getScene(),
          t = this._document.getEditor();
        gDesigner
          .getToolManager()
          .removeEventListener(
            o.GToolManager.ToolChangedEvent,
            this._updateFromToolOrSelection,
            this
          ),
          t.removeEventListener(
            o.GEditor.SelectionChangedEvent,
            this._updateFromToolOrSelection,
            this
          ),
          e.removeEventListener(
            i.GNode.AfterFlagChangeEvent,
            this._afterFlagChangeEvent,
            this
          ),
          (this._document = null),
          (this._elements = null),
          this._updatePropertyPanels(!0),
          this.trigger(r.UPDATE_EVENT);
      }),
      (T.prototype._toolChangedEvent = function (e) {
        var t = e.previousTool,
          n = e.newTool;
        t &&
          t instanceof o.GSelectTool &&
          (e.light || this._updateTransformMode(!1),
          t.removeEventListener(
            o.GSelectTool.Event,
            this._selectToolEvent,
            this
          )),
          this._activeTool(n);
      }),
      (T.prototype._activeTool = function (e) {
        e &&
          e instanceof o.GSelectTool &&
          e.addEventListener(o.GSelectTool.Event, this._selectToolEvent, this);
      }),
      (T.prototype._selectToolEvent = function (e) {
        e.type === o.GSelectTool.Event.Type.EditModeChanged &&
          this._updateTransformMode(
            e.args.mode === o.GSelectTool.EditMode.Transform
          );
      }),
      (T.prototype._updateTransformMode = function (e) {
        e !== this._transformMode &&
          ((this._transformMode = e), this._updatePropertyPanels(!1));
      }),
      (T.prototype._afterFlagChangeEvent = function (e) {
        e.node instanceof i.GPage &&
          e.flag === i.GNode.Flag.Active &&
          !this._document.getEditor().hasSelection() &&
          this._updateFromToolOrSelection();
      }),
      (T.prototype._updateFromToolOrSelection = function (e) {
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
      }),
      (T.prototype._updatePropertyPanels = function (e, t) {
        var n = !1,
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
      }),
      (T.prototype._updateUI = function () {
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
      }),
      (T.prototype._settingChanged = function (e) {
        "touch" === e.key &&
          (this._htmlElement
            .find(".appearance-panel-toggle-btn button.g-accordion")
            [gDesigner.isTouchEnabled() ? "hide" : "show"](),
          this._updateUI(),
          this._updatePropertyPanels());
      }),
      (T.prototype._isPropertiesEnabled = function (e) {
        return !0;
      }),
      (T.prototype.getTouchTools = function () {
        let { disableContextSensitive: e = !1 } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        return e ? this._getAllTouchTools() : this._touchTools;
      }),
      (T.prototype._getAllTouchTools = function () {
        return [
          ...new Set(
            this._propertyPanels.reduce((e, t) => {
              const n = t.properties.getTouchTools();
              return n && (e = e.concat(n)), e;
            }, [])
          ),
        ];
      }),
      (T.prototype.toString = function () {
        return "[Object GInspectorSidebar]";
      }),
      n(1529)(T),
      (e.exports = T);
  }