/**
 * Webpack Module #1506
 * Type: unknown
 */

function (e, t, n) {
    var o = n(1251).default;
    (e.exports = function (e, t) {
      if ("object" != o(e) || !e) return e;
      var n = e[Symbol.toPrimitive];
      if (void 0 !== n) {
        var i = n.call(e, t || "default");
        if ("object" != o(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === t ? String : Number)(e);
    }),
      (e.exports.__esModule = !0),
      (e.exports.default = e.exports);
  }