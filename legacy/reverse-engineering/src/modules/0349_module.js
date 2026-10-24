/**
 * Webpack Module #349
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(124),
      i = n(27),
      a = n(240),
      r = n(93),
      s = n(101),
      l = n(573),
      c = i([].push),
      d = function (e) {
        var t = 1 === e,
          n = 2 === e,
          i = 3 === e,
          d = 4 === e,
          u = 6 === e,
          p = 7 === e,
          g = 5 === e || u;
        return function (h, f, m, y) {
          for (
            var v,
              _,
              b = r(h),
              w = a(b),
              C = s(w),
              x = o(f, m),
              S = 0,
              E = y || l,
              A = t ? E(h, C) : n || p ? E(h, 0) : void 0;
            C > S;
            S++
          )
            if ((g || S in w) && ((_ = x((v = w[S]), S, b)), e))
              if (t) A[S] = _;
              else if (_)
                switch (e) {
                  case 3:
                    return !0;
                  case 5:
                    return v;
                  case 6:
                    return S;
                  case 2:
                    c(A, v);
                }
              else
                switch (e) {
                  case 4:
                    return !1;
                  case 7:
                    c(A, v);
                }
          return u ? -1 : i || d ? d : A;
        };
      };
    e.exports = {
      forEach: d(0),
      map: d(1),
      filter: d(2),
      some: d(3),
      every: d(4),
      find: d(5),
      findIndex: d(6),
      filterReject: d(7),
    };
  }