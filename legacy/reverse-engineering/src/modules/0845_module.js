/**
 * Webpack Module #845
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.updateFileFn =
        t.syncImagesToCloud =
        t.listFilesFn =
        t.fetchRequest =
        t.default =
        t.createFileAndGetSignedPutUrlsFn =
          void 0),
      n(19),
      n(180),
      n(181),
      n(96),
      n(30),
      n(8),
      n(20),
      n(3),
      n(134),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(26),
      n(114);
    var i = o(n(227));
    const a = n(435),
      r = (t.syncImagesToCloud = async function (e, t, n, o, r, s, l, c, d) {
        try {
          var u = new i.default();
          const S = o.length;
          for (var p = 0; p < S; ++p) {
            var g = o[p];
            if (g.cloud) {
              u.addEntry(new i.default.Entry(g.cloud, g.uuid, g.references));
              continue;
            }
            var h = /^data:.{0,255};base64,/i.exec(g.value);
            if (!h) continue;
            var f = a(g.value);
            let l = await e({ md5: f }),
              E = l ? l[0] : null;
            if (E)
              u.addEntry(
                new i.default.Entry(
                  i.default.CLOUD_PROTOCOL + "://id=" + E.id,
                  g.uuid,
                  g.references
                )
              );
            else if (g.references > 0) {
              for (var m = t, y = 0; y < n.length; ++y) {
                var v = n[y],
                  _ = i.default.PROTOCOL + "://" + g.uuid;
                if (
                  (v.url + "").startsWith(i.default.PROTOCOL) &&
                  v.url === _
                ) {
                  v.name && (m = v.name);
                  break;
                }
              }
              var b = g.value,
                w = h[1] || "application/octet-stream";
              let e;
              function C(e, t, n) {
                var o,
                  i = e.split(",");
                try {
                  o = atob(i[1]);
                } catch (e) {
                  o = "";
                }
                for (var a = o.length, r = new Uint8Array(a); a--; )
                  r[a] = o.charCodeAt(a);
                return new File([r], t, { type: n });
              }
              ({ urls: e, file: E } = await r(m, w));
              var x = C(b, c + "-" + E.id + ".txt", w);
              let o = {
                method: "PUT",
                headers: { "Cache-Control": "public, max-age=31536000" },
                body: x,
              };
              w &&
                (o.headers = Object.assign(o.headers, { "Content-Type": w }));
              if (!(await fetch(e.url, o)).ok)
                throw new Error("failed to upload");
              await s(x, E.id, f),
                u.addEntry(
                  new i.default.Entry(
                    i.default.CLOUD_PROTOCOL + "://id=" + E.id,
                    g.uuid,
                    g.references
                  )
                ),
                d && d(p / S);
            }
          }
          return l && l(u);
        } catch (e) {
          return Promise.reject(e);
        }
      }),
      s = (e, t, n) => {
        var o = (n && n.method) || "GET",
          i = n && n.body && JSON.stringify(n.body),
          a = Object.assign(
            {
              "Content-Type": "application/json",
              Accept: "json",
              Authorization: t || "",
            },
            n && n.headers
          );
        if (n && n.query) {
          var r = n.query,
            s = new URLSearchParams();
          for (var l in r) s.append(l, r[l]);
          e = e + "/?" + s.toString();
        }
        var c = { credentials: "include", headers: a, method: o };
        return (
          i && "GET" !== o && (c.body = i), fetch(e, c).then((e) => e.json())
        );
      };
    t.fetchRequest = s;
    t.listFilesFn = (e, t, n) => s("".concat(n, "/file"), t, { query: e });
    (t.createFileAndGetSignedPutUrlsFn = async function (e, t, n, o) {
      var i = { method: "POST", body: { name: e, type: t, trashed: null } };
      const a = await s("".concat(n, "/file"), o, i);
      var r = { method: "PUT", body: { id: a.id, type: t } };
      return {
        urls: await s("".concat(n, "/file/").concat(a.id, "/urls"), o, r),
        file: a,
      };
    }),
      (t.updateFileFn = async function (e, t, n, o, i, a, r) {
        const l = a && r ? await r(e) : null;
        return await s("".concat(o, "/file/").concat(t), i, {
          method: "PUT",
          body: { md5: n, trashed: !1, sha256: l },
        });
      });
    t.default = { syncImagesToCloud: r };
  }