/**
 * Webpack Module #1115
 * Type: unknown
 */

function (e, t, n) {
    (function (e) {
      var o =
          (void 0 !== e && e) || ("undefined" != typeof self && self) || window,
        i = Function.prototype.apply;
      function a(e, t) {
        (this._id = e), (this._clearFn = t);
      }
      (t.setTimeout = function () {
        return new a(i.call(setTimeout, o, arguments), clearTimeout);
      }),
        (t.setInterval = function () {
          return new a(i.call(setInterval, o, arguments), clearInterval);
        }),
        (t.clearTimeout = t.clearInterval =
          function (e) {
            e && e.close();
          }),
        (a.prototype.unref = a.prototype.ref = function () {}),
        (a.prototype.close = function () {
          this._clearFn.call(o, this._id);
        }),
        (t.enroll = function (e, t) {
          clearTimeout(e._idleTimeoutId), (e._idleTimeout = t);
        }),
        (t.unenroll = function (e) {
          clearTimeout(e._idleTimeoutId), (e._idleTimeout = -1);
        }),
        (t._unrefActive = t.active =
          function (e) {
            clearTimeout(e._idleTimeoutId);
            var t = e._idleTimeout;
            t >= 0 &&
              (e._idleTimeoutId = setTimeout(function () {
                e._onTimeout && e._onTimeout();
              }, t));
          }),
        n(1116),
        (t.setImmediate =
          ("undefined" != typeof self && self.setImmediate) ||
          (void 0 !== e && e.setImmediate) ||
          (this && this.setImmediate)),
        (t.clearImmediate =
          ("undefined" != typeof self && self.clearImmediate) ||
          (void 0 !== e && e.clearImmediate) ||
          (this && this.clearImmediate));
    }).call(this, n(109));
  }