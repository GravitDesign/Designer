/**
 * Webpack Module #1504
 * Type: unknown
 */

function (e, t, n) {
    var o = n(1505);
    (e.exports = function (e, t, n) {
      return (
        (t = o(t)) in e
          ? Object.defineProperty(e, t, {
              value: n,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            })
          : (e[t] = n),
        e
      );
    }),
      (e.exports.__esModule = !0),
      (e.exports.default = e.exports);
  }