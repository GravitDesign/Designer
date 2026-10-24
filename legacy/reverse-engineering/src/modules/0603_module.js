/**
 * Webpack Module #603
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(1503),
      a = n(44),
      r = n(447),
      s = n(86);
    function l(e) {
      (this._htmlElement = e), (this._windows = []);
    }
    o.GObject.inherit(l, o.GEventTarget),
      (l.WindowEvent = function (e, t, n) {
        (this.type = e), (this.window = t), (this.index = n);
      }),
      o.GObject.inherit(l.WindowEvent, o.GEvent),
      (l.WindowEvent.Type = {
        Added: 0,
        Removed: 1,
        Deactivated: 10,
        Activated: 11,
      }),
      (l.WindowEvent.prototype.type = null),
      (l.WindowEvent.prototype.window = null),
      (l.WindowEvent.prototype.index = null),
      (l.WindowEvent.prototype.toString = function () {
        return "[Object GWindows.WindowEvent]";
      }),
      (l.prototype._htmlElement = null),
      (l.prototype._windows = null),
      (l.prototype._activeWindow = null),
      (l.prototype._viewOffset = null),
      (l.prototype.getWindows = function () {
        return this._windows;
      }),
      (l.prototype.getActiveWindow = function () {
        return this._activeWindow;
      }),
      (l.prototype.activateWindow = function (e, t) {
        if (e !== this._activeWindow) {
          this._activeWindow &&
            (this._activeWindow.deactivate(),
            this._activeWindow._container.detach()),
            null === e
              ? gDesigner.activateDocument(null, !0)
              : ((e &&
                  this._activeWindow &&
                  e.getDocument() !== this._activeWindow.getDocument()) ||
                  !this._activeWindow) &&
                gDesigner.activateDocument(e.getDocument(), !0);
          var n = this._activeWindow;
          (this._activeWindow = e),
            n &&
              this.hasEventListeners(l.WindowEvent) &&
              this.trigger(
                new l.WindowEvent(l.WindowEvent.Type.Deactivated, n)
              ),
            e &&
              ((e.getDocument()._activeWindow = e),
              this._htmlElement.append(e._container),
              this._relayoutWindow(e, t),
              this._activeWindow.activate(t),
              this.hasEventListeners(l.WindowEvent) &&
                this.trigger(
                  new l.WindowEvent(l.WindowEvent.Type.Activated, e)
                ));
        }
      }),
      (l.prototype.addWindow = function (e, t, n) {
        var o = e instanceof i ? e.getDocument() : e,
          a = this._addWindow(o, t, n);
        if (e instanceof i) {
          var r = e.getView();
          a.getView() &&
            a.getView().transform(r.getScrollX(), r.getScrollY(), r.getZoom());
        }
        return a;
      }),
      (l.prototype.removeWindow = function (e, t, n, i) {
        var c = e.getDocument(),
          d = function (n) {
            if (!n || n.documentStatus !== s.SaveCancelled) {
              if (e === this._activeWindow) {
                var o = this._windows.indexOf(e);
                o > 0
                  ? this.activateWindow(this._windows[o - 1], i)
                  : o + 1 < this._windows.length
                  ? this.activateWindow(this._windows[o + 1], i)
                  : this.activateWindow(null);
              }
              c._activeWindow === e && (c._activeWindow = null),
                c._windows.splice(c._windows.indexOf(e), 1),
                this._windows.splice(this._windows.indexOf(e), 1),
                e._container.remove(),
                this.hasEventListeners(l.WindowEvent) &&
                  this.trigger(
                    new l.WindowEvent(l.WindowEvent.Type.Removed, e)
                  ),
                e.release(),
                t && t(),
                0 === c._windows.length && gDesigner.removeDocument(c);
            }
          }.bind(this);
        n
          ? d()
          : c.isSynchronizing()
          ? a.alert(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GCommonNames",
                  "text.please-wait-avoid-losing-progress"
                )
              )
            )
          : 1 === c._windows.length && c.isModified()
          ? gDesigner
              .canUnloadDocument(c)
              .then((e) => {
                e
                  ? d()
                  : (gDesigner.stats("action_execute_windowalert", r.ID),
                    gDesigner.executeAction(r.ID, [c, d], void 0, !0));
              })
              .catch((e) => {
                e && !e.documentStatus && console.log(e);
              })
          : d();
      }),
      (l.prototype.init = function () {}),
      (l.prototype.relayout = function (e) {
        (this._viewOffset = e || this._viewOffset),
          this._activeWindow && this._relayoutWindow(this._activeWindow);
      }),
      (l.prototype._relayoutWindow = function (e, t) {
        e.relayout(
          this._htmlElement.width(),
          this._htmlElement.height(),
          this._viewOffset,
          t
        );
      }),
      (l.prototype._addWindow = function (e, t, n) {
        var o = new i(e, t);
        return (
          e._windows.push(o),
          "number" == typeof n
            ? this._windows.splice(n, 0, o)
            : this._windows.push(o),
          this.hasEventListeners(l.WindowEvent) &&
            this.trigger(new l.WindowEvent(l.WindowEvent.Type.Added, o, n)),
          this.activateWindow(o),
          o
        );
      }),
      (l.prototype.getHtmlElement = function () {
        return this._htmlElement;
      }),
      (l.prototype.getWindow = function (e) {
        for (var t = null, n = 0; n < this._windows.length; ++n)
          if (this._windows[n].getDocument() === e) {
            t = this._windows[n];
            break;
          }
        return t;
      }),
      (e.exports = l);
  }