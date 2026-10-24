/**
 * Webpack Module #858
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default =
        t.GFilesPanelSortTypes =
        t.GFilesPanelSortDirections =
        t.GFilesPanelFileTypesFilter =
        t.GFilesPanelClipboardModes =
          void 0);
    const o = n(47),
      i =
        ((t.GFilesPanelFileTypesFilter = [
          {
            id: "gvdesign",
            name: new o("GFilesPanel", "text.filter-type-gvdesign"),
            type: "application/gravit+design",
          },
        ]),
        (t.GFilesPanelSortTypes = {
          UPDATED: "updated",
          NAME: "name",
          CREATED: "created",
        })),
      a = (t.GFilesPanelSortDirections = { ASCEND: !0, DESCEND: !1 }),
      r = (t.GFilesPanelClipboardModes = { DEFAULT: 1, COPY: 2, CUT: 3 });
    t.default = {
      GFilesPanelSortTypes: i,
      GFilesPanelSortDirections: a,
      GFilesPanelClipboardModes: r,
    };
  }