/**
 * Webpack Module #1090
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = void 0),
      n(8);
    const o = n(156),
      i = n(220),
      a = n(556);
    function r() {}
    r.createStorageItem = async function (e) {
      let t = null;
      switch (e.storage) {
        case o.Storage.Gravit:
          t = await i.from(gDesigner.getDefaultStorage(), e);
          break;
        case o.Storage.GoogleDrive:
          t = await new a.Item(gDesigner.getDefaultStorage(), e);
      }
      return t;
    };
    t.default = r;
  }