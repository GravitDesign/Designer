/**
 * Webpack Module #1163
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.dateToVersionFormat = t.dateToFilePreviewFormat = void 0);
    const { GLocale: o } = n(1),
      i = (e) =>
        o.toLocaleDate(e, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        });
    t.dateToVersionFormat = i;
    const a = (e) =>
      o.toLocaleDate(new Date(e), {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
        hour: "numeric",
        minute: "numeric",
      });
    t.dateToFilePreviewFormat = a;
    t.default = { dateToVersionFormat: i, dateToFilePreviewFormat: a };
  }