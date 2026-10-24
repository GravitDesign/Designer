/**
 * GSymbolsSidebar
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSymbolsSidebar() {
  // Constructor (reconstructed)
}

// Prototype methods
GSymbolsSidebar.prototype._deleteSymbol = function () {
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
      }

GSymbolsSidebar.prototype._moveSymbolCallback = function (e, t, n) {
        n && e && n.length;
      }

GSymbolsSidebar.prototype._startSymbolDraggingCallback = function (e) {
        return console.log("start dragging cb"), null;
      }

GSymbolsSidebar.prototype._clickSymbolCallback = function (e) {
        if (e && e.isMaster()) {
          var t = this._document.getEditor();
          if (t) {
            var n = a.GEditor.getElementPage(e);
            n && this._document.getScene().setActivePage(n),
              t.clearSelection(),
              t.updateSelection(!1, [e]),
              t.hasSelection() &&
                gDesigner.executeAction(d.ID, undefined, undefined, !0);
          }
        }
      }

GSymbolsSidebar.prototype._dblClickSymbolCallback = function (e) {
        if (e && e.isMaster()) {
          var t = this._document.getEditor(),
            n = this._document.getScene(),
            o = (n.getActivePage(), [e]);
          n.visitLinks(e, function (e) {
            e instanceof i.GSymbol && o.push(e);
          }),
            t && (t.clearSelection(), t.updateSelection(!1, o));
        }
      }

GSymbolsSidebar.prototype._selectionUpdate = function () {
        var e = gDesigner.canExecuteAction(c.ID),
          t = this._newSymbolButton.hasClass("g-disabled");
        e && t
          ? this._newSymbolButton.removeClass("g-disabled")
          : e || t || this._newSymbolButton.addClass("g-disabled");
      }

GSymbolsSidebar.prototype.getTouchTools = function () {
        return [
          new s.default({
            id: "symbols",
            sidebar: this.getId(),
            icon: "gravit-icon-touch-newSymbols",
            panel: ".symbols-container",
            toolbar: ".symbols-toolbar",
          }),
        ];
      }

GSymbolsSidebar.prototype.toString = function () {
        return "[Object GSymbolsSidebar]";
      }

module.exports = GSymbolsSidebar;
