/**
 * Webpack Module #353
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(23),
      a = n(29),
      r = n(49),
      s = n(693),
      l = n(152),
      c = n(324),
      d = n(146),
      u = n(174),
      p = n(100),
      g = n(694),
      h = n(117),
      f = n(426),
      m = n(428),
      y = n(695),
      v = n(294),
      _ = n(61),
      b = n(131),
      w = n(46),
      C = n(241),
      x = n(136),
      S = n(144),
      E = n(175),
      A = n(243).f,
      T = n(696),
      G = n(349).forEach,
      P = n(260),
      D = n(120),
      L = n(88),
      I = n(222),
      k = n(698),
      O = n(80),
      F = n(288),
      R = O.get,
      M = O.set,
      N = O.enforce,
      B = L.f,
      U = I.f,
      $ = i.RangeError,
      j = c.ArrayBuffer,
      K = j.prototype,
      V = c.DataView,
      H = l.NATIVE_ARRAY_BUFFER_VIEWS,
      W = l.TYPED_ARRAY_TAG,
      z = l.TypedArray,
      q = l.TypedArrayPrototype,
      Y = l.isTypedArray,
      X = function (e, t) {
        D(e, t, {
          configurable: !0,
          get: function () {
            return R(this)[t];
          },
        });
      },
      Q = function (e) {
        var t;
        return (
          S(K, e) || "ArrayBuffer" === (t = b(e)) || "SharedArrayBuffer" === t
        );
      },
      J = function (e, t) {
        return Y(e) && !C(t) && t in e && g(+t) && t >= 0;
      },
      Z = function (e, t) {
        return (t = v(t)), J(e, t) ? u(2, e[t]) : U(e, t);
      },
      ee = function (e, t, n) {
        return (
          (t = v(t)),
          !(J(e, t) && w(n) && _(n, "value")) ||
          _(n, "get") ||
          _(n, "set") ||
          n.configurable ||
          (_(n, "writable") && !n.writable) ||
          (_(n, "enumerable") && !n.enumerable)
            ? B(e, t, n)
            : ((e[t] = n.value), e)
        );
      };
    r
      ? (H ||
          ((I.f = Z),
          (L.f = ee),
          X(q, "buffer"),
          X(q, "byteOffset"),
          X(q, "byteLength"),
          X(q, "length")),
        o(
          { target: "Object", stat: !0, forced: !H },
          { getOwnPropertyDescriptor: Z, defineProperty: ee }
        ),
        (e.exports = function (e, t, n) {
          var r = e.match(/\d+/)[0] / 8,
            l = e + (n ? "Clamped" : "") + "Array",
            c = "get" + e,
            u = "set" + e,
            g = i[l],
            v = g,
            _ = v && v.prototype,
            b = {},
            C = function (e, t) {
              B(e, t, {
                get: function () {
                  return (function (e, t) {
                    var n = R(e);
                    return n.view[c](t * r + n.byteOffset, !0);
                  })(this, t);
                },
                set: function (e) {
                  return (function (e, t, o) {
                    var i = R(e);
                    i.view[u](t * r + i.byteOffset, n ? y(o) : o, !0);
                  })(this, t, e);
                },
                enumerable: !0,
              });
            };
          H
            ? s &&
              ((v = t(function (e, t, n, o) {
                return (
                  d(e, _),
                  F(
                    w(t)
                      ? Q(t)
                        ? void 0 !== o
                          ? new g(t, m(n, r), o)
                          : void 0 !== n
                          ? new g(t, m(n, r))
                          : new g(t)
                        : Y(t)
                        ? k(v, t)
                        : a(T, v, t)
                      : new g(f(t)),
                    e,
                    v
                  )
                );
              })),
              E && E(v, z),
              G(A(g), function (e) {
                e in v || p(v, e, g[e]);
              }),
              (v.prototype = _))
            : ((v = t(function (e, t, n, o) {
                d(e, _);
                var i,
                  s,
                  l,
                  c = 0,
                  u = 0;
                if (w(t)) {
                  if (!Q(t)) return Y(t) ? k(v, t) : a(T, v, t);
                  (i = t), (u = m(n, r));
                  var p = t.byteLength;
                  if (void 0 === o) {
                    if (p % r) throw new $("Wrong length");
                    if ((s = p - u) < 0) throw new $("Wrong length");
                  } else if ((s = h(o) * r) + u > p)
                    throw new $("Wrong length");
                  l = s / r;
                } else (l = f(t)), (i = new j((s = l * r)));
                for (
                  M(e, {
                    buffer: i,
                    byteOffset: u,
                    byteLength: s,
                    length: l,
                    view: new V(i),
                  });
                  c < l;

                )
                  C(e, c++);
              })),
              E && E(v, z),
              (_ = v.prototype = x(q))),
            _.constructor !== v && p(_, "constructor", v),
            (N(_).TypedArrayConstructor = v),
            W && p(_, W, l);
          var S = v !== g;
          (b[l] = v),
            o({ global: !0, constructor: !0, forced: S, sham: !H }, b),
            "BYTES_PER_ELEMENT" in v || p(v, "BYTES_PER_ELEMENT", r),
            "BYTES_PER_ELEMENT" in _ || p(_, "BYTES_PER_ELEMENT", r),
            P(l);
        }))
      : (e.exports = function () {});
  }