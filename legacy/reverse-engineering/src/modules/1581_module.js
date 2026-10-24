/**
 * Webpack Module #1581
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = n(878),
      i = n(879),
      a = n(1329);
    e.exports = class extends o {
      constructor(e) {
        super(e),
          this.addGesture(
            new i({
              doubleTapDetection: i.DetectionMode.Nearby,
              doubleTapThreshold: 200,
            })
          ),
          this.addGesture(new a()),
          this.setClickSuppressionEnabled(!0);
      }
      _touchEnd(e) {
        const t = e.changedTouches[0];
        !t ||
          ($(t.target).data("ginputbox") && this._touchmoved) ||
          $(t.target).is(":focus") ||
          (document.activeElement &&
            document.activeElement !== t.target &&
            $(document.activeElement).blur(),
          $(t.target).focus()),
          super._touchEnd(e);
      }
      _handleEvent(e) {
        const t = e.changedTouches && e.changedTouches[0];
        if (!t || !$(t.target).is("select"))
          try {
            super._handleEvent(e);
          } finally {
            e.cancelable && (e.preventDefault(), e.stopPropagation());
          }
      }
    };
  }