/**
 * Webpack Module #1037
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(8), n(134), n(4), n(13), n(26);
    var i = n(1),
      a = n(10),
      r = o(n(536));
    class s {
      static async setLanguage(e) {
        try {
          const t = i.GLocale.getTranslations(),
            n = i.GTranslation.Projects.Cloud,
            o = i.GTranslation.Projects.Designer,
            r = t.find((t) => t.keyValue === e);
          if (!r) return;
          const s = await this._fetchTranslation(o, r),
            l = await this._fetchTranslation(n, r);
          i.GLocale.replaceValues(o, e, s.translations),
            i.GLocale.replaceValues(n, e, l.translations),
            i.GLocale.setLanguage(e),
            a.GLocaleFactory.setLanguage(e),
            a.gApi.setLanguage(e);
        } catch (e) {}
      }
      static async _shouldFetchTranslation(e, t) {
        if (t.keyValue === i.GLocale.getLanguage())
          try {
            const n = await fetch(await this._getCDNURL(e, t), {
              method: "HEAD",
            }).then((e) => {
              if (e.ok) return e.headers.get("etag");
            });
            if (this._isEtagsEqual(n, t.etag)) return !1;
          } catch (e) {}
        return !0;
      }
      static _isEtagsEqual(e, t) {
        return (
          e.startsWith("W/") && (e = e.substring(3, e.length - 1)), e === t
        );
      }
      static async _fetchTranslation(e, t) {
        if (!(await this._shouldFetchTranslation(e, t))) return;
        return await fetch(await this._getCDNURL(e, t)).then((e) => e.json());
      }
      static async _getCDNURL(e, t) {
        const n = t.abbreviation,
          o = e.toLowerCase(),
          i = "".concat(n, "/").concat(o);
        let s = this.translationsCacheMap.get(i);
        return (
          s ||
            (s = this.translationsCacheMap
              .set(
                i,
                new r.default(() =>
                  a.gApi
                    .fetchTranslationsURL(n, o)
                    .then((e) => e.url)
                    .catch(() => null)
                )
              )
              .get(i)),
          await s.get()
        );
      }
    }
    (s.translationsCacheMap = new Map()), (e.exports = s);
  }