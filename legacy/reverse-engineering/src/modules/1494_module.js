/**
 * Webpack Module #1494
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = void 0),
      n(8),
      n(20),
      n(271),
      n(34),
      n(134),
      n(38);
    const { isBeta: o } = n(803);
    var i = n(1495);
    let a = 0,
      r = 0;
    const s = {
      pageStats: (e, t, n, l, c) => {
        if (
          (l ||
            (function (e, t, n) {
              const o = (e) => "string" == typeof e;
              function a(e) {
                return (e || "")
                  .split("/")
                  .map(function (e) {
                    return (function (e) {
                      if (!e) return "";
                      let t = String(e)
                        .replace(
                          /^(?:[\0-\/:-@\[-`\{-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*|(?:[\0-\/:-@\[-`\{-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*$/g,
                          "$"
                        )
                        .replace(
                          /(?:[\0-\/:-@\[-`\{-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+/g,
                          "$"
                        )
                        .replace(/([a-z])([A-Z])/g, function (e, t, n) {
                          return t + "$" + n;
                        })
                        .toLowerCase()
                        .replace(/(\$)([0-9A-Z_a-z]?)/g, function (e, t, n) {
                          return n.toUpperCase();
                        });
                      return e.startsWith("!") && (t = "!" + t), t;
                    })(e);
                  })
                  .join("/");
              }
              if ("undefined" == typeof _GLOBAL_GA_EVENTS) return;
              if (!n && Date.now() - r <= 100) return;
              var l = e.split("_"),
                c = l[0],
                d = l[1],
                u =
                  (l[2] || "") +
                  ("string" == typeof t ||
                  "number" == typeof t ||
                  t instanceof String
                    ? ":" + t
                    : "");
              if ("undefined" != typeof dataLayer) {
                var p = (function (e, t, n) {
                  var r = n ? n.split(":") : "",
                    s = e,
                    l = t,
                    c = r[0] || "",
                    d = r[1] || "";
                  if (!s) return null;
                  var u = "";
                  if (o(i[s])) u = i[s];
                  else if (l && o(i[s][l])) u = i[s][l];
                  else if (l && c && o(i[s][l][c])) u = i[s][l][c];
                  else {
                    if (!(l && c && d && o(i[s][l][c][d]))) return null;
                    u = i[s][l][c][d];
                  }
                  return (
                    (u = (u = (u = (u = u.replace("$EVENTNAME", a(s))).replace(
                      "$CATEGORY",
                      a(l)
                    )).replace("$ACTION", a(c))).replace("$VALUE", a(d))) &&
                      !u.startsWith("/") &&
                      (u = "/" + u),
                    u
                  );
                })(c, d, u);
                p && s.pageTracking(p), (r = Date.now());
              }
            })(e, t),
          n &&
            (("function" == typeof gdb_loaddesign || o) &&
              console.log("updating stats:" + e + " value: " + (t || "null")),
            "undefined" != typeof _GLOBAL_GA_EVENTS &&
              "undefined" != typeof ga))
        ) {
          var d = n;
          if ((!d && n.isAnonymous() && (d = {}), d)) {
            var u = t ? e + "_" + t : e;
            if (
              (d.hasOwnProperty(u) && "number" == typeof d[u]
                ? d[u]++
                : (d[u] = 1),
              c || Date.now() - a > 100)
            ) {
              var p = e.split("_"),
                g =
                  (p[2] || "unknown") +
                  ("string" == typeof t ||
                  "number" == typeof t ||
                  t instanceof String
                    ? ":" + t
                    : "");
              ga(_GLOBAL_GA_EVENTS, "event", p[0], p[1] || "unknown", g),
                (a = Date.now());
            }
          }
        }
      },
      pageTracking: async function (e, t) {
        "undefined" != typeof _GLOBAL_GA_EVENTS &&
          (Date.now() - r <= 100 ||
            (e.startsWith("/") || (e = "/" + e),
            e.endsWith("/") && (e = e.slice(0, e.length - 1)),
            t && (t.startsWith("/") ? (e += t) : (e = e + "/" + t)),
            (e = s.modifyPageStatsForUserLicense(e)),
            (e = await s.modifyPageStatsForAppMode(e)),
            ("function" == typeof gdb_loaddesign || o) &&
              console.log("pagestats: " + e),
            window.ga(_GLOBAL_GA_EVENTS, "pageview", e),
            (r = Date.now())));
      },
      modifyPageStatsForUserLicense: function (e) {
        return e;
      },
      modifyPageStatsForAppMode: function (e) {
        return e;
      },
    };
    t.default = s;
  }