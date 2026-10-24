/**
 * GEffectsPanel
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEffectsPanel(e) {
      (this._htmlElement = $("<div></div>")
        .addClass("g-effects-panel")
        .gOverlay({ releaseOnClose: !1, padding: !1 })),
        (this._catTranslate = e);
    }

// Prototype methods
GEffectsPanel.prototype.addItem = function (e) {
        this._content.append(e._htmlElement);
      }

GEffectsPanel.prototype.createSelector = function () {
        var e = $("<select></select>")
          .addClass("g-effects-select")
          .addClass("active");
        return (
          (this._htmlElementSelector = $("<div></div>")
            .addClass("g-effects-selector")
            .append(e)),
          this._htmlElement.append(this._htmlElementSelector),
          e
        );
      }

GEffectsPanel.prototype.addItems = function (e) {
        for (
          this._content ||
          ((this._content = $("<div></div>").addClass("g-effects-content")),
          this._htmlElement.append(this._content));
          e.length % 3 != 0;

        ) {
          var t = new i();
          e.push(t);
        }
        this._content.children(".g-effects-button").remove();
        for (var n = 0; n < e.length; ++n)
          if (e[n] instanceof i) this.addItem(e[n]);
          else {
            t = new i(
              o.GLocale.getValue(e[n].i18n, "name"),
              e[n].icon,
              e[n].clazz,
              e[n].cb,
              !e[n].mostUsed,
              e[n],
              this._catTranslate
            );
            this.addItem(t);
          }
      }

GEffectsPanel.prototype.open = function (e) {
        (this._parent = e), this._htmlElement.gOverlay("open", e);
      }

GEffectsPanel.prototype.close = function (e) {
        this._htmlElement.gOverlay("close", e || this._parent);
      }

GEffectsPanel.prototype.toString = function () {
        return "[Object GEffectsPanel]";
      }

module.exports = GEffectsPanel;
