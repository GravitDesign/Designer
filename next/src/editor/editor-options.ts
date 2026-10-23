// Old: chunk.vendor.js module 24 (GEditorOptions).
import { CMYKColor } from "../engine/color/cmyk-color.ts";
import type { Color } from "../engine/color/color.ts";
import { RGBColor } from "../engine/color/rgb-color.ts";
import { Locale } from "../engine/core/locale/locale.ts";
import { LocaleKey } from "../engine/core/locale/locale-key.ts";
import { PaintCanvas } from "../engine/paint/paint-canvas.ts";
import { SceneOptions } from "../engine/scene/scene-options.ts";

/**
 * The old options multiplied every screen size by the screen DPI once,
 * when the module loaded, and the app later overwrote single values.
 * Callers read the numbers straight from the object, so they are still
 * computed here at load time; the DPI doesn't change during a session.
 */
const dpi = PaintCanvas.getScreenDPI();

/** A handle shape name as GEditorAnnotation.paintAnnotation takes it. */
type HandleType = string;

/**
 * Look options some handles leave unset (the painters read them anyway
 * and get undefined).
 */
interface OptionalHandleLook {
  outlineWidth?: number | null;
  shadowColor?: string | null;
  outsideStroke?: boolean;
}

const withOptionalLook = <T>(handle: T): T & OptionalHandleLook => handle as T & OptionalHandleLook;

const options = {
  autoPanStep: 3 * dpi,
  maxUndoSteps: 100,
  cloneShift: 10,
  pickDistance: 4,
  annotPickDistance: 0,
  annotDropDistance: 4,
  cursorDistanceSmall: 1,
  cursorDistanceBig: 10,
  cursorConstraint: 0,
  highlightOnHover: true,
  coordinatesTooltip: true,
  bboxPositionTooltip: true,
  sizeTooltip: true,
  angleTooltip: true,
  showTooltips: true,
  tooltipDecimalPlaces: 1,
  showDistance: true,
  toolExitKey: undefined as string | undefined,
  scaleBorderWidth: undefined as boolean | undefined,
  scaleCorners: undefined as boolean | undefined,
  cornerRotate: true,
  rotateHandle: "top" as string | null,
  rotateHandleInDetailMode: true,
  snapRotate: false,
  simpleLineMode: true,
  resizeBox: true,
  resizeHandles: true,
  resizeHandlesInDetailMode: true,
  adaptiveResizeHandles: false,
  visualGroupSelect: false,
  styleEditors: true,
  centerCrossSize: 4 * dpi,
  outlineWidth: 1 * dpi,
  pageOutlineWidth: 2 * dpi,
  distanceHelperColor: new RGBColor([255, 0, 170]) as Color,
  distanceHelperBehaviour: null as unknown,
  guideOutlineColor: new RGBColor([75, 215, 208]) as Color,
  guideLineColor: new RGBColor([0, 145, 234]) as Color,
  guideLineHintColor: "blue",
  gridColor: new RGBColor([38, 50, 56]) as Color,
  gridOpacity: 0.125,
  preserveAspectRatio: false,
  selectDoubleClickBehavior: null as unknown,
  leaveWhenClosePath: false,
  pathDbClickTime: 300,
  invertSelectionMode: false,
  toggleAnchorPointType: true,
  pageSelectable: true,
  inlineEditText: true,
  debugTransactions: false,
  imageCropDistance: 0,
  allowTextRatioPreservation: false,
  pageCollisionTransform: !SceneOptions.pagesCanOverlap,
  propertiesExcludedFromCopying: null as string[] | null,
  maxNumberOfEditorsToDraw: 2e3,
  annotationHandles: {
    suppressRedundantCorners: false,
    rectangle: { type: "circle" as HandleType, size: 8 * dpi, margin: 10 * dpi },
    ellipse: {
      startType: "circle" as HandleType,
      endType: "diamond" as HandleType,
      size: 8 * dpi,
    },
    polygon: {
      innerType: "circle" as HandleType,
      outerType: "diamond" as HandleType,
      size: 8 * dpi,
    },
    textOnPath: { type: "diamond" as HandleType, size: 8 * dpi },
    text: { showAutoSize: true, blResizeColor: new RGBColor([235, 100, 60]) as Color },
    simpleShape: { type: "circle" as HandleType, size: 10 * dpi },
    path: {
      corner: { type: "circle" as HandleType, size: 6 * dpi },
      control: { type: "circle" as HandleType, size: 6 * dpi },
      constrain: { type: "circle" as HandleType, size: 6 * dpi },
      node: {
        straightType: "rect" as HandleType,
        smoothType: "circle" as HandleType,
        autoType: "diamond" as HandleType,
        size: 10 * dpi,
      },
      graph: { type: "circle" as HandleType, size: 10 * dpi },
      center: { type: "circle" as HandleType, size: 8 * dpi },
    },
    gradient: {
      type: "circle" as HandleType,
      startType: "circle" as HandleType,
      endType: "rect" as HandleType,
      size: 9 * dpi,
      sizeBig: 12 * dpi,
      outlineWidth: 2 * dpi,
      shadowColor: "rgba(0,0,0,0.9)",
      lineShadowColor: "rgb(120,120,120)",
    },
    catch: { type: "diamond" as HandleType, size: 8 * dpi },
    resize: withOptionalLook({
      type: "circle" as HandleType,
      size: 10 * dpi,
      inverted: true,
      rotateDistance: 4 * dpi,
      outsideStroke: false,
    }),
    rotate: {
      type: "circle" as HandleType,
      size: 10 * dpi,
      distance: 22 * dpi,
      iconSize: 16 * dpi,
      iconDynamicColor: true,
    },
    // The old key is misspelled; settings and callers use it as is.
    tranformBox: withOptionalLook({
      resizeType: "circle" as HandleType,
      pivotType: "diamond" as HandleType,
      pivotSize: null as number | null,
      pivotOutlineWidth: null as number | null,
      size: 10 * dpi,
      inverted: true,
      skew: {
        enabled: false,
        type: "circle" as HandleType,
        inverted: true,
        size: 23 * dpi,
        distance: 23 * dpi,
        iconSize: 23 * dpi,
        outlineWidth: 2 * dpi,
        outsideStroke: true,
        shadowColor: "transparent",
      },
      rotate: {
        enabled: false,
        type: "circle" as HandleType,
        inverted: true,
        size: 23 * dpi,
        distance: 23 * dpi,
        iconSize: 23 * dpi,
        iconDynamicColor: true,
        outlineWidth: dpi,
        shadowColor: "transparent",
      },
    }),
    preserveAspectRatio: {
      enabled: false,
      type: "circle" as HandleType,
      inverted: true,
      size: 23 * dpi,
      iconSize: 23 * dpi,
      outlineWidth: 2 * dpi,
      outsideStroke: true,
      shadowColor: "transparent",
      side: null as unknown,
    },
  },
  userConfig: { uid: 0 } as { uid: number; readonly userName: string },

  /** Whether the preserve-aspect-ratio handle is on and sits at `side`. */
  isPreserveAspectRatioEnabledForSide(side: unknown): boolean {
    const handle = options.annotationHandles.preserveAspectRatio;
    return !(!handle || !handle.enabled) && handle.side === side;
  },

  /**
   * A deep copy of saved options (a JSON round trip) with the colour keys
   * turned back into colour objects: three components are RGB, anything
   * else CMYK.
   */
  restore(saved: unknown): unknown {
    return JSON.parse(JSON.stringify(saved), (key: string, value: unknown) => {
      switch (key) {
        case "blResizeColor":
        case "gridColor":
        case "distanceHelperColor":
        case "guideOutlineColor":
        case "guideLineColor": {
          const components = (value as { _value: number[] })._value;
          return 3 === components.length ? new RGBColor(components) : new CMYKColor(components);
        }
        default:
          return value;
      }
    });
  },
};

Object.defineProperty(options.userConfig, "userName", {
  get(): string {
    return Locale.get(
      new LocaleKey("GEditorOptions", "text.anonymous-user"),
      "Anonymous",
    ) as string;
  },
  enumerable: true,
  configurable: true,
});

export type EditorOptionsShape = typeof options;

/** The editor's global options; the app overwrites single values. */
export const EditorOptions: EditorOptionsShape = options;
