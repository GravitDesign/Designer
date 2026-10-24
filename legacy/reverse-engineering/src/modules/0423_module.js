/**
 * Webpack Module #423
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21),
      i = n(43),
      a = n(49),
      r = n(74),
      s = i("iterator");
    e.exports = !o(function () {
      var e = new URL("b?a=1&b=2&c=3", "https://a"),
        t = e.searchParams,
        n = new URLSearchParams("a=1&a=2&b=3"),
        o = "";
      return (
        (e.pathname = "c%20d"),
        t.forEach(function (e, n) {
          t.delete("b"), (o += n + e);
        }),
        n.delete("a", 2),
        n.delete("b", void 0),
        (r &&
          (!e.toJSON ||
            !n.has("a", 1) ||
            n.has("a", 2) ||
            !n.has("a", void 0) ||
            n.has("b"))) ||
          (!t.size && (r || !a)) ||
          !t.sort ||
          "https://a/c%20d?a=1&c=3" !== e.href ||
          "3" !== t.get("c") ||
          "a=1" !== String(new URLSearchParams("?a=1")) ||
          !t[s] ||
          "a" !== new URL("https://a@b").username ||
          "b" !== new URLSearchParams(new URLSearchParams("a=b")).get("a") ||
          "xn--e1aybc" !== new URL("https://тест").host ||
          "#%D0%B1" !== new URL("https://a#б").hash ||
          "a1c3" !== o ||
          "x" !== new URL("https://x", void 0).host
      );
    });
  }