// Old: designer.browser.dev.js module 1483 (the app bootstrap and the gravit table).
/**
 * boot(container): creates the designer, builds the registration table
 * (window.gravit in the old app: actions, sidebars, panels, footer
 * panels, tools) in the old order, then init, start and the first
 * document or the welcome screen (docs/rewrite/UI.md, sections 2 and 9).
 *
 * The table names every entry by its old class, module and port-map
 * file. The app's modules come from an eager import.meta.glob over
 * src/app; an entry
 * whose file or export doesn't exist yet is skipped and listed by
 * pendingRegistrations(). No other cluster edits this file: an entry
 * comes alive when its file exports the class under the name given here.
 *
 * Dropped with the cloud, licence and analytics: the user, login and
 * signup flows, deep links, cookies, the UTM and analytics setup, Teams,
 * the beta and maintenance banners, the API error hook, the "new from
 * template" and iOS image actions, the cloud action wrapper (its actions
 * are registered directly), the annotations sidebar and the cloud footer
 * panels.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Editor } from "../../editor/editor.ts";
import { BBoxGuide } from "../../editor/guides/bbox-guide.ts";
import { FullPixelsGuide } from "../../editor/guides/full-pixels-guide.ts";
import { GridGuide } from "../../editor/guides/grid-guide.ts";
import { GuideLinesGuide } from "../../editor/guides/guide-lines-guide.ts";
import { PageGuide } from "../../editor/guides/page-guide.ts";
import { PointsGuide } from "../../editor/guides/points-guide.ts";
import type { Action } from "../actions/action.ts";
import { baseConfig } from "../file-formats.ts";
import { setHeicConverterLoader, type HeicConverter } from "../../io/import/heic.ts";
import { setStorageHost, setStorageMessageDialog, type StorageHost } from "../storage/storage.ts";
import { ApplicationStatusEvent } from "./application-status-event.ts";
import type { Container, OpenFileRequest } from "./container.ts";
import { Designer, type DesignerDocument } from "./designer.ts";
import { setAppRegistry, setContainer, setDesigner, setDragImageElement } from "./globals.ts";
import { hasLateModule, lateExport, setLateModules, systemDialog } from "./late.ts";
import type { SidebarLike } from "./layout.ts";
import type { HostedView } from "./part.ts";
import { PendingSidebar, type PendingSidebarSpec } from "./pending-sidebar.ts";
import type { AppRegistry } from "./registry.ts";
import { buildToolTable } from "./tool-table.ts";
import { startDragDropTouch } from "./drag-drop.ts";
import { installTooltips } from "./tooltip-position.ts";

type Exports = Record<string, unknown>;

/**
 * Module 803, the build flags: nodeEnv "production", storeVendor "" (no
 * app store build). The old bootstrap started the update manager only
 * without a store vendor (`C = !storeVendor`).
 */
const NODE_ENV = "production";
const STORE_VENDOR: string = "";

/** An action class as the table constructs it, with the statics its arguments use. */
type ActionClass = (new (...args: unknown[]) => Action) & {
  Type?: Record<string, unknown>;
  ZOOM_LEVELS?: readonly number[];
  Links?: readonly unknown[];
};

interface Registration<T> {
  /** The old class name (or a description for unnamed modules). */
  name: string;
  /** The old module ("a1601"). */
  module: string;
  /** The port-map target below src/app. */
  file: string;
  /** The export the entry needs from the file. */
  exportName: string;
  /** Builds the instance(s); gets the class and the module map lookup. */
  make: (cls: ActionClass, find: typeof lateExport) => T | T[];
}

function entry<T = Action>(
  name: string,
  module: string,
  file: string,
  exportName: string,
  make: Registration<T>["make"] = (cls) => new cls() as unknown as T,
): Registration<T> {
  return { name, module, file, exportName, make };
}

/** `cls.Type[name]`, the enum value an entry passes. */
const type = (cls: ActionClass, name: string): unknown =>
  (cls.Type as Record<string, unknown>)[name];

/** The extensions GSaveAsAction gets for "save as" entries (GDocument.FileTypes with store). */
function storeFormats(find: typeof lateExport): string[] {
  const list =
    find<() => { ext: string; store?: boolean }[]>(
      "document/file-types.ts",
      "getFileTypesArray",
    )?.() ??
    Object.values(
      find<Record<string, { ext: string; store?: boolean }>>(
        "document/file-types.ts",
        "FileTypes",
      ) ?? {},
    );
  return list
    .filter(
      (type) =>
        type.store &&
        "cdrapp" !== type.ext &&
        "des" !== type.ext &&
        "gvdesign" !== type.ext &&
        "pdf" !== type.ext,
    )
    .map((type) => type.ext);
}

const DEFAULT_FORMAT = (baseConfig.FILE_FORMATS.find((format) => format.default) as { ext: string })
  .ext;
const SECONDARY_FORMATS = baseConfig.FILE_FORMATS.filter((format) => format.secondary).map(
  (f) => f.ext,
);

const F = "actions/file/";
const E = "actions/edit/";
const M = "actions/modify/";
const V = "actions/view/";
const H = "actions/help/";

/** gravit.actions, in the old order. */
export const ACTION_TABLE: readonly Registration<Action>[] = [
  entry("GNewAction", "a1601", F + "new-action.ts", "NewAction"),
  entry("GNewClipboardAction", "a1602", F + "new-clipboard-action.ts", "NewClipboardAction"),
  entry("GOpenAction", "a813", F + "open-action.ts", "OpenAction"),
  entry("open in Safari (a1299)", "a1299", F + "open-safari-action.ts", "OpenSafariAction"),
  entry("GOpenRecentAction", "a843", F + "open-recent-action.ts", "OpenRecentAction"),
  entry("GSaveAction", "a447", F + "save-action.ts", "SaveAction"),
  entry("GSaveAsAction", "a445", F + "save-as-action.ts", "SaveAsAction", (cls) => [
    new cls(DEFAULT_FORMAT),
    ...SECONDARY_FORMATS.map((ext) => new cls(ext)),
  ]),
  entry(
    "GCloseActiveWindowAction",
    "a1649",
    V + "close-active-window-action.ts",
    "CloseActiveWindowAction",
  ),
  entry("GSaveAllAction", "a1612", F + "save-all-action.ts", "SaveAllAction"),
  entry("GPlaceImportAction", "a1283", F + "place-import-action.ts", "PlaceImportAction"),
  entry("GLinkImageAction", "a1280", F + "link-image-action.ts", "LinkImageAction"),
  entry("GImportFontsAction", "a1608", F + "import-fonts-action.ts", "ImportFontsAction"),
  entry("GExportAction", "a861", F + "export-action.ts", "ExportAction"),
  entry(
    "GSaveAsAction (store formats)",
    "a445",
    F + "save-as-action.ts",
    "SaveAsAction",
    (cls, find) => storeFormats(find).map((ext) => new cls(ext)),
  ),
  entry("GSaveAsAction (pdf)", "a445", F + "save-as-action.ts", "SaveAsAction", (cls) => [
    new cls("pdf", { dpi: 72 }),
    new cls("pdf", { dpi: 96 }),
    new cls("pdf", { dpi: 150 }),
    new cls("pdf", { dpi: 300 }),
  ]),
  entry(
    "GExportAction (pdf)",
    "a861",
    F + "export-action.ts",
    "ExportAction",
    (cls) => new cls({ format: "pdf" }),
  ),
  entry("GPrintAction", "a1609", F + "print-action.ts", "PrintAction"),
  entry(
    "GInstallToDesktopAction",
    "a1172",
    F + "install-to-desktop-action.ts",
    "InstallToDesktopAction",
  ),
  entry("GQuitAction", "a1632", F + "quit-action.ts", "QuitAction"),
  entry("GUndoAction", "a1171", E + "undo-action.ts", "UndoAction"),
  entry("GRedoAction", "a1284", E + "redo-action.ts", "RedoAction"),
  entry("GCutCopyAction", "a1331", E + "cut-copy-action.ts", "CutCopyAction", (cls) => [
    new cls(true),
    new cls(false),
  ]),
  entry("GPasteAction", "a877", E + "paste-action.ts", "PasteAction"),
  entry("GPasteInPlaceAction", "a1183", E + "paste-in-place-action.ts", "PasteInPlaceAction"),
  entry(
    "GPasteAndReplaceAction",
    "a876",
    E + "paste-and-replace-action.ts",
    "PasteAndReplaceAction",
  ),
  entry("GPasteInsideAction", "a1184", E + "paste-inside-action.ts", "PasteInsideAction"),
  entry("GPasteHereAction", "a1182", E + "paste-here-action.ts", "PasteHereAction"),
  entry("GPasteStyleAction", "a875", E + "paste-style-action.ts", "PasteStyleAction"),
  entry("GDeleteAction", "a1332", E + "delete-action.ts", "DeleteAction"),
  entry("GDuplicateAction", "a1315", E + "duplicate-action.ts", "DuplicateAction"),
  entry("GEditElementActon", "a1312", M + "edit-element-action.ts", "EditElementActon"),
  entry("GSelectAllAction", "a1333", E + "select-all-action.ts", "SelectAllAction"),
  entry("GDeselectAllAction", "a1334", E + "deselect-all-action.ts", "DeselectAllAction"),
  entry(
    "GInvertSelectionAction",
    "a1599",
    E + "invert-selection-action.ts",
    "InvertSelectionAction",
  ),
  entry(
    "GSelectByFontTypeAction",
    "a1180",
    E + "select-by-font-type-action.ts",
    "SelectByFontTypeAction",
  ),
  entry(
    "GSelectByPaintLayerAction",
    "a1304",
    E + "select-by-paint-layer-action.ts",
    "SelectByPaintLayerAction",
    (cls) => ["Fill", "Border", "FillAndBorder"].map((name) => new cls(type(cls, name))),
  ),
  entry(
    "GSelectByBorderWidthAction",
    "a1305",
    E + "select-by-border-width-action.ts",
    "SelectByBorderWidthAction",
  ),
  entry(
    "GSelectByTransparencyAction",
    "a1306",
    E + "select-by-transparency-action.ts",
    "SelectByTransparencyAction",
  ),
  entry(
    "GSelectByBlendModeAction",
    "a1307",
    E + "select-by-blend-mode-action.ts",
    "SelectByBlendModeAction",
  ),
  entry("GSelectByShapeAction", "a1308", E + "select-by-shape-action.ts", "SelectByShapeAction"),
  entry("GSelectByEffectAction", "a1309", E + "select-by-effect-action.ts", "SelectByEffectAction"),
  entry("GSettingsAction", "a1613", E + "settings-action.ts", "SettingsAction"),
  entry("GEyeDropperAction", "a1645", E + "eye-dropper-action.ts", "EyeDropperAction", (cls) =>
    ["Fill", "Border"].map((name) => new cls(type(cls, name))),
  ),
  entry("GRenameLayerAction", "a1340", M + "rename-layer-action.ts", "RenameLayerAction"),
  entry("GChangeOpacityAction", "a1647", E + "change-opacity-action.ts", "ChangeOpacityAction"),
  entry("GArrangeAction", "a869", M + "arrange-action.ts", "ArrangeAction", (cls) =>
    (["SendToFront", "BringForward", "SendBackward", "SendToBack"] as const).map(
      (name) => new cls(Editor.ArrangeOrderType[name]),
    ),
  ),
  entry("GAlignAction", "a866", M + "align-action.ts", "AlignAction", (cls) =>
    (
      [
        "AlignLeft",
        "AlignCenter",
        "AlignRight",
        "AlignTop",
        "AlignMiddle",
        "AlignBottom",
        "AlignJustifyHorizontal",
        "AlignJustifyVertical",
      ] as const
    ).map((name) => new cls(Editor.ArrangeAlignType[name])),
  ),
  entry("GDistributeAction", "a867", M + "distribute-action.ts", "DistributeAction", (cls) =>
    ["Horizontal", "Vertical"].map((name) => new cls(type(cls, name))),
  ),
  entry("GSnapUnitAction", "a1295", V + "snap-unit-action.ts", "SnapUnitAction", (cls) =>
    ["FullUnit", "HalfUnit"].map((name) => new cls(type(cls, name))),
  ),
  entry("GTransformAction", "a871", M + "transform-action.ts", "TransformAction", (cls) =>
    [
      "Rotate45Left",
      "Rotate90Left",
      "Rotate180Left",
      "Rotate45Right",
      "Rotate90Right",
      "Rotate180Right",
      "FlipVertical",
      "FlipHorizontal",
    ].map((name) => new cls(type(cls, name))),
  ),
  entry("GGroupAction", "a811", M + "group-action.ts", "GroupAction"),
  entry("GClipAction", "a809", M + "clip-action.ts", "ClipAction"),
  entry("GSplitAction", "a870", M + "split-action.ts", "SplitAction"),
  entry("GMaskWithShapeAction", "a1181", M + "mask-with-shape-action.ts", "MaskWithShapeAction"),
  entry("GCropAction", "a1310", M + "crop-action.ts", "CropAction"),
  entry("GCancelCropAction", "a1311", M + "cancel-crop-action.ts", "CancelCropAction"),
  entry("GMergeMainAction", "a812", M + "merge-main-action.ts", "MergeMainAction", (cls, find) => {
    const sub = find<ActionClass>(M + "merge-sub-action.ts", "MergeSubAction");
    return sub ? new cls(sub) : [];
  }),
  entry("GMergeSubAction", "a1600", M + "merge-sub-action.ts", "MergeSubAction", (cls) =>
    ["Intersect", "Difference", "Subtract", "Union"].map((name) => new cls(type(cls, name))),
  ),
  entry(
    "GCreateNestedCompoundAction",
    "a1316",
    M + "create-nested-compound-action.ts",
    "CreateNestedCompoundAction",
  ),
  entry("GJoinPathsAction", "a1179", M + "join-paths-action.ts", "JoinPathsAction"),
  entry("GSplitPathAction", "a873", M + "split-path-action.ts", "SplitPathAction"),
  entry("GConvertToPathAction", "a810", M + "convert-to-path-action.ts", "ConvertToPathAction"),
  entry(
    "GConvertToRawPathAction",
    "a1320",
    M + "convert-to-raw-path-action.ts",
    "ConvertToRawPathAction",
  ),
  entry("GOutlineAction", "a1185", M + "outline-action.ts", "OutlineAction"),
  entry("GOffsetAction", "a1317", M + "offset-action.ts", "OffsetAction"),
  entry(
    "GVectorizeBorderAction",
    "a872",
    M + "vectorize-border-action.ts",
    "VectorizeBorderAction",
  ),
  entry("GVectorizeImageAction", "a1616", M + "vectorize-image-action.ts", "VectorizeImageAction"),
  entry("GAttachToPathAction", "a1176", M + "attach-to-path-action.ts", "AttachToPathAction"),
  entry("GDetachFromPathAction", "a1178", M + "detach-from-path-action.ts", "DetachFromPathAction"),
  entry("GSimplifyAction", "a1318", M + "simplify-action.ts", "SimplifyAction"),
  entry("GConnectLinesAction", "a1597", M + "connect-lines-action.ts", "ConnectLinesAction"),
  entry("GSplitLineAction", "a1319", M + "split-line-action.ts", "SplitLineAction"),
  entry("GReverseOrderAction", "a1611", M + "reverse-order-action.ts", "ReverseOrderAction"),
  entry("GCreateSymbolAction", "a608", M + "create-symbol-action.ts", "CreateSymbolAction"),
  entry("GDetachSymbolAction", "a874", M + "detach-symbol-action.ts", "DetachSymbolAction"),
  entry("GResetInstanceAction", "a1177", M + "reset-instance-action.ts", "ResetInstanceAction"),
  entry("GConvertToImageAction", "a1314", M + "convert-to-image-action.ts", "ConvertToImageAction"),
  entry("GLockLayerAction", "a1606", M + "lock-layer-action.ts", "LockLayerAction"),
  entry(
    "GChangeAnchorPointsJointTypeMainAction",
    "a1345",
    M + "change-anchor-points-joint-type-main-action.ts",
    "ChangeAnchorPointsJointTypeMainAction",
    (cls, find) => {
      const sub = find<ActionClass>(
        M + "change-anchor-points-joint-type-sub-action.ts",
        "ChangeAnchorPointsJointTypeSubAction",
      );
      return sub ? new cls(sub) : [];
    },
  ),
  entry(
    "GChangeAnchorPointsJointTypeSubAction",
    "a1648",
    M + "change-anchor-points-joint-type-sub-action.ts",
    "ChangeAnchorPointsJointTypeSubAction",
    (cls) =>
      ["Straight", "Mirrored", "Disconnected", "Asymmetric", "Connector"].map(
        (name) => new cls(type(cls, name)),
      ),
  ),
  entry(
    "GSwapPaintLayersAction",
    "a1652",
    E + "swap-paint-layers-action.ts",
    "SwapPaintLayersAction",
  ),
  entry("GCreateNewLayerAction", "a1653", M + "create-new-layer-action.ts", "CreateNewLayerAction"),
  entry("GOriginalViewAction", "a1282", V + "original-view-action.ts", "OriginalViewAction"),
  entry("GFitSelectionAction", "a566", V + "fit-selection-action.ts", "FitSelectionAction"),
  entry(
    "GFitCurrentLayerAction",
    "a1598",
    V + "fit-current-layer-action.ts",
    "FitCurrentLayerAction",
  ),
  entry("GFitAllAction", "a449", V + "fit-all-action.ts", "FitAllAction"),
  entry(
    "GEnterLayerGroupAction",
    "a1605",
    M + "enter-layer-group-action.ts",
    "EnterLayerGroupAction",
    (cls) => [new cls(false), new cls(true)],
  ),
  entry(
    "GToggleLayerVisibilityAction",
    "a1607",
    M + "toggle-layer-visibility-action.ts",
    "ToggleLayerVisibilityAction",
  ),
  entry(
    "GCycleThroughLayersAction",
    "a1344",
    M + "cycle-through-layers-action.ts",
    "CycleThroughLayersAction",
    (cls) => ["Next", "Previous"].map((name) => new cls(type(cls, name))),
  ),
  entry(
    "GToggleMultiPageModeAction",
    "a1650",
    V + "toggle-multi-page-mode-action.ts",
    "ToggleMultiPageModeAction",
  ),
  entry(
    "GChangeActivePageAction",
    "a1341",
    M + "change-active-page-action.ts",
    "ChangeActivePageAction",
    (cls) => ["Next", "Previous"].map((name) => new cls(type(cls, name))),
  ),
  entry(
    "GChangeActiveWindowAction",
    "a1651",
    V + "change-active-window-action.ts",
    "ChangeActiveWindowAction",
    (cls) => ["Next", "Previous"].map((name) => new cls(type(cls, name))),
  ),
  entry(
    "GMagnificationAction",
    "a1167",
    V + "magnification-action.ts",
    "MagnificationAction",
    (cls) => (cls.ZOOM_LEVELS || []).map((level) => new cls(level)),
  ),
  entry("GZoomInAction", "a1290", V + "zoom-in-action.ts", "ZoomInAction"),
  entry("GZoomOutAction", "a1291", V + "zoom-out-action.ts", "ZoomOutAction"),
  entry("GOutlineViewAction", "a1297", V + "outline-view-action.ts", "OutlineViewAction"),
  entry("fast view (a1603)", "a1603", V + "fast-view-action.ts", "FastViewAction"),
  entry("GShowRulersAction", "a1614", V + "show-rulers-action.ts", "ShowRulersAction"),
  entry("GShowGuideLinesAction", "a1169", V + "show-guide-lines-action.ts", "ShowGuideLinesAction"),
  entry(
    "GShowSymbolLabelsAction",
    "a1286",
    V + "show-symbol-labels-action.ts",
    "ShowSymbolLabelsAction",
  ),
  entry("GShowGridAction", "a1285", V + "show-grid-action.ts", "ShowGridAction"),
  entry("GShowSlicesAction", "a1615", V + "show-slices-action.ts", "ShowSlicesAction"),
  entry("GShowEffectsAction", "a1619", V + "show-effects-action.ts", "ShowEffectsAction"),
  entry(
    "GShowSelectionHandlesAction",
    "a1646",
    V + "show-selection-handles-action.ts",
    "ShowSelectionHandlesAction",
  ),
  entry("GToggleSnapAction", "a1288", V + "toggle-snap-action.ts", "ToggleSnapAction"),
  entry(
    "GToggleSnapZonesAction",
    "a1289",
    V + "toggle-snap-zones-action.ts",
    "ToggleSnapZonesAction",
    (cls) => (baseConfig.HAS_SNAPZONES ? new cls() : []),
  ),
  entry("GToggleGuideAction", "a1287", V + "toggle-guide-action.ts", "ToggleGuideAction", (cls) =>
    (
      [
        [GridGuide.ID, "text.snap-to-grid"],
        [GuideLinesGuide.ID, "text.snap-to-guide-lines"],
        [FullPixelsGuide.ID, "text.snap-to-full-pixels"],
        [PointsGuide.ID, "text.snap-to-anchor-points"],
        [BBoxGuide.ID, "text.snap-to-shapes"],
        [PageGuide.ID, "text.snap-to-pages"],
      ] as const
    ).map(([id, key]) => new cls(id, Locale.get(new LocaleKey("GCommonNames", key)))),
  ),
  entry("GNewWindowAction", "a1296", V + "new-window-action.ts", "NewWindowAction"),
  entry("GPlayAction", "a1617", V + "play-action.ts", "PlayAction"),
  entry(
    "GToggleFullscreenAction",
    "a1335",
    V + "toggle-fullscreen-action.ts",
    "ToggleFullscreenAction",
  ),
  entry("GToggleTouchAction", "a1634", V + "toggle-touch-action.ts", "ToggleTouchAction"),
  entry("GOpenLinkAction", "a1621", H + "open-link-action.ts", "OpenLinkAction", (cls) =>
    (cls.Links || []).map((link) => new cls(link)),
  ),
  entry(
    "GEnhancedTooltipsAction",
    "a1342",
    V + "enhanced-tooltips-action.ts",
    "EnhancedTooltipsAction",
  ),
  entry(
    "GOpenQuickHelpScreenAction",
    "a1336",
    H + "open-quick-help-action.ts",
    "OpenQuickHelpScreenAction",
  ),
  entry(
    "GOpenWelcomeScreenAction",
    "a1624",
    H + "open-welcome-screen-action.ts",
    "OpenWelcomeScreenAction",
  ),
  entry("GShowShortcutsAction", "a1643", H + "show-shortcuts-action.ts", "ShowShortcutsAction"),
];

/** gravit.sidebars, in the old order (the annotations sidebar is dropped). */
export const SIDEBAR_TABLE: readonly Registration<SidebarLike>[] = [
  entry<SidebarLike>(
    "GInspectorSidebar",
    "a864",
    "inspector/inspector-sidebar.ts",
    "InspectorSidebar",
  ),
  entry<SidebarLike>("GOutlineSidebar", "a1260", "sidebars/outline-sidebar.ts", "OutlineSidebar"),
  entry<SidebarLike>("GLibrarySidebar", "a1662", "sidebars/library-sidebar.ts", "LibrarySidebar"),
  entry<SidebarLike>("GSymbolsSidebar", "a1661", "sidebars/symbols-sidebar.ts", "SymbolsSidebar"),
];

/** What stands in for a sidebar that isn't ported yet (ids and widths of the old classes). */
const PENDING_SIDEBARS: Record<string, PendingSidebarSpec> = {
  GInspectorSidebar: {
    id: "inspector",
    className: "GInspectorSidebar",
    orientation: "right",
    width: 300,
    resizeable: false,
  },
  GOutlineSidebar: {
    id: "outline",
    className: "GOutlineSidebar",
    orientation: "left",
    width: 250,
    resizeable: true,
  },
  GLibrarySidebar: {
    id: "library",
    className: "GLibrarySidebar",
    orientation: "left",
    width: 250,
    resizeable: true,
  },
  GSymbolsSidebar: {
    id: "symbols",
    className: "GSymbolsSidebar",
    orientation: "left",
    width: 250,
    resizeable: true,
  },
};

/** The sidebars, with a stand-in for each one whose module is missing. */
function buildSidebars(): SidebarLike[] {
  const out: SidebarLike[] = [];
  for (const registration of SIDEBAR_TABLE) {
    const made = build([registration]);
    const spec = PENDING_SIDEBARS[registration.name];
    if (made.length === 0 && spec) out.push(new PendingSidebar(spec));
    else out.push(...made);
  }
  return out;
}

/** gravit.footer (the cloud panels are dropped). */
export const FOOTER_TABLE: readonly Registration<HostedView>[] = [
  entry<HostedView>(
    "GSoftwareUpdatePanel",
    "a1665",
    "dialogs/software-update-panel.ts",
    "SoftwareUpdatePanel",
  ),
  entry<HostedView>(
    "GNotificationPanel",
    "a1666",
    "dialogs/notification-panel.ts",
    "NotificationPanel",
  ),
];

const pending: string[] = [];

function build<T>(table: readonly Registration<T>[]): T[] {
  const out: T[] = [];
  for (const registration of table) {
    const cls = lateExport<ActionClass>(registration.file, registration.exportName);
    if (!cls) {
      pending.push(
        `${registration.name} (${registration.module}, ${registration.file} ${registration.exportName})`,
      );
      continue;
    }
    const made = registration.make(cls, lateExport);
    if (Array.isArray(made)) out.push(...made);
    else out.push(made);
  }
  return out;
}

/** The registrations skipped because their module isn't ported yet. */
export function pendingRegistrations(): readonly string[] {
  return pending;
}

/** Hands every module below src/app to late.ts. */
export async function loadAppModules(): Promise<void> {
  // Eager: every module is part of the app bundle, so no request at boot
  // can fail and leave a registration out (a lazy glob makes one chunk per
  // module, each a request that can fail under load).
  const modules = import.meta.glob<Exports>(
    ["../**/*.ts", "../**/*.tsx", "!../**/*.test.ts", "!../**/*.test.tsx", "!../**/*.testing.ts"],
    { eager: true },
  );
  const map: Record<string, Exports> = {};
  for (const [path, exports] of Object.entries(modules)) map[appPath(path)] = exports;
  setLateModules(map);
}

/** A glob key ("../actions/x.ts", or "./x.ts" for this folder) as a path below src/app. */
function appPath(key: string): string {
  if (key.startsWith("./")) return "shell/" + key.slice(2);
  return key.replace(/^\.\.\//, "");
}

/** gravit = { ... }: the table in the old order. */
export function buildRegistry(): AppRegistry {
  pending.length = 0;
  return {
    plugins: [],
    actions: build(ACTION_TABLE),
    sidebars: buildSidebars(),
    panels: [],
    footer: build(FOOTER_TABLE),
    tools: buildToolTable(),
  };
}

/** The other clusters' late-bound hosts, filled once the designer exists. */
function connectHosts(designer: Designer): void {
  const storageHost: StorageHost = {
    getSetting: (key) => designer.getSetting(key),
    setSetting: (key, value) => {
      designer.setSetting(key, value);
    },
    getActiveDocument: () =>
      designer.getActiveDocument() as unknown as ReturnType<StorageHost["getActiveDocument"]>,
    getDocuments: () =>
      designer.getDocuments() as unknown as ReturnType<StorageHost["getDocuments"]>,
  };
  setStorageHost(storageHost);
  setStorageMessageDialog((text) => {
    const MessageDialog = lateExport<new (text: string) => { open(): void }>(
      "dialogs/message-dialog.ts",
      "MessageDialog",
    );
    if (MessageDialog) new MessageDialog(text).open();
    else systemDialog().alert(text);
  });
  // heic2any is loaded on first use, like the old vendors~heic2any chunk.
  setHeicConverterLoader(() =>
    import("heic2any").then((module) => module.default as unknown as HeicConverter),
  );
}

/** The welcome screen setting (app-welcome-settings), shown by default. */
function welcomeScreenEnabled(designer: Designer): boolean {
  const setting = lateExport<{ isEnabled(): boolean }>(
    "welcome/show-welcome-setting.ts",
    "ShowWelcomeSetting",
  );
  if (setting) return setting.isEnabled();
  return false !== designer.getSetting("show_welcome_screen", true);
}

/**
 * The old module's export: boot with the container. Resolves when the
 * first document or the welcome screen is up (ApplicationStatusEvent
 * Ready).
 */
export async function boot(container: Container): Promise<Designer> {
  // The old bootstrap required the DragDropTouch polyfill (module 1488)
  // when it loaded, before the designer added its document listeners.
  startDragDropTouch();
  setContainer(container);
  await loadAppModules();
  const designer = new Designer();
  setDesigner(designer);
  connectHosts(designer);
  const dragImage = document.createElement("div");
  dragImage.className = "g-drag-image";
  document.body.appendChild(dragImage);
  setDragImageElement(dragImage);
  window.onerror = () => {
    // Plugin errors were shown as alerts; everything else went to the
    // (dropped) online error report.
  };
  designer.setEnv(NODE_ENV);
  designer.setVersion("3.15.0");
  designer.setVersionFriendlyName("i015.3");
  designer.preInit();
  if (designer.hasEventListeners(ApplicationStatusEvent))
    designer.trigger(new ApplicationStatusEvent(ApplicationStatusEvent.Status.Init));
  designer.setIsBeta(false);
  const registry = buildRegistry();
  setAppRegistry(registry);
  Designer.loadsCmykProfile = true;
  designer.init();
  designer.relayout();
  await designer.start().finally(() => {
    // The touch layout offer on touch devices (app-touch-ui runs the action).
    if (designer.isTouchDevice() && !designer.isTouchEnabled() && baseConfig.TOUCH_LAYOUT) {
      const dialog = systemDialog();
      if (dialog.confirm)
        dialog.confirm(
          `${Locale.get(new LocaleKey("GSystemDialog", "text.supported-touch-title")) as string}<br>\n                         ${Locale.get(new LocaleKey("GSystemDialog", "text.supported-touch-footer")) as string}`,
          (ok: boolean) => {
            if (ok && designer.getAction("view.toggle-touch"))
              designer.executeAction("view.toggle-touch", undefined, undefined, true);
          },
          Locale.get(new LocaleKey("GLocale", "cancel")),
          { text: Locale.get(new LocaleKey("GLocale", "ok")), pro: true },
          false,
          false,
          false,
          "designer.settings.dont_show_supported_touch_dialog",
        );
    }
  });
  const request: OpenFileRequest | null = container.start();
  // The data-title tooltips (module 1673, Fn.init() in the old bootstrap).
  installTooltips();
  document.body.classList.remove("loading");
  window.onbeforeunload = (event) => {
    if (
      !container.canUnload(
        designer.hasModifiedDocuments(),
        designer.hasSynchronizingDocuments(),
        false,
      )
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  if (request) {
    // Start URLs only named cloud documents (container.start); nothing opens them.
  } else if (welcomeScreenEnabled(designer)) designer.handleWelcomeScreenOpenWithUserPermissions();
  else designer.newInfiniteDocument();
  if (designer.hasEventListeners(ApplicationStatusEvent))
    designer.trigger(new ApplicationStatusEvent(ApplicationStatusEvent.Status.Ready));
  checkScreenSize();
  // Here the old app started the reminder manager (dropped with the
  // licence). With the always-pro licence it reset two reminder settings,
  // and that setSetting wrote the merged settings (defaults included) to
  // storage. Nothing else writes them before the user changes a setting,
  // so the write stays.
  designer.writeSettings();
  // The Electron update manager and the memory warning (app-dialogs-notify).
  if (!STORE_VENDOR) {
    const UpdateManager = lateExport<new () => { start(): void }>(
      "dialogs/software-update-manager.ts",
      "SoftwareUpdateManager",
    );
    if (UpdateManager && hasLateModule("dialogs/software-update-manager.ts")) {
      try {
        new UpdateManager().start();
      } catch (error) {
        console.error(error);
      }
    }
  }
  const MemoryManager = lateExport<new () => { start(): void }>(
    "dialogs/memory-warning-dialog.ts",
    "MemoryManager",
  );
  if (MemoryManager) new MemoryManager().start();
  // The old app loaded the CMYK profile in init and never waited; boot ends
  // once it is there, so a CMYK colour right after start converts the same
  // way every time.
  await designer.whenCmykProfileLoaded();
  return designer;
}

/** The one-time notice on screens narrower than 1024 px. */
function checkScreenSize(): void {
  const supported = lateExport<(width?: number) => boolean>(
    "util/designer-util.ts",
    "isSupportedScreenSize",
  );
  if (!supported || supported()) return;
  const dialog = systemDialog();
  if (dialog.showOneTimeDialog)
    dialog.showOneTimeDialog(
      (
        Locale.get(new LocaleKey("GSystemDialog", "text.unsupported-screen-size")) as string
      ).replace("%app", baseConfig.DESIGNER.TITLE),
      "designer.settings.dont_show_unsupported_screen_size_dialog",
    );
}

export type { DesignerDocument };
