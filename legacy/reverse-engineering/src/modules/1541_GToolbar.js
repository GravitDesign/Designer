/**
 * Webpack Module #1541
 * Type: class
 * Name: GToolbar
 */

function (module, exports, __webpack_require__) {
    "use strict";
    __webpack_require__(58),
      __webpack_require__(19),
      __webpack_require__(596),
      __webpack_require__(96),
      __webpack_require__(30),
      __webpack_require__(57),
      __webpack_require__(20),
      __webpack_require__(3),
      __webpack_require__(151),
      __webpack_require__(247),
      __webpack_require__(4),
      __webpack_require__(41),
      __webpack_require__(13),
      __webpack_require__(32),
      __webpack_require__(33),
      __webpack_require__(26);
    var _editor = __webpack_require__(53),
      _core = __webpack_require__(1),
      _client = __webpack_require__(15),
      _config = __webpack_require__(10),
      _richtooltipconfig = __webpack_require__(67);
    const GCategory = __webpack_require__(18),
      GDocument = __webpack_require__(163),
      GDocumentStatus = __webpack_require__(86),
      simpleShapes = __webpack_require__(1542),
      GAnnotationsSidebar = __webpack_require__(567),
      GInspectorSidebar = __webpack_require__(864),
      GWindows = __webpack_require__(603),
      GArrangeAction = __webpack_require__(869),
      GClipAction = __webpack_require__(809),
      GConvertToPathAction = __webpack_require__(810),
      GCreateSymbolAction = __webpack_require__(608),
      GExportAction = __webpack_require__(861),
      GFitAllAction = __webpack_require__(449),
      GGravitCloudAction = __webpack_require__(448),
      GGroupAction = __webpack_require__(811),
      GLinkImageAction = __webpack_require__(1280),
      GMagnificationAction = __webpack_require__(1167),
      GMergeMainAction = __webpack_require__(812),
      GOpenAction = __webpack_require__(813),
      GOriginalViewAction = __webpack_require__(1282),
      GPlaceImportAction = __webpack_require__(1283),
      GRedoAction = __webpack_require__(1284),
      GSaveAction = __webpack_require__(447),
      GSaveAsAction = __webpack_require__(445),
      GShowGridAction = __webpack_require__(1285),
      GShowGuideLinesAction = __webpack_require__(1169),
      GShowSymbolLabelsAction = __webpack_require__(1286),
      GSplitAction = __webpack_require__(870),
      GToggleGuideAction = __webpack_require__(1287),
      GToggleSidebarAction = __webpack_require__(1170),
      GToggleSnapAction = __webpack_require__(1288),
      GToggleSnapZonesAction = __webpack_require__(1289),
      GTransformAction = __webpack_require__(871),
      GUndoAction = __webpack_require__(1171),
      GVectorizeBorderAction = __webpack_require__(872),
      GZoomInAction = __webpack_require__(1290),
      GZoomOutAction = __webpack_require__(1291),
      GMenuOpenEvent = __webpack_require__(804),
      GMenu = __webpack_require__(238),
      GMenuItem = __webpack_require__(339),
      GCollaborators = __webpack_require__(1292),
      GDocumentEvent = __webpack_require__(78),
      GSettingChangedEvent = __webpack_require__(135),
      GApplicationStateChangedEvent = __webpack_require__(392),
      GShareEvent = __webpack_require__(868),
      GNetworkAvailabilityChangedEvent = __webpack_require__(291),
      GUIIcons = __webpack_require__(257),
      GLicenseChangedEvent = __webpack_require__(441);
    function GToolbar(e) {
      (this._htmlElement = e), (this._initShapeMenu = !1);
    }
    _core.GObject.inherit(GToolbar, _core.GObject),
      (GToolbar.getToolName = function (e) {
        if (e && gravit)
          for (var t of gravit.tools)
            if (t.tool === e || e instanceof t.tool) {
              var n = t.title;
              if (_core.GLocale.getLanguage() !== _core.GLocaleLanguage.English)
                try {
                  n = _core.GLocale.get(
                    new _core.GLocaleKey(t.toolString, "name"),
                    void 0,
                    _core.GLocaleLanguage.English
                  );
                } catch (e) {
                  n = "[errored]";
                }
              return n;
            }
        return "";
      }),
      (GToolbar.getToolTooltipConfig = function (e) {
        return gravit && gravit.tools && gravit.tools.length
          ? gravit.tools.filter((t) => {
              let { toolString: n } = t;
              return n === e;
            })[0].richTooltipConfig
          : null;
      }),
      (GToolbar.prototype._htmlElement = null),
      (GToolbar.prototype._zoomButton = null),
      (GToolbar.prototype._pageButton = null),
      (GToolbar.prototype._selectSection = null),
      (GToolbar.prototype._commentToggleSection = null),
      (GToolbar.prototype._currentZoomLevel = -1),
      (GToolbar.prototype._symbolsButton = null),
      (GToolbar.prototype._initShapeMenu = !1),
      (GToolbar.prototype._toolsDiv = null),
      (GToolbar.prototype._exportButton = null),
      (GToolbar.prototype._shareButton = null),
      (GToolbar.prototype._viewMenu = null),
      (GToolbar.prototype._collaboratorsDiv = null),
      (GToolbar.prototype.init = function () {
        $("<div></div>")
          .addClass("section compound-section file-section")
          .append(
            this._createLabelButton({
              action: gDesigner.getAction(GSaveAction.ID),
            })
          )
          .append(
            this._createLabelButton({
              action: gDesigner.getAction(GUndoAction.ID),
              icon: "gravit-icon-undo",
              split: !0,
              menu: () => this._createQuickHistoryUndoRedoMenu(),
              click: () => gDesigner.executeAction(GUndoAction.ID),
            })
          )
          .append(
            this._createLabelButton({
              action: gDesigner.getAction(GRedoAction.ID),
            })
          )
          .appendTo(this._htmlElement),
          this._initZoomButton(),
          (this._viewMenu = new GMenu()),
          $("<div></div>")
            .addClass("section compound-section view-section")
            .append(this._zoomButton)
            .append(
              this._createLabelButton({
                icon: GUIIcons["gravit-icon-expand"],
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GFitAllAction", "title")
                ),
                click: function () {
                  gDesigner.executeAction(GFitAllAction.ID, void 0, "toolbar");
                },
                tooltipConfig:
                  GFitAllAction.TOOLTIP_CONFIG[
                    _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
                  ],
              })
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-move",
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.view")
                ),
                menu: this._createToolItems("view", this._viewMenu),
                getActiveItem: () => {
                  const e = gDesigner.getToolManager(),
                    t = e && e.getActiveTool(),
                    n = t && GToolbar.getToolName(t);
                  return n && this._viewMenu.findItem(n);
                },
                split: !0,
                click: function (e) {
                  this._activateOrResetTool(
                    $(e.target).closest(".toolbar-button").data("tool")
                  );
                }.bind(this),
                tooltipConfig: GToolbar.getToolTooltipConfig("GHandTool"),
              })
                .data("tool-group", "view")
                .data("tool", _editor.GHandTool)
            )
            .append(this._createSnapButton())
            .appendTo(this._htmlElement),
          (this._toolsDiv = $("<div></div>")
            .addClass("section compound-section tool-section")
            .append(
              this._createLabelButton({
                icon: "gravit-icon-cursor-filled",
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.select")
                ),
                menu: this._createToolItems("select"),
                split: !0,
                click: function (e) {
                  gDesigner.stats("toolbar_click_menu", "select");
                  var t = $(e.target).closest(".toolbar-button").data("tool");
                  this._activateOrResetTool(t);
                }.bind(this),
                tooltipConfig: GToolbar.getToolTooltipConfig("GPointerTool"),
              })
                .addClass("select-toolbar-button")
                .data("tool-group", "select")
                .data("tool", _editor.GPointerTool)
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-shapes",
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GShape", "name")
                ),
                menu: this._createToolItems("shape"),
                split: !0,
                click: function (e) {
                  gDesigner.stats("toolbar_click_menu", "shape"),
                    $(e.target).closest(".toolbar-button").data("tool") &&
                    this._initShapeMenu
                      ? this._activateOrResetTool(
                          $(e.target).closest(".toolbar-button").data("tool")
                        )
                      : $(e.target)
                          .closest(".toolbar-button")
                          .find("button.dropdown-button")
                          .trigger("mousedown");
                }.bind(this),
              })
                .addClass("shapes-toolbar-button")
                .data("tool-group", "shape")
                .data("tool", _editor.GRectangleTool)
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-pen",
                label: _core.GLocale.get(new _core.GLocaleKey("GPath", "name")),
                menu: this._createToolItems("path"),
                split: !0,
                click: function (e) {
                  gDesigner.stats("toolbar_click_menu", "pen");
                  var t = $(e.target).closest(".toolbar-button").data("tool");
                  this._activateOrResetTool(t);
                }.bind(this),
                tooltipConfig: GToolbar.getToolTooltipConfig("GPenTool"),
              })
                .addClass("path-toolbar-button")
                .data("tool-group", "path")
                .data("tool", _editor.GPenTool)
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-scalpel",
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GKnifeTool", "name")
                ),
                menu: this._createToolItems("knife"),
                split: !0,
                click: function (e) {
                  gDesigner.stats("toolbar_click_menu", "knife");
                  var t = $(e.target).closest(".toolbar-button").data("tool");
                  this._activateOrResetTool(t);
                }.bind(this),
                tooltipConfig: GToolbar.getToolTooltipConfig("GKnifeTool"),
              })
                .addClass("knife-toolbar-button")
                .data("tool-group", "knife")
                .data("tool", _editor.GKnifeTool)
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-textbox",
                label: _core.GLocale.get(new _core.GLocaleKey("GText", "name")),
                click: function (e) {
                  gDesigner.stats("toolbar_click_menu", "text"),
                    this._activateOrResetTool(
                      $(e.target).closest(".toolbar-button").data("tool")
                    );
                }.bind(this),
                tooltipConfig: GToolbar.getToolTooltipConfig("GTextTool"),
              })
                .addClass("text-toolbar-button")
                .data("tool", _editor.GTextTool)
            )
            .append(
              this._createLabelButton({
                icon: "gravit-icon-upload-image-icon",
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GPlaceImportAction", "tooltip-title")
                ),
                menu: this._createImageMenu(),
                split: !0,
                click: () =>
                  gDesigner.executeAction(
                    GPlaceImportAction.ID,
                    void 0,
                    "toolbar"
                  ),
                tooltipConfig:
                  GPlaceImportAction.TOOLTIP_CONFIG[
                    _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
                  ],
              }).addClass("image-toolbar-button")
            )
            .appendTo(this._htmlElement)),
          void 0 !== typeof localStorage &&
            localStorage.getItem("enable_mods") &&
            (this._toolsDiv.append(
              this._createLabelButton({
                icon: "gravit-icon-plus",
                label: "Add custom button",
                click: () => {
                  let e = $("<div/>")
                    .append($("<div/>").text("Add custom button code"))
                    .append(
                      this._textEdit(
                        $(
                          '<textarea rows="30" cols="100" wrap="off" class="custom_button_code">'
                        ).text(
                          "function (shapes, scene, selEditor, core, editor, client) {\n\t// your code here\n\t\n}"
                        )
                      )
                    )
                    .append(
                      $("<div/>")
                        .append("<label>Name:</label>")
                        .append(
                          $(
                            '<input type="text" class="custom_button_name" value="New custom action">'
                          )
                        )
                    );
                  e.gDialog({
                    releaseOnClose: !0,
                    className: "context-pane",
                    buttons: [
                      $('<button class="settings-button">Cancel</button>').on(
                        "click",
                        () => {
                          e.gDialog("close");
                        }
                      ),
                      $('<button class="settings-button">Save</button>').on(
                        "click",
                        () => {
                          var t =
                              JSON.parse(
                                localStorage.getItem("designer.custom")
                              ) || [],
                            n = _core.GUtil.uuid();
                          t.push({
                            name: $(".custom_button_name")[0].value,
                            code: $(".custom_button_code")[0].value,
                            id: n,
                          }),
                            localStorage.setItem(
                              "designer.custom",
                              JSON.stringify(t)
                            ),
                            this._refreshCustomButtons(),
                            e.gDialog("close");
                        }
                      ),
                    ],
                  }),
                    e.gDialog("open", !1),
                    $(".custom_button_code").focus(),
                    ($(".custom_button_code")[0].selectionStart = $(
                      ".custom_button_code"
                    )[0].selectionEnd =
                      $(".custom_button_code")[0].value.indexOf("code here") +
                      11);
                },
              })
            ),
            this._refreshCustomButtons()),
          $("<div></div>")
            .addClass("section compound-section transform-section")
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GTransformAction.ID +
                    "." +
                    GTransformAction.Type.FlipHorizontal
                ),
                icon: "gravit-icon-flip-horizontal",
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GTransformAction.ID + "." + GTransformAction.Type.FlipVertical
                ),
                icon: "gravit-icon-flip-vertical",
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GTransformAction.ID + "." + GTransformAction.Type.Rotate90Left
                ),
                icon: "gravit-icon-rotate-left",
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GTransformAction.ID +
                    "." +
                    GTransformAction.Type.Rotate90Right
                ),
                icon: "gravit-icon-rotate-right",
              })
            )
            .appendTo(this._htmlElement),
          $("<div></div>")
            .addClass("section compound-section group-section")
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GGroupAction.ID),
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.group")
                ),
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GSplitAction.ID),
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.split")
                ),
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GMergeMainAction.ID),
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.merge")
                ),
                menu: this._createMergeMenu(),
                split: !0,
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GClipAction.ID),
                label: _core.GLocale.get(
                  new _core.GLocaleKey("GToolbar", "text.clip")
                ),
              })
            )
            .appendTo(this._htmlElement),
          $("<div></div>")
            .addClass("section compound-section arrange-section")
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GArrangeAction.ID +
                    "." +
                    _editor.GEditor.ArrangeOrderType.BringForward
                ),
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(
                  GArrangeAction.ID +
                    "." +
                    _editor.GEditor.ArrangeOrderType.SendBackward
                ),
              })
            )
            .appendTo(this._htmlElement),
          $("<div></div>")
            .addClass("section compound-section action-section")
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GCreateSymbolAction.ID),
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GConvertToPathAction.ID),
              })
            )
            .append(
              this._createLabelButton({
                action: gDesigner.getAction(GVectorizeBorderAction.ID),
              })
            )
            .appendTo(this._htmlElement),
          (this._exportButton = this._createLabelButton({
            action: gDesigner.getAction(GExportAction.ID),
            split: !0,
            menu: this._createExportMenu(),
          }).addClass("export-toolbar-button")),
          this._exportButton.find(".dropdown-button").addClass("g-touch-only"),
          (this._collaboratorsDiv = $("<div/>").gCollaborators()),
          (this._shareButton = $("<button/>").gShareButton()),
          $("<div></div>")
            .addClass("section compound-section export-section")
            .append(this._exportButton)
            .append(
              $("<div/>")
                .addClass("share-section")
                .append(this._collaboratorsDiv)
                .append(this._shareButton)
            )
            .appendTo(this._htmlElement),
          this._updateActiveTool(gDesigner.getToolManager().getActiveTool()),
          this._updateContextTools(),
          this._updateZoomFromWindow(),
          this._updateShareSection(),
          this._updateActions(),
          gDesigner
            .getToolManager()
            .addEventListener(
              _editor.GToolManager.ToolChangedEvent,
              this._toolChangedEvent,
              this
            ),
          gDesigner
            .getWindows()
            .addEventListener(GWindows.WindowEvent, this._windowEvent, this),
          gDesigner.addEventListener(GDocumentEvent, this._documentEvent, this),
          gDesigner.addEventListener(
            GSettingChangedEvent,
            this._settingChangedEvent,
            this
          ),
          gDesigner.addEventListener(
            GNetworkAvailabilityChangedEvent,
            this._networkAvailabilityChangedEvent,
            this
          ),
          gDesigner.addEventListener(
            GApplicationStateChangedEvent,
            this._applicationStateChangedEvent,
            this
          ),
          gDesigner.addEventListener(GShareEvent, this._shareEvent, this);
      }),
      (GToolbar.prototype.setVisible = function (e) {
        const t = this.isVisible();
        this._htmlElement.css("display", e ? "" : "none"),
          t !== e && gDesigner.relayout();
      }),
      (GToolbar.prototype.isVisible = function () {
        this._htmlElement.is(":visible");
      }),
      (GToolbar.prototype._applicationStateChangedEvent = function (e) {
        this._updateUI(), this._updateViewBasedOnPermissions();
      }),
      (GToolbar.prototype._updateViewBasedOnPermissions = function () {}),
      (GToolbar.prototype._shareEvent = function (e) {
        e.type === GShareEvent.Type.Updated && this._updateUI();
      }),
      (GToolbar.prototype._updateUI = function () {
        this._updateShareSection(), this._updateActions();
        const e = !gDesigner.getApplicationManager().isPagesInspectEnabled();
        if ((this._htmlElement.toggleClass("g-simple-ui", e), e)) {
          this._pageButton ||
            ((this._pageButton = $("<div/>")
              .addClass("page-button")
              .addClass("toolbar-button")
              .gPageButton()
              .prependTo(this._htmlElement.find(".view-section"))),
            this._updatePageButton());
          const e = gDesigner.getApplicationManager().isCommentingEnabled();
          this._selectSection
            ? e || (this._selectSection.remove(), (this._selectSection = null))
            : e &&
              ((this._selectSection = $("<div></div>")
                .addClass("section compound-section select-section")
                .append(
                  this._createLabelButton({
                    icon: "gravit-icon-cursor-filled",
                    label: _core.GLocale.get(
                      new _core.GLocaleKey("GToolbar", "text.select")
                    ),
                    click: function (e) {
                      gDesigner.stats("toolbar_click_menu", "select");
                      var t = $(e.target)
                        .closest(".toolbar-button")
                        .data("tool");
                      this._activateOrResetTool(t);
                    }.bind(this),
                    tooltipConfig:
                      GToolbar.getToolTooltipConfig("GPointerTool"),
                  })
                    .data("tool-group", "select")
                    .data("tool", _editor.GPointerTool)
                )
                .insertAfter(this._htmlElement.find(".view-section"))),
              this._updateActiveTool(
                gDesigner.getToolManager().getTool(_editor.GPointerTool)
              )),
            this._commentToggleSection
              ? e ||
                (this._commentToggleSection.remove(),
                (this._commentToggleSection = null))
              : e &&
                (this._commentToggleSection = $("<div></div>")
                  .addClass("section compound-section comment-toggle-section")
                  .append(this._createCommentToggleToolbarBtn())
                  .insertAfter(this._htmlElement.find(".select-section"))),
            gDesigner.isTouchEnabled() && this._updateTouchSimpleUI();
        } else
          this._selectSection &&
            (this._selectSection.remove(), (this._selectSection = null)),
            this._pageButton &&
              (this._pageButton.gPageButton("release"),
              (this._pageButton = null)),
            this._commentToggleSection &&
              (this._commentToggleSection.remove(),
              (this._commentToggleSection = null));
      }),
      (GToolbar.prototype._networkAvailabilityChangedEvent = function (e) {
        this._collaboratorsDiv.gCollaborators(
          e.connected ? GCollaborators.Mode.Online : GCollaborators.Mode.Offline
        ),
          e.connected
            ? this._updateShareSection()
            : gDesigner.getApplicationManager().isSharing() &&
              this._collaboratorsDiv.css("display", "");
      }),
      (GToolbar.prototype._updatePageButton = function () {
        if (this._pageButton) {
          const e = gDesigner.getActiveDocument(),
            t = e && e.getScene();
          this._pageButton.gPageButton("scene", t),
            this._pageButton.css("display", t ? "" : "none");
        }
      }),
      (GToolbar.prototype._updateShareSection = function () {
        const e = this._isShareButtonVisible(),
          t = this._isRealtimeCollaboratorsVisible();
        if (
          (this._shareButton.css("display", e ? "" : "none"),
          this._collaboratorsDiv.css("display", t ? "" : "none"),
          e)
        ) {
          const e = gDesigner.getApplicationManager().isPrivateSharing(),
            t = gDesigner.getApplicationManager().isSharing();
          this._shareButton.gShareButton("update", {
            isPrivate: e,
            isSharing: t,
          });
        }
        t &&
          this._collaboratorsDiv.gCollaborators(
            "collaborators",
            this._getRealtimeCollaborators()
          );
      }),
      (GToolbar.prototype._isShareButtonVisible = function () {
        return (
          gDesigner.getApplicationManager().isShareEnabled() &&
          gDesigner.getApplicationManager().hasRole(_config.ShareRoles.Owner)
        );
      }),
      (GToolbar.prototype._isRealtimeCollaboratorsVisible = function () {
        const e = gDesigner.getApplicationManager();
        if (!e.isSharing()) return !1;
        const t = gDesigner.getActiveDocument();
        if (
          !e.hasPermission(t, _config.SharePermissions.EDIT) &&
          !e.hasPermission(t, _config.SharePermissions.COMMENT)
        )
          return !1;
        const n = this._getRealtimeCollaborators();
        return !!n && n.length > 0;
      }),
      (GToolbar.prototype._getRealtimeCollaborators = function () {
        const e = gDesigner.getSyncUser();
        return _core.GUtil.bubbleSort(
          (
            gDesigner.getApplicationManager().getRealtimeCollaborators() || []
          ).filter(
            (t) =>
              t.getRole().hasPermission(_config.SharePermissions.COMMENT) &&
              !(e && e.getUID() === t.getUID())
          ),
          function (e, t) {
            const n = e.getRole(),
              o = t.getRole();
            return n.equals(o) ||
              (!n.is(_config.ShareRoles.CoAuthor) &&
                !o.is(_config.ShareRoles.CoAuthor))
              ? _core.GUtil.SortOperators.Equals
              : _core.GUtil.SortOperators.LessThan;
          }
        );
      }),
      (GToolbar.prototype._createSnapButton = function () {
        return this._createLabelButton({
          icon: "gravit-icon-magnet",
          active: !1 === gDesigner.getSetting("snap_disabled"),
          label: _core.GLocale.get(
            new _core.GLocaleKey("GToolbar", "text.snap")
          ),
          menu: this._createSnapMenu(),
          split: !0,
          click: function (e) {
            var t = $(e.target)
              .closest(".toolbar-button")
              .find(".action-button");
            t.toggleClass("g-active", !t.hasClass("g-active")),
              gDesigner.executeAction(GToggleSnapAction.ID, void 0, "toolbar");
          }.bind(this),
          tooltipConfig:
            GToggleSnapAction.TOOLTIP_CONFIG[
              _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
            ],
        }).addClass("snap-button");
      }),
      (GToolbar.prototype._createCommentToggleToolbarBtn = function () {
        let e = gDesigner.getAction(
            GToggleSidebarAction.ID + "." + GAnnotationsSidebar.ID
          ),
          t = e.isChecked(),
          n = t ? "gravit-icon-hide-comment" : "gravit-icon-show-comment",
          o = t
            ? _core.GLocale.get(
                new _core.GLocaleKey("GToolbar", "text.comment-off")
              )
            : _core.GLocale.get(
                new _core.GLocaleKey("GToolbar", "text.comment-on")
              );
        return this._createLabelButton({
          icon: n,
          label: _core.GLocale.get(
            new _core.GLocaleKey("GToolbar", "text.comment-toggle")
          ),
          click: function () {
            gDesigner.executeAction(e.getId(), void 0, "toolbar", !0);
            let t = "Hide Comments";
            e.isChecked() && (t = "Show Comments"),
              gDesigner.stats("toolbar_activate_tool", t),
              this.updateCommentToggleStatus();
          }.bind(this),
          tooltipConfig: _richtooltipconfig.GRichTooltipConfig.from({
            title: o,
          }),
        });
      }),
      (GToolbar.prototype.updateCommentToggleStatus = function () {
        if (!this._commentToggleSection) return;
        let e = gDesigner.getAction(
            GToggleSidebarAction.ID + "." + GAnnotationsSidebar.ID
          ),
          t = this._commentToggleSection.find(".toolbar-button"),
          n = t.find(".action-button .icon"),
          o = "gravit-icon-show-comment",
          i = _richtooltipconfig.GRichTooltipConfig.from({
            title: _core.GLocale.get(
              new _core.GLocaleKey("GToolbar", "text.comment-on")
            ),
          });
        e.isChecked() &&
          ((o = "gravit-icon-hide-comment"),
          (i = _richtooltipconfig.GRichTooltipConfig.from({
            title: _core.GLocale.get(
              new _core.GLocaleKey("GToolbar", "text.comment-off")
            ),
          }))),
          this._updateIcon(n, o),
          t.gRichTooltip(i);
      }),
      (GToolbar.prototype._createOpenMenu = function () {
        const e = new GMenu();
        e.createAddItem(gDesigner.getAction(GOpenAction.ID)),
          e.createAddItem(
            gDesigner.getAction(
              ""
                .concat(GGravitCloudAction.ID, ".")
                .concat(GGravitCloudAction.Actions.Open)
            )
          );
        const t = gContainer.getRecentDocuments();
        if (t && t.length) {
          e.createAddDivider();
          const n = e.createAddItem(
            "".concat(
              _core.GLocale.get(
                new _core.GLocaleKey("GFilesPanel", "text.title-recent-files")
              ),
              ":"
            )
          );
          n.setEnabled(!1),
            n.addClass("title"),
            t.forEach((t) => {
              e.createAddItem(t.getName(), () => {
                gDesigner.openDocument(t);
              }).setIcon(gContainer.getRecentDocumentIconClass(t));
            });
        }
        return e;
      }),
      (GToolbar.prototype._createQuickHistoryUndoRedoMenu = function () {
        const e = new GMenu(null, "g-quick-history-undo-redo-menu");
        e.addEventListener(GMenuOpenEvent.EVENT, () => {
          gDesigner.stats("toolbar_click_menu", "undoopen");
        });
        var t = gDesigner.getLicense(),
          n = !(
            gDesigner.isEnabledProFeatures() ||
            (t.isPro() && !t.isExpired())
          );
        n && e.getHtmlElement().addClass("pro");
        const o = gDesigner.getAction(GRedoAction.ID);
        e.createAddItem(o);
        const i = gDesigner.getActiveDocument(),
          a = i && i.getEditor();
        if (!a) return e;
        const r = a.getCurrentStateId(),
          s = gDesigner.getAction(GUndoAction.ID);
        if (a.hasRedoState()) {
          const t = a.getRedoStates();
          e.createAddDivider(),
            t.forEach((t) => {
              this._buildAndIncludeItemForState(t, o, !0, r, e, a, n);
            });
        }
        return (
          a.hasUndoState() &&
            (e.createAddDivider(),
            a
              .getUndoStates()
              .slice()
              .reverse()
              .forEach((t) => {
                this._buildAndIncludeItemForState(t, s, !1, r, e, a, n);
              })),
          e
        );
      }),
      (GToolbar.prototype._buildAndIncludeItemForState = function (
        e,
        t,
        n,
        o,
        i,
        a,
        r
      ) {
        const s = o === e.id,
          l = new GMenuItem(GMenuItem.Type.Item, i);
        l.setCaption(e.name),
          l.setIcon(s ? "gravit-icon-dot" : t.getIcon()),
          s && l.addClass("g-active"),
          t.isEnabled() || l.addClass("g-disabled"),
          l.addEventListener(GMenuItem.ActivateEvent, () =>
            this._actionHandler(e, n, a, i, r, t)
          ),
          i.addItem(l);
      }),
      (GToolbar.prototype._actionHandler = function (e, t, n, o, i, a) {
        if (!a.isEnabled()) return;
        if (i) return void gDesigner.handlePROFeatureInterruption();
        let r = n.getCurrentStateId();
        if (r !== e.id) {
          gDesigner.stats("toolbar_click_menu", "undoclick");
          do {
            t ? n.redoState() : n.undoState(), (r = n.getCurrentStateId());
          } while (r !== e.id);
        }
      }),
      (GToolbar.prototype._createExportMenu = function () {
        const e = new GMenu();
        e.createAddItem(gDesigner.getAction("".concat(GExportAction.ID)));
        const t = ["cdrapp", "des", "gvdesign", "pdf"];
        GDocument.FileTypes.filter(
          (e) => e.store && !t.includes(e.ext)
        ).forEach((t) =>
          e.createAddItem(
            gDesigner.getAction("".concat(GSaveAsAction.ID, ".").concat(t.ext))
          )
        );
        const n = new GMenuItem(GMenuItem.Type.Menu, GMenu);
        return (
          n.setCaption(
            GCategory.CATEGORY_FILE_EXPORT_PDF.label.split("/").slice(-1).pop()
          ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction("".concat(GSaveAsAction.ID, ".pdf"))
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction("".concat(GSaveAsAction.ID, ".pdf.96"))
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction("".concat(GSaveAsAction.ID, ".pdf.150"))
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction("".concat(GSaveAsAction.ID, ".pdf.300"))
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction("".concat(GExportAction.ID, ".pdf"))
            ),
          e.addItem(n),
          e
        );
      }),
      (GToolbar.prototype._textEdit = function (e) {
        return e
          .css({ whiteSpace: "pre", fontFamily: "monospace", fontSize: "14px" })
          .on("keydown", function (e) {
            if (9 === e.keyCode) {
              let n = this.selectionStart;
              var t = this.selectionEnd;
              return (
                (this.value =
                  this.value.substring(0, n) +
                  "\t" +
                  this.value.substring(t, this.value.length)),
                (this.selectionStart = n + 1),
                (this.selectionEnd = n + 1),
                e.preventDefault(),
                !1
              );
            }
            e.keyCode;
          })
          .on("keyup", function (e) {
            if (13 === e.keyCode) {
              for (
                var t,
                  n = "",
                  o = this.selectionStart,
                  i = this.selectionEnd,
                  a = o - 1;
                a > 0;

              ) {
                if ("\n" === this.value.charAt(a)) {
                  var r = 0;
                  for (t = a; --a >= 0; )
                    if ("\n" === this.value.charAt(a)) {
                      var s = this.value.substr(a + 1, t).match(/^\t+/);
                      if (s && s.length) {
                        r = s[0].length;
                        break;
                      }
                    }
                  for (var l = 0; l < r; l++) n += "\t";
                  break;
                }
                a--;
              }
              (this.value =
                this.value.substring(0, o) +
                n +
                this.value.substring(i, this.value.length)),
                (this.selectionStart = o + n.length),
                (this.selectionEnd = o + n.length);
            }
          });
      }),
      (GToolbar.prototype._refreshCustomButtons = function () {
        $(".custom_codes_button").remove();
        var customCode = JSON.parse(localStorage.getItem("designer.custom")),
          myself = this;
        if (customCode && customCode.length) {
          function customMenu(e) {
            var t = new GMenu();
            return (
              t.createAddItem(
                "Edit",
                function () {
                  var e = customCode.find((e) => e.id === this);
                  let t = $("<div/>")
                    .append($("<div/>").text("Edit code"))
                    .append(
                      myself._textEdit(
                        $(
                          '<textarea rows="30" cols="100" class="custom_button_code_edit">'
                        ).text(e.code)
                      )
                    )
                    .append(
                      $("<div/>")
                        .append("<label>Name:</label>")
                        .append(
                          $(
                            '<input type="text" class="custom_button_name_edit" value="' +
                              e.name +
                              '">'
                          )
                        )
                    );
                  t.gDialog({
                    releaseOnClose: !0,
                    className: "context-pane",
                    buttons: [
                      $('<button class="settings-button">Cancel</button>').on(
                        "click",
                        () => {
                          t.gDialog("close");
                        }
                      ),
                      $('<button class="settings-button">Save</button>').on(
                        "click",
                        () => {
                          (e.name = $(".custom_button_name_edit")[0].value),
                            (e.code = $(".custom_button_code_edit")[0].value),
                            localStorage.setItem(
                              "designer.custom",
                              JSON.stringify(customCode)
                            ),
                            t.gDialog("close"),
                            myself._refreshCustomButtons();
                        }
                      ),
                    ],
                  }),
                    t.gDialog("open", !1),
                    $(".custom_button_code_edit").focus();
                }.bind(e)
              ),
              t.createAddItem(
                "Delete",
                function () {
                  var e = localStorage.getItem("designer.custom"),
                    t = JSON.parse(e);
                  (t = t.filter((e) => {
                    if (e.id !== this) return !0;
                  })),
                    localStorage.setItem("designer.custom", JSON.stringify(t)),
                    $("." + this).remove();
                }.bind(e)
              ),
              t
            );
          }
          customCode.forEach((item) => {
            this._toolsDiv.append(
              this._createLabelButton({
                icon: "gravit-icon-favorite",
                label: item.name,
                menu: customMenu(item.id),
                split: !0,
                click: function (evt) {
                  var code = $(evt.target)
                    .closest(".toolbar-button")
                    .data("code");
                  function evaled() {
                    var core = __webpack_require__(1),
                      editor = __webpack_require__(53),
                      client = __webpack_require__(15);
                    eval("(" + code + ")")(
                      gDesigner.getActiveDocument().getEditor().getSelection(),
                      gDesigner.getActiveDocument().getScene(),
                      gDesigner.getActiveDocument().getEditor(),
                      core,
                      editor,
                      client
                    );
                  }
                  evaled.call(null);
                }.bind(this),
              })
                .data("code", item.code)
                .addClass(item.id)
                .addClass("custom_codes_button")
            );
          });
        }
      }),
      (GToolbar.prototype._initZoomButton = function () {
        var e = new GMenu();
        e.setTooltipType(_richtooltipconfig.TOOLTIP_AREA.TOOLBAR);
        var t = this;
        e.createAddItem(gDesigner.getAction(GOriginalViewAction.ID)),
          e.createAddDivider(),
          GMagnificationAction.ZOOM_LEVELS.forEach((t) => {
            e.createAddItem(
              gDesigner.getAction(GMagnificationAction.ID + "." + t.toString())
            );
          }),
          (this._zoomButton = this._createLabelButton({
            caption: "100%",
            label: _core.GLocale.get(
              new _core.GLocaleKey("GToolbar", "text.zoom")
            ),
            menu: e,
            menudblclick: () => {
              var e = gDesigner.getWindows().getActiveWindow().getView();
              this._zoomButton.find(".left-attached").hide(),
                this._zoomButton.find(".right-attached").hide(),
                this._zoomButton
                  .find(".gravit-zoom-manual-input")
                  .show()
                  .find("> input")
                  .val(parseInt(100 * e.getZoom(), 10))
                  .focus()
                  .select(),
                gDesigner.stats("toolbar_zoom_manual-input");
            },
          }).addClass("zoom-button")),
          $("<span></span>")
            .addClass("gravit-icon-zoom-in icon")
            .insertBefore(this._zoomButton.find(".caption")),
          this._zoomButton
            .find(".action-button")
            .gRichTooltip(
              _richtooltipconfig.GRichTooltipConfig.from({
                title: _core.GLocale.get(
                  new _core.GLocaleKey(
                    "GToolbar",
                    "text.zoom-button-tooltip-title"
                  )
                ),
              })
            )
            .addClass("left-attached right-attached")
            .find(".dropdown-icon")
            .remove(),
          $("<button></button>")
            .addClass("left-attached attached-button")
            .css("width", "15px")
            .text("-")
            .on("click", function () {
              gDesigner.executeAction(GZoomOutAction.ID, void 0, "toolbar");
            })
            .gRichTooltip(
              GZoomOutAction.TOOLTIP_CONFIG[
                _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
              ]
            )
            .insertBefore(this._zoomButton.find(".action-button")),
          $("<button></button>")
            .addClass("right-attached attached-button")
            .css("width", "15px")
            .text("+")
            .on("click", function () {
              gDesigner.executeAction(GZoomInAction.ID, void 0, "toolbar");
            })
            .gRichTooltip(
              GZoomInAction.TOOLTIP_CONFIG[
                _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
              ]
            )
            .appendTo(this._zoomButton),
          $("<div />")
            .addClass("gravit-zoom-manual-input")
            .css("display", "none")
            .insertBefore(this._zoomButton.find(".action-button"))
            .html([
              $("<input />")
                .attr("type", "number")
                .attr("min", GMagnificationAction.ZOOM_LEVELS[0])
                .attr(
                  "max",
                  GMagnificationAction.ZOOM_LEVELS[
                    GMagnificationAction.ZOOM_LEVELS.length - 1
                  ]
                )
                .on("blur", () => {
                  $(this).data("keydown") ||
                    (t._zoomButton.find(".left-attached").show(),
                    t._zoomButton.find(".right-attached").show(),
                    t._zoomButton.find(".gravit-zoom-manual-input").hide());
                })
                .on("keydown", (e) => {
                  e.stopPropagation(), $(this).data("keydown", !0);
                })
                .on("keyup", (e) => {
                  if ($(this).data("keydown")) {
                    if (13 === e.which) {
                      var n = gDesigner
                        .getWindows()
                        .getActiveWindow()
                        .getView();
                      t._zoomButton.find(".left-attached").show(),
                        t._zoomButton.find(".right-attached").show(),
                        t._zoomButton.find(".gravit-zoom-manual-input").hide(),
                        gDesigner.zoomAtViewCenter(
                          n,
                          t._zoomButton
                            .find(".gravit-zoom-manual-input > input")
                            .val() / 100
                        );
                    } else
                      27 === e.which &&
                        (t._zoomButton.find(".left-attached").show(),
                        t._zoomButton.find(".right-attached").show(),
                        t._zoomButton.find(".gravit-zoom-manual-input").hide());
                    $(this).data("keydown", null);
                  }
                })
                .on("keypress", (e) => {
                  var t = e.keyCode || e.which;
                  if (8 === t || 46 === t || 37 === t || 39 === t) return !0;
                  (t < 48 || t > 57) && e.preventDefault();
                }),
              $("<span />").text("%"),
            ]);
      }),
      (GToolbar.prototype.relayout = function () {}),
      (GToolbar.prototype._activateOrResetTool = function (e, t) {
        var n = gDesigner.getToolManager(),
          o = n.getTool(e);
        if (o === n.getActiveTool()) {
          if (t) return;
          o = n.getTool(_editor.GPointerTool);
        }
        var i = gDesigner.getRightSidebars().getActiveSidebar(),
          a = i && gDesigner.getRightSidebars().getSidebar(i);
        (!a || a.isToolAllowed(o) || a.isDeactivatable()) &&
          (e &&
            gDesigner.stats("toolbar_activate_tool", GToolbar.getToolName(e)),
          n.activateTool(o, null, !0));
      }),
      (GToolbar.prototype._updateActiveTool = function (e, t) {
        for (var n = null, o = 0; o < gravit.tools.length; ++o)
          if (e.constructor === gravit.tools[o].tool) {
            n = gravit.tools[o];
            break;
          }
        this._htmlElement.find(".toolbar-button").each(
          function (e, t) {
            var o = $(t),
              i = o.data("tool"),
              a = o.data("tool-group");
            if (
              ("shape" === a &&
                n &&
                "shape" === n.group &&
                (this._initShapeMenu = !0),
              i)
            ) {
              if (a && n && n.group === a) {
                i = n.tool;
                var r = o.data("tool", i).find(".action-button .icon"),
                  s = n.icon;
                if (!s) {
                  var l = gDesigner.getToolManager().getTool(i);
                  l.getIcon && (s = l.getIcon());
                }
                n &&
                  n.richTooltipConfig &&
                  o
                    .data("tool", i)
                    .gRichTooltip(n.richTooltipConfig)
                    .find(".action-button")
                    .gRichTooltip(n.richTooltipConfig),
                  this._updateIcon(r, s);
              }
              o.find(".action-button").toggleClass(
                "g-active",
                !(!n || n.tool !== i)
              );
            }
          }.bind(this)
        );
      }),
      (GToolbar.prototype._updateIcon = function (e, t) {
        t && "<svg" === t.substr(0, 4)
          ? (e.empty(),
            e.attr("class", "icon"),
            e.append(
              $(t)
                .attr({ width: "16px", height: "16px" })
                .css("stroke", "transparent")
                .css("vertical-align", "middle")
            ))
          : (e.empty(), e.attr("class", "icon " + t));
      }),
      (GToolbar.prototype._toolChangedEvent = function (e) {
        if (e.newTool) {
          var t = gDesigner.getRightSidebars().getActiveSidebar();
          t &&
            (gDesigner
              .getRightSidebars()
              .getSidebar(t)
              .isToolAllowed(e.newTool) ||
              gDesigner
                .getRightSidebars()
                .setActiveSidebar(GInspectorSidebar.ID)),
            this._updateActiveTool(e.newTool, e.previousTool);
        }
        this._clearViewMenuActiveItem();
      }),
      (GToolbar.prototype._clearViewMenuActiveItem = function () {
        const e = this._viewMenu && this._viewMenu.getActiveItem();
        e && e.changeActiveState(!1);
      }),
      (GToolbar.prototype._updateContextTools = function () {
        this._htmlElement.find(".toolbar-button").each(function (e, t) {
          var n = $(t),
            o = n.data("tool");
          if (o) {
            var i = gDesigner.getToolManager().getTool(o),
              a = n.find(".action-button");
            $(a).hasClass("g-disabled") ===
              gDesigner.getToolManager().isContextActivatable(i) &&
              (gDesigner.getToolManager().isContextActivatable(i)
                ? $(a).removeClass("g-disabled")
                : $(a).addClass("g-disabled"));
          }
        });
      }),
      (GToolbar.prototype._updateActions = function () {
        this._htmlElement
          .find(".toolbar-button[data-action]")
          .each(function (e, t) {
            var n = $(t),
              o = n.data("action");
            o && n.gPro({ pro: !!o.isPro(), feature: o.getId() });
            const i = gDesigner.getApplicationManager();
            if (i && !i.isDocumentTabManagementEnabled()) {
              const e = gDesigner.getActiveDocument();
              if (e && o instanceof GSaveAction) {
                const t = e.getStatus() === GDocumentStatus.Saving,
                  o = e.isSynchronizing() || t;
                n.find(".processing").toggleClass("g-active", o);
              }
            }
            n.find("button").toggleClass(
              "g-disabled",
              !o || !o.isAvailable() || !o.isEnabled()
            );
          });
      }),
      (GToolbar.prototype._selectionChangedEvent = function (e) {
        this._updateActions(), this._updateContextTools();
      }),
      (GToolbar.prototype._settingChangedEvent = function (e) {
        "snap_disabled" === e.key
          ? this._htmlElement
              .find(".snap-button > .action-button")
              .toggleClass("g-active", !1 === e.newValue)
          : "touch" === e.key &&
            (gDesigner.isTouchEnabled()
              ? this._updateTouchUI()
              : this._updateDesktopUI());
      }),
      (GToolbar.prototype._updateDesktopUI = function () {
        const e = this._htmlElement.find(".view-section > .zoom-button");
        e.is(this._zoomButton) ||
          ((this._zoomButton = null),
          this._initZoomButton(),
          e.replaceWith(this._zoomButton),
          this._updateZoomFromWindow(!0)),
          this._pageButton &&
            (this._pageButton.gPageButton("reinit"),
            this._pageButton.hasClass("dropdown") &&
              this._pageButton.removeClass("dropdown"));
      }),
      (GToolbar.prototype._updateTouchUI = function () {}),
      (GToolbar.prototype._documentEvent = function (e) {
        var t = e.document;
        switch (e.type) {
          case GDocumentEvent.Type.Activated:
            t &&
              t.getEditor() &&
              t
                .getEditor()
                .addEventListener(
                  _editor.GEditor.SelectionChangedEvent,
                  this._selectionChangedEvent,
                  this
                ),
              this._updatePageButton(),
              this._updateActions(),
              this._updateContextTools();
            break;
          case GDocumentEvent.Type.Deactivated: {
            t &&
              t.getEditor() &&
              t
                .getEditor()
                .removeEventListener(
                  _editor.GEditor.SelectionChangedEvent,
                  this._selectionChangedEvent,
                  this
                ),
              this._updatePageButton(),
              this._updateActions(),
              this._updateContextTools();
            const e = gDesigner.getToolManager();
            if (e) {
              const t = e.getActiveTool();
              t.supportsElementClick() && t.clearClickedElement();
            }
            break;
          }
          case GDocumentEvent.Type.Modified:
            this._updateActions(),
              this._updateContextTools(),
              this._updateActiveWindow();
            break;
          case GDocumentEvent.Type.StorageItemUpdated:
          case GDocumentEvent.Type.SynchronismUpdated:
            this._updateActiveWindow(), this._updateActions();
        }
      }),
      (GToolbar.prototype._windowEvent = function (e) {
        var t = e.window.getView();
        switch (e.type) {
          case GWindows.WindowEvent.Type.Activated:
            t &&
              t.addEventListener(
                _client.GSceneWidget.TransformEvent,
                this._updateZoomFromWindow,
                this
              ),
              this._updateZoomFromWindow(),
              this._updateContextTools();
            break;
          case GWindows.WindowEvent.Type.Deactivated:
            t &&
              t.removeEventListener(
                _client.GSceneWidget.TransformEvent,
                this._updateZoomFromWindow,
                this
              ),
              this._updateZoomFromWindow(),
              this._updateContextTools();
        }
        this._updateActiveWindow();
      }),
      (GToolbar.prototype._updateActiveWindow = function () {}),
      (GToolbar.prototype._updateZoomFromWindow = function () {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        var t = gDesigner.getWindows().getActiveWindow();
        if (t && t.getView()) {
          var n = _core.GMath.round(100 * t.getView().getZoom(), !1, 0);
          (this._currentZoomLevel !== n || e) &&
            (this._htmlElement
              .find(".zoom-button > .action-button .caption")
              .text(n.toString() + "%"),
            (this._currentZoomLevel = n));
        }
      }),
      (GToolbar.prototype._createToolItems = function (e, t) {
        t || (t = new GMenu()),
          t.setTooltipType(_richtooltipconfig.TOOLTIP_AREA.TOOLBAR);
        var n = null;
        return (
          gravit.tools.forEach((o, i) => {
            if (o.group === e)
              if (
                (n !== o.category &&
                  (i > 0 && t.createAddDivider(), (n = o.category)),
                "simpleshape" === n)
              )
                this.createSimpleShapesMenu(t);
              else {
                var a = new GMenuItem();
                a.setCaption(o.title),
                  a.setIcon(o.icon),
                  a.setShortcutHint(o.key ? [o.key] : null),
                  a.setPro(o.pro, o.feature),
                  a.addEventListener(GMenuItem.ActivateEvent, () => {
                    o &&
                      o.title &&
                      gDesigner.stats(
                        "toolbar_activate_tool",
                        GToolbar.getToolName(o.tool)
                      ),
                      this._activateOrResetTool(o.tool, !0);
                  }),
                  a.addEventListener(GMenuItem.UpdateEvent, () => {
                    gDesigner.canActivateTool(o.tool, !0) && o.key
                      ? a.setShortcutHint([o.key])
                      : a.setShortcutHint(null);
                  }),
                  o.richTooltipConfig &&
                    a.setTooltipConfig(
                      _richtooltipconfig.GRichTooltipConfig.from(
                        Object.assign({}, o.richTooltipConfig.getConfig(), {
                          side: !0,
                        })
                      )
                    ),
                  t.addItem(a);
              }
          }),
          t
        );
      }),
      (GToolbar.prototype._createLabelButton = function (e) {
        var t = e.label,
          n = e.className,
          o = e.icon,
          i = e.click,
          a = e.menudblclick || null;
        let r = !1,
          s = null;
        const l = this;
        e.action &&
          ((r = e.action.isPro()),
          (s = e.action.getTooltipConfig(
            _richtooltipconfig.TOOLTIP_AREA.TOOLBAR
          )),
          t || (t = _core.GLocale.get(e.action.getTitle())),
          o || (o = e.action.getIcon() || e.action.getGroupIcon()),
          i ||
            (i = function () {
              gDesigner.executeAction(
                e.action.getId(),
                [
                  void 0,
                  function (e) {
                    e &&
                      e.documentStatus === GDocumentStatus.SaveCancelled &&
                      l._updateActions();
                  },
                ],
                "toolbar"
              );
            })),
          e.tooltipConfig && (s = e.tooltipConfig);
        var c = $("<div></div>").addClass("toolbar-button").gPro({ pro: r });
        n && c.addClass(n),
          e.action &&
            c.attr("data-action", e.action.getId()).data("action", e.action);
        var d = $("<button></button>")
          .addClass("action-button")
          .toggleClass("g-active", !0 === e.active)
          .attr("data-title", t)
          .appendTo(c)
          .on("mousedown", function (e) {
            e.preventDefault();
          });
        if (
          (s && d.gRichTooltip(s),
          o
            ? (this._updateIcon($("<span></span>").appendTo(d), o),
              d.addClass("icon"))
            : e.caption &&
              d.append($("<span></span>").addClass("caption").text(e.caption)),
          i && d.on("click", i),
          e.menu || e.menuOpen)
        ) {
          var u = null;
          if (
            (e.split
              ? (c.addClass("dropdown"),
                (u = $("<button></button>")
                  .addClass("dropdown-button")
                  .append($("<span></span>").addClass("gravit-icon-down"))
                  .appendTo(c)
                  .on("mouseover", function (e) {
                    _config.IS_COREL || e.stopPropagation();
                  })))
              : (u = d
                  .addClass("menu")
                  .append(
                    $("<span></span>").addClass(
                      "gravit-icon-down dropdown-icon"
                    )
                  )),
            e.menu
              ? u.gMenuButton({
                  menu: e.menu,
                  dblclick: a,
                  getActiveItem: e.getActiveItem || null,
                })
              : e.menuOpen && u.on("click", e.menuOpen),
            "gravit-icon-undo" === o)
          ) {
            var p = gDesigner.getLicense(),
              g =
                gDesigner.isEnabledProFeatures() ||
                (p.isPro() && !p.isExpired());
            _config.IS_COREL
              ? u.attr(
                  "data-title",
                  _core.GLocale.get(
                    new _core.GLocaleKey(
                      "GToolbar",
                      "text.undoList-button-tooltip-title"
                    )
                  )
                )
              : u.gRichTooltip(
                  _richtooltipconfig.GRichTooltipConfig.from({
                    title: _core.GLocale.get(
                      new _core.GLocaleKey(
                        "GToolbar",
                        "text.undoList-button-tooltip-title"
                      )
                    ),
                    description: _core.GLocale.get(
                      new _core.GLocaleKey(
                        "GToolbar",
                        "text.undoList-button-tooltip-description"
                      )
                    ),
                    learnMore:
                      "",
                    isPro: !g,
                  })
                ),
              g || u.addClass("pro-without-icon");
          }
        }
        return $("<span/>").addClass("processing").appendTo(c), c;
      }),
      (GToolbar.prototype.createSimpleShapesMenu = function (e) {
        var t = function (e) {
            var t = null,
              n = new _core.GParameterizedVertexProcessor(
                e.annotations ? e.annotations.name : null,
                e.annotations ? e.annotations.annotList : null,
                e.parameters,
                e.vertices
              ),
              o = null;
            if (
              e.annotations &&
              e.annotations.annotList &&
              e.annotations.annotList.length
            )
              for (var i = e.annotations.annotList, a = 0; a < i.length; ++a) {
                var r = i[a];
                o
                  ? o.push(new _core.GPoint(r.x0, r.y0))
                  : (o = [new _core.GPoint(r.x0, r.y0)]);
              }
            var s = null;
            if (n) {
              s = new _core.GSimpleShape(n, o, 14, 14, e.name);
              var l = (s = new _core.GVertexTransformer(
                s,
                new _core.GTransform(1, 0, 0, 1, 1, 1)
              )).toSVGPath();
              l &&
                (t =
                  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="isolation:isolate" width="16" height="16"><path d="' +
                  l +
                  '" style="fill:none;fill-rule:evenodd;stroke:currentColor;""stroke-width:2;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:3;opacity:1;"/></svg>');
            }
            t || (t = "gravit-icon-rectangle");
            var c = $("<span></span>");
            return (
              this._updateIcon(c, t),
              $("<button></button>")
                .addClass("button")
                .attr("data-sshape", e.name)
                .on(
                  "mouseup",
                  function (n) {
                    n.preventDefault(),
                      gDesigner
                        .getToolManager()
                        .activateTool(_editor.GSimpleShapeTool, t, !0),
                      gDesigner.getToolManager().getActiveTool().init(e);
                  }.bind(this)
                )
                .addClass("icon")
                .append(c)
            );
          }.bind(this),
          n = {};
        for (let e = 0; e < simpleShapes.length; ++e) {
          var o = simpleShapes[e];
          n[o.shapeGroup] || (n[o.shapeGroup] = {});
          var i = n[o.shapeGroup];
          i[o.subGroup] ? i[o.subGroup].push(o) : (i[o.subGroup] = [o]);
        }
        for (var a in n) {
          var r = e.findItem(a);
          r ||
            ((r = new GMenuItem(GMenuItem.Type.Menu, GMenu)).setCaption(a),
            e.addItem(r));
          var s = r.getMenu(),
            l = n[a];
          for (var c in l) {
            var d = new GMenuItem();
            d.setNoHover(!0), s.addItem(d);
            var u = l[c];
            for (let e = 0; e < u.length; ++e) {
              var p = t(u[e]);
              d._htmlElement.append(p);
            }
          }
        }
      }),
      (GToolbar.prototype._createMergeMenu = function () {
        const e = new GMenu();
        e.setTooltipType(_richtooltipconfig.TOOLTIP_AREA.TOOLBAR);
        return (
          gDesigner
            .getAction(GMergeMainAction.ID)
            .getSubActions()
            .forEach((t) => {
              e.createAddItem(t);
            }),
          e
        );
      }),
      (GToolbar.prototype._createSnapMenu = function () {
        var e = new GMenu();
        return (
          e.setTooltipType(_richtooltipconfig.TOOLTIP_AREA.TOOLBAR),
          e.createAddItem(gDesigner.getAction(GToggleSnapAction.ID)),
          _config.HAS_SNAPZONES &&
            e.createAddItem(gDesigner.getAction(GToggleSnapZonesAction.ID)),
          e.createAddDivider(),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GGridGuide.ID
            )
          ),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GGuideLinesGuide.ID
            )
          ),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GFullPixelsGuide.ID
            )
          ),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GPointsGuide.ID
            )
          ),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GBBoxGuide.ID
            )
          ),
          e.createAddItem(
            gDesigner.getAction(
              GToggleGuideAction.ID + "." + _editor.GPageGuide.ID
            )
          ),
          e.createAddDivider(),
          e.createAddItem(gDesigner.getAction(GShowGridAction.ID)),
          e.createAddItem(gDesigner.getAction(GShowGuideLinesAction.ID)),
          e.createAddItem(gDesigner.getAction(GShowSymbolLabelsAction.ID)),
          e
        );
      }),
      (GToolbar.prototype._createImageMenu = function () {
        var e = new GMenu();
        return (
          e.setTooltipType(_richtooltipconfig.TOOLTIP_AREA.TOOLBAR),
          e.createAddItem(gDesigner.getAction(GPlaceImportAction.ID)),
          e.createAddItem(gDesigner.getAction(GLinkImageAction.ID)),
          e
        );
      }),
      (GToolbar.prototype.getHeight = function () {
        return this._htmlElement[0].clientHeight;
      }),
      (GToolbar.prototype.setEnabled = function (e) {
        $(".toolbar-button > button")
          [e ? "removeClass" : "addClass"]("g-disabled")
          .prop("disabled", !e);
      }),
      __webpack_require__(1543)(GToolbar),
      (module.exports = GToolbar);
  }