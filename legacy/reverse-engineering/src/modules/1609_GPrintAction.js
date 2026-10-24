/**
 * Webpack Module #1609
 * Type: class
 * Name: GPrintAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(30), n(3), n(26), n(125), n(126), n(114);
    var o = n(1),
      i = n(15),
      a = n(797),
      r = n(40),
      s = n(18),
      l = n(31),
      c = n(446),
      d = n(219),
      u = n(1610),
      p = n(85);
    const g = n(44);
    var h = null,
      f = !1,
      m = !1;
    function y() {}
    o.GObject.inherit(y, l),
      (y.ID = "file.print"),
      (y.TITLE = new o.GLocaleKey("GPrintAction", "title")),
      (y.prototype.getId = function () {
        return y.ID;
      }),
      (y.prototype.getTitle = function () {
        return y.TITLE;
      }),
      (y.prototype.getIcon = function () {
        return "gravit-icon-print";
      }),
      (y.prototype.getCategory = function () {
        return s.CATEGORY_FILE;
      }),
      (y.prototype.getGroup = function () {
        return "print";
      }),
      (y.prototype.isEnabled = function () {
        if (!gDesigner.getApplicationManager().isExportEnabled()) return !1;
        const e = gDesigner.getActiveDocument();
        return e && (!e.isNew() || e.isModified());
      }),
      (y.prototype.getShortcut = function () {
        return [i.GKey.Constant.COMMAND, "P"];
      }),
      (y.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getScene(),
          n = new u.Item("PDF"),
          i = {
            suppressMessages: !0,
            dpi: gDesigner.isEnabledProFeatures() ? 300 : 150,
            preserveEditingCapabilities: !1,
            jpegQuality: 100,
            export: !0,
          },
          s = () => {
            console.log("NO DATA :(");
          };
        const l = () => {
          -1 !== navigator.userAgent.indexOf("Firefox") ||
          (gContainer.getRuntime() === p.Runtime.Electron &&
            a.GSVGExport.hasSupportedEffects(t))
            ? g.confirm(
                o.GLocale.get(
                  new o.GLocaleKey("GPrintAction", "printing-warning")
                ),
                (e) => {
                  e && y();
                },
                void 0,
                void 0,
                void 0,
                !0,
                !0
              )
            : y();
        };
        var y = () => {
            Object.assign(i, { convertTextToPath: !0 });
            let n = [];
            t.iteratePages(function (e) {
              n.push(e);
            });
            let o = [],
              l = (t, c) => {
                if (t || !c) return s();
                if ((o.push(c), n.shift(), n.length))
                  return void a.GSVGExport.export(n[0], i, l);
                let d = "";
                for (var u = 0; u < o.length; u++) {
                  let e =
                    "data:image/svg+xml;base64," +
                    (0, r.stringToBase64String)(o[u]);
                  d = d.concat(
                    "<img style='height:100%;width:auto;max-width:100%;display:block;' src='" +
                      e +
                      "'/>"
                  );
                }
                var p = h.contentDocument;
                (p.head.innerHTML =
                  "<style type='text/css' media='print'>@page { margin: 0mm; }</style>"),
                  (p.body.style.margin = "0"),
                  (p.body.style.height = "100%"),
                  (p.body.innerHTML = d),
                  (p.title = e.getTitle()),
                  $(h.contentWindow.document).ready(function () {
                    h.contentWindow.focus();
                    try {
                      h.contentWindow.print();
                    } catch (e) {
                      (m = !0), v();
                    }
                  });
              };
            n.length && a.GSVGExport.export(n[0], i, l);
          },
          v = () =>
            new d(
              o.GLocale.get(
                new o.GLocaleKey("GPrintAction", "printing-disabled")
              )
            ).open(),
          _ = () => {
            if (h.src) {
              h.focus();
              try {
                h.contentWindow.print();
              } catch (e) {
                (f = !0), (h.onload = l), (h.src = "about:blank");
              }
            }
          },
          b = () => {
            n.read((e) => {
              let t = new window.Blob([e], { type: "application/pdf" }),
                n = window.URL.createObjectURL(t);
              h.setAttribute("src", n);
            });
          };
        h ||
          (((h = document.createElement("iframe")).style.visibility = "hidden"),
          (h.style.position = "fixed"),
          (h.style.right = "0"),
          (h.style.bottom = "0"),
          (h.style.zIndex = "-1"),
          document.body.appendChild(h),
          gContainer.getRuntime() === p.Runtime.Electron && (f = !0)),
          new c(
            () => {
              !(function () {
                if (m) v();
                else if (f) l();
                else {
                  var o = 0,
                    r = [300, 150, 72, 36, null];
                  gDesigner.isEnabledProFeatures() || r.shift();
                  for (
                    var c = !1;
                    !a.GPDFExport.isSupported(t, !0, r[o++] + "dpi");

                  )
                    if (null === r[o]) {
                      c = !0;
                      break;
                    }
                  c
                    ? ((h.onload = null), y())
                    : ((i.dpi = r[o - 1]), (h.onload = _), e.store(n, b, s, i));
                }
              })();
            },
            () => {
              gDesigner.stats("action-cancelled_anonymous", this.getId());
            }
          );
      }),
      (y.prototype.toString = function () {
        return "[Object GPrintAction]";
      }),
      (e.exports = y);
  }