/**
 * Webpack Module #1199
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(328), n(57), n(8), n(20), n(34), n(134), n(4), n(41), n(13), n(38);
    var o = n(1),
      i = n(381);
    const {
      parseNativeFonts: a,
      getLocalFontsData: r,
      getFontFamily: s,
    } = n(1200);
    function l(e) {
      i.call(this, e);
    }
    o.GObject.inherit(l, i);
    var c = o.GUtil.uuid();
    (l.VERSION = 1),
      (l.prototype._totalFonts = 0),
      (l.prototype._fontList = []),
      (l.prototype._cachedParsedFonts = {}),
      (l.prototype.addPreviews = function (e) {
        if (e.length)
          for (var t = 0; t < e.length; t++)
            e[t].cachedPreview ||
              (e[t].addPreviewCallback = function (e) {
                var t = document.createElement("div");
                (t.innerHTML = this.displayname || this.family),
                  (t.style.fontFamily = this.family),
                  (t.style.fontStyle =
                    this.style === o.GFont.Style.Italic ? "italic" : "normal"),
                  (t.style.fontWeight = this.weight),
                  (t.style.fontSize = "13px"),
                  (t.style.height = "20px"),
                  (t.style.textOverflow = "ellipsis"),
                  (t.style.whiteSpace = "nowrap"),
                  (t.style.overflow = "hidden"),
                  (t.style.display = "flex"),
                  (t.style.alignItems = "center"),
                  e(t);
              });
      }),
      (l.prototype.load = function (e, t, n, o) {
        return this._createLocalFontList(e, t, n, o);
      }),
      (l.prototype.getTotalFonts = function (e) {
        return e
          ? this._fontList.filter(this._searchFilter(e)).length
          : this._totalFonts;
      }),
      (l.prototype.resetProvider = function () {
        this._fontList = [];
      }),
      (l.prototype.resolveFont = function (e, t, n, i) {
        (n = parseInt(n) || 400), (t = t || o.GFont.Style.Normal);
        const a = "".concat(e, "_").concat(t, "_").concat(n);
        return this._cachedParsedFonts[a]
          ? i.done(
              this._cachedParsedFonts[
                "".concat(e, "_").concat(t, "_").concat(n)
              ].blob
            )
          : this._fontList.length
          ? this._processResolveFont(e, t, n, i)
          : this._createLocalFontList("%", 0, 9999, {
              done: () => {
                this._processResolveFont(e, t, n, i);
              },
              fail: i.fail,
            });
      }),
      (l.prototype._processResolveFont = async function (e, t, n, o) {
        const i = s(e, this._findInFontsList.bind(this));
        if (!i) return o.fail();
        const r = i.isLocalFont ? await a(i.fonts) : i.fonts;
        if (!r || !Array.isArray(r) || !r.length) return o.fail();
        const l = r.find(function (o) {
          return (
            (o.style === t && o.weight === n && o.family === e) ||
            (o.style === t &&
              o.weight === n &&
              o.family.replace(" " + o.subfamily, "") === e)
          );
        });
        if (l) {
          const i = "".concat(e, "_").concat(t, "_").concat(n);
          return (
            (this._cachedParsedFonts[i] = l),
            void setTimeout(() => {
              o.done(l.blob);
            }, 10)
          );
        }
        o.fail();
      }),
      (l.prototype._createLocalFontList = function (e, t, n, o) {
        if (this._fontList && this._fontList.length > 0)
          return o.done(
            this._getFilteredFontsList.call(this, e, t, n),
            !0,
            null
          );
        this._createLocalFontListPromise
          ? this._createLocalFontListCallbacks.push(o)
          : ((this._createLocalFontListCallbacks = [o]),
            (this._createLocalFontListPromise = new Promise(async (e) => {
              let t = await r(),
                n = [];
              for (var o = 0; o < t.length; o++) {
                const e = t[o],
                  i = n.findIndex((t) => {
                    let { family: n } = t;
                    return n === e.family;
                  });
                -1 === i
                  ? n.push({ family: e.family, fonts: [e], isLocalFont: !0 })
                  : n[i].fonts.push(e);
              }
              (this._fontList = n.sort((e, t) => {
                let { family: n } = e,
                  { family: o } = t;
                return n - o;
              })),
                e();
            })),
            this._createLocalFontListPromise.then(() => {
              this._createLocalFontListCallbacks.map((o) => {
                let { done: i } = o;
                i(this._getFilteredFontsList.call(this, e, t, n), !0, null),
                  (this._createLocalFontListPromise = null),
                  (this._createLocalFontListCallbacks = null);
              }),
                (this._createLocalFontListCallbacks = []);
            }));
      }),
      (l.prototype._getFilteredFontsList = function (e) {
        let t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0,
          n =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : 9999;
        return this._fontList
          .filter((t) =>
            e.indexOf("%") >= 0
              ? t.family.toLowerCase().startsWith(e.replace(/%/g, ""))
              : t.family.toLowerCase() === e.toLowerCase()
          )
          .slice(t, t + n);
      }),
      (l.prototype._findInFontsList = function (e) {
        return this._fontList.find(function (t) {
          let { family: n } = t;
          return e === n;
        });
      }),
      (l.prototype.getProviderId = function () {
        return c;
      }),
      (e.exports = l);
  }