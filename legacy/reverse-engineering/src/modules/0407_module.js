/**
 * Webpack Module #407
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(129),
      a = n(116),
      r = function (e) {
        return i.slice(0, e.length) === e;
      };
    e.exports = r("Bun/")
      ? "BUN"
      : r("Cloudflare-Workers")
      ? "CLOUDFLARE"
      : r("Deno/")
      ? "DENO"
      : r("Node.js/")
      ? "NODE"
      : o.Bun && "string" == typeof Bun.version
      ? "BUN"
      : o.Deno && "object" == typeof Deno.version
      ? "DENO"
      : "process" === a(o.process)
      ? "NODE"
      : o.window && o.document
      ? "BROWSER"
      : "REST";
  }