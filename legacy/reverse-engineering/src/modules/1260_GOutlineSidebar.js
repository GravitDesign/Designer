/**
 * Webpack Module #1260
 * Type: class
 * Name: GOutlineSidebar
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(596), n(30), n(57), n(8), n(3), n(4), n(41), n(13), n(32), n(33);
    var i = n(53),
      a = n(1),
      r = n(15),
      s = o(n(340)),
      l = n(67),
      c = o(n(442)),
      d = n(78),
      u = n(217),
      p = n(86),
      g = n(603),
      h = n(449),
      f = n(566),
      m = n(806),
      y = n(395),
      v = n(1523),
      _ = n(44),
      b = n(450);
    const w = n(808),
      C = n(135);
    function x() {
      m.call(this);
    }
    a.GObject.inherit(x, m),
      (x.ID = "outline"),
      (x.TITLE = new a.GLocaleKey("GOutlineSidebar", "title")),
      (x.MULTIPAGE_MODE_ENABLED_OPTION_NAME = "OutlineSidebar/Multipage_Mode"),
      (x.prototype._document = null),
      (x.prototype._pageToolbar = null),
      (x.prototype._layerToolbar = null),
      (x.prototype._exportToolbar = null),
      (x.prototype._outlineSidebarElement = null),
      (x.prototype._pageContainerMaxHeight = 500),
      (x.prototype._pageContainerMinHeight = 50),
      (x.prototype._pagePanel = null),
      (x.prototype._pageModeSwitch = null),
      (x.prototype._layerPanel = null),
      (x.prototype._exportPanel = null),
      (x.prototype._exportInstance = null),
      (x.prototype._pageMenuOptionButton = null),
      (x.prototype._transformMode = !1),
      (x.prototype._htmlElement = null),
      (x.prototype.getId = function () {
        return x.ID;
      }),
      (x.prototype.getTitle = function () {
        return x.TITLE;
      }),
      (x.prototype.isEnabled = function () {
        return null !== this._document;
      }),
      (x.prototype.isVisible = function () {
        return !!gDesigner.getApplicationManager().isInspectEnabled();
      }),
      (x.prototype.getOrientation = function () {
        return y.Orientation.Left;
      }),
      (x.prototype.getMinimumWidth = function () {
        return 250;
      }),
      (x.prototype.getDefaultWidth = function () {
        return 250;
      }),
      (x.prototype.isResizeable = function () {
        return !0;
      }),
      (x.prototype.getLayerPanel = function () {
        return this._layerPanel;
      }),
      (x.prototype.relayout = function () {
        this._pagePanel.gPagePanel("relayout"),
          this._layerPanel.gLayerPanel("relayout"),
          (this._pageContainerMaxHeight =
            parseInt(this._outlineSidebarElement.css("height"), 10) - 150);
      }),
      (x.prototype._copyDataTransfer = function (e, t) {
        var n = t.originalEvent;
        e.hasOwnProperty("dataTransfer")
          ? n &&
            n.dataTransfer &&
            n.dataTransfer.types &&
            n.dataTransfer.types.forEach(function (t) {
              e.dataTransfer.setData(n.dataTransfer.getData(t));
            })
          : (e.dataTransfer = n.dataTransfer);
      }),
      (x.prototype.getTouchTools = function () {
        return [
          new s.default({
            def: !0,
            id: "pages",
            sidebar: this.getId(),
            icon: "gravit-icon-touch-pages-panel",
            panel: ".pages-container",
            toolbar: ".page-toolbar",
            panelWidth: "320px",
          }),
          new s.default({
            id: "layers",
            sidebar: this.getId(),
            icon: "gravit-icon-touch-layers-panel",
            panel: [".layers-container", ".export-panel"],
            toolbar: ".layer-toolbar",
            panelWidth: "350px",
          }),
        ];
      }),
      (x.prototype.init = function (e) {
        (this._htmlElement = e),
          m.prototype.init.call(this, e),
          (this._pageToolbar = $("<div></div>")
            .addClass("toolbar page-toolbar")
            .append(
              $("<label></label>").text(
                a.GLocale.get(new a.GLocaleKey("GOutlineSidebar", "text.pages"))
              )
            )
            .on("dragover", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on("dragenter", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on(
              "drop",
              function (e) {
                e.preventDefault(), e.stopPropagation();
                var t = this._pagePanel.gPagePanel("getLastVisitedDroppable");
                if (t) {
                  var n = document.createEvent("mouseEvent");
                  n.initEvent("drop", !0, !0, null),
                    this._copyDataTransfer(n, e),
                    t.dispatchEvent(n);
                }
              }.bind(this)
            )
            .appendTo(e)),
          (this._pageModeSwitch = $("<label></label>")
            .addClass("g-switch")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.toggle-page-mode")
              )
            )
            .css("margin-right", "5px")
            .append(
              $("<input>")
                .attr("id", "toogle-page-mode-checkbox")
                .attr("type", "checkbox")
                .attr("data-property", "multipage-switch")
                .on("change", this._multiPageModeChangeEventHandler.bind(this))
            )
            .append($("<div></div>"))
            .appendTo(this._pageToolbar)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.multipage-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.multipage-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            )),
          (this._pageMenuOptionButton = $("<button></button>")
            .addClass("setting-menu-options")
            .on(
              "click",
              function (e) {
                Object.assign(e, { data: { context: b.PagePanel } }),
                  $(gDesigner.getWindows().getHtmlElement()).trigger(
                    "contextmenu",
                    e
                  );
              }.bind(this)
            )
            .append($("<span/>").addClass("gravit-icon-settings"))
            .appendTo(this._pageToolbar)),
          $("<button></button>")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-active-page")
              )
            )
            .on("click", () => this._deletePage())
            .append($("<span></span>").addClass("gravit-icon-trash"))
            .appendTo(this._pageToolbar)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.delete-page-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.delete-page-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          $("<button></button>")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.create-new-page")
              )
            )
            .on(
              "click",
              function () {
                this._insertPage(),
                  $(this._pageToolbar).gAccordion("toggleOpen", !0),
                  $(this._pageToolbar).gAccordion("init", $(this._pagePanel));
              }.bind(this)
            )
            .append($("<span></span>").addClass("gravit-icon-addpage"))
            .appendTo(this._pageToolbar)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.create-new-page-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.create-new-page-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            );
        var t,
          n,
          o = $("<div></div>").addClass("pages-container").appendTo(e);
        (this._pagePanel = $("<div></div>")
          .addClass("pages")
          .gToolbarShadow("init", ".page-toolbar")
          .on("dragover", function (e) {
            e.preventDefault(), e.stopPropagation();
          })
          .on("dragenter", function (e) {
            e.preventDefault(), e.stopPropagation();
          })
          .on(
            "drop",
            function (e) {
              e.preventDefault(), e.stopPropagation();
              var t = this._pagePanel.gPagePanel("getLastVisitedDroppable");
              if (t) {
                var n = document.createEvent("mouseEvent");
                n.initEvent("drop", !0, !0, null),
                  this._copyDataTransfer(n, e),
                  t.dispatchEvent(n);
              }
            }.bind(this)
          )
          .on(
            "mouseenter",
            function () {
              this._pagePanel.gPagePanel("setBlockHighlight", !0);
            }.bind(this)
          )
          .on(
            "mouseleave",
            function () {
              this._pagePanel.gPagePanel("setBlockHighlight", !1);
            }.bind(this)
          )
          .appendTo(o)),
          this._pagePanel.gPagePanel({
            moveCallback: this._movePageTreeNodeCallback.bind(this),
            clickCallback: this._clickPageTreeNodeCallback.bind(this),
            startDraggingCallback: this._startPageDraggingCallback.bind(this),
          });
        var r = !1,
          s = $("<div/>").attr("id", "page-layer-divider"),
          c = function (e) {
            var i;
            r &&
              ((i = n - t + e.clientY) < this._pageContainerMinHeight &&
                (i = this._pageContainerMinHeight),
              i > this._pageContainerMaxHeight &&
                (i = this._pageContainerMaxHeight),
              o.css("height", i + "px"));
          }.bind(this),
          u = function () {
            $(document).off("mousemove", c),
              $(document).off("mouseup", u),
              (r = !1),
              (t = null),
              (n = null),
              e.removeClass("page-container-resizing");
          },
          p = function (i) {
            (t = i.clientY),
              (r = !0),
              (n = parseInt(o.css("height"), 10)),
              e.addClass("page-container-resizing"),
              $(document).on("mousemove", c),
              $(document).on("mouseup", u);
          }.bind(this);
        $(s).on("mousedown", p),
          s.appendTo(e),
          $("<hr />").appendTo(s),
          s.append($("<div />")),
          this._addLayerPanel(e),
          $("<hr/>").appendTo(e),
          (this._exportToolbar = $("<div></div>")
            .addClass("toolbar toolbar-export")
            .appendTo(e)),
          (this._exportPanel = $("<div></div>")
            .addClass("properties-panel")
            .addClass("export-panel")
            .appendTo(e)),
          (this._exportInstance = new v()),
          this._exportInstance.init(this._exportPanel, this._exportToolbar),
          gDesigner.addEventListener(d, this._documentEvent, this),
          gDesigner
            .getToolManager()
            .addEventListener(
              i.GToolManager.ToolChangedEvent,
              this._toolChangedEvent,
              this
            ),
          gDesigner.addEventListener(w, this._applicationStatusEvent, this),
          gDesigner.addEventListener(C, this._settingChanged, this),
          this._pageToolbar.gAccordion("init", ".pages-container", "label"),
          this._exportToolbar.gAccordion("init", ".properties-panel", "label"),
          (this._outlineSidebarElement = e);
      }),
      (x.prototype.toggleMultiPageMode = function () {
        const e = this._getMultiPageSwitcher();
        if (e) {
          const t = e.is(":checked");
          e.prop("checked", !t), e.trigger("change");
        }
      }),
      (x.prototype._changePageMode = function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        this._document
          .getScene()
          .setProperty(c.default.MULTIPAGE_VIEW_ENABLED, e),
          gContainer.setProperty(x.MULTIPAGE_MODE_ENABLED_OPTION_NAME, e),
          t &&
            this._pageModeSwitch
              .find("input[data-property=multipage-switch]")
              .prop("checked", e);
      }),
      (x.prototype._getMultiPageSwitcher = function () {
        return this._pageModeSwitch
          ? this._pageModeSwitch.find('input[data-property="multipage-switch"]')
          : null;
      }),
      (x.prototype._multiPageModeChangeEventHandler = function (e) {
        gDesigner.stats("pages_change_multipage-mode");
        const t = $(e.target);
        this._refreshPageModeSwitch(t, { showAlert: !0 });
        const n = t.is(":checked");
        this._changePageMode(n, !1);
        const o = a.GLocale.get(
          new a.GLocaleKey("GOutlineSidebar", "action.toggle-page-mode")
        );
        this._document.getEditor().pushState(
          o,
          () => {
            this._changePageMode(n);
          },
          () => {
            this._changePageMode(!n);
          },
          {
            actions: [
              { isPropertyChangeAction: !0, node: { hasMixin: () => !1 } },
            ],
          }
        );
      }),
      (x.prototype._settingChanged = function (e) {
        "touch" === e.key && this._touchInterfaceUpdate();
      }),
      (x.prototype._applicationStatusEvent = function (e) {
        e.status === w.Status.Ready && this._touchInterfaceUpdate();
      }),
      (x.prototype._touchInterfaceUpdate = function () {
        gDesigner.isTouchEnabled()
          ? (this._pageModeSwitch.toggleClass("toogle-page-mode", !0),
            this._pageModeSwitch.toggleClass("g-switch", !1),
            this._pageModeSwitch
              .find("#toogle-page-mode-checkbox")
              .gCheckboxSlider(),
            this._pageMenuOptionButton.show(),
            this._pagePanel.gPagePanel("resetVTreeRowHeight", "48"),
            this._layerPanel.gLayerPanel("resetVTreeRowHeight", "48"))
          : (this._pageModeSwitch.toggleClass("toogle-page-mode", !1),
            this._pageModeSwitch.toggleClass("g-switch", !0),
            this._pageModeSwitch
              .find("#toogle-page-mode-checkbox")
              .gCheckboxSlider("unmount"),
            this._pageMenuOptionButton.hide(),
            this._pagePanel.gPagePanel("resetVTreeRowHeight", "34"),
            this._layerPanel.gLayerPanel("resetVTreeRowHeight", "34"));
      }),
      (x.prototype._addLayerPanel = function (e) {
        this._layerToolbar ||
          ((this._layerToolbar = $("<div></div>")
            .addClass("toolbar")
            .addClass("layer-toolbar")
            .append(
              $("<label></label>")
                .css("flex-grow", "1")
                .text(
                  a.GLocale.get(
                    new a.GLocaleKey("GOutlineSidebar", "text.layers")
                  )
                )
            )
            .on("dragover", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on("dragenter", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on(
              "drop",
              function (e) {
                e.preventDefault(), e.stopPropagation();
                var t = this._layerPanel.gLayerPanel("getLastVisitedDroppable");
                if (t) {
                  var n = new CustomEvent("drop", {
                    bubbles: !0,
                    cancelable: !0,
                  });
                  this._copyDataTransfer(n, e),
                    (n.altKey = e.originalEvent.altKey),
                    (n.layerY = 0),
                    t.dispatchEvent(n);
                }
              }.bind(this)
            )),
          $("<button></button>")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-layer-item")
              )
            )
            .on("click", () => this._deleteLayerOrItem())
            .append($("<span></span>").addClass("gravit-icon-trash"))
            .appendTo(this._layerToolbar)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.delete-layer-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.delete-layer-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          $("<button></button>")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.new-layer")
              )
            )
            .on("click", () => this.insertLayer())
            .append($("<span></span>").addClass("gravit-icon-addlayer"))
            .appendTo(this._layerToolbar)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.new-layer-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.new-layer-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            )),
          this._layerToolbar.appendTo(e);
        var t = $("<div></div>").addClass("layers-container").appendTo(e);
        this._layerPanel ||
          ((this._layerPanel = $("<div></div>")
            .gToolbarShadow("init", ".layer-toolbar")
            .addClass("layers")
            .on(
              "mouseenter",
              function (e) {
                var t = this._document.getScene();
                t &&
                  t.acceptChildren(function (e) {
                    return (
                      e.hasFlag(a.GNode.Flag.Highlighted) &&
                        e.removeFlag(a.GNode.Flag.Highlighted),
                      !0
                    );
                  }),
                  this._layerPanel.gLayerPanel("setBlockHighlight", !0);
              }.bind(this)
            )
            .on(
              "mouseleave",
              function (e) {
                this._layerPanel.gLayerPanel("setBlockHighlight", !1);
              }.bind(this)
            )
            .on(
              "click",
              function () {
                gDesigner.stats("layers_deselect_all-layers"),
                  this._document.getEditor().clearSelection();
                var e = this._document.getScene();
                e && e.setActiveLayer(null),
                  r.GPlatform.modifiers.optionKey &&
                    gDesigner.executeAction(h.ID, void 0, "outlinesidebar");
              }.bind(this)
            )
            .on("dragover", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on("dragenter", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on(
              "drop",
              function (e) {
                e.preventDefault(), e.stopPropagation();
                var t = this._layerPanel.gLayerPanel("getLastVisitedDroppable");
                if (t) {
                  var n = document.createEvent("mouseEvent");
                  n.initEvent("drop", !0, !0, null),
                    this._copyDataTransfer(n, e),
                    t.dispatchEvent(n);
                }
              }.bind(this)
            )
            .appendTo(t)),
          this._layerPanel.gLayerPanel({
            moveCallback: this._moveLayerTreeNodeCallback.bind(this),
            isDuplicateEffectCallback:
              this._isDuplicateEffectCallback.bind(this),
            duplicateCallback: this._duplicateLayerTreeNodeCallback.bind(this),
            clickCallback: this._clickLayerTreeNodeCallback.bind(this),
            startDraggingCallback: this._startLayerDraggingCallback.bind(this),
            patternChooserStatusChangeCallBack:
              this._patternChooserStatusChange.bind(this),
          }));
      }),
      (x.prototype._documentEvent = function (e) {
        var t, n;
        e.type === d.Type.Activated
          ? ((this._document = e.document),
            (t = this._document.getScene()),
            this._pagePanel.gPagePanel("scene", t),
            this._layerPanel.gLayerPanel("scene", t),
            this.trigger(m.UPDATE_EVENT),
            this._document.getStatus() === p.Ready ||
            this._document.getStatus() === p.Loaded
              ? this._document.getActiveWindow()
                ? this._updateMultiPageMode()
                : gDesigner
                    .getWindows()
                    .addEventListener(g.WindowEvent, this._windowsEvent, this)
              : this._document.addEventListener(
                  u,
                  this._documentStatusEvent,
                  this
                ),
            (n = this._document.getEditor()),
            gDesigner
              .getToolManager()
              .addEventListener(
                i.GToolManager.ToolChangedEvent,
                this._updateExport,
                this
              ),
            n.addEventListener(
              i.GEditor.SelectionChangedEvent,
              this._updateExport,
              this
            ),
            t.addEventListener(
              a.GNode.AfterFlagChangeEvent,
              this._afterFlagChangeEvent,
              this
            ),
            t.addEventListener(
              a.GNode.AfterPropertiesChangeEvent,
              this._afterPropertiesChanged,
              this
            ),
            t.addEventListener(
              a.GNode.AfterInsertEvent,
              this._afterInsert,
              this
            ),
            this._updateExport())
          : e.type === d.Type.Deactivated &&
            (this._pagePanel.gPagePanel("scene", null),
            this._layerPanel.gLayerPanel("scene", null),
            (t = this._document.getScene()),
            (n = this._document.getEditor()),
            gDesigner
              .getToolManager()
              .removeEventListener(
                i.GToolManager.ToolChangedEvent,
                this._updateExport,
                this
              ),
            gDesigner
              .getWindows()
              .removeEventListener(g.WindowEvent, this._windowsEvent, this),
            n.removeEventListener(
              i.GEditor.SelectionChangedEvent,
              this._updateExport,
              this
            ),
            t.removeEventListener(
              a.GNode.AfterFlagChangeEvent,
              this._afterFlagChangeEvent,
              this
            ),
            t.removeEventListener(
              a.GNode.AfterPropertiesChangeEvent,
              this._afterPropertiesChanged,
              this
            ),
            t.removeEventListener(
              a.GNode.AfterInsertEvent,
              this._afterInsert,
              this
            ),
            this._document.removeEventListener(
              u,
              this._documentStatusEvent,
              this
            ),
            (this._document = null),
            (this._elements = null),
            this._updateExport(),
            this.trigger(m.UPDATE_EVENT));
      }),
      (x.prototype._documentStatusEvent = function (e) {
        (e.status !== p.Ready && e.status !== p.Loaded) ||
          (this._updateMultiPageMode(),
          this._document.removeEventListener(
            u,
            this._documentStatusEvent,
            this
          ));
      }),
      (x.prototype._windowsEvent = function (e) {
        e.type === g.WindowEvent.Type.Activated &&
          (this._updateMultiPageMode(),
          gDesigner
            .getWindows()
            .removeEventListener(g.WindowEvent, this._windowsEvent, this));
      }),
      (x.prototype._isMultiPageModeEnabled = function () {
        const e = this._document
          .getScene()
          .getProperty(c.default.MULTIPAGE_VIEW_ENABLED);
        return "boolean" == typeof e
          ? e
          : gContainer.getProperty(x.MULTIPAGE_MODE_ENABLED_OPTION_NAME);
      }),
      (x.prototype._updateMultiPageMode = async function () {
        const e = this._getMultiPageSwitcher(),
          t = await this._isMultiPageModeEnabled();
        e.prop("checked", t),
          this._refreshPageModeSwitch(e, { skipInvalidation: !0 });
      }),
      (x.prototype._toolChangedEvent = function (e) {
        var t = e.previousTool,
          n = e.newTool;
        t &&
          t instanceof i.GSelectTool &&
          (e.light || this._updateTransformMode(!1),
          t.removeEventListener(
            i.GSelectTool.Event,
            this._selectToolEvent,
            this
          )),
          this._activeTool(n);
      }),
      (x.prototype._activeTool = function (e) {
        e &&
          e instanceof i.GSelectTool &&
          e.addEventListener(i.GSelectTool.Event, this._selectToolEvent, this);
      }),
      (x.prototype._selectToolEvent = function (e) {
        e.type === i.GSelectTool.Event.Type.EditModeChanged &&
          this._updateTransformMode(
            e.args.mode === i.GSelectTool.EditMode.Transform
          );
      }),
      (x.prototype._insertPage = function () {
        if (gDesigner.getApplicationManager().isEditingEnabled()) {
          gDesigner.stats("pages_insert_page");
          var e = this._document.getScene();
          i.GEditor.tryRunTransaction(
            e,
            function () {
              var t = e.insertPage();
              e.setActivePage(t);
            },
            a.GLocale.get(
              new a.GLocaleKey("GOutlineSidebar", "action.insert-page")
            )
          ),
            this._navigateDrawingCenter(e.getActivePage()),
            this._refreshSelection();
        }
      }),
      (x.prototype.sceneHasInfiniteCanvas = function () {
        var e = !1;
        return (
          this._document
            .getScene()
            .iteratePages((t) => (t.isFixedSized() || (e = !0), !e), !0),
          e
        );
      }),
      (x.prototype._refreshPageModeSwitch = function (e) {
        let { showAlert: t = !1, skipInvalidation: n = !1 } =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const o = !this.sceneHasInfiniteCanvas();
        if (!this.isEnabled())
          return e.attr("data-title", ""), void e.prop("disabled", !0);
        e.prop("disabled", !1);
        var i = this._document.getActiveWindow(),
          r = i.getView();
        (o ||
          (e.is(":checked") && e.prop("checked", !1),
          t &&
            _.alert(
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "text.multipage-alert")
              )
            ),
          r.getViewConfiguration().multiPageView ||
            r.getViewConfiguration().pageLabelsVisible)) &&
          ((r.getViewConfiguration().multiPageView = e.is(":checked")),
          (r.getViewConfiguration().pageLabelsVisible = e.is(":checked")),
          n ||
            (r.invalidate(null, !0),
            t && (i.centerAndZoom(), this._refreshSelection())));
      }),
      (x.prototype._deletePage = function () {
        gDesigner.stats("pages_delete_page");
        this._document.getEditor();
        var e = this._document.getScene(),
          t = e.getActivePage();
        t.getProperty("plkt") & a.GBlock.ProgramLck.NoDelete ||
          (t.getSlavePages().length > 0
            ? _.confirm(
                a.GLocale.get(
                  new a.GLocaleKey(
                    "GOutlineSidebar",
                    "text.confirm-delete-masterpage"
                  )
                ),
                function (t) {
                  t &&
                    i.GEditor.tryRunTransaction(
                      e,
                      function () {
                        e.deleteActivePage();
                      },
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GOutlineSidebar",
                          "action.delete-page"
                        )
                      )
                    );
                },
                null,
                null,
                !0,
                !0
              )
            : i.GEditor.tryRunTransaction(
                e,
                function () {
                  e.deleteActivePage();
                },
                a.GLocale.get(
                  new a.GLocaleKey("GOutlineSidebar", "action.delete-page")
                )
              ),
          this._navigateDrawingCenter(e.getActivePage()),
          this._refreshSelection());
      }),
      (x.prototype._refreshSelection = function () {
        var e = this._document.getEditor(),
          t = this._document.getScene(),
          n = this._document
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView,
          o = t.getActivePage(),
          a = null;
        if (e.hasSelection()) {
          var r = e.getSelection();
          n
            ? e.updateSelection(!1, [o])
            : (a = r.filter(function (e) {
                return i.GEditor.getElementPage(e) === o;
              })).length !== r.length && e.updateSelection(!1, a);
        } else n && e.updateSelection(!1, [o]);
      }),
      (x.prototype._movePageTreeNodeCallback = function (e, t, n) {
        if (n && e && n.length) {
          this._pagePanel.gPagePanel("blockHandlers", !0);
          var o = this._document.getScene();
          i.GEditor.tryRunTransaction(
            this._document.getScene(),
            function () {
              this._document.getEditor().clearSelection(),
                o.startBlockReferenceChanges(),
                n.length > 1 && e.beginUpdate();
              for (var i = n.length; i > 0; --i) {
                var a = n[i - 1];
                a.getParent().removeChild(a), e.insertChild(a, t);
              }
              n.length > 1 && e.endUpdate(),
                o.endBlockReferenceChanges(),
                o.isEvenOddMaster() && o.reassignMasterPages();
            }.bind(this),
            a.GLocale.get(
              new a.GLocaleKey("GOutlineSidebar", "action.move-page")
            )
          ),
            this._pagePanel.gPagePanel("blockHandlers", !1);
        }
      }),
      (x.prototype._startPageDraggingCallback = function (e) {
        gDesigner.stats("pages_start_drag");
        var t = null;
        if (e) {
          t = [];
          var n = this._document.getEditor();
          if (e.hasFlag(a.GNode.Flag.Selected)) {
            var o = n.getSelection();
            t = this._filterPageDraggable(o);
            t = a.GNode.order(t, !0);
          } else n.clearSelection(), t.push(e);
        }
        return t;
      }),
      (x.prototype._filterPageDraggable = function (e) {
        var t = [];
        if (e)
          for (var n = 0; n < e.length; ++n) {
            var o = e[n];
            o instanceof a.GPage &&
              !o.hasFlag(a.GElement.Flag.PartialLocked) &&
              t.push(o);
          }
        return t;
      }),
      (x.prototype.changeActivePage = function (e) {
        gDesigner.stats("pages_select_page");
        const t = this._document,
          n = t && t.getScene();
        n &&
          e &&
          i.GEditor.tryRunTransaction(
            n,
            () => {
              n.setActivePage(e),
                this._navigateDrawingCenter(e),
                this._refreshSelection();
            },
            a.GLocale.get(
              new a.GLocaleKey("GOutlineSidebar", "action.change-active-page")
            )
          );
      }),
      (x.prototype._clickPageTreeNodeCallback = function (e) {
        this.changeActivePage(e);
      }),
      (x.prototype._navigateDrawingCenter = function (e) {
        var t = this._document.getActiveWindow().getView();
        if (t.getViewConfiguration().multiPageView) {
          var n = e.getTransform(),
            o = e.getGeometryBBox();
          r = n.mapRect(o).getSide(a.GRect.Side.CENTER);
          t.zoomAtCenter(r);
        } else if (this._document.hasCDR()) {
          var i = e.getContentBBox();
          if (i && !i.isEmpty()) {
            var r = i.getSide(a.GRect.Side.CENTER);
            t.zoomAtCenter(r);
          }
        }
      }),
      (x.prototype.createLayer = function () {
        const e = this._document.getScene(),
          t = new a.GLayer();
        return (
          t.setProperty(
            "name",
            a.GLocale.get(new a.GLocaleKey("GOutlineSidebar", "text.layer")) +
              " " +
              e.queryCount("layer").toString()
          ),
          t
        );
      }),
      (x.prototype.insertLayer = function () {
        if (!gDesigner.getApplicationManager().isEditingEnabled()) return;
        gDesigner.stats("layers_insert_layer");
        const e = this._document.getScene();
        i.GEditor.tryRunTransaction(
          e,
          () => {
            const t = gDesigner.getActiveDocument(),
              n = t && t.getEditor(),
              o = (n && n.getSelection()) || [];
            let i = e.getActivePage();
            i || ((i = e.insertPage()), i.setFlag(a.GNode.Flag.Active));
            const r = this.createLayer(),
              s = o.filter((e) => !this._hasSelectedParentLayer(e)),
              l = a.GNode.order(s, !0),
              c = l && l[0];
            ((c && c.getParent()) || i).insertChild(r, c),
              e.setActiveLayer(r),
              this._moveLayers(r, null, s, !1);
          },
          a.GLocale.get(
            new a.GLocaleKey("GOutlineSidebar", "action.insert-layer")
          )
        );
      }),
      (x.prototype._hasSelectedParentLayer = function (e) {
        let t = !1;
        for (
          let n = e.getParent();
          n instanceof a.GLayer && !t;
          n = n.getParent()
        )
          n.hasFlag(a.GNode.Flag.Selected) && (t = !0);
        return t;
      }),
      (x.prototype._moveLayerTreeNodeCallback = function (e, t, n, o) {
        const r = this._document.getScene();
        i.GEditor.tryRunTransaction(
          r,
          () => {
            this._moveLayers(e, t, n, o);
          },
          a.GLocale.get(
            new a.GLocaleKey("GOutlineSidebar", "action.move-layer")
          )
        );
      }),
      (x.prototype._moveLayers = function (e, t, n) {
        let o =
          !(arguments.length > 3 && void 0 !== arguments[3]) || arguments[3];
        if (!(e && e.hasMixin(a.GNode.Container) && n && n.length)) return;
        if (
          !(n = n
            .slice()
            .filter((e) =>
              i.GEditor.validateBlockInsertion(e.getParent(), e, t)
            )).length
        )
          return;
        o && this._layerPanel.gLayerPanel("blockHandlers", !0);
        const s = this._document.getScene();
        this._document.getEditor().clearSelection(),
          s.startBlockReferenceChanges(),
          n.length > 1 && e.beginUpdate(),
          n.forEach((n) => {
            r.GPlatform.modifiers.optionKey
              ? n.hasMixin(a.GNode.Store) && (n = n.clone())
              : n.getParent().removeChild(n),
              n &&
                (e.insertChild(n, t),
                e instanceof a.GCompoundShape && n.assignStyleFrom(e));
          }),
          n.length > 1 && e.endUpdate(),
          s.endBlockReferenceChanges(),
          this._document.getEditor().updateSelection(!1, n),
          o && this._layerPanel.gLayerPanel("blockHandlers", !1);
      }),
      (x.prototype._isDuplicateEffectCallback = function (e) {
        return e.altKey;
      }),
      (x.prototype._duplicateLayerTreeNodeCallback = function (e, t, n) {
        if (n && e && e.hasMixin(a.GNode.Container) && n.length) {
          this._layerPanel.gLayerPanel("blockHandlers", !1);
          var o = this._document.getScene();
          i.GEditor.tryRunTransaction(
            o,
            function () {
              this._document.getEditor().clearSelection(),
                n.length > 1 && e.beginUpdate();
              for (var o = [], r = 0; r < n.length; ++r) {
                var s = n[r];
                s.validateInsertion(e) &&
                  s.hasMixin(a.GNode.Store) &&
                  i.GEditor.validateBlockInsertion(e, s) &&
                  (s = s.clone()) &&
                  o.push(s);
              }
              if (
                (this._document
                  .getEditor()
                  .insertElements(o, !0, !0, !1, !0, e, t),
                e instanceof a.GCompoundShape)
              )
                for (var l = 0; l < o.length; ++l) o[l].assignStyleFrom(e);
              else if (e instanceof a.GShape) {
                var c = e.getPaintBBox();
                if (c) {
                  var d = c.getX(),
                    u = c.getY();
                  for (r = 0; r < o.length; ++r) {
                    var p = o[r],
                      g = p instanceof a.GElement ? p.getPaintBBox() : null;
                    if (g && !c.intersectsRect(g, !0)) {
                      var h = g.getX(),
                        f = g.getY();
                      null === d ||
                        null === h ||
                        (a.GMath.isEqualEps(d, h) &&
                          a.GMath.isEqualEps(u, f)) ||
                        p.transform(
                          new a.GTransform(1, 0, 0, 1, d - h, u - f),
                          !0
                        );
                    }
                  }
                }
              }
              n.length > 1 && e.endUpdate(),
                this._document.getEditor().updateSelection(!1, o);
            }.bind(this),
            a.GLocale.get(
              new a.GLocaleKey("GOutlineSidebar", "action.move-layer")
            )
          );
        }
      }),
      (x.prototype._startLayerDraggingCallback = function (e) {
        var t = null;
        if (e) {
          gDesigner.stats("layers_start_drag"), (t = []);
          var n = this._document.getEditor();
          if (e.hasFlag(a.GNode.Flag.Selected)) {
            var o = n.getSelection();
            (t = this._filterLayerDraggable(o)), (t = a.GNode.order(t, !0));
          } else n.clearSelection(), t.push(e);
        }
        return t;
      }),
      (x.prototype._patternChooserStatusChange = function (e) {
        this._layerToolbar.toggleClass("pattern-choose-actived", e);
      }),
      (x.prototype._filterLayerDraggable = function (e) {
        var t = [];
        if (e)
          for (var n = 0; n < e.length; ++n) {
            var o = e[n];
            if (!o.hasFlag(a.GElement.Flag.PartialLocked)) {
              for (
                var i = !1, r = o.getParent();
                null != r && !i;
                r = r.getParent()
              )
                i = r.hasFlag(a.GNode.Flag.Selected);
              i || t.push(o);
            }
          }
        return t;
      }),
      (x.prototype._clickLayerTreeNodeCallback = function (e) {
        if (e) {
          e instanceof a.GCollabText
            ? gDesigner.stats("layers_select_collab-text")
            : gDesigner.stats("layers_select_layer"),
            this._document.getScene().updateActivePageForElem(e),
            this._document.getScene().updateActiveLayerForElem(e);
          var t = this._document.getEditor(),
            n = null,
            o = !1;
          if (
            (e instanceof a.GItem
              ? (n = a.GItem)
              : e instanceof a.GLayer && (n = a.GLayer),
            n)
          ) {
            if (
              (jQuery(
                gDesigner
                  .getWindows()
                  .getActiveWindow()
                  .getView()
                  .getHtmlElement()
              )
                .find("> div[tabindex=0]")
                .focus(),
              r.GPlatform.modifiers.metaKey ||
                (!e.hasFlag(a.GNode.Flag.Selected) &&
                  !e.hasFlag(a.GElement.Flag.FullLocked) &&
                  !r.GPlatform.modifiers.shiftKey))
            )
              this._layerPanel.gLayerPanel("onlyUpdateStyle", !0),
                t.updateSelection(r.GPlatform.modifiers.metaKey, [e]),
                this._layerPanel.gLayerPanel("onlyUpdateStyle", !1),
                (o = !0);
            else if (r.GPlatform.modifiers.shiftKey) {
              var i = t.getSelection(),
                s = null;
              if (i && i.length) {
                for (var l = i.length - 1; l >= 0 && !s; --l)
                  i[l] instanceof n && (s = i[l]);
                if (s && s !== e) {
                  var c = [];
                  if (
                    (this._document.getScene().accept(
                      function (e) {
                        return e instanceof n && c.push(e), !0;
                      },
                      !1,
                      !0
                    ),
                    c)
                  ) {
                    c = a.GNode.order(c);
                    var d = [],
                      u = !1,
                      p = null,
                      g = null;
                    for (l = 0; l < c.length && (null === p || null === g); ++l)
                      c[l] === s || c[l] === e
                        ? ((u = !u),
                          d.push(c[l]),
                          c[l] === s ? (p = l) : (g = l))
                        : u && d.push(c[l]);
                    var m = s.getParent(),
                      y = e.getParent();
                    d = d.filter(
                      function (t) {
                        var n = this._layerPanel.gLayerPanel("getTreeNode", t);
                        if (e === t || s === t) return !0;
                        var o = this._layerPanel.gLayerPanel(
                          "getItem",
                          n.parent
                        );
                        return o ? m === o : t !== m && t !== y;
                      }.bind(this)
                    );
                    var v = gDesigner.getSetting("auto_expand_layers");
                    gDesigner.setSetting("auto_expand_layers", !1),
                      d.length &&
                        (p > g && d.reverse(),
                        t.updateSelection(!1, d),
                        (o = !0)),
                      setTimeout(function () {
                        gDesigner.setSetting("auto_expand_layers", v);
                      }, 50);
                  }
                } else t.updateSelection(!1, [e]), (o = !0);
              }
            } else
              e.hasFlag(a.GNode.Flag.Selected) &&
                (this._layerPanel.gLayerPanel("onlyUpdateStyle", !0),
                t.clearSelection(),
                this._layerPanel.gLayerPanel("onlyUpdateStyle", !1),
                (o = !0));
            if (o)
              if (r.GPlatform.modifiers.optionKey)
                t.hasSelection()
                  ? gDesigner.executeAction(f.ID, void 0, "outlinesidebar")
                  : gDesigner.executeAction(h.ID, void 0, "outlinesidebar");
              else if (
                e.hasMixin(a.GNode.Properties) &&
                e.getProperty("collab")
              ) {
                const t = this._document && this._document.getActiveWindow();
                t && t.scrollIntoView(e.getGeometryBBox());
              }
          }
        }
      }),
      (x.prototype._deleteLayerOrItem = function () {
        gDesigner.stats("layers_delete_layer-or-item");
        var e = this._document.getEditor(),
          t = this._document.getScene(),
          n = t.getActiveLayer();
        e.hasSelection()
          ? i.GEditor.tryRunTransaction(
              t,
              function () {
                e.deleteSelection(!0);
                var o = t.getActiveLayer();
                n &&
                  n === o &&
                  (n.acceptChildren(
                    function (e) {
                      return e instanceof a.GItem;
                    },
                    !1,
                    !0
                  ) ||
                    t.deleteActiveLayer(n));
              },
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-layer-item")
              )
            )
          : n &&
            i.GEditor.tryRunTransaction(
              t,
              function () {
                t.deleteActiveLayer(n);
              },
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-layer-item")
              )
            );
      }),
      (x.prototype._updateExport = function () {
        this._exportInstance.update(this._document, this._elements);
      }),
      (x.prototype._updateTransformMode = function (e) {
        e !== this._transformMode &&
          ((this._transformMode = e), this._updateExport());
      }),
      (x.prototype._afterFlagChangeEvent = function (e) {
        e.node instanceof a.GPage &&
          e.flag === a.GNode.Flag.Active &&
          (this._document.getEditor().hasSelection() || this._updateExport());
      }),
      (x.prototype._afterPropertiesChanged = function (e) {
        !e.temporary &&
          (e.node instanceof a.GScene || e.node instanceof a.GPage) &&
          a.GUtil.containsOneOf(e.properties, ["w", "h"]) &&
          this._refreshPageModeSwitch(this._getMultiPageSwitcher());
      }),
      (x.prototype._afterInsert = function (e) {
        var t = e.node;
        t instanceof a.GPage &&
          0 === t.getProperty("w") &&
          this._refreshPageModeSwitch(this._getMultiPageSwitcher());
      }),
      (x.prototype.toString = function () {
        return "[Object GOutlineSidebar]";
      }),
      (e.exports = x);
  }