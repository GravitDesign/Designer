/**
 * Webpack Module #1485
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = async function (e, t, n, o) {
        var i = void 0 !== window.dataLayer ? window.dataLayer : [],
          s = n;
        i.push({ version: "3.15.0" }),
          i.push({ gtmLocation: s }),
          i.push({ hardware: u() }),
          await (0, r._tryAndCatch)(async () => {
            if (o && !o.isAnonymous()) {
              l && l.forEach((e) => dataLayer.push({ [e]: void 0 }));
              const { type: e = "EWOSU", token: t } = o;
              i.push({ [e]: t });
            }
          });
        var c = a.default.getRuntimeCode();
        i.push({ installType: c }), i.push({ event: "INIT_GTM_EVENT" });
      }),
      n(8),
      n(4),
      n(32),
      n(33);
    var i = n(1),
      a = o(n(859)),
      r = n(40),
      s = n(803);
    const { GA: { customDimensions: l } = {}, GoogleTagManagerSettings: c } =
      n(10);
    window.dataLayer = [];
    const d = c.getContainerId(s.nodeEnv);
    !(function (e, t, n, o, i) {
      (e[o] = e[o] || []),
        e[o].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var a = t.getElementsByTagName(n)[0],
        r = t.createElement(n);
      (r.async = !0),
        (r.src = "https://www.googletagmanager.com/gtm.js?id=" + i),
        a.parentNode.insertBefore(r, a);
    })(window, document, "script", "dataLayer", d);
    const u = () => {
      switch (i.GSystem.hardware) {
        case i.GSystem.Hardware.Desktop:
          return "desktop";
        case i.GSystem.Hardware.Tablet:
          return "tablet";
        case i.GSystem.Hardware.Phone:
          return "phone";
        default:
          return "unknown";
      }
    };
  }