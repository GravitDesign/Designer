/**
 * Webpack Module #1520
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a;
    (i = [n(171), n(605)]),
      void 0 ===
        (a =
          "function" ==
          typeof (o = function (e) {
            return e.extend(e.expr[":"], {
              data: e.expr.createPseudo
                ? e.expr.createPseudo(function (t) {
                    return function (n) {
                      return !!e.data(n, t);
                    };
                  })
                : function (t, n, o) {
                    return !!e.data(t, o[3]);
                  },
            });
          })
            ? o.apply(t, i)
            : o) || (e.exports = a);
  }