/**
 * Webpack Module #1661
 * Type: class
 * Name: GSymbolsSidebar
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(4), n(41);
    var i = n(1),
      a = n(53),
      r = n(67),
      s = o(n(340)),
      l = n(78),
      c = n(608),
      d = n(566),
      u = n(806),
      p = n(395);
    function g() {
      u.call(this);
    }
    i.GObject.inherit(g, u),
      (g.ID = "symbols"),
      (g.TITLE = new i.GLocaleKey("GSymbolsSidebar", "title")),
      (g.prototype._htmlElement = null),
      (g.prototype._newSymbolButton = null),
      (g.prototype._symbolsToolbar = null),
      (g.prototype._symbolsPanel = null),
      (g.prototype.getId = function () {
        return g.ID;
      }),
      (g.prototype.getTitle = function () {
        return g.TITLE;
      }),
      (g.prototype.isEnabled = function () {
        return !0;
      }),
      (g.prototype.isVisible = function () {
        return !!gDesigner.getApplicationManager().isEditingEnabled();
      }),
      (g.prototype.getOrientation = function () {
        return p.Orientation.Left;
      }),
      (g.prototype.getMinimumWidth = function () {
        return 250;
      }),
      (g.prototype.getDefaultWidth = function () {
        return 250;
      }),
      (g.prototype.isResizeable = function () {
        return !0;
      }),
      (g.prototype.relayout = function () {
        this._symbolsPanel.gSymbolsPanel("relayout");
      }),
      (g.prototype.init = function (e) {
        u.prototype.init.call(this, e),
          (this._htmlElement = e),
          (this._symbolsToolbar = $("<div></div>")
            .addClass("toolbar symbols-toolbar")
            .append(
              $("<label></label>")
                .css("flex-grow", "1")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GSymbolsSidebar", "text.symbols")
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
              }.bind(this)
            )
            .appendTo(e)),
          $("<button></button>")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GSymbolsSidebar", "action.delete-symbol")
              )
            )
            .on("click", () => this._deleteSymbol())
            .append($("<span></span>").addClass("gravit-icon-trash"))
            .append($("<span></span>").addClass("gravit-icon-touch-trash"))
            .appendTo(this._symbolsToolbar)
            .gRichTooltip(
              r.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GSymbolsSidebar",
                    "text.delete-symbol-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GSymbolsSidebar",
                    "text.delete-symbol-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          (this._newSymbolButton = $("<button></button>")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GSymbolsSidebar", "action.create-symbol")
              )
            )
            .on(
              "click",
              function () {
                gDesigner.stats("symbols_new_symbol"),
                  this._symbolsPanel.gSymbolsPanel("newSymbolClick") &&
                    ($(this._symbolsToolbar).gAccordion("toggleOpen", !0),
                    $(this._symbolsToolbar).gAccordion(
                      "init",
                      $(this._symbolsPanel)
                    ));
              }.bind(this)
            )
            .append($("<span></span>").addClass("gravit-icon-plus"))
            .append($("<span></span>").addClass("gravit-icon-touch-plus"))
            .appendTo(this._symbolsToolbar)
            .addClass("g-disabled")
            .gRichTooltip(
              r.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GSymbolsSidebar",
                    "text.create-symbol-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GSymbolsSidebar",
                    "text.create-symbol-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ));
        var t = this,
          n = $("<div></div>")
            .addClass("symbols-container")
            .appendTo(e)
            .on("click", function (e) {
              gDesigner.stats("symbols_click_symbol"),
                (e.target === this ||
                  $(e.target).hasClass("g-symbols-panel")) &&
                  t._symbolsPanel.gSymbolsPanel("isSelected") &&
                  t._document.getEditor().updateSelection(
                    !1,
                    t._document
                      .getEditor()
                      .getSelection()
                      .slice()
                      .filter(function (e) {
                        return !(e instanceof i.GSymbol && e.isMaster());
                      })
                  );
            })
            .on("scroll", function () {
              if ($("body").hasClass("g-touch")) {
                var e = $(this)[0].scrollTop,
                  t =
                    "light" == gDesigner.getSetting("theme")
                      ? "DFDFDF"
                      : "2E2E2E";
                (e = e > 20 ? 20 : e),
                  $(".symbols-toolbar").css({
                    "box-shadow": "0 0 25px ".concat(e, "px #").concat(t),
                  });
              }
            });
        (this._symbolsPanel = $("<div></div>")
          .addClass("symbols")
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
            }.bind(this)
          )
          .appendTo(n)),
          this._symbolsPanel.gSymbolsPanel({
            moveCallback: this._moveSymbolCallback.bind(this),
            clickCallback: this._clickSymbolCallback.bind(this),
            dblClickCallback: this._dblClickSymbolCallback.bind(this),
            startDraggingCallback: this._startSymbolDraggingCallback.bind(this),
          }),
          gDesigner.addEventListener(l, this._documentEvent, this);
      }),
      (g.prototype._documentEvent = function (e) {
        if (e.type === l.Type.Activated)
          (this._document = e.document),
            this._symbolsPanel.gSymbolsPanel(
              "scene",
              this._document.getScene()
            ),
            this.trigger(u.UPDATE_EVENT),
            this._document
              .getEditor()
              .addEventListener(
                a.GEditor.SelectionChangedEvent,
                this._selectionUpdate,
                this
              );
        else if (e.type === l.Type.Deactivated) {
          this._symbolsPanel.gSymbolsPanel("scene", null),
            this._document
              .getEditor()
              .removeEventListener(
                a.GEditor.SelectionChangedEvent,
                this._selectionUpdate,
                this
              ),
            (this._document = null),
            this.trigger(u.UPDATE_EVENT);
        }
      }),
      (g.prototype._deleteSymbol = function () {
        gDesigner.stats("symbols_delete_symbol");
        this._document.getEditor();
        var e = this._document.getScene(),
          t = (e.getActivePage(), this._symbolsPanel);
        t.gSymbolsPanel("isSelected") &&
          a.GEditor.tryRunTransaction(
            e,
            function () {
              t.gSymbolsPanel("removeSelected");
            },
            i.GLocale.get(
              new i.GLocaleKey("GSymbolsSidebar", "action.delete-symbol")
            )
          );
      }),
      (g.prototype._moveSymbolCallback = function (e, t, n) {
        n && e && n.length;
      }),
      (g.prototype._startSymbolDraggingCallback = function (e) {
        return console.log("start dragging cb"), null;
      }),
      (g.prototype._clickSymbolCallback = function (e) {
        if (e && e.isMaster()) {
          var t = this._document.getEditor();
          if (t) {
            var n = a.GEditor.getElementPage(e);
            n && this._document.getScene().setActivePage(n),
              t.clearSelection(),
              t.updateSelection(!1, [e]),
              t.hasSelection() &&
                gDesigner.executeAction(d.ID, void 0, void 0, !0);
          }
        }
      }),
      (g.prototype._dblClickSymbolCallback = function (e) {
        if (e && e.isMaster()) {
          var t = this._document.getEditor(),
            n = this._document.getScene(),
            o = (n.getActivePage(), [e]);
          n.visitLinks(e, function (e) {
            e instanceof i.GSymbol && o.push(e);
          }),
            t && (t.clearSelection(), t.updateSelection(!1, o));
        }
      }),
      (g.prototype._selectionUpdate = function () {
        var e = gDesigner.canExecuteAction(c.ID),
          t = this._newSymbolButton.hasClass("g-disabled");
        e && t
          ? this._newSymbolButton.removeClass("g-disabled")
          : e || t || this._newSymbolButton.addClass("g-disabled");
      }),
      (g.prototype.getTouchTools = function () {
        return [
          new s.default({
            id: "symbols",
            sidebar: this.getId(),
            icon: "gravit-icon-touch-newSymbols",
            panel: ".symbols-container",
            toolbar: ".symbols-toolbar",
          }),
        ];
      }),
      (g.prototype.toString = function () {
        return "[Object GSymbolsSidebar]";
      }),
      (e.exports = g);
  }