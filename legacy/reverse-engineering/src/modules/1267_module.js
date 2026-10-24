/**
 * Webpack Module #1267
 * Type: unknown
 */

function (e, t) {
    e.exports = (function () {
      var e = function () {},
        t = function (e) {
          (this.canvas = document.createElement("canvas")),
            (this.context = this.canvas.getContext("2d")),
            document.body.appendChild(this.canvas),
            (this.width = this.canvas.width = e.width),
            (this.height = this.canvas.height = e.height),
            this.context.drawImage(e, 0, 0, this.width, this.height);
        };
      (t.prototype.clear = function () {
        this.context.clearRect(0, 0, this.width, this.height);
      }),
        (t.prototype.update = function (e) {
          this.context.putImageData(e, 0, 0);
        }),
        (t.prototype.getPixelCount = function () {
          return this.width * this.height;
        }),
        (t.prototype.getImageData = function () {
          return this.context.getImageData(0, 0, this.width, this.height);
        }),
        (t.prototype.removeCanvas = function () {
          this.canvas.parentNode.removeChild(this.canvas);
        });
      var n = {
          map: function (e, t) {
            var n = {};
            return t
              ? e.map(function (e, o) {
                  return (n.index = o), t.call(n, e);
                })
              : e.slice();
          },
          naturalOrder: function (e, t) {
            return e < t ? -1 : e > t ? 1 : 0;
          },
          sum: function (e, t) {
            var n = {};
            return e.reduce(
              t
                ? function (e, o, i) {
                    return (n.index = i), e + t.call(n, o);
                  }
                : function (e, t) {
                    return e + t;
                  },
              0
            );
          },
          max: function (e, t) {
            return Math.max.apply(null, t ? n.map(e, t) : e);
          },
        },
        o = (function () {
          function e(e, t, n) {
            return (e << (2 * l)) + (t << l) + n;
          }
          function t(e) {
            function t() {
              n.sort(e), (o = !0);
            }
            var n = [],
              o = !1;
            return {
              push: function (e) {
                n.push(e), (o = !1);
              },
              peek: function (e) {
                return o || t(), void 0 === e && (e = n.length - 1), n[e];
              },
              pop: function () {
                return o || t(), n.pop();
              },
              size: function () {
                return n.length;
              },
              map: function (e) {
                return n.map(e);
              },
              debug: function () {
                return o || t(), n;
              },
            };
          }
          function o(e, t, n, o, i, a, r) {
            var s = this;
            (s.r1 = e),
              (s.r2 = t),
              (s.g1 = n),
              (s.g2 = o),
              (s.b1 = i),
              (s.b2 = a),
              (s.histo = r);
          }
          function i() {
            this.vboxes = new t(function (e, t) {
              return n.naturalOrder(
                e.vbox.count() * e.vbox.volume(),
                t.vbox.count() * t.vbox.volume()
              );
            });
          }
          function a(t) {
            var n,
              o,
              i,
              a,
              r = new Array(1 << (3 * l));
            return (
              t.forEach(function (t) {
                (o = t[0] >> c),
                  (i = t[1] >> c),
                  (a = t[2] >> c),
                  (n = e(o, i, a)),
                  (r[n] = (r[n] || 0) + 1);
              }),
              r
            );
          }
          function r(e, t) {
            var n,
              i,
              a,
              r = 1e6,
              s = 0,
              l = 1e6,
              d = 0,
              u = 1e6,
              p = 0;
            return (
              e.forEach(function (e) {
                (n = e[0] >> c),
                  (i = e[1] >> c),
                  (a = e[2] >> c),
                  n < r ? (r = n) : n > s && (s = n),
                  i < l ? (l = i) : i > d && (d = i),
                  a < u ? (u = a) : a > p && (p = a);
              }),
              new o(r, s, l, d, u, p, t)
            );
          }
          function s(t, o) {
            if (o.count()) {
              var i = o.r2 - o.r1 + 1,
                a = o.g2 - o.g1 + 1,
                r = o.b2 - o.b1 + 1,
                s = n.max([i, a, r]);
              if (1 == o.count()) return [o.copy()];
              var l,
                c,
                d,
                u,
                p = 0,
                g = [],
                h = [];
              if (s == i)
                for (l = o.r1; l <= o.r2; l++) {
                  for (u = 0, c = o.g1; c <= o.g2; c++)
                    for (d = o.b1; d <= o.b2; d++) u += t[e(l, c, d)] || 0;
                  (p += u), (g[l] = p);
                }
              else if (s == a)
                for (l = o.g1; l <= o.g2; l++) {
                  for (u = 0, c = o.r1; c <= o.r2; c++)
                    for (d = o.b1; d <= o.b2; d++) u += t[e(c, l, d)] || 0;
                  (p += u), (g[l] = p);
                }
              else
                for (l = o.b1; l <= o.b2; l++) {
                  for (u = 0, c = o.r1; c <= o.r2; c++)
                    for (d = o.g1; d <= o.g2; d++) u += t[e(c, d, l)] || 0;
                  (p += u), (g[l] = p);
                }
              return (
                g.forEach(function (e, t) {
                  h[t] = p - e;
                }),
                (function (e) {
                  var t,
                    n,
                    i,
                    a,
                    r,
                    s = e + "1",
                    c = e + "2",
                    d = 0;
                  for (l = o[s]; l <= o[c]; l++)
                    if (g[l] > p / 2) {
                      for (
                        i = o.copy(),
                          a = o.copy(),
                          r =
                            (t = l - o[s]) <= (n = o[c] - l)
                              ? Math.min(o[c] - 1, ~~(l + n / 2))
                              : Math.max(o[s], ~~(l - 1 - t / 2));
                        !g[r];

                      )
                        r++;
                      for (d = h[r]; !d && g[r - 1]; ) d = h[--r];
                      return (i[c] = r), (a[s] = i[c] + 1), [i, a];
                    }
                })(s == i ? "r" : s == a ? "g" : "b")
              );
            }
          }
          var l = 5,
            c = 8 - l,
            d = 1e3,
            u = 0.75;
          return (
            (o.prototype = {
              volume: function (e) {
                var t = this;
                return (
                  (t._volume && !e) ||
                    (t._volume =
                      (t.r2 - t.r1 + 1) *
                      (t.g2 - t.g1 + 1) *
                      (t.b2 - t.b1 + 1)),
                  t._volume
                );
              },
              count: function (t) {
                var n = this,
                  o = n.histo;
                if (!n._count_set || t) {
                  var i,
                    a,
                    r,
                    s = 0;
                  for (i = n.r1; i <= n.r2; i++)
                    for (a = n.g1; a <= n.g2; a++)
                      for (r = n.b1; r <= n.b2; r++) s += o[e(i, a, r)] || 0;
                  (n._count = s), (n._count_set = !0);
                }
                return n._count;
              },
              copy: function () {
                var e = this;
                return new o(e.r1, e.r2, e.g1, e.g2, e.b1, e.b2, e.histo);
              },
              avg: function (t) {
                var n = this,
                  o = n.histo;
                if (!n._avg || t) {
                  var i,
                    a,
                    r,
                    s,
                    c = 0,
                    d = 1 << (8 - l),
                    u = 0,
                    p = 0,
                    g = 0;
                  for (a = n.r1; a <= n.r2; a++)
                    for (r = n.g1; r <= n.g2; r++)
                      for (s = n.b1; s <= n.b2; s++)
                        (c += i = o[e(a, r, s)] || 0),
                          (u += i * (a + 0.5) * d),
                          (p += i * (r + 0.5) * d),
                          (g += i * (s + 0.5) * d);
                  n._avg = c
                    ? [~~(u / c), ~~(p / c), ~~(g / c)]
                    : [
                        ~~((d * (n.r1 + n.r2 + 1)) / 2),
                        ~~((d * (n.g1 + n.g2 + 1)) / 2),
                        ~~((d * (n.b1 + n.b2 + 1)) / 2),
                      ];
                }
                return n._avg;
              },
              contains: function (e) {
                var t = this,
                  n = e[0] >> c,
                  o = e[1] >> c,
                  i = e[2] >> c;
                return (
                  n >= t.r1 &&
                  n <= t.r2 &&
                  o >= t.g1 &&
                  o <= t.g2 &&
                  i >= t.b1 &&
                  i <= t.b2
                );
              },
            }),
            (i.prototype = {
              push: function (e) {
                this.vboxes.push({ vbox: e, color: e.avg() });
              },
              palette: function () {
                return this.vboxes.map(function (e) {
                  return e.color;
                });
              },
              size: function () {
                return this.vboxes.size();
              },
              map: function (e) {
                for (var t = this.vboxes, n = 0; n < t.size(); n++)
                  if (t.peek(n).vbox.contains(e)) return t.peek(n).color;
                return this.nearest(e);
              },
              nearest: function (e) {
                for (var t, n, o, i = this.vboxes, a = 0; a < i.size(); a++)
                  ((n = Math.sqrt(
                    Math.pow(e[0] - i.peek(a).color[0], 2) +
                      Math.pow(e[1] - i.peek(a).color[1], 2) +
                      Math.pow(e[2] - i.peek(a).color[2], 2)
                  )) < t ||
                    void 0 === t) &&
                    ((t = n), (o = i.peek(a).color));
                return o;
              },
              forcebw: function () {
                var e = this.vboxes;
                e.sort(function (e, t) {
                  return n.naturalOrder(n.sum(e.color), n.sum(t.color));
                });
                var t = e[0].color;
                t[0] < 5 && t[1] < 5 && t[2] < 5 && (e[0].color = [0, 0, 0]);
                var o = e.length - 1,
                  i = e[o].color;
                i[0] > 251 &&
                  i[1] > 251 &&
                  i[2] > 251 &&
                  (e[o].color = [255, 255, 255]);
              },
            }),
            {
              quantize: function (e, o) {
                function l(e, t) {
                  for (var n, o = 1, i = 0; i < d; )
                    if ((n = e.pop()).count()) {
                      var a = s(c, n),
                        r = a[0],
                        l = a[1];
                      if (!r) return;
                      if ((e.push(r), l && (e.push(l), o++), o >= t)) return;
                      if (i++ > d) return;
                    } else e.push(n), i++;
                }
                if (!e.length || o < 2 || o > 256) return !1;
                var c = a(e);
                c.forEach(function () {
                  0;
                });
                var p = r(e, c),
                  g = new t(function (e, t) {
                    return n.naturalOrder(e.count(), t.count());
                  });
                g.push(p), l(g, u * o);
                for (
                  var h = new t(function (e, t) {
                    return n.naturalOrder(
                      e.count() * e.volume(),
                      t.count() * t.volume()
                    );
                  });
                  g.size();

                )
                  h.push(g.pop());
                l(h, o - h.size());
                for (var f = new i(); h.size(); ) f.push(h.pop());
                return f;
              },
            }
          );
        })();
      return (
        (e.prototype.getColor = function (e, t) {
          return this.getPalette(e, 5, t)[0];
        }),
        (e.prototype.getPalette = function (e, n, i) {
          (void 0 === n || n < 2 || n > 256) && (n = 10),
            (void 0 === i || i < 1) && (i = 10);
          for (
            var a,
              r,
              s,
              l,
              c = new t(e),
              d = c.getImageData().data,
              u = c.getPixelCount(),
              p = [],
              g = 0;
            g < u;
            g += i
          )
            (r = d[(a = 4 * g) + 0]),
              (s = d[a + 1]),
              (l = d[a + 2]),
              d[a + 3] >= 125 &&
                ((r > 250 && s > 250 && l > 250) || p.push([r, s, l]));
          var h = o.quantize(p, n),
            f = h ? h.palette() : null;
          return c.removeCanvas(), f;
        }),
        (e.prototype.getColorFromUrl = function (e, t, n) {
          sourceImage = document.createElement("img");
          var o = this;
          sourceImage.addEventListener("load", function () {
            t(o.getPalette(sourceImage, 5, n)[0], e);
          }),
            (sourceImage.src = e);
        }),
        (e.prototype.getImageData = function (e, t) {
          (xhr = new XMLHttpRequest()),
            xhr.open("GET", e, !0),
            (xhr.responseType = "arraybuffer"),
            (xhr.onload = function (e) {
              if (200 == this.status) {
                (uInt8Array = new Uint8Array(this.response)),
                  (n = uInt8Array.length),
                  (binaryString = new Array(n));
                for (var n = 0; n < uInt8Array.length; n++)
                  binaryString[n] = String.fromCharCode(uInt8Array[n]);
                (data = binaryString.join("")),
                  (base64 = window.btoa(data)),
                  t("data:image/png;base64," + base64);
              }
            }),
            xhr.send();
        }),
        (e.prototype.getColorAsync = function (e, t, n) {
          var o = this;
          this.getImageData(e, function (e) {
            (sourceImage = document.createElement("img")),
              sourceImage.addEventListener("load", function () {
                t(o.getPalette(sourceImage, 5, n)[0], this);
              }),
              (sourceImage.src = e);
          });
        }),
        e
      );
    })();
  }