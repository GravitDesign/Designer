/**
 * Webpack Module #1255
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(34);
    var i = o(n(78)),
      a = o(n(86)),
      r = o(n(449)),
      s = o(n(85)),
      l = o(n(237)),
      c = n(1);
    e.exports = class {
      static handleOpenFileRequest(e, t) {
        gContainer.openStorageFile(e, t, function (n) {
          let o =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
          const d = t.getType();
          function u(t) {
            const n = (t) => {
              if (t.type === i.default.Type.Activated && t.document === e) {
                let e = t.document.getStatus();
                e === a.default.LoadFailed ||
                  e === a.default.LoadCancelled ||
                  gDesigner.executeAction(r.default.ID, void 0, void 0, !0),
                  gDesigner.removeEventListener(i.default, n);
              }
            };
            if (
              (d !== s.default.OpenFileRequest.Type.Preset &&
                gDesigner.addEventListener(i.default, n),
              t instanceof l.default.Item)
            ) {
              if (
                (e.setStorageItem(t),
                e.setIsShared(!0),
                e.load(null, o && o.loadingData),
                gDesigner.trigger(new i.default(i.default.Type.Modified, e)),
                d === s.default.OpenFileRequest.Type.Template)
              ) {
                e.setDocumentFromTemplate(!0);
                let t = o.category,
                  n = t && t.split(".");
                n.length > 1 && (t = n.splice(1).join("."));
                let i = t.toLowerCase().replace(/\./g, "-");
                gDesigner.stats(
                  "directlink_template_".concat(i),
                  "".concat(o.file.name, " [").concat(o.content.id, "]")
                );
              } else if (d === s.default.OpenFileRequest.Type.Preset) {
                e.setDocumentFromTemplate(!0);
                let t = o.preset.presetCategory
                  .toLowerCase()
                  .replace(
                    /[\t-\r \/\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g,
                    "-"
                  );
                gDesigner.stats(
                  "directlink_preset_".concat(t),
                  o.preset.presetLayout.name
                );
              }
            } else if (t && t.presetLayout) {
              let n = gDesigner.createScene(),
                { unit: o, dpi: i, width: a, height: r } = t.presetLayout,
                s = t.presetCategory
                  .toLowerCase()
                  .replace(
                    /[\t-\r \/\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g,
                    "-"
                  );
              n.setProperties(["ut", "dpi"], [o, i || c.GLength.DPI]),
                n
                  .getActivePage()
                  .setProperties(
                    ["bck", "w", "h"],
                    [
                      c.GRGBColor.WHITE,
                      new c.GLength(a, o).toPoint(),
                      new c.GLength(r, o).toPoint(),
                    ]
                  ),
                e.setTitle(t.presetLayout.id),
                e.setScene(n),
                e.setDocumentFromTemplate(!0),
                e.setIsShared(!0),
                gDesigner.stats(
                  "directlink_preset_".concat(s),
                  t.presetLayout.name
                );
            }
          }
          return u(n), e;
        });
      }
    };
  }