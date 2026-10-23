// Old: chunk.vendor.js module 334 (GSelectTool._updateEditorUnderMouse,
// _updateDistanceHelper).
/**
 * What is under the pointer while no button is held: a ruler guide line
 * (within half the pick distance), a transform box part, an element
 * editor's part (handle, point ...), or an element to highlight. Also the
 * snap zones of a single selected item and the Alt distance measurement.
 */
import { Platform } from "../../../engine/core/platform.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Element } from "../../../engine/scene/element.ts";
import { Transform as TransformMixin } from "../../../engine/scene/element-transform.ts";
import { Item } from "../../../engine/scene/item.ts";
import { NodeFlag } from "../../../engine/scene/node-change.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Editor } from "../../editor.ts";
import { EditorOptions } from "../../editor-options.ts";
import { BaseEditor, type PartInfo } from "../../element-editors/base-editor.ts";
import { ElementEditor } from "../../element-editors/element-editor.ts";
import { TransformBox } from "../../element-editors/transform-box.ts";
import { Guides } from "../../guides/guides.ts";
import type { SelectTool } from "../select-tool.ts";
import type { ToolManager } from "../tool-manager.ts";
import type { GuideLineHit } from "./select-types.ts";

const modifiers = Platform.modifiers;

/** An editor that can highlight the part under the pointer (none of the ported ones can). */
interface HighlightingEditor {
  highlightPart?: (id: unknown, data: unknown) => void;
}

/** The ruler guide line within half the pick distance of `position` (view pixels), or null. */
function guideLineAt(
  tool: SelectTool,
  position: Point,
  worldTransform: Transform,
): GuideLineHit | null {
  const x = position.getX();
  const y = position.getY();
  const horizontal = tool._scene.getProperty("hgl") as number[] | null;
  const vertical = tool._scene.getProperty("vgl") as number[] | null;
  const half = EditorOptions.pickDistance / 2;
  if (horizontal && horizontal.length) {
    for (let i = 0; i < horizontal.length; ++i) {
      const lineY = worldTransform.mapPoint(new Point(0, horizontal[i] as number)).getY();
      if (lineY >= y - half && lineY <= y + half) return { isVertical: false, guideIndex: i };
    }
  }
  if (vertical && vertical.length) {
    for (let i = 0; i < vertical.length; ++i) {
      const lineX = worldTransform.mapPoint(new Point(vertical[i] as number, 0)).getX();
      if (lineX >= x - half && lineX <= x + half) return { isVertical: true, guideIndex: i };
    }
  }
  return null;
}

type Transform = ReturnType<SelectTool["_view"]["getWorldTransform"]>;

export function updateEditorUnderMouse(tool: SelectTool, position: Point): void {
  const Mode = (tool.constructor as typeof SelectTool)._Mode;
  tool._visuals = null;
  const scene = tool._view.getScene();
  const pageTransform = scene ? tool._view.getWorldTransform(scene.getActivePage()) : null;
  const sceneTransform = scene ? tool._view.getWorldTransform(scene) : null;
  if (!(sceneTransform && pageTransform)) return;

  let guideLine: GuideLineHit | null = null;
  if (
    (!tool._mode || tool._mode == Mode.Transforming) &&
    tool._view.getViewConfiguration().guideLinesVisible
  ) {
    guideLine = guideLineAt(tool, position, sceneTransform);
  }

  if (tool._mode == Mode.Transforming) {
    const sceneEditor = tool._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive()) {
      if (tool._editorUnderMouseInfo) tool._editorUnderMouseInfo = null;
      const under = sceneEditor.updateTBoxUnderMouse(position, sceneTransform, tool._view);
      tool._editorUnderMouseInfo = under.partInfo;
      if (under.newPInfo || guideLine || (!guideLine && tool._guideLineUnderMouse)) {
        const id = (under.partInfo as PartInfo).id;
        // Over a guide line only the box's inside and outside give way to it.
        if (
          !guideLine ||
          (id != TransformBox.INSIDE &&
            id != TransformBox.OUTSIDE &&
            id != TransformBox.FAR_OUTSIDE)
        ) {
          if (tool._guideLineUnderMouse) tool._guideLineUnderMouse = null;
          guideLine = null;
        } else {
          tool._guideLineUnderMouse = guideLine;
          tool._editorUnderMouseInfo = null;
        }
        tool.updateCursor();
      }
    } else tool._updateMode(null);
  }

  let partInfo: PartInfo | null = null;
  if (!tool._mode) {
    let partChanged = false;
    let highlighted = false;
    const sceneEditor = tool._sceneEditor();
    if (sceneEditor) {
      partInfo = sceneEditor.getPartInfoAt(
        position,
        pageTransform,
        (editor: BaseEditor) => editor.allowPartSelection(),
        EditorOptions.pickDistance,
        tool._view.getViewConfiguration().multiPageView,
      ) as PartInfo | null;
      if (
        partInfo &&
        !tool._editor.hasSelectionDetail() &&
        !tool._editor.hasSelectionEdit() &&
        tool._isLineSegment(partInfo)
      ) {
        partInfo = null;
      }
      if (partInfo !== tool._editorUnderMouseInfo) {
        const previous = tool._editorUnderMouseInfo;
        if (
          previous &&
          (previous.editor as HighlightingEditor).highlightPart &&
          !(partInfo && partInfo.editor == previous.editor)
        ) {
          (previous.editor as BaseEditor).requestInvalidation();
        }
        tool._editorUnderMouseInfo = partInfo;
        partChanged = true;
        const current = tool._editorUnderMouseInfo;
        const highlight = current && (current.editor as HighlightingEditor).highlightPart;
        if (current && highlight) highlight.call(current.editor, current.id, current.data);
        tool.updateCursor();
      }
    }
    if (!partChanged && tool._editorUnderMouseInfo) {
      tool._editorUnderMouseInfo = null;
      tool.updateCursor();
    }
    if (!partChanged && guideLine) {
      tool._guideLineUnderMouse = guideLine;
      tool.updateCursor();
    }
    if (!guideLine && tool._guideLineUnderMouse) {
      tool._guideLineUnderMouse = null;
      tool.updateCursor();
    }
    if (!partChanged && !guideLine) {
      const element = tool._getSelectableForPosition(position, false);
      if (
        element &&
        !element.hasFlag(NodeFlag.Selected) &&
        !(element instanceof Page && tool._scene.getActivePage() === element)
      ) {
        if (tool._elementUnderMouse && tool._elementUnderMouse !== element) {
          tool._elementUnderMouse.removeFlag(NodeFlag.Highlighted);
        }
        tool._elementUnderMouse = element;
        if (EditorOptions.highlightOnHover) tool._elementUnderMouse.setFlag(NodeFlag.Highlighted);
        highlighted = true;
        tool.updateCursor();
      }
    }
    if (!highlighted && tool._elementUnderMouse) {
      tool._elementUnderMouse.removeFlag(NodeFlag.Highlighted);
      tool._elementUnderMouse = null;
      tool.updateCursor();
    }
    if (
      tool._allowDistanceHelper &&
      tool._editor.getDistanceHelper().isActivated() &&
      tool._editor.getSelection() &&
      (tool._editor.getSelection() as unknown[]).length &&
      EditorOptions.distanceHelperBehaviour !==
        (tool.constructor as typeof SelectTool)._DistanceHelperBehaviour.Click
    ) {
      tool._updateDistanceHelper();
    }
  }

  updateSnapZones(tool, position, pageTransform, partInfo);
}

/**
 * The snap zones of the single selected item under the pointer (lines
 * that show where a drag would snap), when no part is hovered.
 */
function updateSnapZones(
  tool: SelectTool,
  position: Point,
  pageTransform: Transform,
  partInfo: PartInfo | null,
): void {
  const Mode = (tool.constructor as typeof SelectTool)._Mode;
  let box: Rect | null = null;
  tool._visuals = null;
  let deep = modifiers.metaKey && null == (tool._manager as ToolManager).getTemporaryActiveTool();
  const zones = Guides.options.zones && !deep;
  if (((!tool._mode && !partInfo) || tool._mode == Mode.Select) && !deep && zones) {
    let hovered: Element | null = null;
    const selection = tool._editor.getSelection();
    deep = false;
    if (
      selection &&
      1 == selection.length &&
      selection[0] instanceof Item &&
      selection[0].hitTest(
        position,
        pageTransform,
        tool._selectAcceptorFunc,
        deep,
        -1,
        EditorOptions.pickDistance,
        zones,
        null,
        true,
        false,
        // The old call also passed the multi-page flag, which an item's hitTest doesn't take.
      )
    ) {
      hovered = selection[0];
    }
    if (hovered && (box = hovered.getGeometryBBox()) && !box.isEmpty()) {
      box = pageTransform.mapRect(box);
      const lines = tool._editor.getGuides().getBBoxSnapZones(box, position);
      if (lines && lines.length) tool._visuals = lines as [Point, Point][];
    }
  }
  const area = tool._visuals ? (box as Rect).expanded(2, 2, 2, 2) : null;
  if (tool._visualsArea || area) {
    if (tool._visualsArea) tool.invalidateArea(tool._visualsArea);
    if (area) tool.invalidateArea(area);
    tool._visualsArea = area;
  }
}

/**
 * Shows the distances between the selection and the page, or the hovered
 * element (`byClick`: the Click behaviour toggles between the two).
 */
export function updateDistanceHelper(tool: SelectTool, byClick?: boolean): void {
  let base: Rect | null = null;
  const first = (tool._editor.getSelection() as Element[])[0] as Element;
  const page = Editor.getElementPage(first);
  let target: Rect | null = null;
  let keepBase = false;
  let keepTarget = false;
  const selectionEditor = tool._editor.getSelectionEditor() as
    (BaseEditor & { getBox(exact: boolean): Rect | null }) | null;
  if (selectionEditor && !selectionEditor.hasFlag(BaseEditor.Flag.HideEditor)) {
    base = selectionEditor.getBox(true);
  } else if (1 == (tool._editor.getSelection() as Element[]).length) {
    const editor = ElementEditor.getEditor<ElementEditor>(first);
    base =
      first.hasMixin(TransformMixin) && editor
        ? editor.getPEGeometryBBox()
        : first.getGeometryBBox();
    let angle = (first as unknown as { getAngle(): number | null }).getAngle();
    angle = angle ? Math.abs(angle) : angle;
    if (!(
      (null == angle ||
        GMath.isEqualEps(angle, 0, 1e-4) ||
        GMath.isEqualEps(angle, Math.PI, 1e-4) ||
        GMath.isEqualEps(angle, GMath.PIHALF, 1e-4)) &&
      editor &&
      editor._showResizeBox()
    )) {
      keepBase = true;
    }
  }
  if (!base) return;
  let targetPage = page;
  const useHovered = !byClick || tool._elementMeasurementsToggle;
  const hovered = tool._elementUnderMouse && !tool._elementUnderMouse.hasFlag(NodeFlag.Selected);
  if (useHovered && hovered) {
    target = (tool._elementUnderMouse as Element).getGeometryBBox();
    targetPage = Editor.getElementPage(tool._elementUnderMouse);
    keepTarget = true;
  } else if (targetPage) {
    target = targetPage.getGeometryBBox();
    if (!(targetPage.getProperty("h") || targetPage.getProperty("w"))) keepTarget = true;
  }
  if (byClick && hovered) tool._elementMeasurementsToggle = !tool._elementMeasurementsToggle;
  if (target && targetPage == page) {
    tool._editor.getDistanceHelper().refreshVisuals(base, target, keepBase, keepTarget);
  }
}
