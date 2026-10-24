/**
 * Webpack Module #1547
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(557), n(26);
    var o = n(16);
    n(96),
      n(8),
      n(356),
      n(20),
      n(107),
      n(3),
      n(271),
      n(34),
      n(851),
      n(91),
      n(4),
      n(322),
      n(13),
      n(32),
      n(33);
    var i = n(1),
      a = n(15),
      r = o(n(1300)),
      s = n(1163),
      l = n(40),
      c = n(593),
      d = o(n(44)),
      u = (function (e, t) {
        if ("function" == typeof WeakMap)
          var n = new WeakMap(),
            o = new WeakMap();
        return (function (e, t) {
          if (!t && e && e.__esModule) return e;
          var i,
            a,
            r = { __proto__: null, default: e };
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return r;
          if ((i = t ? o : n)) {
            if (i.has(e)) return i.get(e);
            i.set(e, r);
          }
          for (const t in e)
            "default" !== t &&
              {}.hasOwnProperty.call(e, t) &&
              ((a =
                (i = Object.defineProperty) &&
                Object.getOwnPropertyDescriptor(e, t)) &&
              (a.get || a.set)
                ? i(r, t, a)
                : (r[t] = e[t]));
          return r;
        })(e, t);
      })(n(862)),
      p = n(858);
    const g = n(156),
      { CLOUD_DIALOG: h } = n(10),
      { GPlatform: f } = n(15),
      m = n(85),
      { GRegex: y } = n(263),
      v = function () {
        r.default.apply(this, arguments),
          (this._lockEnter = !1),
          this.panel.addClass("full-width");
      };
    i.GObject.inherit(v, r.default);
    var _ = n(238),
      b = n(339);
    (v.prototype._lockEnter = !1),
      (v.prototype.filesPanel = null),
      (v.prototype.createHeader = function () {
        var e = this,
          t = $("<div/>").addClass("header").appendTo(this.panel);
        this.renderNewFolderButton(t, () => {
          var t = e.filesPanel.drive.getCurrentFolder();
          if (!t || e.filesPanel.drive.isRootFolder())
            return e.filesPanel.updateFilesList();
          e._cloudFolders.forEach((e) => {
            e.getFolder().id === (t.id || t) && e.refresh();
          });
        });
        var n = "";
        $("<div />")
          .addClass("search-container")
          .append(
            $("<input />")
              .addClass("search-field")
              .attr("type", "text")
              .attr("size", "12")
              .attr(
                "placeholder",
                i.GLocale.get(
                  new i.GLocaleKey("GFilesPanel", "text.search-placeholder")
                )
              )
              .on("keyup", function (t) {
                t.stopPropagation();
                var o = $(this).val().trim();
                o !== n &&
                  ((n = $(this).val()),
                  gDesigner.stats("filespanel-view_execute_search", o),
                  e.filesPanel.search(o));
                var i = e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".clear-search-icon"),
                  a = e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".search-icon");
                o.length ? (i.show(), a.hide()) : (i.hide(), a.show());
              })
              .on("focusin", function () {
                e.panel
                  .find(".header")
                  .find(".search-container")
                  .toggleClass("g-active", !0);
              })
              .on("focusout", function () {
                e.panel
                  .find(".header")
                  .find(".search-container")
                  .toggleClass("g-active", !1);
              })
              .on("input:reset", function () {
                $(this).val(""),
                  (n = ""),
                  e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".clear-search-icon")
                    .hide();
              })
              .on("keydown", function (t) {
                if (a.GKey.translateCode(t.key) === a.GKey.Constant.TAB) {
                  var n = $(this).val().trim();
                  e.filesPanel.search(n),
                    t.preventDefault(),
                    t.stopPropagation();
                }
              })
          )
          .append(
            $("<div />")
              .addClass("clear-search-icon")
              .append(
                $("<span />").addClass("icon").addClass("gravit-icon-close")
              )
              .on("click", function (t) {
                t.stopPropagation();
                var o = e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".search-field"),
                  i = e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".search-icon");
                o.val(""),
                  (n = ""),
                  e.filesPanel.updateFilesList(!1, !1),
                  gDesigner.stats("filespanel-view_clear_search-field"),
                  $(this).hide(),
                  o.focus(),
                  i.show();
              })
              .hide()
          )
          .append(
            $("<div />")
              .addClass("search-icon")
              .append(
                $("<span />").addClass("icon").addClass("gravit-icon-magnifier")
              )
              .on("click", function (t) {
                t.stopPropagation(),
                  gDesigner.stats("filespanel-view_search_focus"),
                  e.panel
                    .find(".header")
                    .find(".search-container")
                    .find(".search-field")
                    .focus();
              })
          )
          .appendTo(t),
          $("<div/>").addClass("fake").appendTo(t),
          this.renderSortButton(t);
        const o = this.filesPanel.getAvailableFileTypesFilter();
        "function" == typeof u.default &&
          this.filesPanel.drive instanceof u.default &&
          o &&
          o.length > 1 &&
          this.renderFileTypeFilterButton(t),
          this.renderGridStyleButtons(t),
          this._buildContextMenu(),
          this._buildAdditionalContextMenu();
      }),
      (v.prototype._permissionChanged = function () {
        r.default.prototype._permissionChanged.call(this);
        const e = this.panel.find(".header").find(".new-folder");
        if (this._isCreateFolderEnabled())
          e.attr(
            "data-title",
            i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.new-folder-tooltip")
            )
          ),
            e.removeClass("g-disabled");
        else {
          const t = i.GLocale.get(
            new i.GLocaleKey("GFilesPanel", "text.option-isnt-available"),
            "This option isn’t available for Cloud Drives"
          );
          e.attr("data-title", t), e.addClass("g-disabled");
        }
      }),
      (v.prototype.addSearchBar = function (e) {
        $("<div />")
          .addClass("g-search-no-results")
          .hide()
          .text(
            i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "text.search-not-found")
            )
          )
          .appendTo(e);
      }),
      (v.prototype.createFooter = function (e) {
        var t = $("<div/>").addClass("footer").appendTo(this.panel);
        if (this.filesPanel.isSaveMode()) {
          var n = $("<div />").addClass("save-form-container").appendTo(t);
          const a = $("<div/>").addClass("input-container").appendTo(n);
          var o = $("<input/>")
            .addClass("file-name")
            .val(
              e
                ? (0, l.decodeHTML)(e)
                : i.GLocale.get(
                    new i.GLocaleKey("GFilesPanel", "text.untitled")
                  )
            )
            .appendTo(a);
          const r = f.webBrowser === f.constructor.WebBrowser.Safari,
            s = gContainer.getRuntime() === m.Runtime.IPad;
          (r || s) &&
            o.on("click", () => {
              o.focus();
            }),
            $("<div/>")
              .addClass("g-button")
              .addClass("cloud-button")
              .addClass("cancel")
              .attr(
                "data-title",
                i.GLocale.get(
                  new i.GLocaleKey("GFilesPanel", "action.cancel-tooltip")
                )
              )
              .html(i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")))
              .on(
                "click",
                function (e) {
                  e.stopPropagation(), this.filesPanel.handleCancelSave();
                }.bind(this)
              )
              .appendTo(a),
            this.filesPanel.setKeyListener((e, t) => {
              if (13 === e && !this._lockEnter) {
                const e = this._getSelectedExtension(),
                  n = this._getSaveOptions();
                if (!this.filesPanel._canDownload(e)) return;
                t.preventDefault(), this.filesPanel.handleSave(o.val(), e, n);
              }
            }),
            gDesigner.getApplicationManager().isSavingToCloudEnabled() &&
              gDesigner.getApplicationManager().isSavingAsEnabled() &&
              $("<div/>")
                .addClass("g-button")
                .addClass("cloud-button")
                .addClass("primary")
                .addClass("save")
                .append(
                  $("<span/>").addClass("icon").addClass("gravit-icon-w-save")
                )
                .append(
                  $("<span/>")
                    .addClass("label")
                    .text(
                      i.GLocale.get(new i.GLocaleKey("GSaveAction", "title"))
                    )
                )
                .on(
                  "click",
                  function (e) {
                    e.stopPropagation();
                    const t = this._getSelectedExtension(),
                      n = this._getSaveOptions();
                    this.filesPanel._canDownload(t) &&
                      this.filesPanel.handleSave(o.val(), t, n);
                  }.bind(this)
                )
                .appendTo(a),
            this._setSelectedExtension(u.DEFAULT_TYPE.ext),
            this.panel
              .find(".g-items-container")
              .addClass("g-items-container-footer"),
            o.focus();
        } else t.hide();
      }),
      (v.prototype._getSelectedExtension = function () {
        const e = this.panel
          .find(".save-form-container")
          .find("option:selected")
          .val();
        if (!e)
          return (
            (this.filesPanel.getDefaultSaveFormat() &&
              this.filesPanel.getDefaultSaveFormat().ext) ||
            u.DEFAULT_TYPE.ext
          );
        const t = this.filesPanel.getPossibleExtensions();
        return (0, l.getExtensionFromString)(e, t) || u.DEFAULT_TYPE.ext;
      }),
      (v.prototype._getSelectedVersion = function () {
        const e = this.panel
          .find(".save-form-container")
          .find("option:selected")
          .val();
        if (!e) return Number(this.filesPanel.getDefaultVersionForSave());
        const t = this._getVersionFromValue(e);
        return Number(t || this.filesPanel.getDefaultVersionForSave());
      }),
      (v.prototype._setSelectedExtension = function (e) {
        this.panel
          .find(
            'select.file-extension > option[value="'.concat(
              e.toUpperCase(),
              '"]'
            )
          )
          .prop("selected", !0);
      }),
      (v.prototype._removeCDRExtensionFromFileName = function (e) {
        return e.endsWith(".cdr") ? e.replace(new RegExp(".cdr$"), "") : e;
      }),
      (v.prototype.addFile = function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
          n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        const o = this._removeCDRExtensionFromFileName(e.name);
        var a = this,
          r = this.filesPanel.isItemSelected(e),
          c = this.filesPanel.isItemInClipboard(e),
          d = null;
        d = t
          ? this.panel.find(".g-recent-files-list")
          : n
          ? this.panel.find(".g-example-files-list")
          : this.panel.find(".g-files-list");
        var u = $("<div/>")
          .attr("draggable", e.hasPermission(g.Permission.CutPaste))
          .attr("id", e.id)
          .addClass("g-gravit-file")
          .addClass("g-cloud-element")
          .addClass(e.id)
          .addClass(r ? "selected" : "")
          .addClass(c && this.filesPanel.isClipboardModeCut() ? "cut" : "")
          .data("node", e)
          .attr("data-title", e._rootPath ? e._rootPath : o)
          .on("dragstart", function (t) {
            if (a._isDuringRenaming())
              return t.stopPropagation(), void t.preventDefault();
            $(this).addClass("dragging"),
              $(".g-tooltip").toggleClass("visible", !1);
            const n = t.dataTransfer || t.originalEvent.dataTransfer,
              o = document.createElement("div"),
              i = $(o);
            i.addClass("drag-ghost-item"),
              i.text(e.name),
              document.getElementById(e.id).appendChild(o),
              n.setDragImage(o, 30, 15),
              n.setData("text/plain", JSON.stringify(e));
          })
          .on("drag", function (e) {
            if (a._isDuringRenaming())
              return e.stopPropagation(), void e.preventDefault();
            $(".g-tooltip").toggleClass("visible", !1);
          })
          .on("dragend", function () {
            $(this).removeClass("dragging");
          })
          .on(
            "dblclick",
            function (t) {
              if (
                (t.stopPropagation(),
                t.preventDefault(),
                !a._isDuringRenaming())
              )
                return this.filesPanel.handleFileDblClick(e), !1;
            }.bind(this)
          )
          .on(
            "click",
            function (n) {
              n.stopPropagation(),
                n.preventDefault(),
                a._isDuringRenaming() ||
                  (this.filesPanel.handleFileClick(e, u),
                  this._updateFileInfoPanel(e, u, t));
            }.bind(this)
          )
          .on(
            "contextmenu",
            function (t) {
              t.stopPropagation(), a._handleFileContextMenu(e, u, t);
            }.bind(this)
          );
        e.example && u.addClass("g-gravit-example-file");
        var f = d.find("#".concat(e.id));
        f.length ? $(f).replaceWith(u) : u.appendTo(d);
        var m,
          y,
          v = $("<div />").addClass("image-container").appendTo(u);
        this.filesPanel.getSortType() === p.GFilesPanelSortTypes.CREATED
          ? ((m = (0, s.dateToFilePreviewFormat)(
              e.created ? e.created : e.updated
            )),
            (y = i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "text.created")
            )))
          : ((m = (0, s.dateToFilePreviewFormat)(
              e.updated ? e.updated : e.created
            )),
            (y = i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "text.updated")
            )));
        var _ = e instanceof g && e.getSize(),
          b = "";
        if (_ && h.SHOW_FILE_SIZE_INFO) {
          var w = (0, l.getSizeInfo)(_);
          w.gb
            ? (b += (b ? "" : " ") + "".concat(w.gb, " GB"))
            : w.mb
            ? (b += (b ? "" : " ") + "".concat(w.mb, " MB"))
            : w.kb
            ? (b += (b ? "" : " ") + "".concat(w.kb, " KB"))
            : (b += (b ? "" : " ") + "< 1 KB");
        }
        var C = null;
        e instanceof g && (C = e.getPreviewURL()),
          C || (C = e.url_t || e.url_s),
          C
            ? v.css("background-image", 'url("'.concat(C, '")'))
            : v.addClass("default-preview");
        var x = $("<div/>").addClass("name-container").appendTo(u);
        $("<div />")
          .addClass("file-name-container")
          .append($("<div />").addClass("name").text(o))
          .append(
            $("<input />")
              .attr("type", "text")
              .css("display", "none")
              .addClass("file-name")
              .val(o)
              .css("width", $(this).parent().find(".name").outerWidth())
          )
          .appendTo(x),
          this._updateFileNamePreview(u, e),
          $("<div />")
            .addClass("file-updated")
            .attr(
              "data-title",
              ""
                .concat(y, " ")
                .concat(m)
                .concat(b ? ", " + b : "")
            )
            .text(
              ""
                .concat(y, " ")
                .concat(m)
                .concat(b ? ", " + b : "")
            )
            .appendTo(u);
        var S = $("<div />").addClass("file-top-tile").appendTo(u);
        return (
          this._isContextMenuAvailableForFile(e) &&
            $("<div />")
              .addClass("file-context")
              .append(
                $("<span />")
                  .addClass("icon")
                  .addClass("gravit-icon-w-kebab")
                  .on("mouseover", function (e) {
                    e.stopPropagation();
                  })
              )
              .on(
                "click",
                function (t) {
                  t.stopPropagation(), a._handleFileContextMenu(e, u, t);
                }.bind(this)
              )
              .on("dblclick", function (e) {
                e.stopPropagation();
              })
              .on("mouseover", function (e) {
                e.stopPropagation();
              })
              .appendTo(S),
          e.hasPermission(g.Permission.Open) &&
            !this.filesPanel.isSaveMode() &&
            $("<button />")
              .addClass("open-design-button g-button cloud-button")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GFilesPanel", "action.open-design")
                )
              )
              .on("click", (t) => {
                t.stopPropagation(),
                  e.example ||
                    gDesigner.stats("filespanel-view_open_cloudfile"),
                  this.filesPanel.openFile(e);
              })
              .appendTo(S),
          u
        );
      }),
      (v.prototype._handleFileContextMenu = function (e, t, n) {
        this._isContextMenuAvailableForFile(e) &&
          (gDesigner.stats("filespanel-view_context_cloudfile"),
          this.filesPanel.isItemSelected(e) || this.resetSelection(!0),
          this._addToSelection(t),
          this._openContextMenuForEventPosition(n));
      }),
      (v.prototype._updateFileNamePreview = function (e, t) {
        const n = this._removeCDRExtensionFromFileName(t.name);
        var o = $(e).find(".file-name-container");
        o.attr("data-ending", "..." + n.substr(n.length - 4));
        var i = o.find(".name");
        i.text(n),
          ((e) => e && e.offsetWidth < e.scrollWidth)(i[0]) &&
            o.addClass("ending");
      }),
      (v.prototype.addFolder = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        this._factoryFolder(e, t)
          .getHTMLContainer()
          .appendTo(this.panel.find(".g-folders-list.main"));
      }),
      (v.prototype.addCustomFolder = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        this._factoryFolder(e, t)
          .getHTMLContainer()
          .appendTo(this.panel.find(".g-folders-list.custom-folders")),
          "shared_files_with_me" === e.id &&
            ("shared_files_with_me" ===
            this.filesPanel.drive.getCurrentFolder().id
              ? this.hideFileTypeFilterButton()
              : this.displayFileTypeFilterButton());
      }),
      (v.prototype.scrollToSelectedElement = function (e) {
        var t = null;
        return (
          this.panel
            .find(".g-files-list")
            .find(".g-gravit-file")
            .each(
              function (n, o) {
                if ($(o).data("node").id === e.id)
                  return (
                    (t = $(o).data("node")),
                    setTimeout(() => {
                      this.panel
                        .find(".g-items-container")
                        .scrollTop($(o).position().top);
                    }),
                    !1
                  );
              }.bind(this)
            ),
          t
        );
      }),
      (v.prototype.updateControls = function (e) {
        this.panel.find(".g-gravit-folder").length > 0
          ? this.panel.find(".g-folders-list").show()
          : this.panel.find(".g-folders-list").hide();
        const t = this.panel.find(".header"),
          n = t.find(".new-folder"),
          o = t.find(".back");
        this.getSearchValue()
          ? (n.addClass("g-disabled"),
            o.addClass("g-hidden"),
            this.panel.find(".g-files-list").find(".g-gravit-file").length <
              1 && this._showNoResultsInfo())
          : this._isCreateFolderEnabled() && n.removeClass("g-disabled"),
          this.filesPanel.isRootFolder()
            ? o.addClass("g-hidden")
            : o.removeClass("g-hidden"),
          e &&
            this.filesPanel.isSaveMode() &&
            this.panel.find(".footer").find("input.file-name").select();
      }),
      (v.prototype._showNoResultsInfo = function () {
        this.panel.find(".g-search-no-results").show();
      }),
      (v.prototype._checkItemPermission = function (e, t) {
        return (e instanceof Array ? e : [e]).every((e) =>
          e instanceof g
            ? e.hasPermission(t)
            : (console.error("Wrong check for file permission", e), !0)
        );
      }),
      (v.prototype._openContextMenuForEventPosition = function (e) {
        var t = e.pageX,
          n = e.pageY;
        this._contextMenu.open({ x: t, y: n });
      }),
      (v.prototype._renameFile = function (e, t, n) {
        const o = this._removeCDRExtensionFromFileName(e.name),
          r = this;
        r.toggleLoading(!1);
        var s = t.find("input");
        s.off("focusout"), s.off("keypress");
        var l = t.find("div.name");
        t.addClass("renaming"),
          $(t).attr("data-title", o),
          l.text(o),
          s.css("width", l.outerWidth()),
          s.val(o),
          $(t).find(".file-name-container").removeClass("ending"),
          s.css("width", l.outerWidth());
        var c = s.val(),
          u = !1;
        s.show(), l.hide(), s.focus();
        const p = (t) => {
          let n;
          return (
            (n =
              e.getType() === g.Type.File
                ? i.GLocale.get(
                    new i.GLocaleKey(
                      "GFilesPanel",
                      "text.file-already-exists-on-current-location"
                    )
                  ).replace("%filename", '"'.concat(t, '"'))
                : i.GLocale.get(
                    new i.GLocaleKey(
                      "GFilesPanel",
                      "text.folder-already-exists-on-current-location"
                    )
                  ).replace("%foldername", '"'.concat(t, '"'))),
            new Promise((e) => {
              d.default.confirm(n, (t) => e(!!t), null, null, !1, !0, !0);
            })
          );
        };
        var h = async function () {
          try {
            s.hide(), l.show();
            let o,
              a = s.val();
            if (e.getType() === g.Type.File && !r._isUserInputValidFileName(a))
              return (
                d.default.alert(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GFilesPanel",
                      "text.new-file-name-invalid"
                    )
                  )
                ),
                void s.val(c)
              );
            if (a.trim() && a.trim() !== e.name) {
              r.toggleLoading(!0);
              try {
                let i = 0;
                const s = e.ext || e.extension;
                if (r.filesPanel.drive.supportsSaveCollisionFlow())
                  if (e.getType() === g.Type.File) {
                    if (
                      (await r.filesPanel.drive.fileExists(
                        a,
                        s,
                        e.parent || r.filesPanel.drive.getRootFolder()
                      )) &&
                      !(await p(a))
                    )
                      return r._renameFile(e, t, n);
                    if (r.filesPanel.drive.requiresOverwriteCollisionHandling())
                      for (
                        o = a;
                        await r.filesPanel.drive.fileExists(
                          o,
                          s,
                          e.parent || r.filesPanel.drive.getRootFolder()
                        );

                      )
                        o = "".concat(a, " (").concat(++i, ")");
                  } else {
                    if (
                      (await r.filesPanel.drive.folderExists(
                        a,
                        e.parent || r.filesPanel.drive.getRootFolder()
                      )) &&
                      !(await p(a))
                    )
                      return r._renameFile(e, t, n);
                    if (r.filesPanel.drive.requiresOverwriteCollisionHandling())
                      for (
                        o = a;
                        await r.filesPanel.drive.folderExists(
                          o,
                          e.parent || r.filesPanel.drive.getRootFolder()
                        );

                      )
                        o = "".concat(a, " (").concat(++i, ")");
                  }
                o || (o = a), await r.filesPanel.renameItem(e, o);
              } catch (e) {
                return (
                  r.toggleLoading(!1),
                  e && e.badName
                    ? void d.default.alert(e.message)
                    : (s.val(c),
                      void d.default.alert(
                        i.GLocale.get(
                          new i.GLocaleKey("GFilesPanel", "text.error-renaming")
                        )
                      ))
                );
              }
              !(function (t) {
                const n = gDesigner.getWindows(),
                  o = n && n.getWindows();
                if (!o || !o.length) return;
                for (let n = 0, i = o.length; n < i; n++) {
                  let i = o[n].getDocument();
                  if (i && i.getId() === e.id) {
                    i.setTitle(t);
                    break;
                  }
                }
              })(o),
                (e.name = o),
                s.css("width", l.outerWidth());
              const u = (t) => {
                ($(t).data("node").name = o),
                  $(t).attr("data-title", o),
                  $(t).find("div.name").text(o),
                  r._updateFileNamePreview(t, e);
              };
              e.getType() === g.Type.Folder
                ? u(t)
                : $.each(r._rightSide.find(".".concat(e.id)), (e, t) => {
                    u(t);
                  }),
                r._fileInfoPanelIsOpen && r._updateFileInfoPanel(e, t, !1),
                r.filesPanel._triggerFileRenamed(e),
                r.toggleLoading(!1),
                n && n();
            } else s.val(c);
          } catch (e) {
            throw (console.log("err changing the name", e), e);
          }
        };
        s.on("focusout", function () {
          u || (h(), (u = !0)), t.removeClass("renaming");
        }).on("keypress", function (e) {
          const n = e.which || e.charCode || e.keyCode;
          a.GKey.translateKey(n) !== a.GKey.Constant.ENTER ||
            u ||
            (gDesigner.stats("filespanel-view_update_cloudfile-name"),
            h(),
            (u = !0)),
            t.removeClass("renaming");
        });
      }),
      (v.prototype._updateMenuItemCaption = function (e, t) {
        this.filesPanel.getSelection().length > 1
          ? e.setCaption(
              i.GLocale.get(
                new i.GLocaleKey("GFilesPanel", "text.selection-multiple")
              )
                .replace("%selection", t)
                .replace(
                  "%multiple",
                  i.GLocale.get(
                    new i.GLocaleKey("GFilesPanel", "text.multiple")
                  )
                )
            )
          : e.setCaption(t);
      }),
      (v.prototype._isFolderSelected = function () {
        var e = this.filesPanel.getSelection();
        return 1 === e.length && e[0].getType() === g.Type.Folder;
      }),
      (v.prototype._getNativeMenuItems = function () {
        return [
          {
            caption: i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.open")
            ),
            click: () => {
              if (this._isFolderSelected()) {
                gDesigner.stats("filespanel-view_open_cloudfolder");
                var e = this.filesPanel.getSelection(),
                  t = this._getSelectedFolderUIElement();
                this.filesPanel.navigateToFolder(e[0]),
                  this.filesPanel.manageOpenFolder(t, e[0]),
                  this._expandSelectedFolder();
              } else {
                gDesigner.stats("filespanel-view_opencontext_cloud");
                e = this.filesPanel.getSelection();
                this.filesPanel.openFile.call(this.filesPanel, e[0]);
              }
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              e.sender.setEnabled(1 === t.length),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.Open)
                );
            },
          },
          {
            caption: i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.rename")
            ),
            click: () => {
              var e = this.filesPanel.getSelection();
              gDesigner.stats("filespanel-view_rename_cloud");
              const t = this._isFolderSelected()
                ? $(".g-gravit-folder.selected")
                : this._rightSide.find(".selected").eq(0);
              this._renameFile(e[0], t);
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              e.sender.setEnabled(1 === t.length),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.Rename)
                );
            },
          },
          {
            caption: i.GLocale.get(new i.GLocaleKey("GPasteAction", "title")),
            click: () => {
              this.filesPanel.isClipboardModeCut()
                ? this.filesPanel.performCutPaste()
                : this.filesPanel.performCopyPaste();
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              const n =
                this.filesPanel.isClipboardModeCut() ||
                this.filesPanel.isClipboardModeCopy();
              e.sender.setEnabled(n),
                e.sender.setVisible(
                  this._checkItemPermission(t, g.Permission.CutPaste) ||
                    (0, c.hasRootFolderInSelections)(this.filesPanel.drive, t)
                );
            },
          },
          {
            caption: i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.copy")
            ),
            click: () => {
              this.filesPanel.performCopyPaste(
                p.GFilesPanelClipboardModes.DEFAULT
              );
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              this._updateMenuItemCaption(
                e.sender,
                i.GLocale.get(new i.GLocaleKey("GFilesPanel", "action.copy"))
              ),
                e.sender.setEnabled(t.length > 0),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.Copy)
                );
            },
          },
          {
            caption: i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.cut")
            ),
            click: () => {
              this.filesPanel.performCutPaste(
                p.GFilesPanelClipboardModes.DEFAULT
              );
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              this._updateMenuItemCaption(
                e.sender,
                i.GLocale.get(new i.GLocaleKey("GFilesPanel", "action.cut"))
              ),
                e.sender.setEnabled(t.length > 0),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.CutPaste)
                );
            },
          },
          {
            caption: i.GLocale.get(new i.GLocaleKey("GDeleteAction", "title")),
            click: () => {
              this.filesPanel.handleDelete();
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              this._updateMenuItemCaption(
                e.sender,
                i.GLocale.get(new i.GLocaleKey("GDeleteAction", "title"))
              ),
                e.sender.setEnabled(t.length > 0),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.Delete)
                );
            },
          },
          {
            caption: i.GLocale.get(
              new i.GLocaleKey("GUnshareWithMeAction", "title")
            ),
            click: async () => {
              if (gDesigner.getShareManager().isShareProRestricted())
                gDesigner.handleShareFilePROFeatureInterruption();
              else {
                const e = await gDesigner.getUser();
                if (!e) return;
                const t = this.filesPanel.getSelection()[0].getId(),
                  n = e.getUID();
                console.log(
                  "About to call unshare with item id: %s and user id: %s",
                  t,
                  n
                ),
                  await gApi.unshareWithUser(t, n),
                  this._closeFileInfoPanel(),
                  this.filesPanel.updateFilesList();
              }
            },
            update: (e) => {
              var t = this.filesPanel.getSelection();
              this._updateMenuItemCaption(
                e.sender,
                i.GLocale.get(new i.GLocaleKey("GUnshareWithMeAction", "title"))
              ),
                e.sender.setEnabled(t.length > 0),
                e.sender.setVisible(
                  !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                    this._checkItemPermission(t, g.Permission.UnshareWithMe)
                );
            },
          },
        ];
      }),
      (v.prototype._buildContextMenu = function () {
        (this._contextMenu = new _(null, "g-file-panel-context-menu")),
          this._setContextMenuActiveRangeSize();
        this._getNativeMenuItems().forEach((e) => {
          this._contextMenu
            .createAddItem(e.caption, e.click)
            .addEventListener(b.UpdateEvent, e.update.bind(this));
        }),
          this._createContextMenuDownloadMenu();
      }),
      (v.prototype._buildAdditionalContextMenu = function () {}),
      (v.prototype._createContextMenuDownloadMenu = async function () {
        this._contextMenu
          .createAddItem(
            i.GLocale.get(
              new i.GLocaleKey("GFilesPanel", "action.download-title")
            ),
            () => {
              1 === this.filesPanel.getSelection().length
                ? gDesigner.stats("filespanel-view_download_file")
                : gDesigner.stats("filespanel-view_download_multiple-files"),
                this.filesPanel.handleDownload();
            }
          )
          .addEventListener(b.UpdateEvent, (e) => {
            var t = this.filesPanel.getSelection();
            this._updateMenuItemCaption(
              e.sender,
              i.GLocale.get(
                new i.GLocaleKey("GFilesPanel", "action.download-title")
              ),
              t
            ),
              e.sender.setEnabled(t.length > 0),
              e.sender.setVisible(
                !(0, c.hasRootFolderInSelections)(this.filesPanel.drive, t) &&
                  this._checkItemPermission(t, g.Permission.Download) &&
                  !this._isFolderSelected()
              );
          });
      }),
      (v.prototype.toggleFolders = function (e) {
        this.panel.find(".g-left-side").toggleClass("g-no-display", !e);
      }),
      (v.prototype.getSearchValue = function () {
        const e = this.panel
          .find(".header")
          .find(".search-container")
          .find(".search-field")
          .val();
        return e ? e.trim() : "";
      }),
      (v.prototype.focusFileNameInput = function (e) {
        this.setFileNameInputValue(e.name),
          this.panel.find(".footer").find("input.file-name").focus().select();
      }),
      (v.prototype.setFileNameInputValue = function (e) {
        this.panel.find(".footer").find("input.file-name").val(e);
      }),
      (v.prototype._isDuringRenaming = function () {
        return !!this.panel.find(".g-gravit-file.selected.renaming").length;
      }),
      (v.prototype._expandSelectedFolder = function () {
        $(".g-gravit-folder.opened .folder-state-icon.closed").click();
      }),
      (v.prototype.setLockEnterState = function (e) {
        this._lockEnter = e;
      }),
      (v.prototype._isUserInputValidFileName = function (e) {
        return y.String.ValidFileName.test(e);
      }),
      (v.prototype._getSelectedFolderUIElement = function () {
        return $(".g-gravit-folder.g-cloud-element.selected");
      }),
      (e.exports = v);
  }