/**
 * Webpack Module #467
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = function (e, t) {
      var n,
        o,
        i,
        a,
        r,
        s,
        l,
        c,
        d,
        u,
        p,
        g,
        h,
        f,
        m,
        y,
        v,
        _,
        b,
        w,
        C,
        x,
        S,
        E,
        A;
      (n = e.state),
        (o = e.next_in),
        (E = e.input),
        (i = o + (e.avail_in - 5)),
        (a = e.next_out),
        (A = e.output),
        (r = a - (t - e.avail_out)),
        (s = a + (e.avail_out - 257)),
        (l = n.dmax),
        (c = n.wsize),
        (d = n.whave),
        (u = n.wnext),
        (p = n.window),
        (g = n.hold),
        (h = n.bits),
        (f = n.lencode),
        (m = n.distcode),
        (y = (1 << n.lenbits) - 1),
        (v = (1 << n.distbits) - 1);
      e: do {
        h < 15 && ((g += E[o++] << h), (h += 8), (g += E[o++] << h), (h += 8)),
          (_ = f[g & y]);
        t: for (;;) {
          if (((g >>>= b = _ >>> 24), (h -= b), 0 === (b = (_ >>> 16) & 255)))
            A[a++] = 65535 & _;
          else {
            if (!(16 & b)) {
              if (0 == (64 & b)) {
                _ = f[(65535 & _) + (g & ((1 << b) - 1))];
                continue t;
              }
              if (32 & b) {
                n.mode = 12;
                break e;
              }
              (e.msg = "invalid literal/length code"), (n.mode = 30);
              break e;
            }
            (w = 65535 & _),
              (b &= 15) &&
                (h < b && ((g += E[o++] << h), (h += 8)),
                (w += g & ((1 << b) - 1)),
                (g >>>= b),
                (h -= b)),
              h < 15 &&
                ((g += E[o++] << h), (h += 8), (g += E[o++] << h), (h += 8)),
              (_ = m[g & v]);
            n: for (;;) {
              if (
                ((g >>>= b = _ >>> 24),
                (h -= b),
                !(16 & (b = (_ >>> 16) & 255)))
              ) {
                if (0 == (64 & b)) {
                  _ = m[(65535 & _) + (g & ((1 << b) - 1))];
                  continue n;
                }
                (e.msg = "invalid distance code"), (n.mode = 30);
                break e;
              }
              if (
                ((C = 65535 & _),
                h < (b &= 15) &&
                  ((g += E[o++] << h),
                  (h += 8) < b && ((g += E[o++] << h), (h += 8))),
                (C += g & ((1 << b) - 1)) > l)
              ) {
                (e.msg = "invalid distance too far back"), (n.mode = 30);
                break e;
              }
              if (((g >>>= b), (h -= b), C > (b = a - r))) {
                if ((b = C - b) > d && n.sane) {
                  (e.msg = "invalid distance too far back"), (n.mode = 30);
                  break e;
                }
                if (((x = 0), (S = p), 0 === u)) {
                  if (((x += c - b), b < w)) {
                    w -= b;
                    do {
                      A[a++] = p[x++];
                    } while (--b);
                    (x = a - C), (S = A);
                  }
                } else if (u < b) {
                  if (((x += c + u - b), (b -= u) < w)) {
                    w -= b;
                    do {
                      A[a++] = p[x++];
                    } while (--b);
                    if (((x = 0), u < w)) {
                      w -= b = u;
                      do {
                        A[a++] = p[x++];
                      } while (--b);
                      (x = a - C), (S = A);
                    }
                  }
                } else if (((x += u - b), b < w)) {
                  w -= b;
                  do {
                    A[a++] = p[x++];
                  } while (--b);
                  (x = a - C), (S = A);
                }
                for (; w > 2; )
                  (A[a++] = S[x++]),
                    (A[a++] = S[x++]),
                    (A[a++] = S[x++]),
                    (w -= 3);
                w && ((A[a++] = S[x++]), w > 1 && (A[a++] = S[x++]));
              } else {
                x = a - C;
                do {
                  (A[a++] = A[x++]),
                    (A[a++] = A[x++]),
                    (A[a++] = A[x++]),
                    (w -= 3);
                } while (w > 2);
                w && ((A[a++] = A[x++]), w > 1 && (A[a++] = A[x++]));
              }
              break;
            }
          }
          break;
        }
      } while (o < i && a < s);
      (o -= w = h >> 3),
        (g &= (1 << (h -= w << 3)) - 1),
        (e.next_in = o),
        (e.next_out = a),
        (e.avail_in = o < i ? i - o + 5 : 5 - (o - i)),
        (e.avail_out = a < s ? s - a + 257 : 257 - (a - s)),
        (n.hold = g),
        (n.bits = h);
    };
  }