/**
 * Webpack Module #1200
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(290), n(1381), n(19), n(57), n(8), n(20), n(34), n(26);
    var o = n(1);
    function i(e) {
      function t(e) {
        if (Object(e) !== e)
          return Promise.reject(new TypeError(e + " is not an object."));
        var t = e.done;
        return Promise.resolve(e.value).then(function (e) {
          return { value: e, done: t };
        });
      }
      return (
        ((i = function (e) {
          (this.s = e), (this.n = e.next);
        }).prototype = {
          s: null,
          n: null,
          next: function () {
            return t(this.n.apply(this.s, arguments));
          },
          return: function (e) {
            var n = this.s.return;
            return void 0 === n
              ? Promise.resolve({ value: e, done: !0 })
              : t(n.apply(this.s, arguments));
          },
          throw: function (e) {
            var n = this.s.return;
            return void 0 === n
              ? Promise.reject(e)
              : t(n.apply(this.s, arguments));
          },
        }),
        new i(e)
      );
    }
    e.exports = {
      generateFormattedList: function (e) {
        if (!e) return null;
        const t = [];
        var n = e.slice();
        for (let e = 0; e < n.length; e++) {
          var o = n[e],
            i = o.displayname || o.family,
            a = [
              {
                weight: parseInt(o.weight),
                style: o.style,
                family: o.family,
                subfamily: o.subfamily || null,
                displayname: o.displayname || null,
              },
            ],
            r = [o.family];
          t.push({ family: null, displayname: i, fonts: a, families: r });
          for (let t = n.length - 1; t > e; t--)
            i === (n[t].displayname || n[t].family) &&
              (r.indexOf(n[t].family) < 0 && r.push(n[t].family),
              a.push({
                weight: parseInt(n[t].weight),
                style: n[t].style,
                family: n[t].family,
                subfamily: n[t].subfamily || null,
                displayname: n[t].displayname || null,
              }),
              n.splice(t, 1));
          var s = 0,
            l = r[0].length;
          if (l > 0)
            for (let e = 1; e < r.length; e++) {
              if (r[e].toLowerCase().indexOf("regular") >= 0) {
                (l = 0), (s = e);
                break;
              }
              l > r[e].length && ((l = r[e].length), (s = e));
            }
          t[t.length - 1].family = r[s];
        }
        return t;
      },
      parseNativeFonts: async function (e) {
        if (!e || !Array.isArray(e) || !e.length) return [];
        const t = [];
        for (var n = 0; n < e.length; n++) {
          const l = e[n],
            c = await l.blob(),
            d = await c.arrayBuffer();
          if (d) {
            var i = o.GOpenTypeUtil.getFont(null, null, null, d, !0, !0);
            if (i && i.length)
              for (var a = 0; a < i.length; a++) {
                for (
                  var r = i[a], s = 2;
                  t.find(
                    (e) =>
                      e.family === r.family &&
                      e.weight === r.weight &&
                      e.style === r.style
                  );

                )
                  r.subfamily && r.family.indexOf(r.subfamily) < 0
                    ? (r.family = r.family + " " + r.subfamily)
                    : ((r.subfamily = "variant " + s++),
                      (r.family =
                        r.family.replace(
                          /[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]variant[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF][0-9]+$/,
                          ""
                        ) +
                        " " +
                        r.subfamily));
                t.push({
                  weight: r.weight,
                  style: r.style,
                  family: r.family,
                  blob: d,
                  displayname: r.displayname,
                  subfamily: r.subfamily,
                });
              }
          }
        }
        return t;
      },
      getLocalFontsData: async () => {
        const e = [];
        try {
          var t,
            n = !1,
            o = !1;
          try {
            for (
              var a,
                r = (function (e) {
                  var t,
                    n,
                    o,
                    a = 2;
                  for (
                    "undefined" != typeof Symbol &&
                    ((n = Symbol.asyncIterator), (o = Symbol.iterator));
                    a--;

                  ) {
                    if (n && null != (t = e[n])) return t.call(e);
                    if (o && null != (t = e[o])) return new i(t.call(e));
                    (n = "@@asyncIterator"), (o = "@@iterator");
                  }
                  throw new TypeError("Object is not async iterable");
                })(await window.queryLocalFonts());
              (n = !(a = await r.next()).done);
              n = !1
            ) {
              const t = a.value;
              e.push(t);
            }
          } catch (e) {
            (o = !0), (t = e);
          } finally {
            try {
              n && null != r.return && (await r.return());
            } finally {
              if (o) throw t;
            }
          }
        } catch (e) {
          console.error(">>>error getting local fonts data:", e);
        }
        return e;
      },
      getFontFamily: function (e, t) {
        let n = e,
          o = t(n);
        if (
          (o ||
            ((n = n.replace(
              /[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]variant[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF][0-9]+$/,
              ""
            )),
            (o = t(n))),
          !o)
        ) {
          let e = n.split(" ");
          for (
            ;
            e.length > 0 && (e.pop(), (n = e.join(" ")), (o = t(n)), !o);

          );
        }
        return o;
      },
    };
  }