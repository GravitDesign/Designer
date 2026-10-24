/**
 * Webpack Module #1687
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(34);
    var i = n(1),
      a = o(n(44));
    const { DateAPI: r, DESIGNER: { TITLE: s } = {} } = n(10),
      l = n(78),
      c = r.minutesToMilliseconds(1),
      d = 0.8,
      u = r.minutesToMilliseconds(30);
    e.exports = class {
      constructor() {
        let {
          memoryCheckInterval: e = c,
          memoryUsageThreshold: t = d,
          autostartTime: n = u,
        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this._memoryCheckInterval = Math.max(e, r.minutesToMilliseconds(1))),
          (this._memoryUsageThreshold = t),
          (this._autostartTime = n);
      }
      start() {
        this.stop(),
          gDesigner.addEventListener(l, this._documentEvent, this),
          this._memoryUsageThreshold <= 0 ||
            (gContainer.isMemoryInfoAvailable() &&
              (this._memoryCheckIntervalId = setInterval(
                this._checkMemory.bind(this),
                this._memoryCheckInterval
              )));
      }
      stop() {
        this._autostartScheduleId &&
          (clearTimeout(this._autostartScheduleId),
          delete this._autostartScheduleId),
          this._memoryCheckIntervalId &&
            (clearInterval(this._memoryCheckIntervalId),
            delete this._memoryCheckIntervalId),
          gDesigner.removeEventListener(l, this._documentEvent, this);
      }
      _checkMemory() {
        this._calculateThreshold() >= this._memoryUsageThreshold &&
          (this._openWarningDialog(), this.stop(), this._scheduleStartup());
      }
      _calculateThreshold() {
        const e = gContainer.getMemoryInfo();
        return e ? e.heapSizeInUse / e.heapSizeLimit : 0;
      }
      _scheduleStartup() {
        this._autostartTime > 0 &&
          (this._autostartScheduleId = setTimeout(() => {
            this.start();
          }, this._autostartTime));
      }
      _openWarningDialog() {
        this._dialog ||
          (gDesigner.stats("memorywarningdialog_open"),
          (this._dialog = a.default.custom({
            closeCallback: () => {
              delete this._dialog;
            },
            className: "g-memory-warn-dialog",
            closeable: !1,
            icon: "info",
            title: i.GLocale.get(
              new i.GLocaleKey("GMemoryManager", "text.title")
            ).replace("%app", s),
            subtitle: i.GLocale.get(
              new i.GLocaleKey("GMemoryManager", "text.subtitle")
            ),
            buttons: [
              {
                label: i.GLocale.get(new i.GLocaleKey("GLocale", "ok")),
                onclick: (e) => {
                  e.gDialog("close");
                },
                highlighted: !0,
              },
            ],
          })));
      }
      _documentEvent(e) {
        e.type === l.Type.Removed &&
          (gDesigner.hasDocuments() || i.GRendererCtx.freeMemory());
      }
    };
  }