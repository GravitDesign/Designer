/**
 * Webpack Module #618
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r = n(25),
      s = n(74),
      l = n(245),
      c = n(23),
      d = n(29),
      u = n(79),
      p = n(175),
      g = n(137),
      h = n(260),
      f = n(65),
      m = n(35),
      y = n(46),
      v = n(146),
      _ = n(342),
      b = n(409).set,
      w = n(623),
      C = n(626),
      x = n(304),
      S = n(412),
      E = n(80),
      A = n(186),
      T = n(201),
      G = n(202),
      P = T.CONSTRUCTOR,
      D = T.REJECTION_EVENT,
      L = T.SUBCLASSING,
      I = E.getterFor("Promise"),
      k = E.set,
      O = A && A.prototype,
      F = A,
      R = O,
      M = c.TypeError,
      N = c.document,
      B = c.process,
      U = G.f,
      $ = U,
      j = !!(N && N.createEvent && c.dispatchEvent),
      K = function (e) {
        var t;
        return !(!y(e) || !m((t = e.then))) && t;
      },
      V = function (e, t) {
        var n,
          o,
          i,
          a = t.value,
          r = 1 === t.state,
          s = r ? e.ok : e.fail,
          l = e.resolve,
          c = e.reject,
          u = e.domain;
        try {
          s
            ? (r || (2 === t.rejection && Y(t), (t.rejection = 1)),
              !0 === s
                ? (n = a)
                : (u && u.enter(), (n = s(a)), u && (u.exit(), (i = !0))),
              n === e.promise
                ? c(new M("Promise-chain cycle"))
                : (o = K(n))
                ? d(o, n, l, c)
                : l(n))
            : c(a);
        } catch (e) {
          u && !i && u.exit(), c(e);
        }
      },
      H = function (e, t) {
        e.notified ||
          ((e.notified = !0),
          w(function () {
            for (var n, o = e.reactions; (n = o.get()); ) V(n, e);
            (e.notified = !1), t && !e.rejection && z(e);
          }));
      },
      W = function (e, t, n) {
        var o, i;
        j
          ? (((o = N.createEvent("Event")).promise = t),
            (o.reason = n),
            o.initEvent(e, !1, !0),
            c.dispatchEvent(o))
          : (o = { promise: t, reason: n }),
          !D && (i = c["on" + e])
            ? i(o)
            : "unhandledrejection" === e && C("Unhandled promise rejection", n);
      },
      z = function (e) {
        d(b, c, function () {
          var t,
            n = e.facade,
            o = e.value;
          if (
            q(e) &&
            ((t = x(function () {
              l
                ? B.emit("unhandledRejection", o, n)
                : W("unhandledrejection", n, o);
            })),
            (e.rejection = l || q(e) ? 2 : 1),
            t.error)
          )
            throw t.value;
        });
      },
      q = function (e) {
        return 1 !== e.rejection && !e.parent;
      },
      Y = function (e) {
        d(b, c, function () {
          var t = e.facade;
          l ? B.emit("rejectionHandled", t) : W("rejectionhandled", t, e.value);
        });
      },
      X = function (e, t, n) {
        return function (o) {
          e(t, o, n);
        };
      },
      Q = function (e, t, n) {
        e.done ||
          ((e.done = !0), n && (e = n), (e.value = t), (e.state = 2), H(e, !0));
      },
      J = function (e, t, n) {
        if (!e.done) {
          (e.done = !0), n && (e = n);
          try {
            if (e.facade === t) throw new M("Promise can't be resolved itself");
            var o = K(t);
            o
              ? w(function () {
                  var n = { done: !1 };
                  try {
                    d(o, t, X(J, n, e), X(Q, n, e));
                  } catch (t) {
                    Q(n, t, e);
                  }
                })
              : ((e.value = t), (e.state = 1), H(e, !1));
          } catch (t) {
            Q({ done: !1 }, t, e);
          }
        }
      };
    if (
      P &&
      ((R = (F = function (e) {
        v(this, R), f(e), d(o, this);
        var t = I(this);
        try {
          e(X(J, t), X(Q, t));
        } catch (e) {
          Q(t, e);
        }
      }).prototype),
      ((o = function (e) {
        k(this, {
          type: "Promise",
          done: !1,
          notified: !1,
          parent: !1,
          reactions: new S(),
          rejection: !1,
          state: 0,
          value: null,
        });
      }).prototype = u(R, "then", function (e, t) {
        var n = I(this),
          o = U(_(this, F));
        return (
          (n.parent = !0),
          (o.ok = !m(e) || e),
          (o.fail = m(t) && t),
          (o.domain = l ? B.domain : void 0),
          0 === n.state
            ? n.reactions.add(o)
            : w(function () {
                V(o, n);
              }),
          o.promise
        );
      })),
      (i = function () {
        var e = new o(),
          t = I(e);
        (this.promise = e), (this.resolve = X(J, t)), (this.reject = X(Q, t));
      }),
      (G.f = U =
        function (e) {
          return e === F || void 0 === e ? new i(e) : $(e);
        }),
      !s && m(A) && O !== Object.prototype)
    ) {
      (a = O.then),
        L ||
          u(
            O,
            "then",
            function (e, t) {
              var n = this;
              return new F(function (e, t) {
                d(a, n, e, t);
              }).then(e, t);
            },
            { unsafe: !0 }
          );
      try {
        delete O.constructor;
      } catch (e) {}
      p && p(O, R);
    }
    r({ global: !0, constructor: !0, wrap: !0, forced: P }, { Promise: F }),
      g(F, "Promise", !1, !0),
      h("Promise");
  }