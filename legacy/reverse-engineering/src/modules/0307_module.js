/**
 * Webpack Module #307
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(37);
    e.exports = function () {
      var e = o(this),
        t = "";
      return (
        e.hasIndices && (t += "d"),
        e.global && (t += "g"),
        e.ignoreCase && (t += "i"),
        e.multiline && (t += "m"),
        e.dotAll && (t += "s"),
        e.unicode && (t += "u"),
        e.unicodeSets && (t += "v"),
        e.sticky && (t += "y"),
        t
      );
    };
  }