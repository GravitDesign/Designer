/**
 * Webpack Module #152
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r = n(425),
      s = n(49),
      l = n(23),
      c = n(35),
      d = n(46),
      u = n(61),
      p = n(131),
      g = n(185),
      h = n(100),
      f = n(79),
      m = n(120),
      y = n(144),
      v = n(208),
      _ = n(175),
      b = n(43),
      w = n(258),
      C = n(80),
      x = C.enforce,
      S = C.get,
      E = l.Int8Array,
      A = E && E.prototype,
      T = l.Uint8ClampedArray,
      G = T && T.prototype,
      P = E && v(E),
      D = A && v(A),
      L = Object.prototype,
      I = l.TypeError,
      k = b("toStringTag"),
      O = w("TYPED_ARRAY_TAG"),
      F = r && !!_ && "Opera" !== p(l.opera),
      R = !1,
      M = {
        Int8Array: 1,
        Uint8Array: 1,
        Uint8ClampedArray: 1,
        Int16Array: 2,
        Uint16Array: 2,
        Int32Array: 4,
        Uint32Array: 4,
        Float32Array: 4,
        Float64Array: 8,
      },
      N = { BigInt64Array: 8, BigUint64Array: 8 },
      B = function (e) {
        var t = v(e);
        if (d(t)) {
          var n = S(t);
          return n && u(n, "TypedArrayConstructor")
            ? n.TypedArrayConstructor
            : B(t);
        }
      },
      U = function (e) {
        if (!d(e)) return !1;
        var t = p(e);
        return u(M, t) || u(N, t);
      };
    for (o in M)
      (a = (i = l[o]) && i.prototype)
        ? (x(a).TypedArrayConstructor = i)
        : (F = !1);
    for (o in N)
      (a = (i = l[o]) && i.prototype) && (x(a).TypedArrayConstructor = i);
    if (
      (!F || !c(P) || P === Function.prototype) &&
      ((P = function () {
        throw new I("Incorrect invocation");
      }),
      F)
    )
      for (o in M) l[o] && _(l[o], P);
    if ((!F || !D || D === L) && ((D = P.prototype), F))
      for (o in M) l[o] && _(l[o].prototype, D);
    if ((F && v(G) !== D && _(G, D), s && !u(D, k)))
      for (o in ((R = !0),
      m(D, k, {
        configurable: !0,
        get: function () {
          return d(this) ? this[O] : void 0;
        },
      }),
      M))
        l[o] && h(l[o], O, o);
    e.exports = {
      NATIVE_ARRAY_BUFFER_VIEWS: F,
      TYPED_ARRAY_TAG: R && O,
      aTypedArray: function (e) {
        if (U(e)) return e;
        throw new I("Target is not a typed array");
      },
      aTypedArrayConstructor: function (e) {
        if (c(e) && (!_ || y(P, e))) return e;
        throw new I(g(e) + " is not a typed array constructor");
      },
      exportTypedArrayMethod: function (e, t, n, o) {
        if (s) {
          if (n)
            for (var i in M) {
              var a = l[i];
              if (a && u(a.prototype, e))
                try {
                  delete a.prototype[e];
                } catch (n) {
                  try {
                    a.prototype[e] = t;
                  } catch (e) {}
                }
            }
          (D[e] && !n) || f(D, e, n ? t : (F && A[e]) || t, o);
        }
      },
      exportTypedArrayStaticMethod: function (e, t, n) {
        var o, i;
        if (s) {
          if (_) {
            if (n)
              for (o in M)
                if ((i = l[o]) && u(i, e))
                  try {
                    delete i[e];
                  } catch (e) {}
            if (P[e] && !n) return;
            try {
              return f(P, e, n ? t : (F && P[e]) || t);
            } catch (e) {}
          }
          for (o in M) !(i = l[o]) || (i[e] && !n) || f(i, e, t);
        }
      },
      getTypedArrayConstructor: B,
      isView: function (e) {
        if (!d(e)) return !1;
        var t = p(e);
        return "DataView" === t || u(M, t) || u(N, t);
      },
      isTypedArray: U,
      TypedArray: P,
      TypedArrayPrototype: D,
    };
  }