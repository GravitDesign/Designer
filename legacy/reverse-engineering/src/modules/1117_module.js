/**
 * Webpack Module #1117
 * Type: unknown
 */

function (e, t, n) {
    var o,
      i =
        i ||
        (function (e) {
          "use strict";
          if (
            !(
              void 0 === e ||
              ("undefined" != typeof navigator &&
                /MSIE [1-9]\./.test(navigator.userAgent))
            )
          ) {
            var t = e.document,
              n = function () {
                return e.URL || e.webkitURL || e;
              },
              o = t.createElementNS("http://www.w3.org/1999/xhtml", "a"),
              i = "download" in o,
              a = /constructor/i.test(e.HTMLElement) || e.safari,
              r = /CriOS\/[\d]+/.test(navigator.userAgent),
              s = function (t) {
                (e.setImmediate || e.setTimeout)(function () {
                  throw t;
                }, 0);
              },
              l = function (e) {
                setTimeout(function () {
                  "string" == typeof e ? n().revokeObjectURL(e) : e.remove();
                }, 4e4);
              },
              c = function (e) {
                return /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(
                  e.type
                )
                  ? new Blob([String.fromCharCode(65279), e], { type: e.type })
                  : e;
              },
              d = function (t, d, u) {
                u || (t = c(t));
                var p,
                  g = this,
                  h = "application/octet-stream" === t.type,
                  f = function () {
                    !(function (e, t, n) {
                      for (var o = (t = [].concat(t)).length; o--; ) {
                        var i = e["on" + t[o]];
                        if ("function" == typeof i)
                          try {
                            i.call(e, n || e);
                          } catch (e) {
                            s(e);
                          }
                      }
                    })(g, "writestart progress write writeend".split(" "));
                  };
                if (((g.readyState = g.INIT), i))
                  return (
                    (p = n().createObjectURL(t)),
                    void setTimeout(function () {
                      var e, t;
                      (o.href = p),
                        (o.download = d),
                        (e = o),
                        (t = new MouseEvent("click")),
                        e.dispatchEvent(t),
                        f(),
                        l(p),
                        (g.readyState = g.DONE);
                    })
                  );
                !(function () {
                  if ((r || (h && a)) && e.FileReader) {
                    var o = new FileReader();
                    return (
                      (o.onloadend = function () {
                        var t = r
                          ? o.result
                          : o.result.replace(
                              /^data:[^;]*;/,
                              "data:attachment/file;"
                            );
                        e.open(t, "_blank") || (e.location.href = t),
                          (t = void 0),
                          (g.readyState = g.DONE),
                          f();
                      }),
                      o.readAsDataURL(t),
                      void (g.readyState = g.INIT)
                    );
                  }
                  (p || (p = n().createObjectURL(t)), h)
                    ? (e.location.href = p)
                    : e.open(p, "_blank") || (e.location.href = p);
                  (g.readyState = g.DONE), f(), l(p);
                })();
              },
              u = d.prototype;
            return "undefined" != typeof navigator && navigator.msSaveOrOpenBlob
              ? function (e, t, n) {
                  return (
                    (t = t || e.name || "download"),
                    n || (e = c(e)),
                    navigator.msSaveOrOpenBlob(e, t)
                  );
                }
              : ((u.abort = function () {}),
                (u.readyState = u.INIT = 0),
                (u.WRITING = 1),
                (u.DONE = 2),
                (u.error =
                  u.onwritestart =
                  u.onprogress =
                  u.onwrite =
                  u.onabort =
                  u.onerror =
                  u.onwriteend =
                    null),
                function (e, t, n) {
                  return new d(e, t || e.name || "download", n);
                });
          }
        })(
          ("undefined" != typeof self && self) ||
            ("undefined" != typeof window && window) ||
            this
        );
    e.exports
      ? (e.exports.saveAs = i)
      : null !== n(1377) &&
        null !== n(414) &&
        (void 0 ===
          (o = function () {
            return i;
          }.call(t, n, t, e)) ||
          (e.exports = o));
  }