/**
 * GWidget
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GWidget() {
  // Constructor (reconstructed)
}

// Prototype methods
GWidget.prototype._updateAndTriggerMouseEvent = function (e, t) {
          if (this._inputEventCache) {
            var i = this._inputEventCache[t];
            if (i) {
              var n = i.event;
              (n.client = this._convertClientPositionFromMousePosition(e)),
                (n.button = e.button),
                n instanceof a.Wheel &&
                  ((n.deltaX = e.deltaX),
                  (n.deltaY = e.deltaY),
                  (n.zoom = e.ctrlKey)),
                (n instanceof a.Click ||
                  n instanceof a.Down ||
                  n instanceof a.Release) &&
                  (n.clickCount = e.detail),
                this._triggerWidgetEventFromDom(e, n);
            }
          }
        }

GWidget.prototype._updateAndTriggerKeyEvent = function (e, t) {
          if (this._inputEventCache) {
            var i = this._inputEventCache[t];
            if (i) {
              var n = i.event;
              (n.key =
                A.translateCode(e.code) ||
                A.translateKey(e.which || e.keyCode, e.location)),
                (n.timestamp = e.timeStamp || -new Date().getTime()),
                String.fromCodePoint
                  ? (n.keyUTF = String.fromCodePoint(e.charCode))
                  : (n.keyUTF = String.fromCharCode(e.charCode)),
                this._triggerWidgetEventFromDom(e, n);
            }
          }
        }

GWidget.prototype._getDomEventNameForEventClass = function (e) {
          switch (e) {
            case a.Move:
              return "mousemove";
            case a.Enter:
              return "mouseover";
            case a.Leave:
              return "mouseout";
            case a.Down:
              return "mousedown";
            case a.Release:
              return "mouseup";
            case a.Click:
              return "click";
            case a.DblClick:
              return "dblclick";
            case h.Down:
              return "keydown";
            case h.Release:
              return "keyup";
            case h.Press:
              return "keypress";
            case a.Wheel:
              return "wheel";
          }
          throw new Error("Unknown DOMEvent name");
        }

GWidget.prototype._setCapture = function () {
        var e = this;

        function t(t) {
          var i = e._getDomEventNameForEventClass(t);
          e._savedDocumentListeners || (e._savedDocumentListeners = {}),
            e._savedDocumentListeners[i] ||
              ((e._savedDocumentListeners[i] = function (i) {
                i.target != this._htmlElement &&
                  (e._updateAndTriggerInputEvent(i, t),
                  i.stopImmediatePropagation());
              }.bind(e)),
              document.addEventListener(i, e._savedDocumentListeners[i], !0));
        }
        for (var i = 0; i < u.length; ++i) {
          var n = u[i];
          this._inputEventCache[r.getTypeId(n)] && t(n);
        }
      }

GWidget.prototype._releaseCapture = function () {
          if (this._savedDocumentListeners) {
            for (var e in this._savedDocumentListeners)
              document.removeEventListener(
                e,
                this._savedDocumentListeners[e],
                !0
              );
            delete this._savedDocumentListeners;
          }
        }

GWidget.prototype._addCSSClass = function (e) {
          var t = this._htmlElement.className;
          if (t && 0 != t.trim().length) {
            for (
              var i = true, n = t.trim().split(" "), r = 0;
              r < n.length;
              ++r
            ) {
              if (n[r].trim() == e) {
                i = false;
                break;
              }
            }
            i && (t += " " + e);
          } else t = e;
          this._htmlElement.className = t;
        }

GWidget.prototype._removeCSSClass = function (e) {
          var t = this._htmlElement.className;
          if (t && t.indexOf(e) >= 0) {
            for (
              var i = "", n = t.trim().split(" "), r = 0;
              r < n.length;
              ++r
            ) {
              var o = n[r].trim();
              o != e && (i.length > 0 && (i += " "), (i += o));
            }
            this._htmlElement.className = i;
          }
        }

GWidget.prototype._createHTMLElement = function (e) {
          var t = document.createElement("div");
          return (
            e &&
              (t.setAttribute("tabindex", "0"),
              (t.style.padding = "0px 0px"),
              (t.style.margin = "0px 0px"),
              (t.style.cursor = "inherit"),
              (t.style.position = "absolute")),
            t
          );
        }

GWidget.prototype.toString = function () {
          return "[Object GWidget]";
        }

module.exports = GWidget;
