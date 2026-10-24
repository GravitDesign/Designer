// Old: designer.browser.dev.js module 1269 (GPathProperties).
/**
 * Paths and compound paths: Closed and Autoscale Corners for the path
 * while no anchor point is selected; position, joint type and corner of
 * the first selected point otherwise. assignNodeType is also what the
 * joint-type actions (Cmd+Alt+A) run through
 * InspectorSidebar.setPathPointsNodeType. Shown when every inspected
 * element is a path or a compound path.
 */
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import { Editor } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { InputSlider } from "../color/opacity-slider.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { CornerTypePicker } from "../widgets/corner-type-select.ts";
import { InputBox } from "../widgets/input-box.ts";
import { initInputLabel } from "../widgets/input-label.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** Old module 357: PATHPROPERTIES.PATH_JOIN_CLASS, an empty class in this build. */
const PATH_JOIN_CLASS = "";

const PointType = PathBase.AnchorPoint.Type;

/** What the panel needs of a path's open element editor. */
interface PathEditorLike {
  getPaintElement(): unknown;
  getPathPointPreview(point: AnchorPoint): AnchorPoint;
  getPointCoord(point: AnchorPoint): Point;
  movePoint(point: AnchorPoint, position: Point): void;
}

/** An anchor point list (the parent of the anchor points). */
interface AnchorPointsLike {
  getFirstChild(): Node | null;
  getPreviousPoint(point: AnchorPoint): AnchorPoint | null;
  getNextPoint(point: AnchorPoint): AnchorPoint | null;
}

/** The statistics name of a node type. */
export function statsNodeType(type: string): string {
  switch (type) {
    case PointType.Mirror:
      return "Mirror";
    case PointType.Asymmetric:
      return "Asymmetric";
    case PointType.Symmetric:
      return "Symmetric";
    case PointType.Connector:
      return "Connector";
    default:
      return "Straight";
  }
}

/** The point's properties the old reader used (getProperty only). */
interface PointLike {
  getProperty(name: string): unknown;
  getParent(): unknown;
}

/**
 * The properties and values assignNodeType writes on one point. "-" (straight)
 * gives the rounded corner type and no handles; a smooth type turns auto
 * handles on, except for an Asymmetric point without handles and without
 * neighbouring handles, which gets explicit handles toward its neighbours.
 * `straight` is the shared pair the old code reused for every point.
 */
export function nodeTypeChange(
  type: string,
  point: PointLike,
  straight: { names: string[]; values: unknown[] } | null,
): { names: string[]; values: unknown[] } {
  if ("-" === type) return straight as { names: string[]; values: unknown[] };
  const names = ["ah", "tp"];
  const values: unknown[] = [false, type];
  if (null === point.getProperty("hlx") && null === point.getProperty("hrx")) {
    const points = point.getParent() as AnchorPointsLike;
    const previous = points.getPreviousPoint(point as unknown as AnchorPoint);
    const previousHandle = previous ? previous.getProperty("hrx") : null;
    const next = points.getNextPoint(point as unknown as AnchorPoint);
    const nextHandle = next ? next.getProperty("hlx") : null;
    if (type != PointType.Asymmetric || null !== previousHandle || null !== nextHandle)
      values[0] = true;
    else {
      const x = point.getProperty("x") as number;
      const y = point.getProperty("y") as number;
      if (previous && previous.getProperty("tp") != PointType.Connector) {
        const px = previous.getProperty("x") as number;
        const py = previous.getProperty("y") as number;
        if (!GMath.isEqualEps(x, px) || !GMath.isEqualEps(y, py)) {
          const hx = x + (px - x) * AnchorPoint.HANDLE_COEFF;
          const hy = y + (py - y) * AnchorPoint.HANDLE_COEFF;
          names.push("hlx");
          names.push("hly");
          values.push(hx);
          values.push(hy);
        }
      }
      if (next && next.getProperty("tp") != PointType.Connector) {
        const nx = next.getProperty("x") as number;
        const ny = next.getProperty("y") as number;
        if (!GMath.isEqualEps(x, nx) || !GMath.isEqualEps(y, ny)) {
          const hx = x + (nx - x) * AnchorPoint.HANDLE_COEFF;
          const hy = y + (ny - y) * AnchorPoint.HANDLE_COEFF;
          names.push("hrx");
          names.push("hry");
          values.push(hx);
          values.push(hy);
        }
      }
    }
  }
  return { names, values };
}

/** The value the type select and the joint buttons show: the smooth type, or "-" for corners. */
export function shownNodeType(type: unknown): { corner: boolean; shown: string } {
  let corner = true;
  for (const key in PointType)
    if (PointType[key as keyof typeof PointType] === type) {
      corner = false;
      break;
    }
  return { corner, shown: corner ? "-" : (type as string) };
}

function each<T extends Element>(root: Element, selector: string, fn: (element: T) => void): void {
  for (const element of root.querySelectorAll<T>(selector)) fn(element);
}

export class PathProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _pathes: (Path | CompoundPath)[] = [];
  _points: AnchorPoint[] | null = null;

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const nodeTypeEvent = (event: Event) => {
      const type = this._getTargetNodeType(event.target as HTMLElement);
      this.assignNodeType(type);
    };
    const control = (property: string): HTMLElement => {
      if ("x" === property || "y" === property) {
        const input = el("input");
        input.setAttribute("type", "text");
        input.setAttribute("data-point-property", property);
        input.addEventListener("change", () => {
          const value = sceneOf(this._document as Document).stringToPoint(input.value);
          if ("x" === property) designer().stats("pathproperties_modify_x");
          else designer().stats("pathproperties_modify_y");
          if (null !== value && "number" == typeof value)
            this._assignPointProperty(property, value);
          else this._updatePointProperties();
        });
        new InputBox(input);
        const wrapper = el("div");
        wrapper.appendChild(input);
        initInputLabel(wrapper, { label: property });
        return wrapper;
      }
      if ("tp" === property) {
        const select = el("select");
        select.setAttribute("data-point-property", property);
        const option = (value: string, table: string, key: string) => {
          const element = el("option");
          element.setAttribute("value", value);
          element.textContent = text(table, key);
          select.appendChild(element);
        };
        option("-", "GPathProperties", "text.straight");
        option(PointType.Mirror, "GPathBase", "anchor-point.mirror");
        option(PointType.Asymmetric, "GPathBase", "anchor-point.asymmetric");
        option(PointType.Symmetric, "GPathBase", "anchor-point.symmetric");
        option(PointType.Connector, "GPathBase", "anchor-point.connector");
        select.addEventListener("change", (event) => nodeTypeEvent(event));
        return select;
      }
      if ("ctp" === property) {
        const span = el("span");
        span.classList.add("clickable");
        span.classList.add("g-button");
        span.classList.add("corner-type");
        span.setAttribute("data-point-property", property);
        new CornerTypePicker(span);
        span.addEventListener("cornertypechange", (event) =>
          this._assignPointProperty("tp", (event as CustomEvent<string>).detail),
        );
        return span;
      }
      if ("cu" === property) {
        const button = el("button", "g-flat");
        button.setAttribute("data-point-property", property);
        button.addEventListener("click", () => {
          designer().stats("pathproperties_modify_uniform");
          this._assignPointProperty(property, !button.classList.contains("g-active"));
          this._updatePointProperties();
        });
        const lock = el("span", "gravit-icon-lock");
        lock.style.fontSize = "10px";
        button.appendChild(lock);
        return button;
      }
      if ("cl-slider" === property) {
        const slider = el("div");
        slider.setAttribute("data-point-property", "cl");
        const handle = new InputSlider(slider, {
          min: 0,
          max: 100,
          richTooltipConfig: RichTooltipConfig.from({
            title: text("GCommonNames", "text.corner-radius-slider-tooltip-title"),
            description: text("GCommonNames", "text.corner-radius-slider-tooltip-description"),
          }),
        });
        slider.addEventListener("mousedown", () => {
          editorOf(this._document as Document).hideSelection();
          document.addEventListener(
            "mouseup",
            () => editorOf(this._document as Document).resetHideSelection(),
            { once: true },
          );
        });
        slider.addEventListener("input", () => {
          const scene = sceneOf(this._document as Document);
          const value = scene.stringToPoint(String(handle.value()));
          const points = this._points as AnchorPoint[];
          for (let n = 0; n < points.length; ++n)
            (points[n] as AnchorPoint).setProperty("cl", value, false, false, true);
          each<HTMLInputElement>(
            this._panel as HTMLElement,
            '[type="text"][data-point-property="cl"]',
            (input) =>
              InputBox.of(input)?.value(
                scene.pointToString(value as number, scene.getOptimalDecimalsCount()),
              ),
          );
        });
        slider.addEventListener("change", () => {
          const value = sceneOf(this._document as Document).stringToPoint(String(handle.value()));
          designer().stats("pathproperties_modify_corner");
          this._assignPointProperty("cl", value);
        });
        return slider;
      }
      if ("cl-input" === property) {
        const input = el("input");
        input.setAttribute("type", "text");
        input.setAttribute("data-point-property", "cl");
        input.classList.add("corner-radius");
        input.addEventListener("change", () => {
          const value = sceneOf(this._document as Document).stringToPoint(input.value);
          if (null !== value && "number" == typeof value && value >= 0) {
            designer().stats("pathproperties_modify_corner");
            this._assignPointProperty("cl", value);
          } else this._updatePointProperties();
        });
        new InputBox(input, { minValue: 0 });
        return input;
      }
      throw new Error("Unknown input property: " + property);
    };

    const checkbox = (
      boxClass: string,
      property: string,
      caption: string,
      onChange: (checked: boolean) => void,
    ) => {
      const box = el("input", boxClass);
      box.setAttribute("type", "checkbox");
      box.setAttribute("data-path-property", property);
      box.addEventListener("change", (event) =>
        onChange((event.target as HTMLInputElement).matches(":checked")),
      );
      const span = el("span");
      span.textContent = caption;
      const label = el("label", "g-checkbox-label");
      label.append(box, span);
      return label;
    };
    const pathRow = el("div");
    pathRow.setAttribute("path-only", "true");
    propertyRow(pathRow, {
      columns: [
        {
          width: "40%",
          content: checkbox(
            "closed-checkbox",
            "closed",
            text("GPathProperties", "text.closed"),
            (checked) => {
              if (!checked) this._setBorderAlignmentCenter();
              designer().stats("pathproperties_modify_closed");
              this._assignPathProperty("closed", checked);
            },
          ),
        },
        {
          width: "60%",
          content: checkbox(
            "csc-checkbox",
            "csc",
            text("GCommonNames", "text.autoscale-corners"),
            (checked) => {
              designer().stats("pathproperties_modify_autoscale");
              this._assignPathProperty("csc", checked);
            },
          ),
        },
      ],
    });
    panel.appendChild(pathRow);

    const positionRow = el("div", "position-row");
    positionRow.setAttribute("point-only", "true");
    propertyRow(positionRow, {
      label: text("GCommonNames", "text.position"),
      columns: [
        { width: "32%", content: control("x") },
        { width: "32%", content: control("y") },
        { width: "auto", content: control("tp") },
      ],
    });
    panel.appendChild(positionRow);

    const jointButton = (
      type: string,
      table: string,
      key: string,
      icon: string,
      radius: Record<string, string>,
    ) => {
      const button = el("button", "g-button");
      for (const name of Object.keys(radius))
        button.style.setProperty(name, radius[name] as string);
      button.setAttribute("data-node-type", type);
      button.setAttribute("data-title", text(table, key));
      button.appendChild(el("span", icon));
      button.addEventListener("click", nodeTypeEvent);
      return button;
    };
    const jointRow = el("div");
    if (PATH_JOIN_CLASS) jointRow.classList.add(PATH_JOIN_CLASS);
    jointRow.classList.add("joint-row");
    jointRow.setAttribute("point-only", "true");
    propertyRow(jointRow, {
      label: text("GPathProperties", "text.joint"),
      columns: [
        {
          width: "25%",
          padding: false,
          content: jointButton(
            "-",
            "GPathProperties",
            "text.straight",
            "gravit-icon-node-straight",
            {
              "border-radius": "0px",
              "border-top-left-radius": "3px",
              "border-bottom-left-radius": "3px",
            },
          ),
        },
        {
          width: "25%",
          padding: false,
          content: jointButton(
            PointType.Mirror,
            "GPathBase",
            "anchor-point.mirror",
            "gravit-icon-node-mirrored",
            { "border-radius": "0px" },
          ),
        },
        {
          width: "25%",
          padding: false,
          content: jointButton(
            PointType.Asymmetric,
            "GPathBase",
            "anchor-point.asymmetric",
            "gravit-icon-node-disconnected",
            { "border-radius": "0px" },
          ),
        },
        {
          width: "25%",
          padding: false,
          content: jointButton(
            PointType.Symmetric,
            "GPathBase",
            "anchor-point.symmetric",
            "gravit-icon-node-assymetric",
            {
              "border-radius": "0px",
              "border-top-right-radius": "3px",
              "border-bottom-right-radius": "3px",
            },
          ),
        },
      ],
    });
    jointRow.classList.add("joint");
    panel.appendChild(jointRow);

    const rule = el("hr");
    rule.setAttribute("point-only", "true");
    rule.setAttribute("corner-only", "true");
    panel.appendChild(rule);

    const cornerRow = el("div");
    cornerRow.setAttribute("point-only", "true");
    cornerRow.setAttribute("corner-only", "true");
    cornerRow.classList.add("path-corner-chooser");
    propertyRow(cornerRow, {
      label: text("GCommonNames", "text.corner"),
      columns: [
        { width: "auto", content: control("cl-slider") },
        { clazz: "corners-radius-no-padding" },
        { width: "35px", content: control("cl-input") },
        // Old: width "3x", an invalid CSS width the browser drops.
        { width: "3x" },
        { width: "40px", content: control("ctp") },
      ],
    });
    cornerRow.classList.add("corner-radius");
    panel.appendChild(cornerRow);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    const panel = this._panel as HTMLElement;
    const touch = designer().isTouchEnabled();
    for (const selector of [".closed-checkbox", ".csc-checkbox"])
      each<HTMLInputElement>(panel, selector, (box) =>
        touch ? mountCheckboxSlider(box) : unmountCheckboxSlider(box),
      );
    if (this._document) {
      // The old code removed these listeners without their target, except the editor's.
      const scene = sceneOf(this._document as Document);
      scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
      scene.removeEventListener(AfterFlagChangeEvent, this._afterFlagChange);
      editorOf(this._document as Document).removeEventListener(
        Editor.EdGeometryChangeEvent,
        this._edGeometryChange,
        this,
      );
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._pathes = [];
    this._points = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let n = 0; n < list.length; ++n) {
        const element = list[n];
        if (element instanceof Path || element instanceof CompoundPath) {
          this._pathes.push(element);
          const collect = (path: Path) => {
            const points = this._points as AnchorPoint[];
            for (
              let point: Node | null = path.getAnchorPoints().getFirstChild();
              null !== point;
              point = point.getNext()
            )
              if (point.hasFlag(Node.Flag.Selected as number)) {
                points.push(point as AnchorPoint);
                // The old code set a _mainPath here when `this._points.legth`
                // (sic) was 1, which never happened; nothing reads it.
              }
          };
          if (element instanceof Path) collect(element);
          else
            for (
              let child: Node | null = element.getPaths().getFirstChild();
              null !== child;
              child = child.getNext()
            )
              collect(child as Path);
        }
      }
      if (this._pathes.length && this._pathes.length === list.length) {
        this._document = document;
        const scene = sceneOf(document);
        scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        scene.addEventListener(AfterFlagChangeEvent, this._afterFlagChange, this);
        editorOf(document).addEventListener(
          Editor.EdGeometryChangeEvent,
          this._edGeometryChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._updatePathProperties();
        this._updatePointProperties();
        return true;
      }
    }
    return false;
  }

  _getTargetNodeType(target: HTMLElement): string {
    if (target.matches("select")) return (target as HTMLSelectElement).value;
    return target.closest("[data-node-type]")?.getAttribute("data-node-type") as string;
  }

  _getStatsNodeType(type: string): string {
    return statsNodeType(type);
  }

  /** Sets the joint type of the selected points ("-" for straight, else an AnchorPoint.Type). */
  assignNodeType(type: string = "-"): void {
    designer().stats("pathproperties_assign_nodetype", this._getStatsNodeType(type));
    const document = this._document;
    const editor = document && document.getEditor();
    if (editor) {
      editor.beginTransaction();
      try {
        const straight =
          "-" === type
            ? {
                names: ["tp", "hlx", "hly", "hrx", "hry", "ah"],
                values: [PathBase.CornerType.Rounded, null, null, null, null, false],
              }
            : null;
        (this._points as AnchorPoint[]).forEach((point) => {
          const { names, values } = nodeTypeChange(type, point, straight);
          point.setProperties(names, values);
          const tp = point.getProperty("tp");
          const ah = point.getProperty("ah");
          if (tp == PointType.Mirror && ah) point.setProperty("ah", false);
        });
      } finally {
        editor.commitTransaction(text("GPathProperties", "action.modify-path-node-type"));
      }
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (event.temporary) return;
    if (this._pathes.length > 0 && this._pathes[0] === event.node) this._updatePathProperties();
    const points = this._points as AnchorPoint[];
    if (points.length > 0 && points[0] === event.node) this._updatePointProperties();
  }

  _afterFlagChange(event: AfterFlagChangeEvent): void {
    if (event.flag === Node.Flag.Selected && event.node instanceof AnchorPoint) {
      const point = event.node;
      const path = point.getParent() ? (point.getParent() as Node).getParent() : null;
      const compound =
        path && path.getParent() && (path.getParent() as Node).getParent()
          ? (path.getParent() as Node).getParent()
          : null;
      const pathes = this._pathes as Node[];
      if ((path && pathes.indexOf(path) >= 0) || (compound && pathes.indexOf(compound) >= 0)) {
        const points = this._points as AnchorPoint[];
        if (event.set) points.push(point);
        // Kept from the old code: a point that isn't in the list gives
        // indexOf -1, and splice(-1, 1) drops the last point instead (pinned
        // in path-panel.test.ts).
        else points.splice(points.indexOf(point), 1);
        this._updatePathProperties();
        this._updatePointProperties();
      }
    }
  }

  _edGeometryChange(): void {
    this._updatePointProperties();
  }

  _updatePathProperties(): void {
    const panel = this._panel as HTMLElement;
    const pathOnly = (display: string) =>
      each<HTMLElement>(panel, "[path-only]", (row) => row.style.setProperty("display", display));
    const boxes = (property: string, disabled: boolean, checked: boolean) =>
      each<HTMLInputElement>(panel, `input[data-path-property="${property}"]`, (box) => {
        box.disabled = disabled;
        box.checked = checked;
      });
    if ((this._points as AnchorPoint[]).length) pathOnly("none");
    else {
      pathOnly("");
      const path = this._pathes[0] as Path | CompoundPath;
      if (path instanceof Path) {
        boxes("closed", false, !!path.getProperty("closed"));
        boxes("csc", false, !!path.getProperty("csc"));
      } else {
        boxes("closed", true, false);
        boxes("csc", false, !!path.getProperty("csc"));
      }
    }
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updatePointProperties();
  }

  _updatePointProperties(): void {
    const panel = this._panel as HTMLElement;
    const points = this._points as AnchorPoint[];
    const point = points.length > 0 ? (points[0] as AnchorPoint) : null;
    if (!point) {
      each<HTMLElement>(panel, "[point-only]", (e) => e.style.setProperty("display", "none"));
      return;
    }
    each<HTMLElement>(panel, "[point-only]", (e) => e.style.setProperty("display", ""));
    const scene = sceneOf(this._document as Document);
    const coord = this._getPointCoord(point);
    const format = (value: number) => scene.pointToString(value, scene.getOptimalDecimalsCount());
    each<HTMLInputElement>(panel, 'input[data-point-property="x"]', (input) => {
      input.value = format(coord.getX());
    });
    each<HTMLInputElement>(panel, 'input[data-point-property="y"]', (input) => {
      input.value = format(coord.getY());
    });
    const type = point.getProperty("tp");
    const { corner, shown } = shownNodeType(type);
    each<HTMLSelectElement>(panel, 'select[data-point-property="tp"]', (select) => {
      select.value = shown;
    });
    each<HTMLElement>(panel, "[data-node-type]", (button) =>
      button.classList.toggle("g-active", button.getAttribute("data-node-type") === shown),
    );
    each<HTMLElement>(panel, "[corner-only]", (e) =>
      e.style.setProperty("display", corner ? "" : "none"),
    );
    each<HTMLElement>(panel, '[data-point-property="ctp"]', (e) => {
      e.style.setProperty("display", corner ? "" : "none");
      CornerTypePicker.of(e)?.value(corner ? (type as string) : PathBase.CornerType.Rounded);
    });
    each<HTMLElement>(panel, 'div[data-point-property="cl"]', (e) => {
      // jQuery's prop("disabled") on a div only set a JavaScript property.
      (e as unknown as { disabled: boolean }).disabled = !corner;
      InputSlider.of(e)?.value(format(point.getProperty("cl") as number));
    });
    each<HTMLInputElement>(panel, 'input[data-point-property="cl"]', (input) => {
      input.disabled = !corner;
      input.value = format(point.getProperty("cl") as number);
    });
    // The old code also updated a "cr" box and a "cu" button the panel never builds.
    each<HTMLInputElement>(panel, 'input[data-point-property="cr"]', (input) => {
      input.disabled = !corner || !!point.getProperty("cu");
      input.value = format(point.getProperty("cr") as number);
    });
    each<HTMLButtonElement>(panel, 'button[data-point-property="cu"]', (button) => {
      button.disabled = !corner;
      button.classList.toggle("g-active", !!point.getProperty("cu"));
    });
  }

  _getPointCoord(point: AnchorPoint): Point {
    const path = point.getPath();
    const editor = path ? ElementEditor.getEditor<PathEditorLike>(path) : null;
    if (path && editor) {
      if (editor.getPaintElement() != path) point = editor.getPathPointPreview(point);
      return editor.getPointCoord(point);
    }
    return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
  }

  _transformPoint(point: AnchorPoint, transform: Transform | null, position: Point): void {
    if (transform) position = transform.mapPoint(position);
    const editor = ElementEditor.getEditor<PathEditorLike>(point.getPath());
    if (editor) editor.movePoint(point, position);
    else point.setProperties(["x", "y"], [position.getX(), position.getY()]);
  }

  _assignPathProperty(property: string, value: unknown): void {
    this._assignPathProperties([property], [value]);
  }

  _assignPathProperties(properties: string[], values: unknown[]): void {
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._pathes.length; ++i)
        (this._pathes[i] as Path).setProperties(properties, values);
    } finally {
      editor.commitTransaction(text("GPathProperties", "action.modify-path-properties"));
    }
  }

  _setBorderAlignmentCenter(): void {
    const names = ["_ba"];
    const values = [BorderAlignment.Center];
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (let r = 0, s = this._pathes.length; r < s; ++r) {
        const layers = (
          (this._pathes[r] as Path | CompoundPath).getPaintLayers() as PaintLayers
        ).getBorderLayers();
        for (let l = 0, c = layers.length; l < c; l++) {
          const layer = layers[l];
          if (layer instanceof BorderPaintLayer) layer.setProperties(names, values);
        }
      }
    } finally {
      editor.commitTransaction(text("GPathProperties", "action.modify-path-properties"));
    }
  }

  _assignPointProperty(property: string, value: unknown): void {
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      const points = this._points as AnchorPoint[];
      for (let i = 0; i < points.length; ++i) {
        const point = points[i] as AnchorPoint;
        if ("x" === property) {
          const coord = this._getPointCoord(point);
          const move = new Transform(1, 0, 0, 1, (value as number) - coord.getX(), 0);
          this._transformPoint(point, move, coord);
        } else if ("y" === property) {
          const coord = this._getPointCoord(point);
          const move = new Transform(1, 0, 0, 1, 0, (value as number) - coord.getY());
          this._transformPoint(point, move, coord);
        } else point.setProperties([property], [value]);
      }
    } finally {
      editor.commitTransaction(text("GPathProperties", "action.modify-point-properties"));
    }
  }

  _assignPointProperties(properties: string[], values: unknown[]): void {
    designer().stats("pathproperties_modify_point-properties");
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      const points = this._points as AnchorPoint[];
      for (let i = 0; i < points.length; ++i)
        (points[i] as AnchorPoint).setProperties(properties, values);
    } finally {
      editor.commitTransaction(text("GPathProperties", "action.modify-point-properties"));
    }
  }

  override toString(): string {
    return "[Object GPathProperties]";
  }
}
