/**
 * Webpack Module #1596
 * Type: unknown
 */

function (e, t) {
    !(function (e) {
      if (e) {
        var t = {},
          n = e.prototype.stopCallback;
        (e.prototype.stopCallback = function (e, o, i, a) {
          return !!this.paused || (!t[i] && !t[a] && n.call(this, e, o, i));
        }),
          (e.prototype.bindGlobal = function (e, n, o) {
            if ((this.bind(e, n, o), e instanceof Array))
              for (var i = 0; i < e.length; i++) t[e[i]] = !0;
            else t[e] = !0;
          }),
          e.init();
      }
    })("undefined" != typeof Mousetrap ? Mousetrap : void 0);
  }