// Old: chunk.vendor.js module 999 (no G name).
/**
 * The class a collaborative text (GCollabText) turns into while it is in
 * text mode: a GText with action buttons and annotation links.
 * `CollabText.setModeText` swaps an instance's prototype to this one.
 *
 * The old instance kept GCollabText's type id as an own field through the
 * swap, so it still saved and answered as "collabtext". Here the class
 * itself carries that id, so instances behave the same, but
 * getTypeId(CollabTextAnnotationBase) on the class gives the collabtext
 * id where the old module 999 class had its own counter id. Nothing
 * reads the class-level id.
 */
import { registerClass } from "../../core/object.ts";
import { lookupOldTypeId } from "../../core/type-ids.ts";
import { Text } from "../../text/text.ts";
import { ActionableMixin } from "./actionable.ts";
import { Annotable } from "./annotable.ts";

export class CollabTextAnnotationBase extends Annotable(ActionableMixin(Text)) {
  static {
    registerClass(this, "GCollabText (text mode)", { id: lookupOldTypeId("GCollabText") });
  }
}
