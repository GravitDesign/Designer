import { BaseEditor } from "../../editor/element-editors/base-editor.ts";
import { BlockEditor } from "../../editor/element-editors/block-editor.ts";
import { BoxEditor } from "../../editor/element-editors/box-editor.ts";
import { CompoundShapeEditor } from "../../editor/element-editors/compound-shape-editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { EllipseEditor } from "../../editor/element-editors/ellipse-editor.ts";
import { GroupEditor } from "../../editor/element-editors/group-editor.ts";
import { ImageEditor } from "../../editor/element-editors/image-editor.ts";
import { ImageGridEditor } from "../../editor/element-editors/image-grid-editor.ts";
import { ItemEditor } from "../../editor/element-editors/item-editor.ts";
import { LayerEditor } from "../../editor/element-editors/layer-editor.ts";
import { PageEditor } from "../../editor/element-editors/page-editor.ts";
import { PolygonEditor } from "../../editor/element-editors/polygon-editor.ts";
import { RectangleEditor } from "../../editor/element-editors/rectangle-editor.ts";
import { SceneEditor } from "../../editor/element-editors/scene-editor.ts";
import { SelectionPositionEditor } from "../../editor/element-editors/selection-position-editor.ts";
import { ShapeEditor } from "../../editor/element-editors/shape-editor.ts";
import { SimpleShapeEditor } from "../../editor/element-editors/simple-shape-editor.ts";
import { SliceEditor } from "../../editor/element-editors/slice-editor.ts";
import { SymbolEditor } from "../../editor/element-editors/symbol-editor.ts";
import { TransformBox } from "../../editor/element-editors/transform-box.ts";

export const editorElementEditors = {
  GBaseEditor: BaseEditor,
  GBoxEditor: BoxEditor,
  GElementEditor: ElementEditor,
  GBlockEditor: BlockEditor,
  GItemEditor: ItemEditor,
  GShapeEditor: ShapeEditor,
  GImageEditor: ImageEditor,
  GRectangleEditor: RectangleEditor,
  GEllipseEditor: EllipseEditor,
  GPolygonEditor: PolygonEditor,
  GPageEditor: PageEditor,
  GSceneEditor: SceneEditor,
  GTransformBox: TransformBox,
  GSelectionPositionEditor: SelectionPositionEditor,
  GGroupEditor: GroupEditor,
  GLayerEditor: LayerEditor,
  GCompoundShapeEditor: CompoundShapeEditor,
  GImageGridEditor: ImageGridEditor,
  GSliceEditor: SliceEditor,
  GSimpleShapeEditor: SimpleShapeEditor,
  GSymbolEditor: SymbolEditor,
};
