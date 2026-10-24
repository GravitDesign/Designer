/**
 * Webpack Module #1154
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.downloadActiveFile = function () {
        let e =
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : null,
          t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if (!window.gDesigner) return !1;
        const n = window.gDesigner.getActiveDocument();
        if (!n) return !1;
        if (!window.gContainer) return !1;
        const o = window.gContainer.getStorage();
        if (!o) return !1;
        e = e || n.getExtension();
        const i = "".concat(n.getTitle() || "Design", ".").concat(e);
        return (
          o.download(i, (e) => {
            n.store(e, console.log, console.error, t);
          }),
          !0
        );
      }),
      (t.downloadDataURI = function e(t, n, o, i) {
        if (t instanceof Blob) {
          var a = new FileReader();
          (a.onloadend = () => {
            r(a.result);
          }),
            a.readAsArrayBuffer(t);
        } else "string" == typeof t ? e(new Blob([t], i), n, o, i) : r(t);
        function r(e) {
          gContainer.download({ buffer: e, name: n, extension: o, mime: i });
        }
      }),
      n(19),
      n(180),
      n(181),
      n(20),
      n(34),
      n(247),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192);
    var o = n(1),
      i = n(1210),
      a = /["\*\/:<>\?\\\|]/g,
      r = /[\0-\x1F\x80-\x9F]/g,
      s = /^\.+$/,
      l =
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.(?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i,
      c = /[ \.]+$/;
    (o.GUtil.sanitizeFilename = function (e, t) {
      return (
        (t = t || "_"),
        e
          .replace(a, t)
          .replace(r, t)
          .replace(s, t)
          .replace(l, t)
          .replace(c, t)
          .substr(0, 255)
      );
    }),
      (o.GUtil.dataUrlToBlob = function (e) {
        if (
          !/^data:(?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){0,255};ba[s\u017F]e64,/i.exec(
            e
          )
        ) {
          const t = e.split(","),
            n = t[0].split(":")[1],
            o = t[1];
          return new Blob([o], { type: n });
        }
        var t,
          n = e.split(";base64,"),
          o = n[0].split(":")[1];
        try {
          t = window.atob(n[1]);
        } catch (e) {
          t = "";
        }
        for (var i = t.length, a = new Uint8Array(i), r = 0; r < i; ++r)
          a[r] = t.charCodeAt(r);
        return new Blob([a], { type: o });
      }),
      (o.GUtil.readACVFile = function (e) {
        var t = new i(e),
          n = { rgb: [], r: [], g: [], b: [] };
        t.seek(4);
        var o = t.getUint16(),
          a = ["r", "g", "b"],
          r = null,
          s = null,
          l = null,
          c = null,
          d = null;
        for (
          n.rgb.push([0, t.getUint16()]), t.seek(t.tell() + 2), c = 1;
          c < o;
          c++
        )
          (l = t.getUint16()), (s = t.getUint16()), n.rgb.push([s, l]);
        for (c = 0; c < 3; c++)
          for (o = t.getUint16(), r = n[a[c]], d = 0; d < o; d++)
            (l = t.getUint16()), (s = t.getUint16()), r.push([s, l]);
        return n;
      });
  }