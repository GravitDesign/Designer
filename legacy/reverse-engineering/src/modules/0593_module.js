/**
 * Webpack Module #593
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e) {
      return pako.gzip(e, { level: 9 }).buffer;
    }
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.gzip = o),
      (t.hasRootFolderInSelections = function (e, t) {
        if (!e || !(t || []).length) return !1;
        t instanceof Array || (t = [t]);
        return t.some((t) => e.isRootFolder(t));
      }),
      (t.readResponseWithProgress = async function (e, t, n) {
        const i = e.body.getReader(),
          a = parseInt(e.headers.get("Content-Length")) || 0;
        let r = 0;
        return new Promise((e) => {
          const s = new ReadableStream({
            start: (l) =>
              (function c() {
                return i.read().then((d) => {
                  let { done: u, value: p } = d;
                  if (u) return l.close(), i.releaseLock(), void e(s);
                  if ("function" == typeof t) {
                    r += (function (e) {
                      if (n) return new Uint8Array(o(e)).length;
                      return e.length;
                    })(p);
                    const e = Math.floor((r / a) * 100);
                    t(e);
                  }
                  return l.enqueue(p), c();
                });
              })(),
          });
        }).then((e) => new Response(e));
      }),
      n(19),
      n(180),
      n(181),
      n(57),
      n(8),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(97);
  }