/**
 * Webpack Module #590
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(20), n(34), n(134), n(4), n(41), n(13), n(32), n(33);
    var o = n(1),
      i = n(1075),
      a = n(381);
    function r(e) {
      a.call(this, e);
    }
    o.GObject.inherit(r, a);
    var s = o.GUtil.uuid(),
      l = {},
      c = null,
      d = [
        {
          family: "Open Sans",
          fonts: [
            {
              weight: o.GFont.Weight.Light,
              style: o.GFont.Style.Normal,
              url: "assets/font/OpenSans-Light.ttf",
            },
            {
              weight: o.GFont.Weight.Light,
              style: o.GFont.Style.Italic,
              url: "assets/font/OpenSans-LightItalic.ttf",
            },
            {
              weight: o.GFont.Weight.Regular,
              style: o.GFont.Style.Normal,
              url: "assets/font/OpenSans-Regular.ttf",
            },
            {
              weight: o.GFont.Weight.Regular,
              style: o.GFont.Style.Italic,
              url: "assets/font/OpenSans-Italic.ttf",
            },
            {
              weight: o.GFont.Weight.SemiBold,
              style: o.GFont.Style.Normal,
              url: "assets/font/OpenSans-SemiBold.ttf",
            },
            {
              weight: o.GFont.Weight.SemiBold,
              style: o.GFont.Style.Italic,
              url: "assets/font/OpenSans-SemiBoldItalic.ttf",
            },
            {
              weight: o.GFont.Weight.Bold,
              style: o.GFont.Style.Normal,
              url: "assets/font/OpenSans-Bold.ttf",
            },
            {
              weight: o.GFont.Weight.Bold,
              style: o.GFont.Style.Italic,
              url: "assets/font/OpenSans-BoldItalic.ttf",
            },
            {
              weight: o.GFont.Weight.ExtraBold,
              style: o.GFont.Style.Normal,
              url: "assets/font/OpenSans-ExtraBold.ttf",
            },
            {
              weight: o.GFont.Weight.ExtraBold,
              style: o.GFont.Style.Italic,
              url: "assets/font/OpenSans-ExtraBoldItalic.ttf",
            },
          ],
          preview: "assets/font/OpenSans.svg",
          scripts: ["LATIN"],
        },
      ];
    d.push({
      family: "Noto Sans CJK SC",
      fonts: [
        {
          weight: o.GFont.Weight.Regular,
          style: o.GFont.Style.Normal,
          url: "assets/font/chinese-simplified/NotoSansCJKsc-Regular.otf",
        },
        {
          weight: o.GFont.Weight.Bold,
          style: o.GFont.Style.Normal,
          url: "assets/font/chinese-simplified/NotoSansCJKsc-Bold.otf",
        },
      ],
      preview: "assets/font/chinese-simplified/NotoSans.svg",
      scripts: ["HAN"],
    }),
      d.push({
        family: "Noto Sans CJK TC",
        fonts: [
          {
            weight: o.GFont.Weight.Regular,
            style: o.GFont.Style.Normal,
            url: "assets/font/chinese-traditional/NotoSansCJKtc-Regular.otf",
          },
          {
            weight: o.GFont.Weight.Bold,
            style: o.GFont.Style.Normal,
            url: "assets/font/chinese-traditional/NotoSansCJKtc-Bold.otf",
          },
        ],
        preview: "assets/font/chinese-traditional/NotoSans.svg",
        scripts: ["HAN"],
      }),
      (d = d.concat(i)),
      o.GObject.inherit(r, a),
      (r.prototype.getDefaultFamilyForString = function (e) {
        var t = o.GOpenTypeFont.getScriptForString(e);
        if ("CYRILLIC" === t || "GREEK" === t) return "Noto Sans";
        var n = d.find((e) => e.scripts && e.scripts.indexOf(t) >= 0);
        return (n && n.family) || null;
      }),
      (r.prototype.addPreviews = function (e) {
        for (var t = new DOMParser(), n = 0; n < e.length; n++)
          e[n].cachedPreview ||
            (e[n].addPreviewCallback = function (e) {
              var n = new XMLHttpRequest();
              n.open("GET", this.preview),
                (n.onload = function () {
                  var n;
                  if (this.status >= 200 && this.status < 300)
                    try {
                      (n = t.parseFromString(
                        this.response,
                        "image/svg+xml"
                      ).firstChild) &&
                        n.getAttribute("xmlns") &&
                        (n.setAttribute("height", "20px"), e(n));
                    } catch (e) {
                      "undefined" != typeof gdb_loaddesign &&
                        console.warn("Couldn't parse default preview");
                    }
                }),
                n.send();
            });
      }),
      (r.prototype.init = function () {
        c || (c = d);
      }),
      (r.prototype.load = function (e, t, n, o) {
        this.init(),
          o.done(
            c
              .filter(function (t) {
                return e.indexOf("%") >= 0
                  ? t.family.toLowerCase().startsWith(e.replace(/%/g, ""))
                  : t.family.toLowerCase() == e.toLowerCase();
              })
              .slice(t, t + n),
            !0,
            null
          );
      }),
      (r.prototype.getTotalFonts = function (e) {
        return (
          this.init(), e ? c.filter(this._searchFilter(e)).length : c.length
        );
      }),
      (r.prototype.hasFont = function (e) {
        var t = !1;
        if (d)
          for (var n = 0; n < d.length; ++n)
            if (d[n].family === e) {
              t = !0;
              break;
            }
        return t;
      }),
      (r.prototype.resolveFont = function (e, t, n, i) {
        this.init();
        for (var r = 0; r < c.length; r++) {
          var s = c[r];
          if (s.family === e)
            for (var d = s.fonts, u = 0; u < d.length; u++) {
              var p = d[u];
              if (
                p.weight === (n || 400) &&
                p.style === (t || o.GFont.Style.Normal)
              ) {
                if (l[p.url]) l[p.url].push(i);
                else {
                  var g = new XMLHttpRequest();
                  (g.responseType = "arraybuffer"),
                    g.open("GET", p.url),
                    (l[p.url] = []),
                    l[p.url].push(i),
                    (g.onload = function () {
                      if (this.status >= 200 && this.status < 300) {
                        var e = l[p.url];
                        delete l[p.url],
                          e.forEach((e) => {
                            e.done(this.response);
                          });
                      }
                    }),
                    (g.onerror = () => {
                      delete l[p.url], i.fail(a.Errors.ConnectionError);
                    }),
                    g.send();
                }
                return;
              }
            }
        }
        i.fail();
      }),
      (r.prototype.getProviderId = function () {
        return s;
      }),
      (e.exports = r);
  }