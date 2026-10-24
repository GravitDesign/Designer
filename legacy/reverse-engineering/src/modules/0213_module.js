/**
 * Webpack Module #213
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a = n(23),
      r = n(129),
      s = a.process,
      l = a.Deno,
      c = (s && s.versions) || (l && l.version),
      d = c && c.v8;
    d && (i = (o = d.split("."))[0] > 0 && o[0] < 4 ? 1 : +(o[0] + o[1])),
      !i &&
        r &&
        (!(o = r.match(/Edge\/(\d+)/)) || o[1] >= 74) &&
        (o = r.match(/Chrome\/(\d+)/)) &&
        (i = +o[1]),
      (e.exports = i);
  }