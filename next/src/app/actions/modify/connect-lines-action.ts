// Old: designer.browser.dev.js module 1597 (GConnectLinesAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Path } from "../../../engine/scene/path.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/**
 * Modify > Path > Connect Lines: one selected path is closed; several
 * paths with the same parent become one path through all their points, in
 * tree order, with the last path's transform and properties.
 */
export class ConnectLinesAction extends ElementAction {
  static ID = "modify.connect-lines";
  static TITLE = new LocaleKey("GConnectLinesAction", "title");

  override getId(): string {
    return ConnectLinesAction.ID;
  }

  override getTitle(): LocaleKey {
    return ConnectLinesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/path";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument ? designerDocument.getEditor().getSelection() : null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        if (selection[i] instanceof Path) return true;
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? editor.getSelection() : null;
    let paths: Path[] = [];
    let parent: ContainerNode | null = null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Path) {
          // Only paths with the first path's parent take part.
          if (parent) {
            if (parent === node.getParent()) paths.push(node);
          } else if ((parent = node.getParent())) paths.push(node);
        }
      }
    }
    if (!paths.length) return;
    const ed = editor as NonNullable<typeof editor>;
    ed.beginTransaction();
    try {
      if (1 == paths.length) (paths[0] as Path).setProperty("closed", true);
      else {
        const root = parent as ContainerNode;
        let connected: Path | undefined;
        try {
          blockChanges(ed, null, null, root as unknown as Updatable);
          paths = Node.order(paths) as Path[];
          const last = paths[paths.length - 1] as Path;
          let transform = last.getProperty("trf") as Transform | null;
          const inverse = transform ? transform.inverted() : null;
          const next = last.getNext();
          let points: unknown[] = [];
          // The points of the other paths are mapped into the last path's space.
          for (let i = 0; i < paths.length - 1; ++i) {
            const path = paths[i] as Path;
            path.removeFlag(Node.Flag.Selected as number);
            path.setProperty("closed", false);
            root.removeChild(path);
            transform = path.getProperty("trf") as Transform | null;
            transform = transform ? (inverse ? transform.multiplied(inverse) : transform) : inverse;
            points = points.concat(path.getAnchorPoints().serialize(transform));
          }
          last.removeFlag(Node.Flag.Selected as number);
          root.removeChild(last);
          points = points.concat(last.getAnchorPoints().serialize());
          connected = new Path();
          connected.getAnchorPoints().deserialize(points);
          connected.assignFrom(last);
          root.insertChild(connected, next);
        } finally {
          releaseChanges(ed, null, null, root as unknown as Updatable);
          ed.updateSelection(false, [connected]);
        }
      }
    } finally {
      ed.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GConnectLinesAction]";
  }
}
