/**
 * Webpack Module #1526
 * Type: class
 * Name: GEffectsPanel
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(1527);
    function a(e) {
      (this._htmlElement = $("<div></div>")
        .addClass("g-effects-panel")
        .gOverlay({ releaseOnClose: !1, padding: !1 })),
        (this._catTranslate = e);
    }
    (a.prototype._htmlElement = null),
      (a.prototype._content = null),
      (a.prototype._catTranslate = null),
      (a.prototype._parent = null),
      (a.prototype.addItem = function (e) {
        this._content.append(e._htmlElement);
      }),
      (a.prototype.createSelector = function () {
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
      }),
      (a.prototype.addItems = function (e) {
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
      }),
      (a.prototype.open = function (e) {
        (this._parent = e), this._htmlElement.gOverlay("open", e);
      }),
      (a.prototype.close = function (e) {
        this._htmlElement.gOverlay("close", e || this._parent);
      }),
      (a.prototype.toString = function () {
        return "[Object GEffectsPanel]";
      }),
      (e.exports = a);
  }